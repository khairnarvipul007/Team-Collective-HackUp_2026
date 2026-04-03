"""
OmniGuard XAI — Banking Fraud Intelligence API
FastAPI backend · Union Bank of India Hackathon Prototype
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
from datetime import datetime, timedelta

app = FastAPI(title="OmniGuard XAI API", version="2.4.1")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ── Reference Data ─────────────────────────────────────────────────────────
PAYEES = ["NEFT Transfer","RTGS Payment","ATM Cash","POS Terminal","Online Banking",
          "Cheque Deposit","Unknown Payee","Crypto Gateway","Shell Company Ltd","Offshore Account"]
CITIES = ["Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad","Dubai","Singapore"]
DEPARTMENTS = ["Core Banking","Treasury","Loan Processing","IT Admin","Branch Operations",
               "Audit & Compliance","Risk Management","Customer Service","HR","Finance"]
EMP_NAMES = [
    "Arun Kumar","Sunita Sharma","Rajesh Patel","Priya Mehta","Vikram Nair",
    "Anita Singh","Suresh Reddy","Kavya Iyer","Amit Joshi","Deepa Rao",
    "Rohit Gupta","Meera Bhat","Sanjay Desai","Pooja Malhotra","Nikhil Tiwari",
    "Renu Verma","Aditya Krishnan","Swati Pandey","Manoj Dubey","Lakshmi Pillai",
]
INDIAN_BANKS = [
    {"name": "State Bank of India",    "abbr": "SBI",  "sponsor": False},
    {"name": "HDFC Bank",              "abbr": "HDFC", "sponsor": False},
    {"name": "ICICI Bank",             "abbr": "ICICI","sponsor": False},
    {"name": "Union Bank of India",    "abbr": "UBI",  "sponsor": True},
    {"name": "Punjab National Bank",   "abbr": "PNB",  "sponsor": False},
    {"name": "Bank of Baroda",         "abbr": "BOB",  "sponsor": False},
]
ALERT_POOL = [
    {"message":"TXN-88231 ₹8,74,000 to Offshore Account at 2:14 AM", "severity":"high","module":"transaction"},
    {"message":"EMP-2004 (Treasury) bulk export 612 MB at 1:47 AM",   "severity":"high","module":"user"},
    {"message":"TXN-88198 risk 94 — Crypto Gateway, UBI-87654321",    "severity":"high","module":"transaction"},
    {"message":"EMP-2007 privilege escalation on Core Banking module", "severity":"high","module":"user"},
    {"message":"TXN-88045 geo anomaly: Mumbai → Dubai, 2,400km",       "severity":"med", "module":"transaction"},
    {"message":"EMP-2011 off-hours login 3:22 AM (baseline 9 AM)",     "severity":"med", "module":"user"},
    {"message":"EMP-2002 accessed 8 restricted modules (baseline 3)",  "severity":"high","module":"user"},
    {"message":"TXN-88312 velocity: 5 txns in 90 seconds, same IP",   "severity":"high","module":"transaction"},
    {"message":"TXN-88401 Shell Company Ltd ₹15,00,000 flagged",       "severity":"high","module":"transaction"},
    {"message":"EMP-2015 unauthorised account mod in Loan Processing", "severity":"high","module":"user"},
]

_alert_idx = 0

# ── Helpers ────────────────────────────────────────────────────────────────
def xai_txn(is_fraud, amount, hour, payee, city):
    if not is_fraud: return []
    f = []
    if amount > 100000: f.append({"label":"Mouse Trajectory Deviation",  "value":48,"direction":"risk"})
    if hour < 6:        f.append({"label":"IP Geolocation Distance",     "value":35,"direction":"risk"})
    if any(x in payee for x in ["Unknown","Crypto","Shell","Offshore"]):
                        f.append({"label":"Graph Cluster Proximity",     "value":28,"direction":"risk"})
    if city in ["Dubai","Singapore"]:
                        f.append({"label":"Time of Day Anomaly",         "value":22,"direction":"risk"})
    f.append({"label":"Device Fingerprint Match","value":8,"direction":"safe"})
    f.append({"label":"Transaction Amount",       "value":6,"direction":"safe"})
    return f[:6]

def xai_user(is_rogue, off_hours, data_vol, priv_esc, norm_vol):
    if not is_rogue: return []
    f = []
    if off_hours:                  f.append({"label":"Login Hour Deviation",       "value":42,"direction":"risk"})
    if data_vol > norm_vol * 5:    f.append({"label":"Data Export Volume Spike",   "value":35,"direction":"risk"})
    if priv_esc:                   f.append({"label":"Privilege Escalation Attempt","value":30,"direction":"risk"})
    f.append({"label":"Module Access Pattern",         "value":20,"direction":"risk"})
    f.append({"label":"Device Fingerprint Match",      "value": 9,"direction":"safe"})
    f.append({"label":"Historical Clean Record",       "value": 5,"direction":"safe"})
    return f[:6]

def make_transactions(n=100):
    now = datetime.now()
    rows = []
    for i in range(n):
        fraud  = random.random() < 0.13
        p_idx  = random.randint(6,9) if fraud else random.randint(0,5)
        amt    = random.randint(100000,2500000) if fraud else random.randint(500,80000)
        hr     = random.randint(1,4)  if fraud else random.randint(8,20)
        city   = random.choice(["Dubai","Singapore"]) if fraud else random.choice(CITIES[:6])
        payee  = PAYEES[p_idx]
        rows.append({
            "id":       f"TXN-{88000+i}",
            "merchant": payee,
            "amount":   amt,
            "avg_amount": random.randint(20000,60000),
            "city":     city,
            "hour":     hr,
            "risk":     random.randint(72,97) if fraud else random.randint(3,35),
            "flagged":  fraud,
            "time":     (now-timedelta(minutes=(n-i)*3)).strftime("%H:%M:%S"),
            "type":     random.choice(["Credential Stuffing","Account Takeover"]) if fraud else "Normal",
            "latency":  random.randint(12,95),
            "account":  f"UBI-{random.randint(10000000,99999999)}",
            "branch":   random.choice(["Mumbai Main","Delhi CP","Bangalore MG Road","Chennai Anna Nagar"]),
            "xai":      xai_txn(fraud,amt,hr,payee,city),
        })
    return rows[::-1]

def make_users(n=20):
    rows = []
    for i, name in enumerate(EMP_NAMES[:n]):
        rogue   = random.random() < 0.28
        norm_hr = random.randint(9,11)
        norm_dv = random.randint(10,25)
        priv    = rogue and random.random() > 0.5
        off_hr  = rogue
        dv      = random.randint(400,1200) if rogue else random.randint(5,40)
        rows.append({
            "id":             f"EMP-{2000+i}",
            "name":           name,
            "department":     DEPARTMENTS[i % len(DEPARTMENTS)],
            "role":           random.choice(["Manager","Officer","Analyst","Admin","Supervisor"]),
            "employee_id":    f"UBI{random.randint(10000,99999)}",
            "normal_login_hour": norm_hr,
            "last_login":     f"{random.randint(1,3):02d}:{random.randint(0,59):02d} AM" if rogue else f"{norm_hr}:{random.randint(0,59):02d} AM",
            "normal_data_vol":norm_dv,
            "data_volume":    dv,
            "privilege_escalation": priv,
            "off_hours_access": off_hr,
            "modules_normal": 3,
            "modules_accessed": random.randint(6,12) if rogue else random.randint(2,4),
            "risk":           random.randint(68,95) if rogue else random.randint(3,28),
            "flagged":        rogue,
            "anomalies":      [a for a in ["Off-hours login","Bulk data export","Privilege escalation"] if random.random()>0.35] if rogue else [],
            "activity":       [{"hour":f"{h+8}:00","events": random.randint(20,60) if (rogue and h<2) else random.randint(0,15)} for h in range(8)],
            "latency":        random.randint(15,75),
            "xai":            xai_user(rogue,off_hr,dv,priv,norm_dv),
            "branch":         random.choice(["Head Office Mumbai","Zonal Office Delhi","Regional Office Bangalore"]),
        })
    return rows

def make_graph():
    nodes, edges = [], []
    users = make_users(12)
    for u in users:
        nodes.append({"id":f"u_{u['id']}","type":"user","label":u["name"].split()[0],"risk":u["risk"],"flagged":u["flagged"]})
    for i in range(14):
        nodes.append({"id":f"d_{i}","type":"device","label":f"DEV-{i}","risk":random.randint(5,90),"flagged":random.random()<0.2})
    for i,p in enumerate(PAYEES[:8]):
        nodes.append({"id":f"m_{i}","type":"merchant","label":p.split()[0],"risk":random.randint(5,80),"flagged":i>=6})
    uids  = [n["id"] for n in nodes if n["type"]=="user"]
    dids  = [n["id"] for n in nodes if n["type"]=="device"]
    mids  = [n["id"] for n in nodes if n["type"]=="merchant"]
    for uid in uids:
        for _ in range(random.randint(1,2)):
            edges.append({"source":uid,"target":random.choice(dids),"suspicious":random.random()<0.2})
    for did in dids[:10]:
        edges.append({"source":did,"target":random.choice(mids),"suspicious":random.random()<0.25})
    return {"nodes":nodes,"edges":edges}

# ── Startup data ───────────────────────────────────────────────────────────
_txns   = make_transactions()
_users  = make_users()
_graph  = make_graph()
_intents = [
    {"id":"TX-88492","action":"Freeze account and initiate step-up biometric verification",
     "confidence":78,"severity":"high","status":"pending",
     "reasons":["Account linked to 3 known compromised nodes","Transaction to newly established vendor (< 30 days)","Geographic anomaly: 2,400km from typical location"]},
    {"id":"TX-91203","action":"Request additional identity verification via SMS OTP",
     "confidence":65,"severity":"med","status":"pending",
     "reasons":["Unusual transaction time (3:42 AM local)","Device fingerprint partially matches known fraud ring"]},
    {"id":"EMP-2004","action":"Suspend session and notify CISO for privileged user investigation",
     "confidence":89,"severity":"high","status":"pending",
     "reasons":["Bulk export 612MB customer data at 1:47 AM","Privilege escalation attempt on Core Banking module","IP matches external proxy server"]},
]
_audit = [
    {"id":f"ACT-{1000+i}","action":random.choice(["Alert dispatched","Account frozen","SMS OTP triggered","Case escalated","Report filed"]),
     "txn_id":f"TXN-{random.randint(88000,88100)}","method":"Detection" if random.random()>0.3 else "Manual",
     "automated":random.random()>0.3,"time_ago":f"{i*2}m ago" if i>0 else "0s ago","reverted":False}
    for i in range(20)
]
_reasoning = [
    {"time":"21:27:38","agent":"Ingestion",    "message":"Transaction TXN-88492 received. Running feature extraction pipeline."},
    {"time":"21:27:40","agent":"Ingestion",    "message":"Behavioural pattern analysis complete. 4 anomalies detected."},
    {"time":"21:27:42","agent":"Policy",       "message":"Risk threshold breached (score 87). Escalating to Verification agent."},
    {"time":"21:27:44","agent":"Verification", "message":"Graph cluster proximity check initiated."},
    {"time":"21:27:46","agent":"Verification", "message":"Node linked to 3 compromised accounts in active fraud ring."},
    {"time":"21:27:48","agent":"Policy",       "message":"SHAP attribution computed. Top factor: Mouse Trajectory Deviation (48%)."},
    {"time":"21:27:50","agent":"Action",       "message":"Intent generated: Freeze account + step-up biometric. Awaiting human approval."},
]

# ── Routes ─────────────────────────────────────────────────────────────────
@app.get("/api/transactions")
def get_transactions():
    return {"transactions":_txns,"total":len(_txns),"flagged":sum(1 for t in _txns if t["flagged"])}

@app.get("/api/users")
def get_users():
    return {"users":_users,"total":len(_users),"flagged":sum(1 for u in _users if u["flagged"])}

@app.get("/api/graph")
def get_graph():
    return _graph

@app.get("/api/metrics")
def get_metrics():
    return {"accuracy":97.8,"fpr":2.16,"latency":15,"model_version":"v2.4.1",
            "total_processed_today":random.randint(12000,15000),
            "alerts_today":random.randint(24,35),"adaptability":"AUTO-RETRAIN","fed_avg_version":"FedAvg v2.1","active_nodes":2}

@app.get("/api/alerts")
def get_alerts():
    global _alert_idx
    _alert_idx += 1
    item = ALERT_POOL[_alert_idx % len(ALERT_POOL)]
    return {"alert":{**item,"id":f"ALT-{_alert_idx}","time":datetime.now().strftime("%H:%M:%S")}}

@app.get("/api/audit")
def get_audit():
    return {"actions":_audit,"total":len(_audit),"automated":sum(1 for a in _audit if a["automated"]),"reverted":0}

@app.get("/api/intents")
def get_intents():
    return {"intents":[i for i in _intents if i["status"]=="pending"]}

@app.post("/api/intent/{intent_id}/approve")
def approve_intent(intent_id: str):
    for intent in _intents:
        if intent["id"]==intent_id:
            intent["status"]="approved"
            _audit.insert(0,{"id":f"ACT-{random.randint(9000,9999)}","action":intent["action"][:45]+"…",
                              "txn_id":intent_id,"method":"Agentic","automated":True,"time_ago":"0s ago","reverted":False})
    return {"status":"approved"}

@app.post("/api/intent/{intent_id}/reject")
def reject_intent(intent_id: str):
    for intent in _intents:
        if intent["id"]==intent_id: intent["status"]="rejected"
    return {"status":"rejected"}

@app.get("/api/fed-learning")
def get_fed_learning():
    banks = [{"name":b["name"],"abbr":b["abbr"],"sponsor":b["sponsor"],
              "weights_mb":random.randint(500,900),"syncing":random.random()<0.4,
              "last_sync":f"{random.randint(1,30)}m ago"} for b in INDIAN_BANKS]
    return {"banks":banks,"total_weights_mb":3258,"active_sync":2,"version":"FedAvg v2.1"}

@app.get("/api/reasoning")
def get_reasoning():
    return {"steps":_reasoning}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)