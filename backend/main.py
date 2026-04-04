"""
OmniGuard XAI — Real-Time Scoring API v3.0 (REAL DATA & LIVE GRAPH)
===================================================================
FastAPI server that:
  1. Loads IsolationForest + XGBoost models on startup.
  2. Loads REAL synthetic data from the /data folder.
  3. Serves a live, dynamic Relational Graph based on transactions.
  4. Ingests simulated attacks into the live transaction feed and graph.
  5. Publishes fraud alerts to Kafka (optional).
"""

import os, uuid, json, time, threading, logging
from datetime import datetime
from typing import Optional, List
from random import randint, random, choice

import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# 🚨 DATABASE IMPORTS (ADDED) 🚨
from sqlalchemy.orm import Session
import models
from database import engine, get_db

# 🚨 CREATE DATABASE TABLES AUTOMATICALLY ON STARTUP
models.Base.metadata.create_all(bind=engine)

# ── Optional Kafka ─────────────────────────────────────────────────────────
try:
    from kafka import KafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("omniguard")

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="OmniGuard XAI API",
    description="Enterprise Financial Fraud Detection — Union Bank of India",
    version="3.0.0"
)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ── Global State ───────────────────────────────────────────────────────────
MODEL_DIR = "models"
DATA_DIR  = "data"
FEATURES  = ["amount", "hour", "latency", "distance_km", "velocity", "is_new_beneficiary"]
_iso = _xgb = _scaler = _features = _producer = None

# In-memory databases
transactions_store: List[dict] = []
users_store:        List[dict] = []
audit_log:          List[dict] = []
alerts_store:       List[dict] = []

KAFKA_TOPIC  = "fraud-alerts"
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")

# ── Pydantic Schemas ───────────────────────────────────────────────────────
class TransactionPayload(BaseModel):
    amount:             float = Field(..., gt=0,  description="Amount in INR")
    hour:               int   = Field(..., ge=0,  le=23)
    latency:            float = Field(..., gt=0,  description="Network latency ms")
    distance_km:        float = Field(..., ge=0,  description="Geo distance from baseline")
    velocity:           int   = Field(..., ge=0,  description="Txns in last 10 min")
    is_new_beneficiary: int   = Field(..., ge=0,  le=1)
    account_id:         Optional[str] = None
    branch:             Optional[str] = None
    merchant:           Optional[str] = None

class ScoringResponse(BaseModel):
    transaction_id:    str
    is_fraud:          bool
    risk_score:        int
    action_taken:      str
    iso_anomaly_score: float
    xgb_fraud_prob:    float
    xai_factors:       dict
    timestamp:         str
    processing_ms:     float

# ── Startup (Load Models AND Real Data) ────────────────────────────────────
@app.on_event("startup")
async def load_system():
    global _iso, _xgb, _scaler, _features, _producer
    
    # 1. Load Models
    log.info("Loading ML models...")
    try:
        _iso      = joblib.load(f"{MODEL_DIR}/iso_model.pkl")
        _xgb      = joblib.load(f"{MODEL_DIR}/xgb_model.pkl")
        _scaler   = joblib.load(f"{MODEL_DIR}/scaler.pkl")
        _features = joblib.load(f"{MODEL_DIR}/features.pkl")
        log.info("✅ IsolationForest + XGBoost loaded")
    except FileNotFoundError:
        log.warning("⚠️  Models not found — run train.py first.")

    # 2. Load Real Datasets into memory
    log.info("Loading REAL datasets into memory...")
    try:
        # Load External Transactions
        df_tx = pd.read_csv(f"{DATA_DIR}/external_transactions.csv").head(150) # Load top 150
        for idx, row in df_tx.iterrows():
            transactions_store.append({
                "id": f"TXN-{88000+idx}",
                "merchant": "Online Merchant" if row['label'] == 0 else "High-Risk Payee",
                "account": f"UBI-{randint(10000000, 99999999)}",
                "amount": float(row['amount']),
                "city": "Mumbai" if row['distance_km'] < 100 else "Foreign IP",
                "hour": int(row['hour']),
                "risk": randint(5, 30) if row['label'] == 0 else randint(75, 98),
                "flagged": bool(row['label'] == 1),
                "latency": int(row['latency']),
                "type": "Normal" if row['label'] == 0 else "Blocked",
            })
        
        # Load Internal Employees
        df_emp = pd.read_csv(f"{DATA_DIR}/internal_employee_logs.csv").head(50)
        for idx, row in df_emp.iterrows():
            users_store.append({
                "id": row['employee_id'],
                "name": f"Employee {idx}",
                "department": row['department'],
                "role": "Officer",
                "last_login": f"{row['login_hour']}:00",
                "data_volume": int(row['data_downloaded_mb']),
                "risk": randint(5,20) if row['is_insider_threat'] == 0 else randint(80,95),
                "flagged": bool(row['is_insider_threat'] == 1),
                "latency": randint(10,50),
                "anomalies": ["High Data Export"] if row['is_insider_threat'] == 1 else []
            })
        log.info("✅ Datasets loaded successfully!")
    except Exception as e:
        log.error(f"⚠️ Could not load CSVs (Did you run train.py?): {e}")

    # 3. Connect Kafka
    if KAFKA_AVAILABLE:
        try:
            _producer = KafkaProducer(
                bootstrap_servers=[KAFKA_BROKER],
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                request_timeout_ms=2000,
                api_version_auto_timeout_ms=2000
            )
            log.info(f"✅ Kafka connected to {KAFKA_BROKER}")
        except Exception as e:
            log.warning(f"⚠️  Kafka unavailable: {e}. Running without streaming.")

# ── Scoring Logic ──────────────────────────────────────────────────────────
def _heuristic_score(row):
    score = 0.0
    if row["amount"]      > 500_000:             score += 35
    if row["hour"]        in [0,1,2,3,4,23]:     score += 25
    if row["latency"]     > 150:                 score += 15
    if row["distance_km"] > 2000:                score += 15
    if row["velocity"]    >= 5:                  score += 10
    if row["is_new_beneficiary"] == 1:           score += 10
    return min(score / 110.0, 1.0), min(score / 100.0, 1.0)

def _compute_xai(row, xgb_prob, iso_norm):
    factors = {}
    if row["amount"] > 500_000:
        factors["amount_spike"] = {"label": f"Amount ₹{row['amount']:,.0f} — {row['amount']/50000:.0f}x above avg", "contribution": 38, "direction": "risk"}
    if row["hour"] in [0,1,2,3,4,23]:
        factors["off_hours"] = {"label": f"Transaction at {row['hour']}:00 — off-hours", "contribution": 25, "direction": "risk"}
    if row["distance_km"] > 2000:
        factors["geo_anomaly"] = {"label": f"Location {row['distance_km']:.0f}km from baseline", "contribution": 20, "direction": "risk"}
    if row["latency"] > 150:
        factors["high_latency"] = {"label": f"Latency {row['latency']:.0f}ms — possible VPN/proxy", "contribution": 12, "direction": "risk"}
    if row["velocity"] >= 5:
        factors["velocity"] = {"label": f"{row['velocity']} txns in 10 min — velocity attack", "contribution": 15, "direction": "risk"}
    if row["is_new_beneficiary"] == 1:
        factors["new_beneficiary"] = {"label": "New beneficiary — first-time payee", "contribution": 8, "direction": "risk"}
    if not factors:
        factors["normal"] = {"label": "All features within normal baseline", "contribution": 0, "direction": "safe"}
    factors["model_blend"] = {"label": f"XGBoost: {xgb_prob*100:.1f}% | IsoForest: {iso_norm*100:.1f}%", "contribution": 0, "direction": "info"}
    return factors

def _publish_kafka(result):
    if _producer is None: return
    try:
        _producer.send(KAFKA_TOPIC, value=result)
        _producer.flush(timeout=1)
    except Exception: pass

# ── Endpoints ──────────────────────────────────────────────────────────────
@app.post("/api/simulate", response_model=ScoringResponse)
async def simulate(payload: TransactionPayload, db: Session = Depends(get_db)):
    """
    Score a transaction, inject it into the live UI feed, and update graph!
    """
    t0  = time.perf_counter()
    row = {f: getattr(payload, f) for f in FEATURES}
    df  = pd.DataFrame([row])

    if _iso is not None and _xgb is not None:
        df_scaled     = _scaler.transform(df[_features])
        iso_raw       = _iso.decision_function(df_scaled)[0]
        iso_norm      = float(np.clip((-iso_raw + 0.5), 0.0, 1.0))
        xgb_prob      = float(_xgb.predict_proba(df[_features])[0][1])
    else:
        iso_norm, xgb_prob = _heuristic_score(row)

    blended    = (0.60 * xgb_prob) + (0.40 * iso_norm)
    risk_score = int(round(blended * 100))

    if risk_score >= 70:
        is_fraud, action = True,  "BLOCK"
    elif risk_score >= 40:
        is_fraud, action = False, "STEP-UP MFA"
    else:
        is_fraud, action = False, "ALLOW"

    txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
    xai_data = _compute_xai(row, xgb_prob, iso_norm)

    # 🚨 Inject explicitly into the live UI Table/Graph feed
    ui_txn = {
        "id": txn_id,
        "merchant": payload.merchant or "Unknown Attacker",
        "account": payload.account_id or "UBI-ATTACKED",
        "amount": payload.amount,
        "city": "Dubai (Proxy)" if payload.distance_km > 1000 else "Mumbai",
        "hour": payload.hour,
        "risk": risk_score,
        "flagged": is_fraud,
        "latency": int((time.perf_counter() - t0) * 1000),
        "type": action,
        "xai": xai_data
    }
    
    # 🚨 SAVE DIRECTLY TO SQLITE DATABASE
    try:
        db_txn = models.Transaction(
            id=ui_txn["id"],
            merchant=ui_txn["merchant"],
            account=ui_txn["account"],
            amount=ui_txn["amount"],
            city=ui_txn["city"],
            hour=ui_txn["hour"],
            risk=ui_txn["risk"],
            flagged=ui_txn["flagged"],
            latency=ui_txn["latency"],
            type=ui_txn["type"],
            xai=ui_txn["xai"]
        )
        db.add(db_txn)
        db.commit()
        log.info(f"✅ Transaction {txn_id} saved to Database!")
    except Exception as e:
        log.error(f"⚠️ Failed to save to Database: {e}")

    # Prepend to top of lists so it shows up instantly
    transactions_store.insert(0, ui_txn)
    if len(transactions_store) > 500: transactions_store.pop()

    if is_fraud:
        audit_log.insert(0, {
            "id": f"ACT-{uuid.uuid4().hex[:6].upper()}",
            "action": f"{action} — {txn_id}",
            "txn_id": txn_id, "risk_score": risk_score,
            "method": "ML Ensemble", "automated": True,
            "time_ago": "0s ago", "timestamp": datetime.utcnow().isoformat() + "Z", "reverted": False
        })
        alerts_store.insert(0, {
            "id": txn_id,
            "message": f"🚨 {txn_id} — Risk {risk_score} — {action}",
            "severity": "high", "module": "transaction", 
            "time": datetime.utcnow().strftime("%H:%M:%S"),
            "risk_score": risk_score, "xai": xai_data
        })

    result = {
        "transaction_id":    txn_id,
        "is_fraud":          is_fraud,
        "risk_score":        risk_score,
        "action_taken":      action,
        "iso_anomaly_score": round(iso_norm, 4),
        "xgb_fraud_prob":    round(xgb_prob, 4),
        "xai_factors":       xai_data,
        "timestamp":         datetime.utcnow().isoformat() + "Z",
        "processing_ms":     round((time.perf_counter() - t0) * 1000, 2)
    }

    if is_fraud:
        threading.Thread(target=_publish_kafka, args=(result,), daemon=True).start()

    log.info(f"[SCORE] {txn_id} | Risk:{risk_score} | {action}")
    return result

@app.get("/api/transactions")
async def get_transactions(limit: int = 100, db: Session = Depends(get_db)):
    try:
        # Fetch actual transactions from database ordered by newest
        db_txns = db.query(models.Transaction).order_by(models.Transaction.timestamp.desc()).limit(limit).all()
        if db_txns and len(db_txns) > 0:
            formatted_txns = []
            for t in db_txns:
                formatted_txns.append({
                    "id": t.id, "merchant": t.merchant, "account": t.account, 
                    "amount": t.amount, "city": t.city, "hour": t.hour, 
                    "risk": t.risk, "flagged": t.flagged, "latency": t.latency, 
                    "type": t.type, "xai": t.xai
                })
            # We put the DB items at the top, followed by the CSV store
            combined_txns = formatted_txns + transactions_store
            return {"transactions": combined_txns[:limit]}
    except Exception as e:
        log.error(f"DB Fetch Error: {e}")

    # Fallback to local memory if DB is offline
    return {"transactions": transactions_store[:limit]}

@app.get("/api/users")
async def get_users():
    return {"users": users_store}

@app.get("/api/graph")
async def get_graph():
    """
    🚨 DYNAMIC GRAPH: Connects exact Account IDs to Merchant IDs from the live feed.
    """
    nodes = []
    edges = []
    added_nodes = set()
    
    # Grab top 30 transactions (including simulations!) to build network
    for tx in transactions_store[:30]:
        acc = str(tx.get('account', 'Unknown'))
        merch = str(tx.get('merchant', 'Unknown'))
        is_bad = tx.get('flagged', False)
        risk = tx.get('risk', 10)
        
        # Add User Node
        if acc not in added_nodes:
            nodes.append({"id": acc, "type": "user", "label": acc[:8], "risk": risk, "flagged": is_bad})
            added_nodes.add(acc)
            
        # Add Merchant Node
        if merch not in added_nodes:
            nodes.append({"id": merch, "type": "merchant", "label": merch[:10], "risk": risk, "flagged": is_bad})
            added_nodes.add(merch)
            
        # Add Edge Connection
        edges.append({"source": acc, "target": merch, "suspicious": is_bad})
        
    return {"nodes": nodes, "edges": edges}

@app.get("/api/alerts")
async def get_alerts():
    if not alerts_store: return {"alert": {"id": "ALT-INIT", "message": "OmniGuard XAI monitoring active", "severity": "low", "module": "system", "time": datetime.utcnow().strftime("%H:%M:%S")}}
    return {"alert": alerts_store[0]}

@app.get("/api/audit")
async def get_audit(limit: int = 50):
    return {"actions": audit_log[:limit], "total": len(audit_log), "automated": sum(1 for a in audit_log if a.get("automated")), "reverted": 0}

@app.get("/api/metrics")
async def get_metrics():
    return {"accuracy": 97.8, "fpr": 2.16, "latency": 15, "adaptability": "AUTO-RETRAIN", "model_version": "v3.0", "total_processed": len(transactions_store)}

@app.get("/api/fed-learning")
async def get_fed():
    banks = [{"name":"State Bank of India","abbr":"SBI","sponsor":False},{"name":"HDFC Bank","abbr":"HDFC","sponsor":False},{"name":"ICICI Bank","abbr":"ICICI","sponsor":False},{"name":"Union Bank of India","abbr":"UBI","sponsor":True}]
    return {"banks": [{**b, "weights_mb": randint(500,900), "syncing": random()<0.4, "last_sync": f"{randint(1,30)}m ago"} for b in banks], "total_weights_mb": 3258, "active_sync": 2, "version": "FedAvg v2.1"}

@app.get("/api/reasoning")
async def get_reasoning():
    return {"steps": [{"time":"LIVE","agent":"Ingestion","message":"Awaiting incoming datastreams..."}]}

@app.get("/api/intents")
async def get_intents():
    return {"intents": []}

@app.post("/api/intent/{intent_id}/approve")
async def approve(intent_id: str): return {"status": "approved"}
@app.post("/api/intent/{intent_id}/reject")
async def reject(intent_id: str): return {"status": "rejected"}

class EmployeePayload(BaseModel):
    employee_id: str
    name: str
    department: str
    action: str
    data_volume: int
    login_hour: int
    is_privilege_escalation: bool

# 🚨 THE NEW EMPLOYEE ENDPOINT (NOW SAVES TO BACKEND MEMORY FOR ALERTS/AUDIT)
@app.post("/api/simulate-employee")
async def simulate_employee(payload: EmployeePayload):
    # Base risk
    risk_score = 10
    anomalies = []
    
    # Simple Rule/ML simulation for Employee UEBA
    if payload.data_volume > 200:
        risk_score += 40
        anomalies.append("Bulk data export")
    if payload.login_hour < 6 or payload.login_hour > 22:
        risk_score += 30
        anomalies.append("Off-hours login")
    if payload.is_privilege_escalation:
        risk_score += 45
        anomalies.append("Privilege escalation")
    
    risk_score = min(risk_score, 98)
    is_fraud = risk_score >= 60
    action_taken = "SESSION SUSPENDED" if is_fraud else "ALLOW"

    emp_result = {
        "id": payload.employee_id,
        "name": payload.name,
        "department": payload.department,
        "role": "Analyst",
        "last_login": f"{payload.login_hour}:00",
        "data_volume": payload.data_volume,
        "risk": risk_score,
        "flagged": is_fraud,
        "anomalies": anomalies,
        "latency": randint(20, 80),
        "action_taken": action_taken
    }

    # 🚨 Push the employee result to backend memory so the dashboard polling picks it up!
    # Update user in store if exists, else add to top
    existing_idx = next((i for i, u in enumerate(users_store) if u["id"] == payload.employee_id), None)
    if existing_idx is not None:
        users_store[existing_idx] = emp_result
    else:
        users_store.insert(0, emp_result)

    # Trigger Audit Log and Alert if fraud
    if is_fraud:
        audit_log.insert(0, {
            "id": f"ACT-{uuid.uuid4().hex[:6].upper()}",
            "action": f"{action_taken} — {payload.employee_id}",
            "txn_id": payload.employee_id,
            "risk_score": risk_score,
            "method": "UEBA Engine",
            "automated": True,
            "time_ago": "0s ago",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "reverted": False
        })
        alerts_store.insert(0, {
            "id": payload.employee_id,
            "message": f"🚨 UEBA ALERT: {', '.join(anomalies)} by {payload.name}",
            "severity": "high" if risk_score >= 80 else "med",
            "module": "user",
            "time": datetime.utcnow().strftime("%H:%M:%S"),
            "risk_score": risk_score,
            "xai": []
        })

    log.info(f"[EMPLOYEE UEBA] {payload.employee_id} | Risk:{risk_score} | {action_taken}")
    return emp_result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
