import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";

const API = "http://localhost:5000/api/club";
const fmt = d => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";

export default function ClubRepDashboard() {
  const navigate    = useNavigate();
  useTheme();

  const [user,    setUser]    = useState(null);
  const [club,    setClub]    = useState(null);
  const [section, setSection] = useState("overview");
  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [stats,    setStats]    = useState(null);
  const [members,  setMembers]  = useState([]);
  const [joinReqs, setJoinReqs] = useState([]);

  const [memModal,    setMemModal]    = useState(false);
  const [memForm,     setMemForm]     = useState({ name:"", email:"", password:"" });
  const [memErrors,   setMemErrors]   = useState({});
  const [memBusy,     setMemBusy]     = useState(false);
  const [showMemPass, setShowMemPass] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { navigate("/login"); return; }
    const u = JSON.parse(raw);
    if (u.role !== "club_rep") { navigate("/login"); return; }
    setUser(u);
  }, [navigate]);

  const repId    = user?.id;
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const get = useCallback(async (path, setter) => {
    if (!repId) return;
    try {
      const r = await fetch(`${API}/${path}?rep_id=${repId}`);
      const d = await r.json();
      if (r.ok) setter(d);
    } catch {}
  }, [repId]);

  const loadClub     = useCallback(() => get("my-club",       setClub),     [get]);
  const loadStats    = useCallback(() => get("stats",         setStats),    [get]);
  const loadMembers  = useCallback(() => get("members",       setMembers),  [get]);
  const loadJoinReqs = useCallback(() => get("join-requests", setJoinReqs), [get]);

  useEffect(() => {
    if (!repId) return;
    loadClub(); loadStats(); loadMembers(); loadJoinReqs();
  }, [repId, loadClub, loadStats, loadMembers, loadJoinReqs]);

  useEffect(() => { if (repId) loadStats(); }, [section, repId, loadStats]);

  const approveMember = async (userId, name) => {
    const r = await fetch(`${API}/approve-member/${userId}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ rep_id: repId }),
    });
    const d = await r.json();
    if (r.ok) { showToast(`${name} has been approved successfully`); loadMembers(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  };

  const removeMember = (userId, name) => {
    setConfirm({
      message: `Are you sure you want to remove "${name}" from your club?`,
      onConfirm: async () => {
        const r = await fetch(`${API}/remove-member/${userId}`, {
          method:"DELETE", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ rep_id: repId }),
        });
        const d = await r.json();
        if (r.ok) { showToast("Member has been removed successfully."); loadMembers(); loadStats(); }
        else       showToast(d.message || "Error", "error");
      }
    });
  };

  const handleAddMember = async () => {
    const e = {};
    if (!memForm.name.trim())     e.name     = "Name is required";
    if (!memForm.email.trim())    e.email    = "Email is required";
    if (!memForm.password.trim()) e.password = "Password is required";
    if (Object.keys(e).length)   { setMemErrors(e); return; }
    setMemBusy(true);
    try {
      const r = await fetch(`${API}/add-member`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ rep_id: repId, ...memForm }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast("Member has been added successfully");
        setMemModal(false); setMemForm({ name:"", email:"", password:"" });
        loadMembers(); loadJoinReqs(); loadStats();
      } else {
        setMemErrors({ submit: d.message || "Error" });
      }
    } catch { setMemErrors({ submit: "Server error" }); }
    setMemBusy(false);
  };

  const approveJoin = async (membershipId, name) => {
    const r = await fetch(`${API}/approve-join/${membershipId}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ rep_id: repId }),
    });
    const d = await r.json();
    if (r.ok) { showToast(`${name} has been approved successfully`); loadJoinReqs(); loadMembers(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  };

  const rejectJoin = (membershipId, name) => {
    setConfirm({
      message: `Are you sure you want to reject the join request from "${name}"?`,
      onConfirm: async () => {
        const r = await fetch(`${API}/reject-join/${membershipId}`, {
          method:"DELETE", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ rep_id: repId }),
        });
        const d = await r.json();
        if (r.ok) { showToast("Request has been rejected.", "info"); loadJoinReqs(); loadStats(); }
        else       showToast(d.message || "Error", "error");
      }
    });
  };

  const logout        = () => { localStorage.removeItem("user"); navigate("/login"); };
  const closeMemModal = () => { setMemModal(false); setMemErrors({}); setMemForm({ name:"", email:"", password:"" }); };

  const navItems = [
    { id:"overview",  label:"Overview",      icon:"⬡" },
    { id:"joinreqs",  label:"Join Requests", icon:"◑", badge: joinReqs.length || null },
    { id:"members",   label:"Members",       icon:"◎", badge: members.filter(m => m.status === "pending").length || null },
  ];

  if (!user) return null;
  const noClub = !club;

  return (
    <>
      <style>{pageStyles}</style>

      {/*BACKGROUND*/}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      {/*TOAST*/}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/*CONFIRM*/}
      {confirm && (
        <div className="overlay" onClick={e => { if (e.target.classList.contains("overlay")) setConfirm(null); }}>
          <div className="confirm-modal">
            <div style={{ fontSize:"2.2rem", marginBottom:16 }}>⚠️</div>
            <p style={{ fontSize:".9rem", color:"var(--text-soft)", lineHeight:1.75, marginBottom:28 }}>{confirm.message}</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button className="confirm-btn-danger" onClick={() => { confirm.onConfirm(); setConfirm(null); }}>Confirm</button>
              <button className="confirm-btn-ghost"  onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/*ADD MEMBER*/}
      {memModal && (
        <div className="overlay" onClick={e => { if (e.target.classList.contains("overlay")) closeMemModal(); }}>
          <div className="confirm-modal" style={{ maxWidth:440, textAlign:"left" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:26 }}>
              <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.4rem", fontWeight:400, color:"var(--text)" }}>
                Add <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Member</em>
              </h2>
              <button onClick={closeMemModal} className="modal-close-btn">✕</button>
            </div>

            {[
              { key:"name",     label:"Full Name", type:"text",                              ph:"John Doe" },
              { key:"email",    label:"Email",     type:"email",                             ph:"member@example.com" },
              { key:"password", label:"Password",  type: showMemPass ? "text" : "password", ph:"Temporary password" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:18 }}>
                <label className="field-label">{f.label}</label>
                <div style={{ position:"relative" }}>
                  <input
                    type={f.type} placeholder={f.ph} value={memForm[f.key]}
                    onChange={e => { setMemForm(p => ({...p,[f.key]:e.target.value})); setMemErrors(p => ({...p,[f.key]:"",submit:""})); }}
                    className={`field-input${memErrors[f.key] ? " field-input-error" : ""}`}
                    onFocus={e => { e.target.style.borderColor = memErrors[f.key] ? "#F4845F" : "#3DBFA0"; e.target.style.boxShadow = "0 0 0 3px rgba(61,191,160,0.12)"; }}
                    onBlur={e  => { e.target.style.borderColor = memErrors[f.key] ? "#F4845F" : "var(--border)"; e.target.style.boxShadow = "none"; }}
                  />
                  {f.key === "password" && (
                    <button type="button" className="pass-toggle" onClick={() => setShowMemPass(s => !s)}>
                      {showMemPass ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
                {memErrors[f.key] && <span className="field-error">{memErrors[f.key]}</span>}
              </div>
            ))}

            {memErrors.submit && <div className="error-box" style={{ marginBottom:16 }}>{memErrors.submit}</div>}

            <div style={{ display:"flex", gap:12, marginTop:8 }}>
              <button className="btn-primary" onClick={handleAddMember} disabled={memBusy}
                style={{ flex:1, padding:"12px", opacity: memBusy ? .7 : 1, cursor: memBusy ? "not-allowed" : "pointer" }}>
                {memBusy ? "Adding…" : "Add Member"}
              </button>
              <button className="confirm-btn-ghost" onClick={closeMemModal} style={{ padding:"12px 20px" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/*LAYOUT*/}
      <div className="page-container">

        {/*SIDEBAR*/}
        <aside className="sidebar">

          {/*Logo*/}
          <div className="sidebar-logo">
            <div className="nav-logo-box">SC</div>
            <div>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.05rem", color:"var(--text)" }}>Societas</div>
              <div style={{ fontSize:".62rem", color:"var(--mint)", letterSpacing:".1em", textTransform:"uppercase", fontWeight:600 }}>Club Panel</div>
            </div>
          </div>

          {/*Club info*/}
          <div className="sidebar-uni">
            <div style={{ fontSize:".66rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:5 }}>Your Club</div>
            <div style={{ fontSize:".88rem", color:"var(--mint)", fontWeight:600, wordBreak:"break-word" }}>{club?.name || "—"}</div>
            {club?.university_name && <div style={{ fontSize:".75rem", color:"var(--text-muted)", marginTop:3 }}>{club.university_name}</div>}
          </div>

          {/*Nav*/}
          <nav style={{ flex:1, padding:"10px 0" }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`sidebar-nav-btn${section === item.id ? " active" : ""}`}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
                {item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
              </button>
            ))}
          </nav>

          {/*Footer*/}
          <div className="sidebar-footer">
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:".8rem", color:"var(--text-soft)", fontWeight:500, marginBottom:2 }}>{user?.name}</div>
              <div style={{ fontSize:".72rem", color:"var(--text-muted)", wordBreak:"break-word" }}>{user?.email}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
              {[
                { label:"📰 User Feed",    path:"/feed"    },
                { label:"📢 Notices", path:"/notices" },
                { label:"👤 My Profile", path:"/profile" },
                { label:"👥 User Directory",  path:"/users"   },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)} className="sidebar-quick-btn">{item.label}</button>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <button onClick={logout} className="sidebar-logout-btn">Sign Out</button>
              <ThemeToggle style={{ flexShrink:0 }} />
            </div>
          </div>
        </aside>

        {/*MAIN*/}
        <main className="main-content">

          {/*NO CLUB*/}
          {noClub && (
            <div className="section-wrap">
              <div className="empty-state" style={{ maxWidth:480, margin:"60px auto", animation:"fadeUp .5s ease both" }}>
                <div style={{ fontSize:"2.5rem", marginBottom:20 }}>⚠️</div>
                <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.7rem", fontWeight:400, marginBottom:12, color:"var(--text)" }}>Club Not Linked</h2>
                <p style={{ fontSize:".9rem", color:"var(--text-soft)", lineHeight:1.75, marginBottom:28 }}>
                  Your account is not linked to an approved club. Please contact your Varsity Administrator for assistance.
                </p>
                <button onClick={logout} className="btn-primary" style={{ padding:"12px 32px" }}>Sign Out</button>
              </div>
            </div>
          )}

          {/*OVERVIEW*/}
          {!noClub && section === "overview" && (
            <div className="section-wrap" style={{ animation:"fadeUp .5s ease both" }}>
              <div style={{ marginBottom:36 }}>
                <div className="section-eyebrow">Club Administration</div>
                <h1 className="section-title">
                  Welcome, <em style={{ fontStyle:"italic", color:"var(--mint)" }}>{user?.name?.split(" ")[0] || "Representative"}</em>
                </h1>
                <p className="section-desc">
                  Administration of <span style={{ color:"var(--mint)", fontWeight:600 }}>{club?.name}</span>
                  {club?.university_name && <span style={{ color:"var(--text-muted)" }}> · {club.university_name}</span>}
                </p>
              </div>

              {/*STAT CARDS*/}
              {stats && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16, marginBottom:32 }}>
                  {[
                    { label:"Active Members", value: stats.approvedMembers, accent:"#3DBFA0", bg:"rgba(61,191,160,0.10)",  icon:"◎", section:"members" },
                    { label:"Pending",        value: stats.pendingMembers,  accent:"#E8C24A", bg:"rgba(232,194,74,0.10)",  icon:"◐", section:"joinreqs" },
                  ].map(s => (
                    <div 
                      key={s.label} 
                      className="stat-card" 
                      onClick={() => setSection(s.section)}
                      style={{ cursor: "pointer" }}
                    >
                      <div style={{
                        width:44, height:44, borderRadius:12,
                        background:s.bg, border:`1.5px solid ${s.accent}33`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"1.2rem", color:s.accent, marginBottom:14,
                      }}>{s.icon}</div>
                      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2.2rem", fontWeight:400, color:s.accent, lineHeight:1, marginBottom:6 }}>{s.value ?? "—"}</div>
                      <div style={{ fontSize:".72rem", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".08em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/*PENDING ALERT*/}
              {stats?.pendingMembers > 0 && (
                <div style={{
                  background:"rgba(232,194,74,0.07)", border:"1.5px solid rgba(232,194,74,0.25)",
                  borderRadius:14, padding:"20px 24px", backdropFilter:"blur(20px)",
                  display:"flex", alignItems:"center", justifyContent:"space-between", gap:16,
                }}>
                  <div>
                    <div style={{ fontSize:".74rem", color:"#E8C24A", fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:5 }}>
                      ● {stats.pendingMembers} Pending Member{stats.pendingMembers > 1 ? "s" : ""}
                    </div>
                    <div style={{ fontSize:".85rem", color:"var(--text-soft)" }}>Members awaiting approval.</div>
                  </div>
                  <button
                    onClick={() => setSection("joinreqs")}
                    style={{ padding:"10px 22px", background:"rgba(232,194,74,0.15)", color:"#E8C24A", border:"1.5px solid rgba(232,194,74,0.3)", borderRadius:10, cursor:"pointer", fontSize:".82rem", fontWeight:600, whiteSpace:"nowrap", fontFamily:"'DM Sans',sans-serif", transition:"background .2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(232,194,74,0.28)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(232,194,74,0.15)"}
                  >Review →</button>
                </div>
              )}
            </div>
          )}

          {/*JOIN REQUESTS*/}
          {!noClub && section === "joinreqs" && (
            <div className="section-wrap" style={{ animation:"fadeUp .5s ease both" }}>
              <div style={{ marginBottom:36 }}>
                <div className="section-eyebrow">Club Administration</div>
                <h1 className="section-title">Join <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Requests</em></h1>
                <p className="section-desc">Students requesting to join your club.</p>
              </div>
              {joinReqs.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize:"2.2rem", marginBottom:14, opacity:.4 }}>◑</div>
                  <p style={{ fontSize:".9rem", color:"var(--text-muted)" }}>No pending join requests at this time.</p>
                </div>
              ) : (
                <DataTable
                  headers={["Student", "Email", "Requested", ""]}
                  rows={joinReqs.map(r => [
                    <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:".98rem", color:"var(--text)" }}>{r.student_name}</span>,
                    <span style={{ fontSize:".82rem", color:"var(--text-muted)" }}>{r.student_email}</span>,
                    <span style={{ fontSize:".8rem", color:"var(--text-muted)" }}>{fmt(r.requested_at)}</span>,
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn-approve" onClick={() => approveJoin(r.membership_id, r.student_name)}>Approve</button>
                      <button className="btn-reject"  onClick={() => rejectJoin(r.membership_id, r.student_name)}>Reject</button>
                    </div>,
                  ])}
                />
              )}
            </div>
          )}

          {/*MEMBERS*/}
          {!noClub && section === "members" && (
            <div className="section-wrap" style={{ animation:"fadeUp .5s ease both" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, marginBottom:36 }}>
                <div>
                  <div className="section-eyebrow">Club Administration</div>
                  <h1 className="section-title">Club <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Members</em></h1>
                  <p className="section-desc">Approve, add, or remove members.</p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => { setMemModal(true); setMemErrors({}); }}
                  style={{ padding:"11px 22px", flexShrink:0, marginTop:8 }}
                >+ Add Member</button>
              </div>
              {members.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize:"2.2rem", marginBottom:14, opacity:.4 }}>◎</div>
                  <p style={{ fontSize:".9rem", color:"var(--text-muted)" }}>No members available at this time.</p>
                </div>
              ) : (
                <DataTable
                  headers={["Name", "Email", "Status", "Joined", ""]}
                  rows={members.map(m => [
                    <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:".98rem", color:"var(--text)" }}>{m.name}</span>,
                    <span style={{ fontSize:".82rem", color:"var(--text-muted)" }}>{m.email}</span>,
                    <StatusBadge status={m.membership_status || m.status} />,
                    <span style={{ fontSize:".8rem", color:"var(--text-muted)" }}>{fmt(m.created_at)}</span>,
                    <div style={{ display:"flex", gap:8 }}>
                      {m.status === "pending" && (
                        <button className="btn-approve" onClick={() => approveMember(m.id, m.name)}>Approve</button>
                      )}
                      <button className="btn-reject" onClick={() => removeMember(m.id, m.name)}>Remove</button>
                    </div>,
                  ])}
                />
              )}
            </div>
          )}

        </main>
      </div>
    </>
  );
}

//Sub-components
function DataTable({ headers, rows }) {
  return (
    <div style={{ background:"var(--card-bg)", borderRadius:18, border:"1.5px solid var(--border)", overflow:"hidden", boxShadow:"var(--shadow)", backdropFilter:"blur(20px)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ borderBottom:"1px solid var(--border)", background:"var(--surface2)" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding:"14px 22px", textAlign:"left", fontSize:".68rem", fontWeight:700, color:"var(--text-muted)", letterSpacing:".1em", textTransform:"uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}
              style={{ borderBottom: ri < rows.length - 1 ? "1px solid var(--border)" : "none", transition:"background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--card-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding:"14px 22px", verticalAlign:"middle" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const approved = status === "approved";
  return (
    <span style={{
      padding:"4px 12px", borderRadius:20, fontSize:".7rem", fontWeight:700,
      letterSpacing:".04em", textTransform:"capitalize",
      background: approved ? "rgba(61,191,160,0.12)" : "rgba(232,194,74,0.12)",
      color:       approved ? "#3DBFA0"               : "#E8C24A",
      border:`1.5px solid ${approved ? "rgba(61,191,160,0.3)" : "rgba(232,194,74,0.3)"}`,
    }}>{status}</span>
  );
}

//Styles
const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  /*LIGHT THEME*/
  body.theme-light {
    --mint:        #3DBFA0;
    --mint-light:  #E8F5F0;
    --mint-dark:   #2A9E83;
    --text:        #2A3B35;
    --text-soft:   #6B7F78;
    --text-muted:  #9DB5AE;
    --border:      #DCE9E5;
    --border-h:    #A8D4CB;
    --sidebar-bg:  rgba(255,255,255,0.95);
    --main-bg:     transparent;
    --card-bg:     rgba(255,255,255,0.92);
    --card-hover:  rgba(240,250,247,0.95);
    --surface2:    #F7F9F8;
    --shadow:      0 2px 12px rgba(61,191,160,0.08);
    --shadow-lg:   0 6px 28px rgba(61,191,160,0.14);
  }

  /*DARK THEME*/
  body.theme-dark {
    --mint:        #3DBFA0;
    --mint-light:  rgba(61,191,160,0.15);
    --mint-dark:   #2A9E83;
    --text:        #dde4ee;
    --text-soft:   #8fa0b5;
    --text-muted:  #5e738a;
    --border:      rgba(196,178,140,0.10);
    --border-h:    rgba(196,178,140,0.28);
    --sidebar-bg:  rgba(17,32,48,0.95);
    --main-bg:     transparent;
    --card-bg:     rgba(22,32,48,0.95);
    --card-hover:  rgba(29,44,63,0.98);
    --surface2:    #1d2c3f;
    --shadow:      0 2px 12px rgba(0,0,0,0.20);
    --shadow-lg:   0 6px 28px rgba(0,0,0,0.35);
  }

  html, body {
    font-family: 'DM Sans', sans-serif;
    color: var(--text); -webkit-font-smoothing: antialiased;
    transition: background .3s, color .3s;
  }

  /*BACKGROUND*/
  .bg-canvas { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; transition:opacity .3s; }

  body.theme-light .bg-canvas::before { content:''; position:absolute; inset:0; background:#f0ebe3; }
  body.theme-light .bg-canvas::after  {
    content:''; position:absolute; top:0; right:0; width:55%; height:55%;
    background:#c9a8b2; clip-path:polygon(45% 0%,100% 0%,100% 100%,0% 100%);
  }
  body.theme-light .bg-bottom-accent { background:#ddb8c0; }

  body.theme-dark .bg-canvas::before  { content:''; position:absolute; inset:0; background:#0a1520; }
  body.theme-dark .bg-canvas::after   {
    content:''; position:absolute; top:0; right:0; width:55%; height:55%;
    background:#0f2535; clip-path:polygon(45% 0%,100% 0%,100% 100%,0% 100%);
  }
  body.theme-dark .bg-bottom-accent { background:#0d1e30; }

  .bg-bottom-accent { position:absolute; bottom:0; left:0; width:40%; height:35%; clip-path:polygon(0% 0%,100% 100%,0% 100%); }
  .bg-noise {
    position:absolute; inset:0; opacity:0.035;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size:200px 200px;
  }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes toastIn { from{opacity:0;transform:translateX(24px)}  to{opacity:1;transform:translateX(0)} }
  @keyframes modalIn { from{opacity:0;transform:scale(.96) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }

  /*TOAST*/
  .toast {
    position:fixed; top:20px; right:20px; z-index:9999;
    padding:12px 20px; border-radius:12px; font-size:.84rem; font-weight:500;
    animation:toastIn .3s ease both; backdrop-filter:blur(12px); box-shadow:var(--shadow-lg);
  }
  .toast-success { background:rgba(61,191,160,0.12);  border:1.5px solid rgba(61,191,160,0.35);  color:#3DBFA0; }
  .toast-error   { background:rgba(244,132,95,0.12);  border:1.5px solid rgba(244,132,95,0.35);  color:#F4845F; }
  .toast-info    { background:rgba(123,147,212,0.12); border:1.5px solid rgba(123,147,212,0.35); color:#7B93D4; }

  /*OVERLAY*/
  .overlay {
    position:fixed; inset:0; z-index:9000;
    background:rgba(10,21,32,0.65); backdrop-filter:blur(10px);
    display:flex; align-items:center; justify-content:center; padding:24px;
  }

  /*CONFIRM*/
  .confirm-modal {
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:20px; padding:36px; max-width:400px; width:100%;
    text-align:center; animation:modalIn .3s cubic-bezier(.22,1,.36,1) both;
    box-shadow:var(--shadow-lg); backdrop-filter:blur(20px);
  }
  .confirm-btn-danger {
    padding:10px 26px; background:#F4845F; color:white;
    border:none; border-radius:10px; cursor:pointer;
    font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:600; transition:background .2s;
  }
  .confirm-btn-danger:hover { background:#e06840; }
  .confirm-btn-ghost {
    padding:10px 26px; background:transparent; color:var(--text-muted);
    border:1.5px solid var(--border); border-radius:10px; cursor:pointer;
    font-family:'DM Sans',sans-serif; font-size:.85rem; transition:border-color .2s;
  }
  .confirm-btn-ghost:hover { border-color:var(--border-h); }
  .modal-close-btn {
    background:var(--surface2); border:1.5px solid var(--border);
    border-radius:8px; padding:6px 10px; cursor:pointer;
    color:var(--text-muted); font-size:.9rem; transition:all .2s;
  }
  .modal-close-btn:hover { border-color:var(--mint); color:var(--mint); }

  /*PAGE*/
  .page-container { display:flex; min-height:100vh; position:relative; z-index:1; }

  /*SIDEBAR*/
  .sidebar {
    width:248px; flex-shrink:0;
    background:var(--sidebar-bg); border-right:1px solid var(--border);
    display:flex; flex-direction:column;
    position:sticky; top:0; height:100vh; overflow-y:auto;
    transition:background .3s, border-color .3s; backdrop-filter:blur(20px);
  }
  .sidebar-logo {
    display:flex; align-items:center; gap:12px;
    padding:24px 20px 20px; border-bottom:1px solid var(--border);
  }
  .nav-logo-box {
    width:36px; height:36px; border-radius:10px; background:var(--mint);
    color:white; font-family:'DM Serif Display',serif; font-size:1rem; font-weight:700;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    box-shadow:0 4px 12px rgba(61,191,160,0.30);
  }
  .sidebar-uni { padding:14px 20px; border-bottom:1px solid var(--border); }
  .sidebar-nav-btn {
    width:100%; padding:11px 20px; background:transparent; border:none;
    border-left:2.5px solid transparent; cursor:pointer; text-align:left;
    display:flex; align-items:center; gap:12px;
    transition:background .15s, border-color .15s; font-family:'DM Sans',sans-serif;
  }
  .sidebar-nav-btn:hover { background:var(--mint-light); }
  .sidebar-nav-btn.active { background:var(--mint-light); border-left-color:var(--mint); }
  .sidebar-nav-icon { font-size:.9rem; color:var(--text-muted); }
  .sidebar-nav-btn.active .sidebar-nav-icon { color:var(--mint); }
  .sidebar-nav-label { font-size:.85rem; color:var(--text-soft); font-weight:400; }
  .sidebar-nav-btn.active .sidebar-nav-label { color:var(--text); font-weight:600; }
  .sidebar-badge {
    margin-left:auto; background:rgba(232,194,74,0.18); color:#E8C24A;
    border-radius:20px; font-size:.65rem; font-weight:700; padding:2px 8px;
  }
  .sidebar-footer { padding:16px 20px; border-top:1px solid var(--border); }
  .sidebar-quick-btn {
    width:100%; padding:9px 12px; background:var(--surface2);
    border:1.5px solid var(--border); border-radius:10px; color:var(--text-soft);
    cursor:pointer; font-size:.8rem; font-family:'DM Sans',sans-serif;
    text-align:left; transition:border-color .2s, color .2s;
  }
  .sidebar-quick-btn:hover { border-color:var(--mint); color:var(--mint); }
  .sidebar-logout-btn {
    flex:1; padding:9px 12px; background:rgba(244,132,95,0.08);
    border:1.5px solid rgba(244,132,95,0.25); border-radius:10px; color:#F4845F;
    cursor:pointer; font-size:.8rem; font-family:'DM Sans',sans-serif; transition:background .2s;
  }
  .sidebar-logout-btn:hover { background:rgba(244,132,95,0.18); }

  .main-content { flex:1; overflow-y:auto; background:var(--main-bg); transition:background .3s; }
  .section-wrap { padding:44px 48px; }
  .section-eyebrow {
    font-size:.7rem; font-weight:600; color:var(--mint);
    letter-spacing:.12em; text-transform:uppercase; margin-bottom:8px;
  }
  .section-title {
    font-family:'DM Serif Display',serif; font-size:2.2rem; font-weight:400;
    color:var(--text); letter-spacing:-.02em; margin-bottom:8px;
  }
  .section-desc { font-size:.88rem; color:var(--text-muted); }

  .stat-card {
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:18px; padding:24px; box-shadow:var(--shadow);
    backdrop-filter:blur(20px);
    transition:border-color .2s, transform .2s, box-shadow .2s;
  }
  .stat-card:hover { border-color:var(--border-h); transform:translateY(-3px); box-shadow:var(--shadow-lg); }

  .empty-state {
    text-align:center; padding:64px 24px;
    background:var(--card-bg); border-radius:18px;
    border:1.5px solid var(--border); backdrop-filter:blur(20px);
  }

  /*BUTTONS*/
  .btn-primary {
    border-radius:12px; border:none; background:var(--mint); color:white;
    font-size:.88rem; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif;
    box-shadow:0 4px 16px rgba(61,191,160,0.35); transition:background .2s, transform .2s;
  }
  .btn-primary:hover:not(:disabled) { background:var(--mint-dark); transform:translateY(-2px); }
  .btn-approve {
    padding:7px 16px; background:rgba(61,191,160,0.12); color:#3DBFA0;
    border:1.5px solid rgba(61,191,160,0.3); border-radius:8px;
    font-family:'DM Sans',sans-serif; font-size:.78rem; font-weight:600;
    cursor:pointer; transition:background .2s;
  }
  .btn-approve:hover { background:rgba(61,191,160,0.25); }
  .btn-reject {
    padding:7px 16px; background:rgba(244,132,95,0.10); color:#F4845F;
    border:1.5px solid rgba(244,132,95,0.3); border-radius:8px;
    font-family:'DM Sans',sans-serif; font-size:.78rem; font-weight:600;
    cursor:pointer; transition:background .2s;
  }
  .btn-reject:hover { background:rgba(244,132,95,0.22); }

  /*FORM*/
  .field-label {
    font-size:.72rem; font-weight:600; color:var(--text-soft);
    letter-spacing:.08em; text-transform:uppercase; display:block; margin-bottom:7px;
  }
  .field-input {
    width:100%; background:var(--surface2); border:1.5px solid var(--border);
    border-radius:10px; padding:12px 14px; color:var(--text);
    font-family:'DM Sans',sans-serif; font-size:.9rem;
    outline:none; transition:border-color .2s, box-shadow .2s;
  }
  .field-input::placeholder { color:var(--text-muted); }
  .field-input-error { border-color:#F4845F !important; }
  .field-error { font-size:.75rem; color:#F4845F; display:block; margin-top:5px; font-weight:500; }
  .error-box {
    padding:12px 16px; border-radius:10px; font-size:.84rem; color:#F4845F;
    background:rgba(244,132,95,0.10); border:1.5px solid rgba(244,132,95,0.35);
  }
  .pass-toggle {
    position:absolute; right:12px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; color:var(--text-muted);
    font-size:.8rem; font-family:'DM Sans',sans-serif; font-weight:600;
    padding:4px 8px; border-radius:6px; transition:color .2s, background .2s;
  }
  .pass-toggle:hover { color:var(--mint); background:var(--mint-light); }

  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

  @media (max-width:768px) {
    .sidebar { width:200px; }
    .section-wrap { padding:28px 24px; }
  }
`;