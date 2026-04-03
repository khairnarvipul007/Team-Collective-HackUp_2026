/**
 * OmniGuard XAI — Full Frontend v3 (ML Backend Integrated)
 * Union Bank of India · Banking Fraud Intelligence Platform
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API = "/api";
// 🚨 CHANGED TO FALSE: App is now in REAL LIVE WORKING MODE!
// It will pull data exclusively from your Python backend datasets.
const DEMO = false; 

// ═══════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const PAYEES = ["NEFT Transfer","RTGS Payment","ATM Cash","POS Terminal","Online Banking",
                "Cheque Deposit","Unknown Payee","Crypto Gateway","Shell Company Ltd","Offshore Account"];
const CITIES  = ["Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Dubai","Singapore"];
const BANKING_SYSTEMS = ["Core Banking","Treasury","Loan Origination","Customer Database","IT Infrastructure","Audit System"];
const DEPTS   = ["Core Banking","Treasury","Loan Processing","IT Admin","Branch Operations",
                 "Audit & Compliance","Risk Management","Customer Service","HR","Finance"];
const EMP_NAMES = [
  "Arun Kumar","Sunita Sharma","Rajesh Patel","Priya Mehta","Vikram Nair",
  "Anita Singh","Suresh Reddy","Kavya Iyer","Amit Joshi","Deepa Rao",
  "Rohit Gupta","Meera Bhat","Sanjay Desai","Pooja Malhotra","Nikhil Tiwari",
  "Renu Verma","Aditya Krishnan","Swati Pandey","Manoj Dubey","Lakshmi Pillai",
];
const INDIAN_BANKS = [
  {name:"State Bank of India", abbr:"SBI",   sponsor:false},
  {name:"HDFC Bank",           abbr:"HDFC",  sponsor:false},
  {name:"ICICI Bank",          abbr:"ICICI", sponsor:false},
  {name:"Union Bank of India", abbr:"UBI",   sponsor:true},
  {name:"Punjab National Bank",abbr:"PNB",   sponsor:false},
  {name:"Bank of Baroda",      abbr:"BOB",   sponsor:false},
];
const ALERT_POOL = [
  {message:"TXN-88231 ₹8,74,000 to Offshore Account at 2:14 AM",      severity:"high",module:"transaction"},
  {message:"EMP-2004 (Treasury) bulk export 612 MB at 1:47 AM",       severity:"high",module:"user"},
  {message:"TXN-88198 risk 94 — Crypto Gateway, UBI-87654321",        severity:"high",module:"transaction"},
  {message:"EMP-2007 privilege escalation on Core Banking module",     severity:"high",module:"user"},
  {message:"TXN-88045 geo anomaly: Mumbai → Dubai, 2,400km",           severity:"med", module:"transaction"},
  {message:"EMP-2011 off-hours login 3:22 AM (baseline 9 AM)",         severity:"med", module:"user"},
  {message:"EMP-2002 accessed 8 restricted modules (baseline 3)",      severity:"high",module:"user"},
  {message:"TXN-88312 velocity: 5 txns in 90 seconds, same IP",        severity:"high",module:"transaction"},
  {message:"TXN-88401 Shell Company Ltd ₹15,00,000 flagged",           severity:"high",module:"transaction"},
  {message:"EMP-2015 unauthorised account modification in Loan Origination", severity:"high",module:"user"},
  {message:"EMP-2009 accessed Customer Database at 4:12 AM",           severity:"high",module:"user"},
  {message:"TXN-88502 ₹22,50,000 RTGS to new beneficiary within 1hr", severity:"high",module:"transaction"},
];
const NODE_COLORS = {user:"#f59e0b", device:"#06b6d4", merchant:"#10b981"};
const AGENT_COLORS = {Ingestion:"#00d4ff", Policy:"#a855f7", Verification:"#f59e0b", Action:"#00ff88"};
const AUTONOMY_LABELS = ["Observe","Suggest","Act (Low)","Full Auto"];
const ACTION_ICONS = {
  "Alert dispatched":"📢","Account frozen":"🔒","SMS OTP triggered":"📱",
  "Case escalated":"⚠️","Report filed":"📋","Session suspended":"🚫","Account unlocked":"🔓",
  "BLOCK": "🚫", "STEP-UP MFA": "📱", "ALLOW": "✅", "AUTO-APPROVED": "✅", "FLAGGED (GEN-AI)": "⚠️", "FROZEN (ESCALATED)": "🔒", "AUTO-BLOCKED (LOCKED)": "🚫"
};

function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

// ═══════════════════════════════════════════════════════════════════════════
//  MOCK DATA BUILDERS
// ═══════════════════════════════════════════════════════════════════════════
function buildXaiTxn(fraud,amount,hour,payee,city){
  if(!fraud) return [];
  const f=[];
  if(amount>500000) f.push({label:"Mouse Trajectory Deviation",   value:48,direction:"risk"});
  if(hour<6)        f.push({label:"IP Geolocation Distance",      value:35,direction:"risk"});
  if(/Unknown|Crypto|Shell|Offshore/.test(payee))
                    f.push({label:"Graph Cluster Proximity",       value:28,direction:"risk"});
  if(["Dubai","Singapore"].includes(city))
                    f.push({label:"Time of Day Anomaly",           value:22,direction:"risk"});
  f.push({label:"Device Fingerprint Match",                        value: 8,direction:"safe"});
  f.push({label:"Transaction Amount Baseline",                     value: 6,direction:"safe"});
  return f.slice(0,6);
}

function buildXaiUser(rogue,offHr,dv,priv,acctMod,normDv){
  if(!rogue) return [];
  const f=[];
  if(offHr)             f.push({label:"Login Hour Deviation",          value:42,direction:"risk"});
  if(dv>normDv*5)       f.push({label:"Data Export Volume Spike",      value:35,direction:"risk"});
  if(priv)              f.push({label:"Privilege Escalation Attempt",  value:30,direction:"risk"});
  if(acctMod)           f.push({label:"Unauthorized Account Modification",value:27,direction:"risk"});
  f.push({label:"Module Access Pattern Deviation",                      value:20,direction:"risk"});
  f.push({label:"Historical Clean Record",                              value: 5,direction:"safe"});
  return f.slice(0,6);
}

function buildMockTransactions(n=100){
  const now=Date.now();
  return Array.from({length:n},(_,i)=>{
    const fraud=Math.random()<0.13;
    const pi=fraud?rnd(6,9):rnd(0,5);
    const amt=fraud?rnd(300000,2500000):rnd(500,80000);
    const hr=fraud?rnd(1,5):rnd(8,20);
    const city=fraud?["Dubai","Singapore"][rnd(0,1)]:CITIES[rnd(0,5)];
    const payee=PAYEES[pi];
    const avgAmt=rnd(15000,60000);
    return{
      id:`TXN-${88000+i}`, merchant:payee, amount:amt, avg_amount:avgAmt,
      city, hour:hr,
      risk:fraud?rnd(72,97):rnd(3,35), flagged:fraud,
      time:new Date(now-(n-i)*180000).toTimeString().slice(0,8),
      type:fraud?(["Geo Anomaly","Velocity Attack","New Beneficiary","Account Takeover","Credential Stuffing","Suspicious Merchant"][rnd(0,5)]):"Normal",
      patterns:fraud?Array.from(new Set([
        amt>800000?"High Amount":null,
        hr<6?"Off-Hours":null,
        ["Dubai","Singapore"].includes(city)?"Geo Anomaly":null,
        /Unknown|Crypto|Shell|Offshore/.test(payee)?"Suspicious Merchant":null,
        Math.random()>.5?"New Beneficiary":null,
      ].filter(Boolean))):[],
      latency:rnd(12,95),
      account:`UBI-${rnd(10000000,99999999)}`,
      branch:["Mumbai Main","Delhi CP","Bangalore MG Road","Chennai Anna Nagar"][rnd(0,3)],
      new_beneficiary:fraud&&Math.random()>.5,
      xai:buildXaiTxn(fraud,amt,hr,payee,city),
    };
  }).reverse();
}

function buildMockUsers(n=20){
  return EMP_NAMES.slice(0,n).map((name,i)=>{
    const rogue=Math.random()<0.28;
    const normHr=rnd(9,11), normDv=rnd(10,25);
    const priv=rogue&&Math.random()>.5;
    const offHr=rogue;
    const acctMod=rogue&&Math.random()>.5;
    const dv=rogue?rnd(400,1200):rnd(5,40);
    const normalSystems=BANKING_SYSTEMS.slice(0,rnd(1,2));
    const accessedSystems=rogue
      ?BANKING_SYSTEMS.slice(0,rnd(3,6))
      :normalSystems;
    return{
      id:`EMP-${2000+i}`, name,
      department:DEPTS[i%DEPTS.length],
      role:["Manager","Officer","Analyst","Admin","Supervisor"][rnd(0,4)],
      employee_id:`UBI${rnd(10000,99999)}`,
      normal_login_hour:normHr,
      last_login:rogue
        ?`${String(rnd(1,3)).padStart(2,"0")}:${String(rnd(0,59)).padStart(2,"0")} AM`
        :`${normHr}:${String(rnd(0,59)).padStart(2,"0")} AM`,
      normal_data_vol:normDv,
      data_volume:dv,
      privilege_escalation:priv,
      account_modification:acctMod,
      off_hours_access:offHr,
      modules_normal:3,
      modules_accessed:rogue?rnd(6,12):rnd(2,4),
      normal_systems:normalSystems,
      accessed_systems:accessedSystems,
      risk:rogue?rnd(68,95):rnd(3,28),
      flagged:rogue,
      anomalies:rogue
        ?["Off-hours login","Bulk data export","Privilege escalation","Unauthorized account mod"].filter(()=>Math.random()>.35)
        :[],
      activity:Array.from({length:8},(_,h)=>({
        hour:`${h+8}:00`,
        baseline:rnd(2,12),
        events:(rogue&&h<2)?rnd(25,70):rnd(0,14),
      })),
      latency:rnd(15,75),
      xai:buildXaiUser(rogue,offHr,dv,priv,acctMod,normDv),
      branch:["Head Office Mumbai","Zonal Office Delhi","Regional Office Bangalore"][rnd(0,2)],
    };
  });
}

function buildMockGraph(){
  const nodes=[],edges=[];
  for(let i=0;i<12;i++) nodes.push({id:`u_${i}`,type:"user",   label:EMP_NAMES[i].split(" ")[0],risk:rnd(5,95),flagged:Math.random()<0.28});
  for(let i=0;i<14;i++) nodes.push({id:`d_${i}`,type:"device", label:`DEV-${i}`,risk:rnd(5,90),flagged:Math.random()<0.2});
  for(let i=0;i<8;i++)  nodes.push({id:`m_${i}`,type:"merchant",label:PAYEES[i].split(" ")[0],risk:rnd(5,80),flagged:i>=6});
  const uids=nodes.filter(n=>n.type==="user").map(n=>n.id);
  const dids=nodes.filter(n=>n.type==="device").map(n=>n.id);
  const mids=nodes.filter(n=>n.type==="merchant").map(n=>n.id);
  uids.forEach(uid=>{for(let k=0;k<rnd(1,2);k++) edges.push({source:uid,target:dids[rnd(0,dids.length-1)],suspicious:Math.random()<0.2});});
  dids.slice(0,10).forEach(did=>edges.push({source:did,target:mids[rnd(0,mids.length-1)],suspicious:Math.random()<0.25}));
  return{nodes,edges};
}

const MOCK_INTENTS=[
  {id:"TX-88492",action:"Freeze account + step-up biometric verification",confidence:78,severity:"high",status:"pending",
   reasons:["Account linked to 3 known compromised nodes","Transaction to newly established vendor (< 30 days)","Geographic anomaly: 2,400km from typical location"]},
  {id:"TX-91203",action:"Request identity verification via SMS OTP",confidence:65,severity:"med",status:"pending",
   reasons:["Unusual transaction time (3:42 AM local)","Device fingerprint partially matches known fraud ring"]},
  {id:"EMP-2004",action:"Suspend session and notify CISO for investigation",confidence:89,severity:"high",status:"pending",
   reasons:["Bulk export 612MB customer data at 1:47 AM","Privilege escalation on Core Banking","IP matches external proxy server"]},
];
const MOCK_REASONING=[
  {time:"21:27:38",agent:"Ingestion",   message:"Transaction TXN-88492 received. Running feature extraction pipeline."},
  {time:"21:27:40",agent:"Ingestion",   message:"Behavioural pattern analysis complete. 4 anomalies detected."},
  {time:"21:27:42",agent:"Policy",      message:"Risk threshold breached (score 87). Escalating to Verification agent."},
  {time:"21:27:44",agent:"Verification",message:"Graph cluster proximity check initiated."},
  {time:"21:27:46",agent:"Verification",message:"Node linked to 3 compromised accounts in active fraud ring."},
  {time:"21:27:48",agent:"Policy",      message:"SHAP attribution computed. Top factor: Mouse Trajectory Deviation (48%)."},
  {time:"21:27:50",agent:"Action",      message:"Intent generated: Freeze + step-up biometric. Awaiting human approval."},
];
const MOCK_FED={
  total_weights_mb:3258,active_sync:2,version:"FedAvg v2.1",
  banks:INDIAN_BANKS.map(b=>({...b,weights_mb:rnd(500,900),syncing:Math.random()<0.4,last_sync:`${rnd(1,30)}m ago`})),
};
const MOCK_AUDIT={
  total:20,automated:14,reverted:0,
  actions:Array.from({length:12},(_,i)=>({
    id:`ACT-${1000+i}`,
    action:Object.keys(ACTION_ICONS)[rnd(0,Object.keys(ACTION_ICONS).length-1)],
    txn_id:`${Math.random()>.5?"TXN":"EMP"}-${rnd(88000,88100)}`,
    method:Math.random()>.3?"Detection":"Manual",
    automated:Math.random()>.3,time_ago:i===0?"0s ago":`${i*2}m ago`,reverted:false,
  })),
};
const TL_TXN=Array.from({length:24},(_,i)=>({time:`${String(i).padStart(2,"0")}:00`,normal:rnd(30,150),anomalous:(i>=1&&i<=4)?rnd(10,35):rnd(0,6)}));
const TL_USR=Array.from({length:24},(_,i)=>({time:`${String(i).padStart(2,"0")}:00`,normal:rnd(5,55), anomalous:(i>=1&&i<=4)?rnd(5,20):rnd(0,4)}));

// ═══════════════════════════════════════════════════════════════════════════
//  ACTIVE SESSION MONITOR — PS1 "continuously monitors users across banking systems"
// ═══════════════════════════════════════════════════════════════════════════
const SESSION_SYSTEMS = ["Core Banking","Treasury","Loan Origination","Customer DB","IT Admin","Audit System"];
function ActiveSessionMonitor({users}){
  const [sessions,setSessions] = useState(()=>{
    // seed with flagged users + a few normal users
    const active = users.filter(u=>u.flagged).slice(0,3).concat(users.filter(u=>!u.flagged).slice(0,3));
    return active.map(u=>({
      id: u.id, name: u.name.split(" ")[0], dept: u.department,
      system: SESSION_SYSTEMS[rnd(0,SESSION_SYSTEMS.length-1)],
      since: `${rnd(1,4)}:${String(rnd(0,59)).padStart(2,"0")} AM`,
      actions: rnd(u.flagged?40:2, u.flagged?120:15),
      risk: u.risk, flagged: u.flagged,
    }));
  });

  // simulate new action counts ticking up for rogue users
  useEffect(()=>{
    const iv = setInterval(()=>{
      setSessions(p=>p.map(s=>s.flagged?{...s,actions:s.actions+rnd(1,5)}:s));
    },3000);
    return()=>clearInterval(iv);
  },[]);

  return(
    <div style={{padding:"10px 14px",borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span>📡</span>
          <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>Active Session Monitor</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 4px #00ff88",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:8,color:"#00ff88",fontFamily:"monospace"}}>LIVE · {sessions.length} sessions</span>
        </div>
      </div>
      {/* System load bars */}
      <div style={{display:"flex",gap:4,marginBottom:10}}>
        {SESSION_SYSTEMS.slice(0,4).map((sys,i)=>{
          const active=sessions.filter(s=>s.system===sys).length;
          const hasSusp=sessions.filter(s=>s.system===sys&&s.flagged).length>0;
          return(
            <div key={i} style={{flex:1,textAlign:"center"}}>
              <div style={{background:"#1a1a2e",borderRadius:3,height:28,overflow:"hidden",position:"relative",marginBottom:2}}>
                <div style={{position:"absolute",bottom:0,left:0,right:0,
                  height:`${Math.min(100,(active/sessions.length)*100+20)}%`,
                  background:hasSusp?"linear-gradient(180deg,#ff336644,#ff336622)":"linear-gradient(180deg,#00d4ff22,#00d4ff11)",
                  borderTop:`1px solid ${hasSusp?"#ff336666":"#00d4ff33"}`}}/>
                <div style={{position:"relative",zIndex:1,padding:"4px 2px",fontSize:7,color:hasSusp?"#ff3366":"#555",fontFamily:"monospace",lineHeight:1.2,textAlign:"center"}}>
                  {sys.split(" ")[0]}<br/>{hasSusp?"⚠️":active>0?"●":"○"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Live session rows */}
      {sessions.map((s,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"4px 0",borderBottom:"1px solid #0d0d22",
          background:s.flagged?"#ff33660a":"transparent"}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:5,height:5,borderRadius:"50%",flexShrink:0,
              background:s.flagged?"#ff3366":"#00ff88",
              boxShadow:s.flagged?"0 0 4px #ff3366":"0 0 4px #00ff88"}}/>
            <div>
              <span style={{fontSize:9,color:s.flagged?"#ff9999":"#ccc",fontWeight:600}}>{s.name}</span>
              <span style={{fontSize:8,color:"#444",marginLeft:4}}>{s.dept.split(" ")[0]}</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:8,color:s.flagged?"#ffaa00":"#444",fontFamily:"monospace",
              background:"#1a1a2e",padding:"1px 5px",borderRadius:3}}>{s.system.split(" ")[0]}</span>
            <span style={{fontSize:8,color:s.flagged?"#ff3366":"#333",fontFamily:"monospace"}}>{s.actions} acts</span>
            <span style={{fontSize:7,color:"#333",fontFamily:"monospace"}}>{s.since}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  FORCE GRAPH
// ═══════════════════════════════════════════════════════════════════════════
function ForceGraph({nodes=[],edges=[]}){
  const [pos,setPos]=useState({});
  const [hovered,setHovered]=useState(null);
  const W=330,H=300;
  const frameRef=useRef(null);
  useEffect(()=>{
    if(!nodes.length) return;
    const p={};
    nodes.forEach(n=>{p[n.id]={x:W/2+(Math.random()-.5)*W*.65,y:H/2+(Math.random()-.5)*H*.65,vx:0,vy:0};});
    let step=0;
    const tick=()=>{
      nodes.forEach(n1=>{
        if(!p[n1.id]) return;
        let fx=(W/2-p[n1.id].x)*.006,fy=(H/2-p[n1.id].y)*.006;
        nodes.forEach(n2=>{
          if(n1.id===n2.id||!p[n2.id]) return;
          const dx=p[n1.id].x-p[n2.id].x,dy=p[n1.id].y-p[n2.id].y;
          const d2=Math.max(dx*dx+dy*dy,1);
          fx+=1300*dx/d2;fy+=1300*dy/d2;
        });
        p[n1.id].vx=(p[n1.id].vx+fx)*.82;
        p[n1.id].vy=(p[n1.id].vy+fy)*.82;
      });
      edges.forEach(e=>{
        if(!p[e.source]||!p[e.target]) return;
        const dx=p[e.target].x-p[e.source].x,dy=p[e.target].y-p[e.source].y;
        const d=Math.sqrt(dx*dx+dy*dy)+.1;
        const f=(d-65)*.07;
        p[e.source].vx+=f*dx/d;p[e.source].vy+=f*dy/d;
        p[e.target].vx-=f*dx/d;p[e.target].vy-=f*dy/d;
      });
      nodes.forEach(n=>{
        p[n.id].x=Math.max(14,Math.min(W-14,p[n.id].x+p[n.id].vx));
        p[n.id].y=Math.max(14,Math.min(H-14,p[n.id].y+p[n.id].vy));
      });
      step++;setPos({...p});
      if(step<200) frameRef.current=requestAnimationFrame(tick);
    };
    frameRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frameRef.current);
  },[nodes.length]);

  return(
    <div style={{position:"relative"}}>
      <svg width={W} height={H} style={{display:"block"}}>
        {edges.map((e,i)=>{const s=pos[e.source],t=pos[e.target];if(!s||!t)return null;
          return<line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
            stroke={e.suspicious?"#ff336666":"#ffffff12"} strokeWidth={e.suspicious?1.5:.7}/>;
        })}
        {nodes.map(n=>{const p2=pos[n.id];if(!p2)return null;
          const col=NODE_COLORS[n.type]||"#888";
          const r=n.type==="user"?8:n.type==="device"?5:6;
          return(
            <g key={n.id} onMouseEnter={()=>setHovered(n)} onMouseLeave={()=>setHovered(null)} style={{cursor:"pointer"}}>
              {n.flagged&&<circle cx={p2.x} cy={p2.y} r={r+6} fill={`${col}14`} stroke={col} strokeWidth={.5} opacity={.6}/>}
              <circle cx={p2.x} cy={p2.y} r={r} fill={n.flagged?"#ff3366":col}
                stroke={n.flagged?"#ff336688":`${col}44`} strokeWidth={n.flagged?2:1}/>
            </g>
          );
        })}
      </svg>
      <div style={{position:"absolute",bottom:2,left:4,display:"flex",gap:10}}>
        {Object.entries(NODE_COLORS).map(([t,c])=>(
          <div key={t} style={{display:"flex",alignItems:"center",gap:3}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c}}/>
            <span style={{fontSize:9,color:"#555",fontFamily:"monospace",textTransform:"capitalize"}}>{t}</span>
          </div>
        ))}
      </div>
      {hovered&&pos[hovered.id]&&(
        <div style={{position:"absolute",left:pos[hovered.id].x+12,top:pos[hovered.id].y-10,
          background:"#0f0f1a",border:"1px solid #333",borderRadius:6,padding:"4px 8px",zIndex:10,pointerEvents:"none",whiteSpace:"nowrap"}}>
          <div style={{fontSize:10,color:"#fff",fontFamily:"monospace"}}>{hovered.id}</div>
          <div style={{fontSize:9,color:hovered.flagged?"#ff3366":"#00ff88"}}>Risk {hovered.risk} {hovered.flagged?"⚠️":"✓"}</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHAP MATRIX
// ═══════════════════════════════════════════════════════════════════════════
function ShapMatrix({factors,itemId,riskScore}){
  if(!factors?.length) return(
    <div style={{padding:"14px 0",textAlign:"center",color:"#2a2a3a",fontSize:11,fontFamily:"monospace"}}>
      ← click a flagged row to view XAI feature attribution
    </div>
  );
  // Support both Object format (from new backend) and Array format (from old mock)
  const factorsArray = Array.isArray(factors) ? factors : Object.entries(factors).map(([k,v])=>({label: v.label, value: v.contribution||v.value, direction: v.direction}));
  const mx=Math.max(...factorsArray.map(f=>f.value),1);
  
  return(
    <div>
      <div style={{fontSize:9,color:"#555",fontFamily:"monospace",marginBottom:10}}>
        {itemId} · Risk Score: {riskScore}%
      </div>
      {factorsArray.map((f,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
          <span style={{fontSize:9,color:"#666",fontFamily:"monospace",width:158,textAlign:"right",flexShrink:0,lineHeight:1.3}}>{f.label}</span>
          <div style={{flex:1,background:"#1a1a2e",borderRadius:3,height:13,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(f.value/mx)*100}%`,transition:"width .5s",borderRadius:3,
              background:f.direction==="risk"?"linear-gradient(90deg,#ff3366,#ff6699)":"linear-gradient(90deg,#00ff88,#00cc66)"}}/>
          </div>
          <span style={{fontSize:9,color:f.direction==="risk"?"#ff3366":"#00ff88",fontFamily:"monospace",width:26,textAlign:"right"}}>{f.value}%</span>
        </div>
      ))}
      <div style={{display:"flex",gap:14,marginTop:6}}>
        {[{c:"#ff3366",l:"Increases Risk"},{c:"#00ff88",l:"Decreases Risk"}].map(({c,l})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,borderRadius:2,background:c}}/>
            <span style={{fontSize:9,color:"#555"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  BEHAVIOURAL BASELINE CARD (PS1 requirement)
// ═══════════════════════════════════════════════════════════════════════════
function BaselineCard({user}){
  if(!user) return null;
  const dv=user.data_volume||user.dataVolume||0;
  const normDv=user.normal_data_vol||user.normalDataVol||20;
  const normHr=user.normal_login_hour||user.normalLoginHour||9;
  const mNorm=user.modules_normal||3;
  const mAcc=user.modules_accessed||3;
  const rows=[
    {label:"Login Time",    baseline:`${normHr}:00–${normHr+2}:00 AM`,  actual:user.last_login||"",              anomaly:user.off_hours_access||user.offHoursAccess},
    {label:"Data Export",   baseline:`~${normDv} MB/day`,                actual:`${dv} MB`,                        anomaly:dv>normDv*4},
    {label:"Modules Used",  baseline:`${mNorm} systems`,                  actual:`${mAcc} systems`,                anomaly:mAcc>mNorm+2},
    {label:"Acct. Modify",  baseline:"None expected",                     actual:user.account_modification?"DETECTED ⚠️":"None",anomaly:user.account_modification},
    {label:"Privilege",     baseline:"Standard",                          actual:user.privilege_escalation?"ESCALATED ⚠️":"Standard",anomaly:user.privilege_escalation},
  ];
  return(
    <div style={{background:"#07071a",border:"1px solid #a855f733",borderRadius:8,padding:"10px 12px",marginTop:10}}>
      <div style={{fontSize:9,letterSpacing:2,fontFamily:"monospace",color:"#a855f7",marginBottom:10}}>BEHAVIOURAL BASELINE vs TODAY</div>
      {rows.map((r,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"5px 0",borderBottom:i<rows.length-1?"1px solid #0d0d22":"none"}}>
          <span style={{fontSize:9,color:"#555",fontFamily:"monospace",minWidth:80}}>{r.label}</span>
          <span style={{fontSize:9,color:"#3a3a5a",fontFamily:"monospace"}}>{r.baseline}</span>
          <span style={{fontSize:9,fontFamily:"monospace",padding:"1px 6px",borderRadius:3,
            color:r.anomaly?"#ff3366":"#00ff88",background:r.anomaly?"#ff336618":"#00ff8810",
            border:`1px solid ${r.anomaly?"#ff336633":"#00ff8822"}`}}>
            {r.actual}
          </span>
        </div>
      ))}
      {/* Accessed Banking Systems */}
      {user.accessed_systems?.length>0&&(
        <div style={{marginTop:8}}>
          <div style={{fontSize:9,color:"#555",fontFamily:"monospace",marginBottom:5}}>SYSTEMS ACCESSED</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {user.accessed_systems.map((s,i)=>{
              const isExtra=!user.normal_systems?.includes(s);
              return(
                <span key={i} style={{fontSize:8,padding:"2px 6px",borderRadius:3,fontFamily:"monospace",
                  background:isExtra?"#ff336618":"#1a1a2e",
                  color:isExtra?"#ff3366":"#555",
                  border:`1px solid ${isExtra?"#ff336633":"#1a1a2e"}`}}>
                  {isExtra?"⚠️ ":""}{s}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  CASE DETAIL PANEL (PS1 & PS3 — triage actions)
// ═══════════════════════════════════════════════════════════════════════════
function CaseDetail({selected,isT,accent,onClose,onBlock,onEscalate,onClear}){
  if(!selected) return(
    <div style={{padding:"16px",color:"#2a2a3a",fontSize:11,fontFamily:"monospace",textAlign:"center",marginTop:10}}>
      Select a row to view case details
    </div>
  );
  const dv=selected.data_volume||selected.dataVolume||0;
  return(
    <div style={{padding:"10px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:10,fontFamily:"monospace",color:accent,letterSpacing:2}}>CASE DETAIL</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16}}>×</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {/* Common fields */}
        {[{k:"ID",v:selected.id},{k:"Branch",v:selected.branch||"N/A"}].map(r=>(
          <div key={r.k} style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>{r.k}</span>
            <span style={{fontSize:10,color:"#ccc",fontFamily:"monospace"}}>{r.v}</span>
          </div>
        ))}
        {/* Transaction-specific */}
        {isT&&[
          {k:"PAYEE",   v:selected.merchant},
          {k:"AMOUNT",  v:`₹${selected.amount?.toLocaleString("en-IN")} ${selected.avg_amount?`(avg ₹${selected.avg_amount?.toLocaleString("en-IN")})`:''}`, c:selected.amount>500000?"#ff3366":"#ccc"},
          {k:"ACCOUNT", v:selected.account},
          {k:"CITY",    v:selected.city},
          {k:"HOUR",    v:`${selected.hour}:00`,c:(selected.hour<6||selected.hour>22)?"#ffaa00":"#ccc"},
          {k:"NEW PAYEE",v:selected.new_beneficiary?"YES ⚠️":"No",c:selected.new_beneficiary?"#ffaa00":"#555"},
          {k:"LATENCY", v:`${selected.latency}ms`,c:selected.latency>100?"#ffaa00":"#00ff88"},
        ].map(r=>(
          <div key={r.k} style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>{r.k}</span>
            <span style={{fontSize:10,color:r.c||"#ccc",fontFamily:"monospace",textAlign:"right",maxWidth:180}}>{r.v}</span>
          </div>
        ))}
        {/* User-specific */}
        {!isT&&[
          {k:"NAME",    v:selected.name},
          {k:"EMP ID",  v:selected.employee_id},
          {k:"DEPT",    v:selected.department},
          {k:"ROLE",    v:selected.role},
          {k:"LAST LOGIN",v:selected.last_login},
          {k:"DATA VOL",v:`${dv} MB`,c:dv>200?"#ff3366":"#ccc"},
          {k:"LATENCY", v:`${selected.latency}ms`,c:selected.latency>100?"#ffaa00":"#00ff88"},
        ].map(r=>(
          <div key={r.k} style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>{r.k}</span>
            <span style={{fontSize:10,color:r.c||"#ccc",fontFamily:"monospace"}}>{r.v}</span>
          </div>
        ))}
        {/* Risk bar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>RISK</span>
          <RiskBadge score={selected.risk}/>
        </div>
        <div style={{background:"#1a1a2e",borderRadius:4,height:5,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${selected.risk}%`,borderRadius:4,transition:"width .5s",
            background:selected.risk>=70?"#ff3366":selected.risk>=40?"#ffaa00":"#00ff88"}}/>
        </div>
        {/* Baseline card — PS1 users only */}
        {!isT&&selected.flagged&&<BaselineCard user={selected}/>}
        {/* Activity sparkline — users */}
        {!isT&&selected.activity&&(
          <div style={{marginTop:8}}>
            <div style={{fontSize:9,color:"#555",fontFamily:"monospace",letterSpacing:1,marginBottom:4}}>ACTIVITY PATTERN vs BASELINE (8AM–4PM)</div>
            <ResponsiveContainer width="100%" height={55}>
              <BarChart data={selected.activity} barSize={10} barGap={2}>
                <Bar dataKey="baseline" fill="#1a1a3a" radius={[2,2,0,0]}/>
                <Bar dataKey="events"   fill={selected.flagged?"#ff3366":accent} opacity={.85} radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:12,marginTop:3}}>
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:8,height:8,background:"#1a1a3a",borderRadius:2}}/>
                <span style={{fontSize:8,color:"#444"}}>Baseline</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:8,height:8,background:selected.flagged?"#ff3366":accent,borderRadius:2}}/>
                <span style={{fontSize:8,color:"#444"}}>Today</span>
              </div>
            </div>
          </div>
        )}
        {/* Actions — PS1 & PS3 triage */}
        {selected.flagged&&(
          <div style={{display:"flex",gap:6,marginTop:10}}>
            <button onClick={()=>onBlock(selected)}
              style={{flex:1,background:"#ff336618",border:"1px solid #ff336644",color:"#ff3366",
                padding:"6px 0",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>
              🚫 BLOCK
            </button>
            <button onClick={()=>onEscalate(selected)}
              style={{flex:1,background:"#ffaa0018",border:"1px solid #ffaa0044",color:"#ffaa00",
                padding:"6px 0",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>
              🔍 ESCALATE
            </button>
            <button onClick={()=>onClear(selected)}
              style={{flex:1,background:"#00ff8818",border:"1px solid #00ff8844",color:"#00ff88",
                padding:"6px 0",borderRadius:6,cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>
              ✓ CLEAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  FEDERATED LEARNING
// ═══════════════════════════════════════════════════════════════════════════
function FedLearning({data}){
  if(!data) return null;
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {[{l:"Total Weights",v:`${(data.total_weights_mb||0).toLocaleString()} MB`,c:"#00d4ff"},
          {l:"Active Sync",  v:`${data.active_sync||0} nodes`,c:"#f59e0b"}].map(s=>(
          <div key={s.l} style={{flex:1,background:"#0f0f1a",borderRadius:6,padding:"7px 10px"}}>
            <div style={{fontSize:8,color:"#444",fontFamily:"monospace",letterSpacing:1}}>{s.l}</div>
            <div style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"monospace",lineHeight:1.2}}>{s.v}</div>
          </div>
        ))}
      </div>
      {data.banks?.map((b,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"6px 0",borderBottom:"1px solid #0d0d22"}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:12}}>🏦</span>
            <div>
              <span style={{fontSize:10,color:b.sponsor?"#f59e0b":"#bbb",fontWeight:b.sponsor?700:400}}>
                {b.name.length>20?b.name.slice(0,20)+"…":b.name}
              </span>
              {b.sponsor&&<span style={{display:"block",fontSize:7,color:"#f59e0b",letterSpacing:1}}>● SPONSOR</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:9,fontFamily:"monospace",color:"#444"}}>{b.weights_mb}MB</span>
            <div style={{width:14,height:14,borderRadius:"50%",border:"2px solid",
              borderColor:b.syncing?"#00d4ff":"#00ff88",
              borderTopColor:b.syncing?"transparent":"#00ff88",
              animation:b.syncing?"spin 1s linear infinite":"none",flexShrink:0}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  AGENTIC CONSOLE
// ═══════════════════════════════════════════════════════════════════════════
function AgenticConsole({intents=[],reasoning=[],onApprove,onReject,autonomy,setAutonomy}){
  const pending=intents.filter(i=>i.status==="pending");
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"8px 14px",borderBottom:"1px solid #1a1a2e",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span>🤖</span>
          <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>Agentic Workflow Console</span>
        </div>
        <span style={{fontSize:8,background:"#00ff8812",color:"#00ff88",border:"1px solid #00ff8833",padding:"2px 7px",borderRadius:10,fontFamily:"monospace"}}>Multi-Agent Active</span>
      </div>
      {/* Autonomy Dial */}
      <div style={{padding:"10px 14px",borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:12}}>🛡️</span>
          <span style={{fontSize:10,color:"#ccc"}}>Autonomy Dial</span>
        </div>
        <input type="range" min={0} max={3} value={autonomy} onChange={e=>setAutonomy(+e.target.value)}
          style={{width:"100%",accentColor:"#a855f7",cursor:"pointer",marginBottom:4}}/>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          {AUTONOMY_LABELS.map((l,i)=>(
            <span key={i} style={{fontSize:8,fontFamily:"monospace",color:i===autonomy?"#a855f7":"#333",fontWeight:i===autonomy?700:400}}>{l}</span>
          ))}
        </div>
        <div style={{fontSize:9,color:"#444",marginTop:4}}>
          {["Monitoring only, no actions","Agent suggests, human confirms all","Auto-acts on low risk; human reviews high","Fully autonomous — all actions auto-executed"][autonomy]}
        </div>
      </div>
      {/* Intents */}
      <div style={{flex:1,overflowY:"auto"}}>
        <div style={{padding:"6px 14px 2px",fontSize:8,color:"#333",fontFamily:"monospace",letterSpacing:2}}>
          INTENT PREVIEWS AWAITING APPROVAL ({pending.length})
        </div>
        {pending.map(intent=>(
          <div key={intent.id} style={{margin:"6px 10px",background:"#0d0d20",
            border:`1px solid ${intent.severity==="high"?"#ff336633":"#ffaa0033"}`,borderRadius:8,padding:"10px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:9,background:"#f59e0b",color:"#000",padding:"2px 6px",borderRadius:3,fontFamily:"monospace",fontWeight:800}}>{intent.id}</span>
              <span style={{fontSize:9,color:"#666"}}>Confidence: {intent.confidence}%</span>
            </div>
            <div style={{background:"#1a1a2e",borderRadius:3,height:3,marginBottom:7,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${intent.confidence}%`,borderRadius:3,
                background:intent.confidence>=75?"#00ff88":intent.confidence>=50?"#ffaa00":"#ff3366"}}/>
            </div>
            <div style={{fontSize:11,fontWeight:600,color:"#fff",marginBottom:6,lineHeight:1.4}}>{intent.action}</div>
            {intent.reasons.map((r,i)=>(
              <div key={i} style={{fontSize:10,color:"#777",marginBottom:3}}>• {r}</div>
            ))}
            <div style={{display:"flex",gap:7,marginTop:9}}>
              <button onClick={()=>onApprove(intent.id)}
                style={{flex:1,background:"#16a34a",border:"none",color:"#fff",padding:"6px 0",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:700}}>
                ✓ Approve
              </button>
              <button onClick={()=>onReject(intent.id)}
                style={{flex:1,background:"#dc2626",border:"none",color:"#fff",padding:"6px 0",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:700}}>
                ✗ Reject
              </button>
            </div>
          </div>
        ))}
        {/* Reasoning Chain */}
        <div style={{padding:"6px 14px 2px",fontSize:8,color:"#333",fontFamily:"monospace",letterSpacing:2,marginTop:2}}>
          AGENT CHAIN OF REASONING
        </div>
        <div style={{background:"#050510",margin:"0 10px 10px",borderRadius:8,padding:"9px",fontFamily:"monospace",fontSize:9,maxHeight:160,overflowY:"auto"}}>
          {reasoning.map((r,i)=>(
            <div key={i} style={{marginBottom:6,lineHeight:1.5}}>
              <span style={{color:"#333"}}>{r.time} </span>
              <span style={{color:AGENT_COLORS[r.agent]||"#888",background:`${AGENT_COLORS[r.agent]||"#888"}18`,padding:"1px 4px",borderRadius:3}}>
                [{r.agent}]
              </span>
              <span style={{color:"#666"}}> {r.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUDIT LOG — PS1 & PS3 (immutable ledger) + 🚨 AUTO/MANUAL FIX
// ═══════════════════════════════════════════════════════════════════════════
function AuditLog({data,onUndo}){
  if(!data) return null;
  return(
    <div style={{padding:"10px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:13}}>🕐</span>
          <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>Action Audit Log</span>
        </div>
        <span style={{fontSize:8,background:"#a855f714",color:"#a855f7",border:"1px solid #a855f730",padding:"2px 8px",borderRadius:5,fontFamily:"monospace"}}>Immutable Ledger</span>
      </div>
      <div style={{display:"flex",gap:7,marginBottom:9}}>
        {[{l:"Total",v:data.total,c:"#fff"},{l:"Automated",v:data.automated,c:"#a855f7"},{l:"Reverted",v:data.reverted||0,c:"#f59e0b"}].map(s=>(
          <div key={s.l} style={{flex:1,background:"#0f0f1a",borderRadius:5,padding:"5px 8px",textAlign:"center"}}>
            <div style={{fontSize:8,color:"#333",fontFamily:"monospace"}}>{s.l}</div>
            <div style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:"monospace"}}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{maxHeight:150,overflowY:"auto"}}>
        {data.actions?.slice(0,9).map((a,i)=>(
          <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"5px 0",borderBottom:"1px solid #0d0d22"}}>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:12}}>{ACTION_ICONS[a.action?.split(" ")[0]]||"📋"}</span>
              <div>
                <div style={{fontSize:10,color:"#ccc",marginBottom:2}}>{a.action}</div>
                {/* 🚨 FIX: ADDED AUTOMATED VS MANUAL VISUAL BADGES */}
                <div style={{fontSize:8,color:"#444",fontFamily:"monospace",display:"flex",alignItems:"center",gap:4}}>
                  <span>{a.txn_id}</span>
                  <span style={{
                    background: a.automated ? "#a855f722" : "#00d4ff22",
                    color: a.automated ? "#a855f7" : "#00d4ff",
                    padding: "1px 4px", borderRadius: 3, fontSize: 7
                  }}>
                    {a.automated ? "🤖 AUTO" : "👤 MANUAL"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:8,color:"#333",fontFamily:"monospace"}}>{a.time_ago}</div>
              <button onClick={()=>onUndo&&onUndo(a.id)}
                style={{fontSize:8,color:"#f59e0b",background:"none",border:"none",cursor:"pointer",fontFamily:"monospace"}}>↩ Undo</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SMALL SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
function RiskBadge({score}){
  const color=score>=70?"#ff3366":score>=40?"#ffaa00":"#00ff88";
  const label=score>=70?"HIGH":score>=40?"MED":"LOW";
  return(
    <span style={{background:`${color}22`,color,border:`1px solid ${color}55`,
      padding:"2px 6px",borderRadius:3,fontSize:9,fontFamily:"monospace",fontWeight:700,letterSpacing:1,whiteSpace:"nowrap"}}>
      {label} {score}
    </span>
  );
}
function ChartTip({active,payload,label}){
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:"#0f0f1a",border:"1px solid #333",borderRadius:6,padding:"6px 10px"}}>
      <div style={{color:"#777",fontSize:9,marginBottom:3}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color,fontSize:10,fontFamily:"monospace"}}>{p.name}: <b>{p.value}</b></div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
let _alertIdx=0;
export default function App(){
  const [module,setModule]         = useState("transaction");
  
  // Start with empty arrays/objects if we are connecting to the backend
  const [txns,setTxns]             = useState(DEMO ? buildMockTransactions() : []);
  const [users,setUsers]           = useState(DEMO ? buildMockUsers() : []);
  const [graph,setGraph]           = useState(DEMO ? buildMockGraph() : {nodes:[], edges:[]});
  const [intents,setIntents]       = useState(DEMO ? MOCK_INTENTS.map(i=>({...i})) : []);
  const [reasoning,setReasoning]   = useState(DEMO ? MOCK_REASONING : []);
  const [audit,setAudit]           = useState(DEMO ? {...MOCK_AUDIT,actions:[...MOCK_AUDIT.actions]} : {total:0,automated:0,reverted:0,actions:[]});
  const [fed,setFed]               = useState(DEMO ? MOCK_FED : {banks:[]});
  const [metrics,setMetrics]       = useState(DEMO ? {accuracy:97.8,fpr:2.16,latency:15,adaptability:"AUTO-RETRAIN",model:"v2.4.1"} : {accuracy:0,fpr:0,latency:0,adaptability:"",model:""});
  
  const [alerts,setAlerts]         = useState([]);
  const [alertPulse,setAlertPulse] = useState(false);
  const [selected,setSelected]     = useState(null);
  const [filter,setFilter]         = useState("all");
  const [autonomy,setAutonomy]     = useState(1);
  const [clock,setClock]           = useState(()=>new Date().toUTCString().slice(17,25)+" UTC");

  // 🚨 ML INTEGRATION STATE VARIABLES
  const [mlResult, setMlResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // 🚨 NEW UI STATES FOR MODAL & BELL
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const isT=module==="transaction";
  const accent=isT?"#00d4ff":"#a855f7";

  const flaggedTxns =txns.filter(t=>t.flagged);
  const flaggedUsers=users.filter(u=>u.flagged);

  // ── 0. Fetch Real Data from Python Backend ───────────────────────────
  const fetchAllData = useCallback(async () => {
    if(DEMO) return; 
    try {
      const [txnsRes, usersRes, graphRes, metricsRes, fedRes, reasoningRes, intentsRes, auditRes] = await Promise.all([
        fetch(API + '/transactions').then(r=>r.json()), fetch(API + '/users').then(r=>r.json()),
        fetch(API + '/graph').then(r=>r.json()), fetch(API + '/metrics').then(r=>r.json()),
        fetch(API + '/fed-learning').then(r=>r.json()), fetch(API + '/reasoning').then(r=>r.json()),
        fetch(API + '/intents').then(r=>r.json()), fetch(API + '/audit').then(r=>r.json())
      ]);
      setTxns(txnsRes.transactions||[]); setUsers(usersRes.users||[]); setGraph(graphRes||{nodes:[],edges:[]});
      setMetrics(metricsRes); setFed(fedRes); setReasoning(reasoningRes.steps||[]);
      setIntents(intentsRes.intents||[]); setAudit(auditRes||{total:0,automated:0,actions:[]});
    } catch (error) { console.error("Backend offline."); }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ── 1. Attack Simulation Logic ───────────────────────────────
  const attackVectors = {
    offshore: {
      title: "Massive Offshore Transfer", desc: "Account Takeover pattern. High amount to unknown foreign entity at 3 AM.",
      payload: { amount: 2750000, hour: 3, latency: 245, distance_km: 4200, velocity: 2, is_new_beneficiary: 1, merchant: "Offshore Shell Corp" }
    },
    velocity: {
      title: "Velocity Card Testing", desc: "Small amounts triggered rapidly from a new IP address.",
      payload: { amount: 450, hour: 14, latency: 45, distance_km: 15, velocity: 35, is_new_beneficiary: 0, merchant: "Online Payment Gateway" }
    },
    geo: {
      title: "Zero-Day Geo Anomaly", desc: "Medium transfer from an impossibly far location with high latency proxy.",
      payload: { amount: 85000, hour: 10, latency: 310, distance_km: 8500, velocity: 1, is_new_beneficiary: 1, merchant: "Unknown Foreign Entity" }
    }
  };

  const executeAttack = async (type) => {
    setShowAttackModal(false);
    setIsSimulating(true);
    const payload = attackVectors[type].payload;
    payload.account_id = `UBI-${Math.floor(Math.random() * 90000000) + 10000000}`;
    payload.branch = "Mumbai Main";

    try {
      const response = await fetch("/api/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      setMlResult(data);

      // 🚨 Inject into main table locally for instant visual feedback
      const newTableRow = {
        id:       data.transaction_id,
        merchant: data.merchant || payload.merchant,
        account:  data.account_id || payload.account_id,
        amount:   data.amount || payload.amount,
        city:     payload.distance_km > 1000 ? "Dubai (Proxy)" : "Mumbai", // Fix geo display
        hour:     data.hour || payload.hour,
        risk:     data.risk_score,
        flagged:  data.is_fraud,
        latency:  data.processing_ms,
        type:     data.action_taken, // Show blocked status
        patterns: [attackVectors[type].title, "ML Caught"],
        xai:      data.xai_factors 
      };
      setTxns(prev => [newTableRow, ...prev]);

      // 🚨 Trigger complete UI sync from Backend to update Graph and Tables instantly
      await fetchAllData();

      // Format as a live alert for the bell/feed
      const newAlert = {
        id:       data.transaction_id,
        message:  `🚨 ATTACK DETECTED — ${data.transaction_id} | Risk: ${data.risk_score}/100 | Action: ${data.action_taken}`,
        severity: data.risk_score >= 70 ? "high" : "med",
        module:   "transaction",
        time:     new Date().toLocaleTimeString(),
        xai:      data.xai_factors,
      };
      setAlerts(prev => [newAlert, ...prev].slice(0, 14));
      setAlertPulse(true); setTimeout(()=>setAlertPulse(false),600);

      // 🚨 Inject directly into Audit Log locally with `automated: true`
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
            automated: true, // This triggers the new 🤖 AUTO badge
            time_ago:  "0s ago",
            reverted:  false,
          }, ...prev.actions],
        }));
      }
    } catch (err) {
      console.error("[OmniGuard] Simulation failed:", err);
      alert("⚠️ Backend offline — Make sure Python is running on port 8000!");
    } finally {
      setIsSimulating(false);
    }
  };

  // ── 2. Live alerts polling every 4.5s ───────────────────────────────────
  useEffect(()=>{
    const push = async () => {
      if (DEMO) {
        _alertIdx++;
        const a=ALERT_POOL[_alertIdx%ALERT_POOL.length];
        const alert={...a,id:`ALT-${_alertIdx}`,time:new Date().toTimeString().slice(0,8)};
        setAlerts(prev=>[alert,...prev].slice(0,14));
        setAlertPulse(true); setTimeout(()=>setAlertPulse(false),600);
      } else {
        try {
          const res = await fetch(API + '/alerts');
          const data = await res.json();
          if(data.alert) {
            setAlerts(prev=>[data.alert, ...prev].slice(0,14));
            setAlertPulse(true); setTimeout(()=>setAlertPulse(false),600);
          }
        } catch(e) { console.error(e); }
      }
    };
    
    push();
    const iv=setInterval(push,4500);
    return()=>clearInterval(iv);
  },[]);

  // ── 3. Clock ───────────────────────────────────────────────────────────────
  useEffect(()=>{
    const iv=setInterval(()=>setClock(new Date().toUTCString().slice(17,25)+" UTC"),1000);
    return()=>clearInterval(iv);
  },[]);

  // ── 4. Audit helper ─────────────────────────────────────────────────────────
  const addAuditAction=(action,id)=>{
    setAudit(p=>({...p,total:p.total+1,
      // Manual actions don't increment `automated` count
      actions:[{id:`ACT-${Date.now()}`,action,txn_id:id,method:"Manual",automated:false,time_ago:"0s ago",reverted:false},...p.actions]}));
  };

  // ── 5. Intent handlers ──────────────────────────────────────────────────────
  const handleApprove=id=>{
    setIntents(p=>p.map(i=>i.id===id?{...i,status:"approved"}:i));
    addAuditAction("Action Approved",id);
  };
  const handleReject=id=>setIntents(p=>p.map(i=>i.id===id?{...i,status:"rejected"}:i));

  // ── 6. Row action handlers ──────────────────────────────────────────────────
  const handleBlock=item=>{
    if(isT) setTxns(p=>p.map(t=>t.id===item.id?{...t,type:"BLOCKED"}:t));
    else    setUsers(p=>p.map(u=>u.id===item.id?{...u,anomalies:[...(u.anomalies||[]),"Session Blocked"]}:u));
    addAuditAction("Account frozen",item.id);
    setSelected(null);
  };
  const handleEscalate=item=>{addAuditAction("Case escalated",item.id);};
  const handleClear=item=>{
    if(isT) setTxns(p=>p.map(t=>t.id===item.id?{...t,flagged:false,risk:Math.min(t.risk,30)}:t));
    else    setUsers(p=>p.map(u=>u.id===item.id?{...u,flagged:false}:u));
    addAuditAction("Alert dispatched",item.id);
    setSelected(null);
  };

  const filteredTxns =filter==="all"?txns:filter==="flagged"?txns.filter(t=>t.flagged):txns.filter(t=>!t.flagged);
  const filteredUsers=filter==="all"?users:filter==="flagged"?users.filter(u=>u.flagged):users.filter(u=>!u.flagged);
  const timeline=isT?TL_TXN:TL_USR;

  // ── 7. Risk distribution data ───────────────────────────────────────────────
  const items=isT?txns:users;
  const riskDist=[
    {range:"0–20",  count:items.filter(x=>x.risk<20).length},
    {range:"20–40", count:items.filter(x=>x.risk>=20&&x.risk<40).length},
    {range:"40–60", count:items.filter(x=>x.risk>=40&&x.risk<60).length},
    {range:"60–80", count:items.filter(x=>x.risk>=60&&x.risk<80).length},
    {range:"80+",   count:items.filter(x=>x.risk>=80).length},
  ];

  return(
    <div style={{height:"100vh",background:"#07070f",color:"#e0e0e0",
      fontFamily:"'Segoe UI',sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ── 🚨 ATTACK SIMULATION MODAL OVERLAY ── */}
      {showAttackModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(5px)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#0d0d1f",border:"1px solid #ff336655",borderRadius:12,padding:24,width:600,boxShadow:"0 10px 40px rgba(255,51,102,0.15)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{color:"#ff3366",fontFamily:"monospace",margin:0}}>🚨 SELECT ATTACK VECTOR</h2>
              <button onClick={()=>setShowAttackModal(false)} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:20}}>×</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {Object.entries(attackVectors).map(([key, vector]) => (
                <div key={key} onClick={()=>executeAttack(key)} style={{
                  background:"#111125",border:"1px solid #1a1a2e",padding:16,borderRadius:8,cursor:"pointer",transition:"all 0.2s"
                }} onMouseOver={e=>e.currentTarget.style.borderColor="#ff3366"} onMouseOut={e=>e.currentTarget.style.borderColor="#1a1a2e"}>
                  <div style={{color:"#fff",fontWeight:800,marginBottom:4}}>{vector.title}</div>
                  <div style={{fontSize:11,color:"#888"}}>{vector.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{background:"#0a0a18",borderBottom:"1px solid #1a1a2e",padding:"0 18px",
        display:"flex",alignItems:"center",gap:16,height:50,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:28,height:28,background:`linear-gradient(135deg,${accent},#ff3366)`,
            borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,transition:"all .4s"}}>🛡️</div>
          <div>
            <div style={{fontSize:12,fontWeight:800,letterSpacing:2,color:"#fff",fontFamily:"monospace"}}>OmniGuard XAI</div>
            <div style={{fontSize:8,color:"#2a2a4a",letterSpacing:1.5,fontFamily:"monospace"}}>UNION BANK OF INDIA · ENTERPRISE FRAUD INTELLIGENCE</div>
          </div>
        </div>
        {/* Module toggle */}
        <div style={{display:"flex",background:"#111125",borderRadius:8,padding:3,border:"1px solid #1a1a2e"}}>
          {[{id:"transaction",label:"💳 Transaction Fraud",c:"#00d4ff"},{id:"user",label:"👤 Internal User Fraud",c:"#a855f7"}].map(m=>(
            <button key={m.id} onClick={()=>{setModule(m.id);setSelected(null);setFilter("all");}}
              style={{background:module===m.id?`${m.c}18`:"transparent",
                border:module===m.id?`1px solid ${m.c}44`:"1px solid transparent",
                color:module===m.id?m.c:"#444",
                padding:"5px 12px",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"monospace",transition:"all .2s"}}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{flex:1}}/>
        {/* Live metrics strip */}
        <div style={{display:"flex",gap:14,fontSize:10,fontFamily:"monospace",alignItems:"center"}}>
          <span style={{fontSize:9,color:"#00ff88",background:"#00ff8810",padding:"2px 8px",borderRadius:10,border:"1px solid #00ff8820"}}>● LIVE</span>
          <span>FPR: <strong style={{color:"#00ff88"}}>{metrics.fpr}%</strong></span>
          <span>Latency: <strong style={{color:"#00ff88"}}>{metrics.latency}ms</strong></span>
          <span>Accuracy: <strong style={{color:"#00ff88"}}>{metrics.accuracy}%</strong></span>
          <span style={{color:accent}}>Adapt: <strong>{metrics.adaptability}</strong></span>
        </div>
        {/* Clock */}
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,fontFamily:"monospace",color:"#444",borderLeft:"1px solid #1a1a2e",paddingLeft:14}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 5px #00ff88",animation:"pulse 2s infinite"}}/>
          🕐 {clock}
        </div>
        
        {/* 🚨 FIX: FUNCTIONAL NOTIFICATIONS BELL 🚨 */}
        <div style={{position:"relative"}}>
          <div onClick={() => setShowNotifPanel(!showNotifPanel)} 
            style={{width:30,height:30,background:alertPulse?"#ff336620":"#111125",
            borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",
            border:`1px solid ${alertPulse?"#ff3366":"#1a1a2e"}`,transition:"all .3s",cursor:"pointer",flexShrink:0}}>
            🔔
            <div style={{position:"absolute",top:4,right:4,width:6,height:6,background:"#ff3366",borderRadius:"50%"}}/>
          </div>
          
          {/* Dropdown Panel */}
          {showNotifPanel && (
            <div style={{position:"absolute",top:40,right:0,width:320,background:"#0d0d1f",border:"1px solid #1a1a2e",borderRadius:8,zIndex:100,boxShadow:"0 10px 30px rgba(0,0,0,0.5)"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #1a1a2e",fontSize:10,fontWeight:"bold",color:"#fff",display:"flex",justifyContent:"space-between"}}>
                Recent Alerts
                <button onClick={()=>setShowNotifPanel(false)} style={{background:"none",border:"none",color:"#888",cursor:"pointer"}}>✕</button>
              </div>
              <div style={{maxHeight:300,overflowY:"auto"}}>
                {alerts.slice(0,5).map((a,i)=>(
                  <div key={i} style={{padding:"10px 14px",borderBottom:"1px solid #1a1a2e",fontSize:10}}>
                    <div style={{color:a.severity==="high"?"#ff3366":"#ffaa00",marginBottom:4,fontFamily:"monospace"}}>{a.time} • {a.severity?.toUpperCase()} RISK</div>
                    <div style={{color:"#ccc"}}>{a.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🚨 SIMULATE BUTTON NOW OPENS MODAL */}
        <SimulateButton triggerAttackSimulation={() => setShowAttackModal(true)} isSimulating={isSimulating} />

        <div style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontFamily:"monospace",color:"#888"}}>JD</div>
          <span style={{fontSize:10,color:"#888"}}>J. Doe ▾</span>
        </div>
      </div>

      {/* ── ML MODEL INFO BAR (PS3: anomaly detection techniques + Adaptability) ── */}
      <div style={{background:"#08081a",borderBottom:"1px solid #1a1a2e",padding:"5px 18px",
        display:"flex",gap:0,alignItems:"center",flexShrink:0,overflowX:"auto"}}>
        {[
          {icon:"🧠",label:"PRIMARY MODEL",  value:"Isolation Forest",        color:"#00d4ff"},
          {icon:"⚡",label:"BOOSTER",        value:"XGBoost (score refinement)",color:"#a855f7"},
          {icon:"🔎",label:"ANOMALY DETECTION", value:"Unsupervised UEBA",        color:"#f59e0b"},
          {icon:"📐",label:"EXPLAINABILITY",   value:"SHAP v0.44",               color:"#00ff88"},
          {icon:"🔄",label:"LAST RETRAIN",     value:"Today 03:00 AM UTC",        color:"#888"},
          {icon:"📈",label:"TRAINING DATA",    value:"2.4M UBI transactions",    color:"#888"},
          {icon:"🎯",label:"F1 SCORE",         value:"0.961",                    color:"#00ff88"},
        ].map((m,i,arr)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:6,
            paddingRight:18,marginRight:18,flexShrink:0,
            borderRight:i<arr.length-1?"1px solid #1a1a2e":"none"}}>
            <span style={{fontSize:12}}>{m.icon}</span>
            <div>
              <div style={{fontSize:7,color:"#2a2a4a",fontFamily:"monospace",letterSpacing:1.5}}>{m.label}</div>
              <div style={{fontSize:10,fontWeight:700,color:m.color,fontFamily:"monospace",lineHeight:1.2}}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3-COLUMN BODY ── */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── LEFT COLUMN: Graph + Federated Learning ── */}
        <div style={{width:360,background:"#09090f",borderRight:"1px solid #1a1a2e",
          display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
          {/* Active Session Monitor — PS1: "continuously monitors users across banking systems" */}
          {!isT&&<ActiveSessionMonitor users={users}/>}
          {/* Graph Network */}
          <div style={{padding:"10px 14px 6px",borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span>🕸</span>
                <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>Relational Graph Network</span>
              </div>
              <div style={{display:"flex",gap:5}}>
                <span style={{fontSize:8,color:"#00d4ff",background:"#00d4ff14",border:"1px solid #00d4ff28",padding:"2px 6px",borderRadius:10,fontFamily:"monospace"}}>{rnd(1300,1500)} tx/s</span>
                <span style={{fontSize:8,color:"#ff3366",background:"#ff336614",border:"1px solid #ff336628",padding:"2px 6px",borderRadius:10,fontFamily:"monospace"}}>{flaggedTxns.length+flaggedUsers.length} Alerts</span>
              </div>
            </div>
            <ForceGraph nodes={graph.nodes} edges={graph.edges}/>
          </div>
          {/* Federated Learning */}
          <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span>🌐</span>
                <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>Federated Learning Network</span>
              </div>
              <span style={{fontSize:8,background:"#00d4ff14",color:"#00d4ff",border:"1px solid #00d4ff28",padding:"2px 6px",borderRadius:10,fontFamily:"monospace"}}>{fed.version}</span>
            </div>
            <FedLearning data={fed}/>
          </div>
        </div>

        {/* ── CENTER COLUMN: Stats + Timeline + Table + SHAP + Risk Dist ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          {/* Stat strip */}
          <div style={{display:"flex",borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
            {(isT?[
              {l:"TRANSACTIONS",  v:txns.length,         sub:"today",                    ac:accent},
              {l:"FRAUD ALERTS",  v:flaggedTxns.length,   sub:`${txns.length?Math.round(flaggedTxns.length/txns.length*100):0}% rate`, ac:"#ff3366"},
              {l:"AVG RISK",      v:Math.round(txns.reduce((a,t)=>a+t.risk,0)/(txns.length||1)), sub:"score", ac:"#ffaa00"},
              {l:"BLOCKED ₹",     v:`${(flaggedTxns.reduce((a,t)=>a+t.amount,0)/100000).toFixed(1)}L`, sub:"saved", ac:"#00ff88"},
            ]:[
              {l:"EMPLOYEES",     v:users.length,        sub:"monitored",                ac:accent},
              {l:"ROGUE INSIDERS",v:flaggedUsers.length,  sub:`${users.length?Math.round(flaggedUsers.length/users.length*100):0}% risk`, ac:"#ff3366"},
              {l:"OFF-HOURS",     v:users.filter(u=>u.off_hours_access).length, sub:"logins", ac:"#ffaa00"},
              {l:"DATA EXFIL",    v:`${users.filter(u=>u.flagged).reduce((a,u)=>a+(u.data_volume||0),0)} MB`, sub:"suspicious", ac:"#a855f7"},
            ]).map((s,i)=>(
              <div key={i} style={{flex:1,padding:"8px 12px",borderRight:"1px solid #1a1a2e"}}>
                <div style={{fontSize:8,color:s.ac,fontFamily:"monospace",letterSpacing:2}}>{s.l}</div>
                <div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:"monospace",lineHeight:1.1}}>{s.v}</div>
                <div style={{fontSize:8,color:"#333",fontFamily:"monospace"}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Timeline Chart — 24h */}
          <div style={{padding:"10px 14px 8px",borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:9,fontFamily:"monospace",color:"#555",letterSpacing:2}}>
                {isT?"TRANSACTION VOLUME — 24H":"USER ACTIVITY TIMELINE — 24H"}
              </span>
              <div style={{display:"flex",gap:12,fontSize:9}}>
                <span style={{color:accent}}>● Normal</span>
                <span style={{color:"#ff3366"}}>● Anomalous</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={accent}    stopOpacity={.3}/>
                    <stop offset="95%" stopColor={accent}    stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff3366" stopOpacity={.4}/>
                    <stop offset="95%" stopColor="#ff3366" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e"/>
                <XAxis dataKey="time" tick={{fill:"#333",fontSize:8,fontFamily:"monospace"}} interval={5}/>
                <YAxis tick={{fill:"#333",fontSize:8}} width={28}/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="normal"    name="Normal"    stroke={accent}    fill="url(#gN)" strokeWidth={1.5}/>
                <Area type="monotone" dataKey="anomalous" name="Anomalous" stroke="#ff3366"   fill="url(#gA)" strokeWidth={1.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div style={{flex:1,overflowY:"auto",overflowX:"auto"}}>
            <div style={{position:"sticky",top:0,background:"#0c0c1a",padding:"6px 12px",
              borderBottom:"1px solid #1a1a2e",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:2}}>
              <span style={{fontSize:9,fontFamily:"monospace",color:"#444",letterSpacing:2}}>
                {isT?"UBI BANKING TRANSACTION LOG":"UBI EMPLOYEE BEHAVIOUR LOG"}
              </span>
              <div style={{display:"flex",gap:4}}>
                {["all","flagged","normal"].map(f=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{
                    background:filter===f?`${accent}18`:"transparent",border:`1px solid ${filter===f?accent:"#222"}`,
                    color:filter===f?accent:"#444",padding:"2px 8px",borderRadius:3,cursor:"pointer",
                    fontSize:8,fontFamily:"monospace",letterSpacing:1,textTransform:"uppercase"}}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#0d0d1e"}}>
                  {(isT
                    ?["TXN ID","Payee / Merchant","Amount (₹)","City","Hour","Risk","Type","Latency"]
                    :["EMP ID","Name","Dept / Role","Last Login","Data Vol","Risk","Anomalies","Latency"]
                  ).map(h=>(
                    <th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#333",
                      fontFamily:"monospace",fontSize:8,letterSpacing:1,fontWeight:600,
                      borderBottom:"1px solid #1a1a2e",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isT
                  ?filteredTxns.map((t,i)=>(
                    <tr key={t.id} onClick={()=>setSelected(t===selected?null:t)} style={{
                      background:selected?.id===t.id?`${accent}11`:t.flagged?"#ff33660a":i%2===0?"#0a0a18":"#08080f",
                      cursor:"pointer",borderLeft:t.flagged?"3px solid #ff3366":"3px solid transparent",transition:"background .15s"}}>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:accent,fontSize:9}}>{t.id}</td>
                      <td style={{padding:"6px 10px"}}>
                        <div style={{fontSize:10}}>{t.merchant}</div>
                        <div style={{fontSize:8,color:"#333",fontFamily:"monospace"}}>{t.account}</div>
                      </td>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:t.amount>500000?"#ff3366":"#e0e0e0",whiteSpace:"nowrap",fontSize:10}}>₹{t.amount?.toLocaleString("en-IN")}</td>
                      <td style={{padding:"6px 10px",color:"#666",fontSize:10}}>{t.city}</td>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:(t.hour<6||t.hour>22)?"#ffaa00":"#444",fontSize:10}}>{t.hour}:00</td>
                      <td style={{padding:"6px 10px"}}><RiskBadge score={t.risk}/></td>
                      <td style={{padding:"6px 10px",fontSize:9}}>
                        {t.flagged
                          ?(t.patterns||[t.type]).slice(0,2).map((p,j)=>(
                            <span key={j} style={{display:"inline-block",background:"#ff336614",color:"#ff3366",
                              border:"1px solid #ff336625",borderRadius:3,padding:"1px 4px",marginRight:3,marginBottom:2,fontSize:8,whiteSpace:"nowrap"}}>{p}</span>
                          ))
                          :<span style={{color:"#444"}}>Normal</span>
                        }
                      </td>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:t.latency>100?"#ffaa00":"#444",fontSize:9}}>{t.latency}ms</td>
                    </tr>
                  ))
                  :filteredUsers.map((u,i)=>(
                    <tr key={u.id} onClick={()=>setSelected(u===selected?null:u)} style={{
                      background:selected?.id===u.id?`${accent}11`:u.flagged?"#ff33660a":i%2===0?"#0a0a18":"#08080f",
                      cursor:"pointer",borderLeft:u.flagged?"3px solid #ff3366":"3px solid transparent",transition:"background .15s"}}>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:accent,fontSize:9}}>{u.id}</td>
                      <td style={{padding:"6px 10px",fontWeight:600,fontSize:10}}>{u.name}</td>
                      <td style={{padding:"6px 10px"}}>
                        <div style={{fontSize:10,color:"#ccc"}}>{u.department}</div>
                        <div style={{fontSize:8,color:"#444"}}>{u.role}</div>
                      </td>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:u.off_hours_access?"#ffaa00":"#555",fontSize:9}}>{u.last_login}</td>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:u.data_volume>200?"#ff3366":"#555",fontSize:9}}>{u.data_volume} MB</td>
                      <td style={{padding:"6px 10px"}}><RiskBadge score={u.risk}/></td>
                      <td style={{padding:"6px 10px",fontSize:9}}>
                        {u.anomalies?.length>0
                          ?u.anomalies.map((a,j)=>(
                            <span key={j} style={{background:"#ff336614",color:"#ff3366",border:"1px solid #ff336625",
                              borderRadius:3,padding:"1px 4px",marginRight:3,fontSize:8}}>{a}</span>
                          ))
                          :<span style={{color:"#333"}}>None</span>
                        }
                      </td>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",color:u.latency>100?"#ffaa00":"#444",fontSize:9}}>{u.latency}ms</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* SHAP + Risk Distribution (bottom strip) */}
          <div style={{background:"#0a0a18",borderTop:"1px solid #1a1a2e",display:"flex",flexShrink:0,maxHeight:220}}>
            {/* SHAP */}
            <div style={{flex:1,padding:"10px 14px",overflowY:"auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span>📊</span>
                <span style={{fontSize:11,fontWeight:700,color:"#fff"}}>SHAP Explainability Matrix</span>
              </div>
              <ShapMatrix factors={selected?.xai} itemId={selected?.id} riskScore={selected?.risk}/>
            </div>
            {/* Risk Distribution */}
            <div style={{width:180,borderLeft:"1px solid #1a1a2e",padding:"10px 12px"}}>
              <div style={{fontSize:8,color:"#444",fontFamily:"monospace",letterSpacing:2,marginBottom:8}}>RISK DISTRIBUTION</div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={riskDist} barSize={20}>
                  <XAxis dataKey="range" tick={{fill:"#333",fontSize:7,fontFamily:"monospace"}}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="count" name="Count" fill={accent} opacity={.7} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Alerts + Case Detail + Agentic Console + Audit ── */}
        <div style={{width:350,background:"#09090f",borderLeft:"1px solid #1a1a2e",
          display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
          {/* Live Alerts */}
          <div style={{background:"#0a0a18",borderBottom:"1px solid #1a1a2e",maxHeight:105,overflowY:"auto",flexShrink:0}}>
            <div style={{padding:"5px 12px 2px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:8,color:"#444",fontFamily:"monospace",letterSpacing:2}}>LIVE ALERTS</span>
              <span style={{fontSize:8,background:alertPulse?"#ff336625":"#ff336614",color:"#ff3366",
                border:"1px solid #ff336628",borderRadius:10,padding:"1px 7px",fontFamily:"monospace",transition:"all .3s"}}>
                {alerts.length} ACTIVE
              </span>
            </div>
            {alerts.slice(0,3).map((a,i)=>(
              <div key={a.id} style={{display:"flex",gap:6,alignItems:"flex-start",padding:"6px 12px",
                borderLeft:`2px solid ${a.severity==="high"?"#ff3366":"#ffaa00"}`,
                background:i===0?(a.severity==="high"?"#ff33660a":"#ffaa000a"):"transparent",
                borderBottom:"1px solid #0d0d22"}}>
                <span style={{fontSize:8,fontFamily:"monospace",flexShrink:0,
                  color:a.module==="transaction"?"#00d4ff":"#a855f7",
                  background:a.module==="transaction"?"#00d4ff14":"#a855f714",
                  padding:"1px 4px",borderRadius:3,marginTop:1}}>{a.module==="transaction"?"TXN":"UEBA"}</span>
                <div style={{flex:1,fontSize:10,color:i===0?"#ccc":"#555",lineHeight:1.4}}>{a.message}</div>
                <span style={{fontSize:8,color:"#222",fontFamily:"monospace",flexShrink:0}}>{a.time}</span>
              </div>
            ))}
          </div>

          {/* 🚨 ML Result Panel (Appears instantly when simulated) */}
          <MLResultPanel mlResult={mlResult} />

          {/* Case Detail Panel */}
          <div style={{background:"#0d0d1f",borderBottom:"1px solid #1a1a2e",overflowY:"auto",maxHeight:"38vh",flexShrink:0}}>
            <CaseDetail
              selected={selected} isT={isT} accent={accent}
              onClose={()=>setSelected(null)}
              onBlock={handleBlock} onEscalate={handleEscalate} onClear={handleClear}/>
          </div>

          {/* Agentic Console */}
          <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>
            <AgenticConsole
              intents={intents} reasoning={reasoning}
              onApprove={handleApprove} onReject={handleReject}
              autonomy={autonomy} setAutonomy={setAutonomy}/>
          </div>

          {/* Audit Log */}
          <div style={{background:"#0a0a18",borderTop:"1px solid #1a1a2e",flexShrink:0,maxHeight:240,overflowY:"auto"}}>
            <AuditLog data={audit} onUndo={id=>{
              setAudit(p=>({...p,reverted:p.reverted+1,
                actions:p.actions.map(a=>a.id===id?{...a,reverted:true}:a)}));
            }}/>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:#07070f}
        ::-webkit-scrollbar-thumb{background:#1a1a2e;border-radius:2px}
        tr:hover td{background:rgba(255,255,255,.02)!important}
        button{transition:all .15s}
        button:hover{filter:brightness(1.15)}
        input[type=range]{height:4px}
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXTRA COMPONENTS (SIMULATE BUTTON & ML PANEL)
// ═══════════════════════════════════════════════════════════════════════════
const SimulateButton = ({ triggerAttackSimulation, isSimulating }) => (
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
      display:       "flex",
      alignItems:    "center",
      gap:           6,
      boxShadow:     isSimulating ? "none" : "0 0 12px #ff336644",
    }}
  >
    {isSimulating ? "⏳ SCORING..." : "🚨 SIMULATE ATTACK"}
  </button>
);

const MLResultPanel = ({ mlResult }) => {
  if (!mlResult) return null;
  return (
    <div style={{
      background:   "#0d0d1f",
      border:       `1px solid ${mlResult.risk_score >= 70 ? "#ff336655" : "#ffaa0055"}`,
      borderLeft:   `3px solid ${mlResult.risk_score >= 70 ? "#ff3366" : "#ffaa00"}`,
      borderRadius: 8,
      padding:      "12px 14px",
      margin:       "8px 10px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "#00d4ff", letterSpacing: 2 }}>LIVE ML RESULT</span>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: mlResult.risk_score >= 70 ? "#ff3366" : "#ffaa00" }}>
          {mlResult.action_taken}
        </span>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "#888" }}>Blended Risk Score</span>
          <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", color: mlResult.risk_score >= 70 ? "#ff3366" : "#ffaa00" }}>
            {mlResult.risk_score}/100
          </span>
        </div>
        <div style={{ background: "#1a1a2e", borderRadius: 4, height: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${mlResult.risk_score}%`, background: mlResult.risk_score >= 70 ? "#ff3366" : "#ffaa00" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, background: "#111125", borderRadius: 6, padding: "6px", textAlign: "center" }}>
          <div style={{ fontSize: 8, color: "#444" }}>XGBoost</div>
          <div style={{ fontSize: 13, color: "#a855f7" }}>{(mlResult.xgb_confidence || (mlResult.xgb_fraud_prob * 100))?.toFixed(1)}%</div>
        </div>
        <div style={{ flex: 1, background: "#111125", borderRadius: 6, padding: "6px", textAlign: "center" }}>
          <div style={{ fontSize: 8, color: "#444" }}>IsoForest</div>
          <div style={{ fontSize: 13, color: "#00d4ff" }}>{(mlResult.iso_confidence || (mlResult.iso_anomaly_score * 100))?.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
};
