"""
OmniGuard XAI — Dual-Dataset ML Training Pipeline
=================================================
Generates TWO distinct enterprise datasets:
  1. Internal Employee Logs (CERT style) -> Saved as an artifact for the judges.
  2. External Transactions (PaySim style) -> Trains the XGBoost/IsoForest models.

Run:
    pip install pandas scikit-learn xgboost joblib numpy
    python train.py

Output:
    data/internal_employee_logs.csv
    data/external_transactions.csv
    models/iso_model.pkl
    models/xgb_model.pkl
    models/scaler.pkl
    models/features.pkl
"""

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import xgboost as xgb

# ─── Config ───────────────────────────────────────────────────────────────────
np.random.seed(42)
N           = 10_000       # Total transactions
N_EMPLOYEES = 2_000        # Total employee logs
FRAUD_RATE  = 0.05         # 5% fraud
MODEL_DIR   = "models"
DATA_DIR    = "data"

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# ─── Feature list (must match API input exactly) ──────────────────────────────
FEATURES = [
    "amount",           # Transaction amount in INR
    "hour",             # Hour of day (0–23)
    "latency",          # Detection latency in ms
    "distance_km",      # Geo-distance from user's baseline location
    "velocity",         # Number of transactions in last 10 minutes
    "is_new_beneficiary" # 1 if payee added < 30 days ago
]

print("=" * 60)
print("OMNIGUARD XAI — Dual-Dataset Training Pipeline")
print("=" * 60)

# ══════════════════════════════════════════════════════════════════════════════
# DATASET 1: INTERNAL EMPLOYEE LOGS (CERT Style) - Artifact for Judges
# ══════════════════════════════════════════════════════════════════════════════
print(f"\n[DATA 1] Generating {N_EMPLOYEES:,} Internal Employee Logs (CERT Style)...")
n_rogue = int(N_EMPLOYEES * FRAUD_RATE)
n_normal_emp = N_EMPLOYEES - n_rogue

emp_normal = pd.DataFrame({
    "employee_id": [f"UBI-{np.random.randint(1000, 9999)}" for _ in range(n_normal_emp)],
    "department": np.random.choice(["Retail", "Treasury", "IT", "HR", "Audit"], size=n_normal_emp),
    "login_hour": np.random.normal(9, 2, size=n_normal_emp).clip(7, 18).astype(int),
    "data_downloaded_mb": np.random.exponential(15, size=n_normal_emp).clip(1, 50),
    "restricted_access_attempts": np.random.poisson(0.1, size=n_normal_emp),
    "is_insider_threat": 0
})

emp_rogue = pd.DataFrame({
    "employee_id": [f"UBI-{np.random.randint(1000, 9999)}" for _ in range(n_rogue)],
    "department": np.random.choice(["Retail", "Treasury", "IT", "HR", "Audit"], size=n_rogue),
    "login_hour": np.random.choice([2, 3, 4, 23], size=n_rogue), 
    "data_downloaded_mb": np.random.normal(800, 200, size=n_rogue).clip(300, 2000), 
    "restricted_access_attempts": np.random.poisson(4, size=n_rogue), 
    "is_insider_threat": 1
})

df_employees = pd.concat([emp_normal, emp_rogue]).sample(frac=1, random_state=42).reset_index(drop=True)
df_employees.to_csv(f"{DATA_DIR}/internal_employee_logs.csv", index=False)
print(f"✅ Saved to {DATA_DIR}/internal_employee_logs.csv")

# ══════════════════════════════════════════════════════════════════════════════
# DATASET 2: EXTERNAL TRANSACTIONS (PaySim Style) - Trains the Live API
# ══════════════════════════════════════════════════════════════════════════════
n_fraud = int(N * FRAUD_RATE)
n_legit = N - n_fraud

print(f"\n[DATA 2] Generating {N:,} External Transactions ({n_fraud} fraud, {n_legit} legit)...")

# Legitimate transaction patterns
legit = pd.DataFrame({
    "amount":             np.random.lognormal(mean=8.0, sigma=1.2, size=n_legit).clip(100, 200_000),
    "hour":               np.random.choice(np.arange(8, 22), size=n_legit),
    "latency":            np.random.normal(loc=45, scale=15, size=n_legit).clip(10, 120),
    "distance_km":        np.random.exponential(scale=80, size=n_legit).clip(0, 500),
    "velocity":           np.random.poisson(lam=2, size=n_legit).clip(0, 10),
    "is_new_beneficiary": np.random.choice([0, 1], size=n_legit, p=[0.85, 0.15]),
    "label": 0
})

# Fraudulent transaction patterns — massive amounts at odd hours, far away
fraud = pd.DataFrame({
    "amount":             np.random.lognormal(mean=12.5, sigma=0.8, size=n_fraud).clip(500_000, 5_000_000),
    "hour":               np.random.choice([0, 1, 2, 3, 4, 23], size=n_fraud),
    "latency":            np.random.normal(loc=190, scale=40, size=n_fraud).clip(100, 400),
    "distance_km":        np.random.normal(loc=3500, scale=800, size=n_fraud).clip(2000, 8000),
    "velocity":           np.random.poisson(lam=8, size=n_fraud).clip(5, 20),
    "is_new_beneficiary": np.random.choice([0, 1], size=n_fraud, p=[0.1, 0.9]),
    "label": 1
})

# Shuffle and split
df = pd.concat([legit, fraud]).sample(frac=1, random_state=42).reset_index(drop=True)
df.to_csv(f"{DATA_DIR}/external_transactions.csv", index=False)
print(f"✅ Saved to {DATA_DIR}/external_transactions.csv")

X  = df[FEATURES]
y  = df["label"]

print(f"\n[DATA] Dataset ready: {len(df):,} rows | "
      f"Fraud: {y.sum()} ({y.mean()*100:.1f}%) | "
      f"Legit: {(y==0).sum()} ({(y==0).mean()*100:.1f}%)")

# ─── Step 2: Train Isolation Forest (Unsupervised) ───────────────────────────
print("\n[ISO]  Training IsolationForest (n_estimators=200)...")

scaler   = StandardScaler()
X_scaled = scaler.fit_transform(X)

iso = IsolationForest(
    n_estimators=200,
    contamination=FRAUD_RATE,
    max_features=len(FEATURES),
    bootstrap=False,
    random_state=42,
    n_jobs=-1
)
iso.fit(X_scaled)

# Quick eval on fraud subset
iso_preds = iso.predict(X_scaled)
iso_fraud_detected = (iso_preds[y == 1] == -1).mean()
print(f"[ISO]  Anomaly recall on fraud: {iso_fraud_detected*100:.1f}%")

# ─── Step 3: Train XGBoost (Supervised) ──────────────────────────────────────
print("\n[XGB]  Training XGBClassifier (n_estimators=300)...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

xgb_model = xgb.XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,
    gamma=0.1,
    reg_alpha=0.1,
    reg_lambda=1.0,
    scale_pos_weight=(n_legit / n_fraud),   # Handle class imbalance
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1
)

xgb_model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False
)

y_pred      = xgb_model.predict(X_test)
y_prob      = xgb_model.predict_proba(X_test)[:, 1]
roc_auc     = roc_auc_score(y_test, y_prob)

print(f"[XGB]  ROC-AUC: {roc_auc:.4f}")
print(f"\n[XGB]  Classification Report:\n")
print(classification_report(y_test, y_pred, target_names=["Legit", "Fraud"]))

# Feature importance
importances = xgb_model.feature_importances_
print("[XGB]  Feature Importances:")
for feat, imp in sorted(zip(FEATURES, importances), key=lambda x: -x[1]):
    print(f"       {feat:<25} {imp:.4f}")

# ─── Step 4: Save Everything ──────────────────────────────────────────────────
print(f"\n[SAVE] Saving models to ./{MODEL_DIR}/...")

joblib.dump(iso,       f"{MODEL_DIR}/iso_model.pkl")
joblib.dump(xgb_model, f"{MODEL_DIR}/xgb_model.pkl")
joblib.dump(scaler,    f"{MODEL_DIR}/scaler.pkl")
joblib.dump(FEATURES,  f"{MODEL_DIR}/features.pkl")

print(f"[SAVE] iso_model.pkl  → IsolationForest")
print(f"[SAVE] xgb_model.pkl  → XGBClassifier")
print(f"[SAVE] scaler.pkl     → StandardScaler (for ISO preprocessing)")
print(f"[SAVE] features.pkl   → Feature name list")

print("\n" + "=" * 60)
print("Training Complete! Run the backend: uvicorn main:app --reload")
print("=" * 60)