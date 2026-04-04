TEAM COLLECTIVE
# 🛡️ OmniGuard XAI Hackup_2026 
**Real-Time Adaptive Financial Fraud Detection System**

![OmniGuard XAI](https://img.shields.io/badge/Status-Hackathon_Ready-success) ![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Python%20%7C%20FastAPI%20%7C%20XGBoost-blue) 

OmniGuard XAI is an enterprise-grade, real-time fraud detection engine designed to stop financial crimes *before* the money leaves the server. By fusing Machine Learning (XGBoost + Isolation Forest) with eXplainable AI (SHAP) and dynamic Step-Up MFA, OmniGuard provides unparalleled security without compromising the user experience.

Built by **Team Collective**.

---

## ⚠️ The Problem Statement: The Silent Fraud Crisis

Modern financial institutions are losing billions to sophisticated, AI-driven cyber threats. Current legacy systems are failing due to four critical vulnerabilities:

1. **Reactive Defense:** Legacy systems flag fraud *after* funds are stolen. Banks urgently need pre-transaction prevention.
2. **Complex Attacks:** Coordinated, multi-channel threats (e.g., Account Takeovers, Synthetic IDs) easily bypass traditional rule-based engines.
3. **High Latency & Siloed Data:** Fragmented databases prevent the instant fusion of user behavior, device intelligence, and transaction context needed for real-time anomaly detection.
4. **The "Black Box" AI Problem:** Unexplainable AI alerts leave security teams (SOC) guessing *why* a transaction was flagged, causing critical delays in incident response.

---

## 💡 Our Solution: OmniGuard XAI

OmniGuard shifts the paradigm from post-transaction recovery to **pre-transaction prevention** with millisecond latency. 

### Core Features
* **🧠 Blended ML Engine:** Combines XGBoost (supervised) and Isolation Forest (unsupervised) for high-accuracy anomaly detection.
* **🔎 SHAP Explainability (XAI):** Translates complex ML decisions into human-readable insights for SOC analysts instantly.
* **🛡️ Dynamic Step-Up MFA:** Automatically triggers biometric or OTP verification for "medium-risk" transactions (Score 40-69) to block hackers while keeping real users moving.
* **👁️ Insider Threat Detection (UEBA):** Monitors internal employee portal logs to detect rogue admins, privilege escalation, and unauthorized data exports.
* **📱 Dual-Portal Simulation:** Includes a live Customer Mobile App simulator and an Employee Terminal to inject real-time attack vectors.

---

## 🏗️ Project Architecture & File Structure

```text
omniguard-xai/
│
├── backend/                  # Python API & ML Models
│   ├── main.py               # Main FastAPI/Flask application
│   ├── requirements.txt      # Python dependencies
│   ├── models/               # Pre-trained XGBoost & Isolation Forest models
│   ├── utils/                # Helper functions for data processing & SHAP
│   └── data/                 # Sample transaction datasets for evaluation
│
├── frontend/                 # React UI (SOC Dashboard & Mobile App)
│   ├── package.json          # Node modules and scripts
│   ├── vite.config.js        # Vite bundler configuration
│   ├── index.html            # Main HTML entry point
│   ├── public/               # Static assets (images, icons)
│   └── src/
│       ├── main.jsx          # React DOM render
│       ├── App.jsx           # Main SOC Analyst Dashboard Component
│       ├── MobileApp.jsx     # Customer & Employee Simulator (Attack Injector)
│       ├── components/       # Reusable UI widgets (Charts, Alerts, MFA)
│       └── styles/           # CSS modules and dark-theme styling
│
└── README.md                 # Project documentation
🚀 Installation & Run Instructions
Follow these steps to run the OmniGuard XAI environment locally. You will need two terminal windows open: one for the backend and one for the frontend.

Prerequisites
Python 3.9+

Node.js (v16+) & npm

Part 1: Starting the Backend (Machine Learning API)
Open your first terminal and navigate to the project folder:
# 1. Navigate to the backend directory
cd backend

# 2. Create a virtual environment (Recommended)
python -m venv venv

# 3. Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 4. Install the required Python packages
pip install -r requirements.txt

# 5. Run the backend server (FastAPI/Uvicorn or Flask)
# If using FastAPI:
uvicorn main:app --reload --port 8000
# If using Flask:
python main.py
The backend should now be running on http://localhost:8000.

Part 2: Starting the Frontend (React UI)
Open your second terminal window:
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server
npm run dev
The frontend will start on http://localhost:5173.

🎮 How to Use the Simulator
To demonstrate the full power of OmniGuard XAI to the judges, follow this flow:

Open the Dashboards: Open two browser tabs. In Tab 1, open the SOC Dashboard (http://localhost:5173). In Tab 2, open the Mobile Simulator (http://localhost:5173/simulator or navigate via your routing).

Inject a Normal Transaction: On the simulator, select "Normal Nancy". Watch the transaction get instantly approved on the SOC dashboard with a low risk score.

Trigger Step-Up MFA: Select "Nightowl Nick" (Off-Hours Activity). The ML model will assign a medium risk score (~55). The simulator will block the payment and instantly prompt a realistic SMS OTP / Biometric MFA screen.

Execute an Attack: Select "Hacker Harry" (Account Takeover). The system will assign a critical risk score (>75), instantly blocking the transaction.

View Explainability: On the SOC Dashboard, click on Hacker Harry's blocked transaction. The SHAP Explainability Matrix will reveal exactly why it was blocked (e.g., Velocity, High Distance, New Beneficiary).

Insider Threat: Switch to the Employee Terminal and execute an unauthorized data export to see the internal UEBA model suspend the employee session.

🛠️ Technologies Used
Frontend: React.js, Vite, Recharts (Data Visualization), CSS3 (Dark Enterprise Theme)

Backend: Python, FastAPI (or Flask), REST APIs

Machine Learning: XGBoost, Scikit-Learn (Isolation Forest), SHAP (SHapley Additive exPlanations), Pandas, NumPy

Built with passion for securing the digital economy.
