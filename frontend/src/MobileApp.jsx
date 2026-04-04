import { useState } from "react";

// --- EXTERNAL CUSTOMER PERSONAS ---
const CUSTOMER_PERSONAS = [
  { id: "normal_coffee", name: "Normal Nancy", type: "Everyday Payment", desc: "Buying coffee at local cafe.", payload: { amount: 350, hour: 9, latency: 15, distance_km: 2, velocity: 1, is_new_beneficiary: 0, merchant: "Starbucks", account_id: "UBI-NANCY-55", branch: "Mumbai South" }, expected: "ALLOW" },
  { id: "normal_rent", name: "Regular Rick", type: "Monthly Rent", desc: "Paying monthly house rent.", payload: { amount: 25000, hour: 11, latency: 20, distance_km: 5, velocity: 1, is_new_beneficiary: 0, merchant: "Landlord Account", account_id: "UBI-RICK-88", branch: "Delhi Central" }, expected: "ALLOW" },
  { id: "high_value", name: "Billionaire Bob", type: "High Value Transfer", desc: "Sending ₹1 Crore to suspicious payee.", payload: { amount: 10000000, hour: 3, latency: 120, distance_km: 10000, velocity: 1, is_new_beneficiary: 1, merchant: "Suspicious Beneficiary", account_id: "UBI-BOB-99", branch: "Mumbai Main" }, expected: "BLOCK" },
  { id: "geo_anomaly", name: "Traveling Tom", type: "Geographic Anomaly", desc: "Impossible travel: Mumbai to Dubai in 1 hour.", payload: { amount: 250000, hour: 2, latency: 200, distance_km: 8000, velocity: 1, is_new_beneficiary: 0, merchant: "Unknown Entity", account_id: "UBI-TOM-44", branch: "Delhi CP" }, expected: "BLOCK" },
  { id: "off_hours", name: "Nightowl Nick", type: "Off-Hours Activity", desc: "Transferring at 1:00 AM.", payload: { amount: 500000, hour: 1, latency: 45, distance_km: 1500, velocity: 1, is_new_beneficiary: 0, merchant: "Standard Payee", account_id: "UBI-NICK-22", branch: "Bangalore" }, expected: "STEP-UP MFA" },
  { id: "unusual_merchant", name: "Crypto Chris", type: "Unusual Merchant", desc: "Buying crypto at high risk.", payload: { amount: 750000, hour: 14, latency: 60, distance_km: 3500, velocity: 2, is_new_beneficiary: 1, merchant: "High-Risk Crypto", account_id: "UBI-CHRIS-77", branch: "Chennai" }, expected: "STEP-UP MFA" },
  { id: "new_beneficiary", name: "Gullible Gary", type: "New Beneficiary", desc: "Large transfer to recently added payee.", payload: { amount: 1500000, hour: 10, latency: 30, distance_km: 500, velocity: 1, is_new_beneficiary: 1, merchant: "New Payee", account_id: "UBI-GARY-11", branch: "Mumbai" }, expected: "STEP-UP MFA" },
  { id: "account_takeover", name: "Hacker Harry", type: "Account Takeover", desc: "Typical ATO pattern from new device.", payload: { amount: 300000, hour: 23, latency: 180, distance_km: 12000, velocity: 4, is_new_beneficiary: 1, merchant: "Hacker Account", account_id: "UBI-VICTIM-00", branch: "Kolkata" }, expected: "BLOCK" },
  { id: "synthetic_id", name: "Fake Fred", type: "Synthetic Identity", desc: "Mixed real/fake info application.", payload: { amount: 2000000, hour: 4, latency: 150, distance_km: 9000, velocity: 1, is_new_beneficiary: 1, merchant: "Fake Identity", account_id: "UBI-FAKE-66", branch: "Delhi" }, expected: "BLOCK" },
  { id: "velocity", name: "Spammer Sam", type: "Velocity Attack", desc: "15 rapid transactions from same IP.", payload: { amount: 100000, hour: 15, latency: 25, distance_km: 2000, velocity: 15, is_new_beneficiary: 0, merchant: "Payment Gateway", account_id: "UBI-SAM-33", branch: "Pune" }, expected: "STEP-UP MFA" }
];

// --- INTERNAL EMPLOYEE PERSONAS ---
const EMPLOYEE_PERSONAS = [
  { id: "emp_normal", name: "Alice (Analyst)", type: "Normal Access", desc: "Checking few records during day.", payload: { employee_id: "UBI-EMP-001", name: "Alice Smith", department: "Retail Banking", action: "Viewed Profile", data_volume: 15, login_hour: 10, is_privilege_escalation: false }, expected: "ALLOW" },
  { id: "emp_export", name: "Bob (Data Thief)", type: "Bulk Data Export", desc: "Exporting 850MB of customer data.", payload: { employee_id: "UBI-EMP-002", name: "Bob Jones", department: "Treasury", action: "Database Export", data_volume: 850, login_hour: 14, is_privilege_escalation: false }, expected: "SUSPEND" },
  { id: "emp_offhours", name: "Charlie (Night Owl)", type: "Off-Hours Login", desc: "Accessing core banking at 2 AM.", payload: { employee_id: "UBI-EMP-003", name: "Charlie Brown", department: "Loan Processing", action: "Accessed Vault", data_volume: 5, login_hour: 2, is_privilege_escalation: false }, expected: "SUSPEND" },
  { id: "emp_privilege", name: "Diana (Rogue Admin)", type: "Privilege Escalation", desc: "Modifying IAM roles illegally.", payload: { employee_id: "UBI-EMP-004", name: "Diana Prince", department: "IT Admin", action: "Changed IAM Roles", data_volume: 20, login_hour: 11, is_privilege_escalation: true }, expected: "SUSPEND" },
  { id: "emp_txn", name: "Eve (Corrupt Manager)", type: "Unauthorized Mod", desc: "Changing transaction limits.", payload: { employee_id: "UBI-EMP-005", name: "Eve Davis", department: "Risk Management", action: "Modified Thresholds", data_volume: 150, login_hour: 23, is_privilege_escalation: true }, expected: "SUSPEND" }
];

export default function MobileApp() {
  const [appMode, setAppMode] = useState("home"); // 'home', 'customer', 'employee'
  const [activeUser, setActiveUser] = useState(null);
  const [status, setStatus] = useState("idle"); 
  const [mlResult, setMlResult] = useState(null);

  const handleAction = async () => {
    setStatus("loading");
    try {
      const endpoint = appMode === "customer" ? "/api/simulate" : "/api/simulate-employee";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeUser.payload)
      });
      
      const data = await res.json();
      setMlResult(data);
      
      // BROADCAST MESSAGE TO SOC DASHBOARD
      const channel = new BroadcastChannel('omniguard_sync');
      channel.postMessage({
        type: appMode === "customer" ? 'INJECT_ATTACK' : 'INJECT_EMPLOYEE',
        payload: activeUser.payload,
        result: data,
        attackName: activeUser.type
      });
      channel.close();

      // UI Update
      if (data.action_taken === "BLOCK" || data.action_taken === "SESSION SUSPENDED") setStatus("blocked");
      else if (data.action_taken === "STEP-UP MFA") setStatus("mfa");
      else setStatus("success"); 
      
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const reset = () => { setStatus("idle"); setActiveUser(null); };

  // --- SCREEN 0: PORTAL SELECTION ---
  if (appMode === "home") {
    return (
      <div style={{ height: "100vh", background: "#f4f4f9", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "sans-serif" }}>
        <div style={{ width: 375, height: 800, background: "#fff", borderRadius: 40, boxShadow: "0 25px 50px rgba(0,0,0,0.2)", overflow: "hidden", position: "relative", border: "8px solid #111", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#111", color: "#fff", padding: "60px 20px 40px", textAlign: "center" }}>
            <h1 style={{ margin: 0, letterSpacing: 2 }}>UBI PORTALS</h1>
            <p style={{ color: "#aaa", fontSize: 12, marginTop: 10 }}>Select operating environment</p>
          </div>
          <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 20, justifyContent: "center" }}>
            
            <button onClick={() => setAppMode("customer")} style={{ padding: 30, background: "#0056b3", color: "#fff", border: "none", borderRadius: 15, cursor: "pointer", boxShadow: "0 10px 20px rgba(0,86,179,0.3)" }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>📱</div>
              <h2 style={{ margin: 0 }}>Customer Banking App</h2>
              <div style={{ fontSize: 11, marginTop: 5, color: "#99c2ff" }}>Simulate External Transactions</div>
            </button>

            <button onClick={() => setAppMode("employee")} style={{ padding: 30, background: "#a855f7", color: "#fff", border: "none", borderRadius: 15, cursor: "pointer", boxShadow: "0 10px 20px rgba(168,85,247,0.3)" }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>💻</div>
              <h2 style={{ margin: 0 }}>Employee Terminal</h2>
              <div style={{ fontSize: 11, marginTop: 5, color: "#e9d5ff" }}>Simulate Internal Insider Threats</div>
            </button>

          </div>
        </div>
      </div>
    );
  }

  const isEmp = appMode === "employee";
  const headerColor = isEmp ? "#a855f7" : "#0056b3";
  const personasList = isEmp ? EMPLOYEE_PERSONAS : CUSTOMER_PERSONAS;

  return (
    <div style={{ height: "100vh", background: "#f4f4f9", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "sans-serif" }}>
      <div style={{ width: 375, height: 800, background: "#fff", borderRadius: 40, boxShadow: "0 25px 50px rgba(0,0,0,0.2)", overflow: "hidden", position: "relative", border: "8px solid #111" }}>
        
        {/* HEADER */}
        <div style={{ background: headerColor, color: "#fff", padding: "40px 20px 20px", display: "flex", alignItems: "center" }}>
          <button onClick={() => setAppMode("home")} style={{ background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}>‹</button>
          <div style={{ flex: 1, textAlign: "center", fontWeight: "bold", fontSize: 18 }}>
            {isEmp ? "Internal Terminal" : "Mobile Banking"}
          </div>
          <div style={{ width: 24 }}></div>
        </div>

        <div style={{ padding: 20, height: "calc(100% - 80px)", overflowY: "auto" }}>
          
          {/* SCREEN 1: SELECT PERSONA */}
          {!activeUser && (
            <div>
              <h3 style={{ marginTop: 0, color: "#333" }}>Select Scenario</h3>
              {personasList.map(p => (
                <div key={p.id} onClick={() => setActiveUser(p)} style={{ background: "#fff", border: "1px solid #ddd", padding: 15, borderRadius: 10, marginBottom: 10, cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontWeight: "bold", color: headerColor }}>{p.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <div style={{ fontSize: 12, color: p.expected === "ALLOW" ? "#28a745" : "#d9534f", fontWeight: "bold" }}>{p.type}</div>
                    <div style={{ fontSize: 9, background: p.expected === "ALLOW" ? "#e6f4ea" : "#fee", color: p.expected === "ALLOW" ? "#28a745" : "#d9534f", padding: "2px 6px", borderRadius: 4 }}>Expected: {p.expected}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* SCREEN 2: CONFIRMATION */}
          {activeUser && status === "idle" && (
            <div>
              <button onClick={reset} style={{ background: "none", border: "none", color: headerColor, fontWeight: "bold", cursor: "pointer", padding: "0 0 20px 0" }}>← Back</button>
              <h2 style={{ margin: 0, color: "#333" }}>{isEmp ? "Execute Action" : "Confirm Payment"}</h2>
              
              <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 10, marginTop: 20, textAlign: "center", border: "1px solid #eee" }}>
                {isEmp ? (
                  <>
                    <div style={{ fontSize: 14, color: "#666" }}>System Request via:</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "#333", margin: "10px 0" }}>{activeUser.payload.employee_id}</div>
                    <div style={{ fontSize: 20, fontWeight: "bold", color: headerColor }}>{activeUser.payload.action}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, color: "#666" }}>Transferring to</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "#333", margin: "10px 0" }}>{activeUser.payload.merchant}</div>
                    <div style={{ fontSize: 32, fontWeight: "bold", color: headerColor }}>₹{activeUser.payload.amount.toLocaleString()}</div>
                  </>
                )}
              </div>

              <button onClick={handleAction} style={{ width: "100%", padding: 15, background: headerColor, color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: "bold", marginTop: 30, cursor: "pointer" }}>
                {isEmp ? "EXECUTE COMMAND" : "CONFIRM PAYMENT"}
              </button>
            </div>
          )}

          {/* SCREEN 3: LOADING */}
          {status === "loading" && (
            <div style={{ textAlign: "center", marginTop: 100 }}>
              <div style={{ width: 40, height: 40, border: "4px solid #f3f3f3", borderTop: `4px solid ${headerColor}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
              <h3 style={{ color: "#333" }}>Processing Request...</h3>
              <p style={{ fontSize: 12, color: "#888" }}>OmniGuard XAI is analyzing behaviour</p>
            </div>
          )}

          {/* SCREEN 4: SUCCESS */}
          {status === "success" && (
            <div style={{ textAlign: "center", marginTop: 50 }}>
              <div style={{ fontSize: 60, margin: "0 auto 10px" }}>✅</div>
              <h2 style={{ color: "#28a745" }}>{isEmp ? "ACCESS GRANTED" : "PAYMENT SUCCESSFUL"}</h2>
              <div style={{ background: "#e6f4ea", padding: 15, borderRadius: 10, marginTop: 20, border: "1px solid #c3e6cb", textAlign: "left" }}>
                <div style={{ fontSize: 12, color: "#28a745", fontWeight: "bold" }}>SECURITY CLEARANCE</div>
                <div style={{ fontSize: 12, color: "#333", marginTop: 5 }}>Risk Score: <b>{mlResult?.risk_score || mlResult?.risk}/100</b></div>
                <div style={{ fontSize: 12, color: "#333", marginTop: 5 }}>Status: <b>CLEARED (No Anomalies)</b></div>
              </div>
              <button onClick={reset} style={{ width: "100%", padding: 15, background: "#28a745", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: "bold", marginTop: 30, cursor: "pointer" }}>Done</button>
            </div>
          )}

          {/* SCREEN 5: BLOCKED */}
          {status === "blocked" && (
            <div style={{ textAlign: "center", marginTop: 50 }}>
              <div style={{ fontSize: 60, margin: "0 auto 10px" }}>🚫</div>
              <h2 style={{ color: "#d9534f" }}>{isEmp ? "SESSION SUSPENDED" : "TRANSACTION BLOCKED"}</h2>
              <p style={{ color: "#555", fontSize: 14, lineHeight: 1.5 }}>Halted by OmniGuard Fraud Intelligence.</p>
              
              <div style={{ background: "#fee", padding: 15, borderRadius: 10, marginTop: 20, border: "1px solid #fcc", textAlign: "left" }}>
                <div style={{ fontSize: 12, color: "#d9534f", fontWeight: "bold" }}>CRITICAL ALERT</div>
                <div style={{ fontSize: 12, color: "#333", marginTop: 5 }}>Risk Score: <b>{mlResult?.risk_score || mlResult?.risk}/100</b></div>
                <div style={{ fontSize: 12, color: "#333", marginTop: 5 }}>Reason: <b>{isEmp ? mlResult?.anomalies[0] : mlResult?.xai_factors[0]?.label}</b></div>
              </div>
              <button onClick={reset} style={{ width: "100%", padding: 15, background: "#333", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: "bold", marginTop: 30, cursor: "pointer" }}>Return to Home</button>
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
