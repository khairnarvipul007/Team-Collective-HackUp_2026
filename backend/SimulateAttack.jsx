/**
 * OmniGuard XAI — React Frontend Integration
 * ============================================
 * Paste these pieces into your existing App.jsx
 *
 * What this does:
 *   1. triggerAttackSimulation() — builds a malicious payload and POSTs to FastAPI
 *   2. The response is formatted as a live alert and prepended to the alerts feed
 *   3. A red "SIMULATE ATTACK" button fires the function
 *   4. The Agentic Console shows the ML decision in real time
 *
 * SETUP:
 *   - Backend must be running: python -m uvicorn main:app --reload --port 8000
 *   - Add `const [mlResult, setMlResult] = useState(null);` to your App state
 *   - Add `const [isSimulating, setIsSimulating] = useState(false);` to your App state
 */

// ─── PASTE THIS INSIDE YOUR App() COMPONENT (near your other state) ──────────

const [mlResult,    setMlResult]    = useState(null);
const [isSimulating, setIsSimulating] = useState(false);

// ─── PASTE THIS FUNCTION INSIDE YOUR App() COMPONENT ─────────────────────────

/**
 * Sends a synthetic high-risk transaction to the FastAPI ML backend.
 * Mimics a real fraud pattern: massive ₹ transfer at 3 AM from Dubai.
 */
const triggerAttackSimulation = async () => {
  setIsSimulating(true);

  // ── Malicious Payload (guaranteed to trigger BLOCK) ──────────────────────
  const maliciousPayload = {
    amount:             2_750_000,   // ₹27.5L — massive transfer
    hour:               3,           // 3 AM — deep off-hours
    latency:            245,         // 245ms — VPN/proxy signature
    distance_km:        4200,        // 4,200km — geographically impossible
    velocity:           9,           // 9 txns in 10 min — velocity attack
    is_new_beneficiary: 1,           // First-time payee
    account_id:         `UBI-${Math.floor(Math.random() * 90000000) + 10000000}`,
    branch:             "Mumbai Main",
    merchant:           "Offshore Account",
  };

  try {
    const response = await fetch("http://localhost:8000/api/simulate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(maliciousPayload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // ── Store ML result for display ─────────────────────────────────────
    setMlResult(data);

    // ── Format as a live alert and prepend to alerts feed ───────────────
    const newAlert = {
      id:       data.transaction_id,
      message:  `🚨 ATTACK DETECTED — ${data.transaction_id} | ` +
                `Risk: ${data.risk_score}/100 | ` +
                `XGB: ${(data.xgb_fraud_prob * 100).toFixed(1)}% | ` +
                `ISO: ${(data.iso_anomaly_score * 100).toFixed(1)}% | ` +
                `Action: ${data.action_taken}`,
      severity: data.risk_score >= 70 ? "high" : "med",
      module:   "transaction",
      time:     new Date().toLocaleTimeString(),
      xai:      data.xai_factors,
    };

    // Prepend to your existing alerts state
    setAlerts(prev => [newAlert, ...prev].slice(0, 14));

    // ── Also add to audit log ────────────────────────────────────────────
    if (data.action_taken !== "ALLOW") {
      setAudit(prev => ({
        ...prev,
        total:     prev.total + 1,
        automated: prev.automated + 1,
        actions: [{
          id:        `ACT-${Date.now()}`,
          action:    `${data.action_taken} — ${data.transaction_id}`,
          txn_id:    data.transaction_id,
          method:    "ML Ensemble",
          automated: true,
          time_ago:  "0s ago",
          reverted:  false,
        }, ...prev.actions],
      }));
    }

    console.log("[OmniGuard] Simulation result:", data);

  } catch (err) {
    console.error("[OmniGuard] Simulation failed:", err);

    // Graceful fallback — show error alert
    const errorAlert = {
      id:       `ERR-${Date.now()}`,
      message:  "⚠️ Backend offline — run: python -m uvicorn main:app --port 8000",
      severity: "med",
      module:   "system",
      time:     new Date().toLocaleTimeString(),
    };
    setAlerts(prev => [errorAlert, ...prev].slice(0, 14));
  } finally {
    setIsSimulating(false);
  }
};


// ─── PASTE THIS JSX WHERE YOU WANT THE BUTTON ─────────────────────────────────
// (Suggested: in your header bar, next to the bell icon)

const SimulateButton = () => (
  <button
    onClick={triggerAttackSimulation}
    disabled={isSimulating}
    style={{
      background:    isSimulating ? "#7f1d1d" : "linear-gradient(135deg, #ff3366, #cc0033)",
      border:        "1px solid #ff336677",
      color:         "#fff",
      padding:       "6px 14px",
      borderRadius:  7,
      cursor:        isSimulating ? "not-allowed" : "pointer",
      fontSize:      11,
      fontWeight:    800,
      fontFamily:    "monospace",
      letterSpacing: 1,
      display:       "flex",
      alignItems:    "center",
      gap:           6,
      opacity:       isSimulating ? 0.7 : 1,
      transition:    "all 0.2s",
      boxShadow:     isSimulating ? "none" : "0 0 12px #ff336644",
      animation:     isSimulating ? "none" : "pulse 2s infinite",
    }}
  >
    {isSimulating ? "⏳ SCORING..." : "🚨 SIMULATE ATTACK"}
  </button>
);


// ─── PASTE THIS JSX TO SHOW THE ML RESULT PANEL ───────────────────────────────
// (Suggested: in your Case Detail / right sidebar)

const MLResultPanel = () => {
  if (!mlResult) return null;
  return (
    <div style={{
      background:   "#0d0d1f",
      border:       `1px solid ${mlResult.risk_score >= 70 ? "#ff336655" : "#ffaa0055"}`,
      borderRadius: 8,
      padding:      "12px 14px",
      margin:       "8px 0",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "#00d4ff", letterSpacing: 2 }}>
          LIVE ML RESULT
        </span>
        <span style={{
          fontSize:   9, fontFamily: "monospace",
          background: mlResult.risk_score >= 70 ? "#ff336622" : "#ffaa0022",
          color:      mlResult.risk_score >= 70 ? "#ff3366"   : "#ffaa00",
          padding:    "2px 7px", borderRadius: 10,
        }}>
          {mlResult.action_taken}
        </span>
      </div>

      {/* Score Bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "#888" }}>Blended Risk Score</span>
          <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace",
            color: mlResult.risk_score >= 70 ? "#ff3366" : mlResult.risk_score >= 40 ? "#ffaa00" : "#00ff88" }}>
            {mlResult.risk_score}/100
          </span>
        </div>
        <div style={{ background: "#1a1a2e", borderRadius: 4, height: 6, overflow: "hidden" }}>
          <div style={{
            height:     "100%",
            width:      `${mlResult.risk_score}%`,
            background: mlResult.risk_score >= 70 ? "#ff3366" : mlResult.risk_score >= 40 ? "#ffaa00" : "#00ff88",
            borderRadius: 4, transition: "width 0.6s ease",
          }} />
        </div>
      </div>

      {/* Model Scores */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[
          { label: "XGBoost",      value: `${(mlResult.xgb_fraud_prob * 100).toFixed(1)}%`, color: "#a855f7" },
          { label: "IsoForest",    value: `${(mlResult.iso_anomaly_score * 100).toFixed(1)}%`, color: "#00d4ff" },
          { label: "Latency",      value: `${mlResult.processing_ms}ms`, color: "#00ff88" },
        ].map(m => (
          <div key={m.label} style={{ flex: 1, background: "#111125", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 8, color: "#444", fontFamily: "monospace" }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: m.color, fontFamily: "monospace" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* XAI Factors */}
      <div style={{ fontSize: 9, color: "#555", fontFamily: "monospace", marginBottom: 6, letterSpacing: 2 }}>
        XAI — WHY FLAGGED
      </div>
      {Object.entries(mlResult.xai_factors || {})
        .filter(([, v]) => v.direction === "risk")
        .map(([key, factor]) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: "#ccc" }}>{factor.label}</span>
              <span style={{ fontSize: 10, color: "#ff3366", fontFamily: "monospace" }}>+{factor.contribution}pts</span>
            </div>
            <div style={{ background: "#1a1a2e", borderRadius: 3, height: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${factor.contribution}%`,
                background: "linear-gradient(90deg, #ff3366, #ff6699)",
                borderRadius: 3, transition: "width 0.5s",
              }} />
            </div>
          </div>
        ))
      }

      <div style={{ fontSize: 8, color: "#333", marginTop: 8, fontFamily: "monospace" }}>
        ID: {mlResult.transaction_id} · {mlResult.timestamp?.slice(11, 19)} UTC
      </div>
    </div>
  );
};


// ─── FULL USAGE EXAMPLE ───────────────────────────────────────────────────────
// In your return JSX:
//
//   {/* In header */}
//   <SimulateButton />
//
//   {/* In right sidebar / case detail */}
//   <MLResultPanel />
//
// ─────────────────────────────────────────────────────────────────────────────
