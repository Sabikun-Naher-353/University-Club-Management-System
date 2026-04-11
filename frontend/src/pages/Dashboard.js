import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";

const SAPI = "http://localhost:5000/api/student";
const fmt  = d => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";

export default function Dashboard() {
  const navigate    = useNavigate();
  const { isDark }  = useTheme(); 

  const [user,    setUser]    = useState(null);
  const [section, setSection] = useState("explore");
  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [clubs,       setClubs]       = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [joining,     setJoining]     = useState({});
  const [uniName,     setUniName]     = useState("—");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { navigate("/login"); return; }
    const u = JSON.parse(raw);
    if (u.role !== "student") { navigate("/login"); return; }
    setUser(u);
  }, [navigate]);

  const uid = user?.university_id;
  const sid = user?.id;

  useEffect(() => {
    if (!uid) return;
    fetch("http://localhost:5000/api/admin/universities")
      .then(r => r.json())
      .then(list => { const found = list.find(u => u.id === uid); if (found) setUniName(found.name); })
      .catch(() => {});
  }, [uid]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadClubs = useCallback(async () => {
    if (!uid) return;
    try {
      const r = await fetch(`${SAPI}/clubs?university_id=${uid}`);
      const d = await r.json();
      if (r.ok) setClubs(d);
    } catch {}
  }, [uid]);

  const loadMemberships = useCallback(async () => {
    if (!sid) return;
    try {
      const r = await fetch(`${SAPI}/my-memberships?student_id=${sid}`);
      const d = await r.json();
      if (r.ok) setMemberships(d);
    } catch {}
  }, [sid]);

  useEffect(() => {
    if (!uid || !sid) return;
    loadClubs();
    loadMemberships();
  }, [uid, sid, loadClubs, loadMemberships]);

  const sendJoinRequest = async (clubId) => {
    const key = `c-${clubId}`;
    setJoining(j => ({ ...j, [key]: true }));
    try {
      const r = await fetch(`${SAPI}/join-request`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ student_id: sid, club_id: clubId }),
      });
      const d = await r.json();
      if (r.ok) { showToast("Join request sent ✓"); loadMemberships(); loadClubs(); }
      else       showToast(d.message || "Error", "error");
    } catch { showToast("Server error", "error"); }
    setJoining(j => ({ ...j, [key]: false }));
  };

  const cancelRequest = membershipId => {
    setConfirm({
      message: "Cancel this join request?",
      onConfirm: async () => {
        const r = await fetch(`${SAPI}/cancel-request/${membershipId}`, {
          method:"DELETE", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ student_id: sid }),
        });
        const d = await r.json();
        if (r.ok) { showToast("Request cancelled.", "info"); loadMemberships(); loadClubs(); }
        else       showToast(d.message || "Error", "error");
      }
    });
  };

  const getMembership = clubId => memberships.find(m => m.club_id === clubId);
  const logout = () => { localStorage.removeItem("user"); navigate("/login"); };

  const pendingCount = memberships.filter(m => m.membership_status === "pending").length;
  const navItems = [
    { id:"explore",     label:"Explore Clubs",  icon:"◈" },
    { id:"memberships", label:"My Memberships", icon:"◎", badge: pendingCount || null },
  ];

  if (!user) return null;

  return (
    <>
      <style>{pageStyles}</style>

      {/*BACKGROUND*/}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      {/*TOAST*/}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/*CONFIRM*/}
      {confirm && (
        <div className="overlay" onClick={e => { if (e.target.classList.contains("overlay")) setConfirm(null); }}>
          <div className="confirm-modal">
            <div style={{ fontSize:"2.2rem", marginBottom:16 }}>⚠️</div>
            <p style={{ fontSize:".9rem", color:"var(--text-soft)", lineHeight:1.75, marginBottom:28 }}>{confirm.message}</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button
                className="confirm-btn-danger"
                onClick={() => { confirm.onConfirm(); setConfirm(null); }}
              >Confirm</button>
              <button
                className="confirm-btn-ghost"
                onClick={() => setConfirm(null)}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-container">

        {/*SIDEBAR*/}
        <aside className="sidebar">

          {/*Logo*/}
          <div className="sidebar-logo">
            <div className="nav-logo-box">SC</div>
            <div>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.05rem", color:"var(--text)" }}>Societas</div>
              <div style={{ fontSize:".62rem", color:"var(--text-muted)", letterSpacing:".1em", textTransform:"uppercase" }}>Student Portal</div>
            </div>
          </div>

          {/*University*/}
          <div className="sidebar-uni">
            <div style={{ fontSize:".66rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:5 }}>University</div>
            <div style={{ fontSize:".85rem", color:"var(--mint)", fontWeight:600 }}>{uniName}</div>
          </div>

          {/*Nav*/}
          <nav style={{ flex:1, padding:"10px 0" }}>
            {navItems.map(item => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`sidebar-nav-btn${active ? " active" : ""}`}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/*User Footer*/}
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
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="sidebar-quick-btn"
                >{item.label}</button>
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

          {/*EXPLORE CLUBS*/}
          {section === "explore" && (
            <div className="section-wrap" style={{ animation:"fadeUp .5s ease both" }}>

              {/*Header*/}
              <div style={{ marginBottom:36 }}>
                <div className="section-eyebrow">Student Portal</div>
                <h1 className="section-title">
                  Explore <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Clubs</em>
                </h1>
                <p className="section-desc">Browse all clubs at your university and send a join request.</p>
              </div>

              {clubs.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize:"2.2rem", marginBottom:14, opacity:.4 }}>◈</div>
                  <p style={{ fontSize:".9rem", color:"var(--text-muted)" }}>No clubs available at your university yet.</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {clubs.map(club => {
                    const mem  = getMembership(club.id);
                    const cKey = `c-${club.id}`;
                    const full = club.max_seats > 0 && club.seats_available <= 0;

                    return (
                      <div
                        key={club.id}
                        className="club-card"
                        onClick={() => navigate(`/club/${club.id}`)}
                      >
                        {/*Club icon*/}
                        <div className="club-icon">◈</div>

                        {/*Info*/}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.05rem", color:"var(--text)", marginBottom:3 }}>{club.name}</div>
                          {club.description && (
                            <div style={{ fontSize:".78rem", color:"var(--text-muted)" }}>{club.description}</div>
                          )}
                        </div>

                        {/*Stats*/}
                        <div style={{ display:"flex", gap:20, flexShrink:0 }}>
                          <StatMini label="Members"    value={club.member_count}    color="#7B93D4" />
                          <StatMini label="Seats Left" value={club.seats_available} color={full ? "#F4845F" : "#3DBFA0"} />
                          <StatMini label="Capacity"   value={club.max_seats}       color="var(--text-muted)" />
                        </div>

                        {/*Action*/}
                        <div style={{ flexShrink:0, marginLeft:8 }} onClick={e => e.stopPropagation()}>
                          {mem ? (
                            <MembershipBadge
                              status={mem.membership_status}
                              onCancel={mem.membership_status === "pending" ? () => cancelRequest(mem.membership_id) : null}
                              isDark={isDark}
                            />
                          ) : full ? (
                            <span style={{ fontSize:".76rem", color:"#F4845F", fontWeight:600 }}>● Full</span>
                          ) : (
                            <button
                              disabled={joining[cKey]}
                              onClick={() => sendJoinRequest(club.id)}
                              className="join-btn"
                              style={{ opacity: joining[cKey] ? .6 : 1, cursor: joining[cKey] ? "not-allowed" : "pointer" }}
                            >{joining[cKey] ? "Sending…" : "Join Club"}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/*MEMBERSHIPS*/}
          {section === "memberships" && (
            <div className="section-wrap" style={{ animation:"fadeUp .5s ease both" }}>

              <div style={{ marginBottom:36 }}>
                <div className="section-eyebrow">Student Portal</div>
                <h1 className="section-title">
                  My <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Memberships</em>
                </h1>
                <p className="section-desc">Clubs you've joined or requested to join.</p>
              </div>

              {memberships.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize:"2.2rem", marginBottom:14, opacity:.4 }}>◎</div>
                  <p style={{ fontSize:".9rem", color:"var(--text-muted)", marginBottom:20 }}>You haven't joined any clubs yet.</p>
                  <button onClick={() => setSection("explore")} className="btn-primary" style={{ padding:"10px 28px" }}>
                    Explore Clubs →
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {memberships.map(m => (
                    <div
                      key={m.membership_id}
                      className="membership-card"
                      onClick={() => navigate(`/club/${m.club_id}`)}
                    >
                      <div className="membership-club-icon">◎</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1rem", color:"var(--text)", marginBottom:4 }}>{m.club_name}</div>
                        <div style={{ fontSize:".75rem", color:"var(--text-muted)" }}>
                          Club membership · Requested {fmt(m.requested_at)}
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                        <StatusBadge status={m.membership_status} isDark={isDark} />
                        {m.membership_status === "pending" && (
                          <button
                            onClick={() => cancelRequest(m.membership_id)}
                            className="cancel-btn"
                          >Cancel</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </>
  );
}

//Sub-components
function StatMini({ label, value, color }) {
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.1rem", fontWeight:400, color, lineHeight:1 }}>{value ?? "—"}</div>
      <div style={{ fontSize:".6rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".06em", marginTop:2, whiteSpace:"nowrap" }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const approved = status === "approved";
  return (
    <span style={{
      padding:"4px 12px", borderRadius:20, fontSize:".7rem", fontWeight:700,
      letterSpacing:".06em", textTransform:"uppercase",
      background: approved ? "rgba(61,191,160,0.12)" : "rgba(232,194,74,0.12)",
      color:       approved ? "#3DBFA0"               : "#E8C24A",
      border:`1.5px solid ${approved ? "rgba(61,191,160,0.3)" : "rgba(232,194,74,0.3)"}`,
    }}>{status}</span>
  );
}

function MembershipBadge({ status, onCancel }) {
  const approved = status === "approved";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <span style={{
        padding:"4px 12px", borderRadius:20, fontSize:".7rem", fontWeight:700,
        letterSpacing:".06em", textTransform:"uppercase",
        background: approved ? "rgba(61,191,160,0.12)" : "rgba(232,194,74,0.12)",
        color:       approved ? "#3DBFA0"               : "#E8C24A",
        border:`1.5px solid ${approved ? "rgba(61,191,160,0.3)" : "rgba(232,194,74,0.3)"}`,
      }}>
        {approved ? "✓ Joined" : "⏳ Pending"}
      </span>
      {onCancel && (
        <button onClick={onCancel} style={{
          background:"none", border:"none", cursor:"pointer",
          color:"#F4845F", fontSize:".72rem", textDecoration:"underline",
          fontFamily:"'DM Sans',sans-serif", padding:0,
        }}>cancel</button>
      )}
    </div>
  );
}

//Styles
const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  /*LIGHT THEME*/
  body.theme-light {
    --mint:         #3DBFA0;
    --mint-light:   #E8F5F0;
    --mint-mid:     #5ECDB3;
    --mint-dark:    #2A9E83;
    --text:         #2A3B35;
    --text-soft:    #6B7F78;
    --text-muted:   #9DB5AE;
    --border:       #DCE9E5;
    --border-h:     #A8D4CB;
    --sidebar-bg:   rgba(255,255,255,0.95);
    --main-bg:      transparent;
    --card-bg:      rgba(255,255,255,0.92);
    --card-hover:   rgba(240,250,247,0.95);
    --surface2:     #F7F9F8;
    --shadow:       0 2px 12px rgba(61,191,160,0.08);
    --shadow-lg:    0 6px 28px rgba(61,191,160,0.14);
  }

  /*DARK THEME*/
  body.theme-dark {
    --mint:         #3DBFA0;
    --mint-light:   rgba(61,191,160,0.15);
    --mint-mid:     #5ECDB3;
    --mint-dark:    #2A9E83;
    --text:         #dde4ee;
    --text-soft:    #8fa0b5;
    --text-muted:   #5e738a;
    --border:       rgba(196,178,140,0.10);
    --border-h:     rgba(196,178,140,0.28);
    --sidebar-bg:   rgba(17,32,48,0.95);
    --main-bg:      transparent;
    --card-bg:      rgba(22,32,48,0.95);
    --card-hover:   rgba(29,44,63,0.98);
    --surface2:     #1d2c3f;
    --shadow:       0 2px 12px rgba(0,0,0,0.20);
    --shadow-lg:    0 6px 28px rgba(0,0,0,0.35);
  }

  html, body {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    transition: background .3s, color .3s;
  }

  /*BACKGROUND */
  .bg-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    transition: opacity .3s;
  }

  /*Light background*/
  body.theme-light .bg-canvas::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #f0ebe3;
  }
  body.theme-light .bg-canvas::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 55%; height: 55%;
    background: #c9a8b2;
    clip-path: polygon(45% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
  body.theme-light .bg-bottom-accent {
    background: #ddb8c0;
  }

  /*Dark background*/
  body.theme-dark .bg-canvas::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #0a1520;
  }
  body.theme-dark .bg-canvas::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 55%; height: 55%;
    background: #0f2535;
    clip-path: polygon(45% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
  body.theme-dark .bg-bottom-accent {
    background: #0d1e30;
  }

  .bg-bottom-accent {
    position: absolute;
    bottom: 0; left: 0;
    width: 40%; height: 35%;
    clip-path: polygon(0% 0%, 100% 100%, 0% 100%);
  }
  .bg-noise {
    position: absolute;
    inset: 0;
    opacity: 0.035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size: 200px 200px;
  }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes toastIn { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes modalIn { from{opacity:0;transform:scale(.96) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }

  .toast {
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    padding: 12px 20px; border-radius: 12px; font-size: .84rem; font-weight: 500;
    animation: toastIn .3s ease both; backdrop-filter: blur(12px);
    box-shadow: var(--shadow-lg);
  }
  .toast-success { background:rgba(61,191,160,0.12); border:1.5px solid rgba(61,191,160,0.35); color:#3DBFA0; }
  .toast-error   { background:rgba(244,132,95,0.12);  border:1.5px solid rgba(244,132,95,0.35);  color:#F4845F; }
  .toast-info    { background:rgba(123,147,212,0.12); border:1.5px solid rgba(123,147,212,0.35); color:#7B93D4; }

  .overlay {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(10,21,32,0.65); backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }

  /*CONFIRM*/
  .confirm-modal {
    background: var(--card-bg); border: 1.5px solid var(--border);
    border-radius: 20px; padding: 36px;
    max-width: 380px; width: 100%; text-align: center;
    animation: modalIn .3s cubic-bezier(.22,1,.36,1) both;
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(20px);
  }
  .confirm-btn-danger {
    padding: 10px 26px; background: #F4845F; color: white;
    border: none; border-radius: 10px; cursor: pointer;
    font-family: 'DM Sans',sans-serif; font-size: .85rem; font-weight: 600;
    transition: background .2s;
  }
  .confirm-btn-danger:hover { background: #e06840; }
  .confirm-btn-ghost {
    padding: 10px 26px; background: transparent; color: var(--text-muted);
    border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer;
    font-family: 'DM Sans',sans-serif; font-size: .85rem;
    transition: border-color .2s;
  }
  .confirm-btn-ghost:hover { border-color: var(--border-h); }

  /*PAGE*/
  .page-container {
    display: flex;
    min-height: 100vh;
    position: relative;
    z-index: 1;
  }

  /*SIDEBAR*/
  .sidebar {
    width: 248px; flex-shrink: 0;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    position: sticky; top: 0; height: 100vh; overflow-y: auto;
    transition: background .3s, border-color .3s;
    backdrop-filter: blur(20px);
  }

  .sidebar-logo {
    display: flex; align-items: center; gap: 12px;
    padding: 24px 20px 20px;
    border-bottom: 1px solid var(--border);
  }

  .nav-logo-box {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--mint); color: white;
    font-family: 'DM Serif Display',serif; font-size: 1rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(61,191,160,0.30);
  }

  .sidebar-uni {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
  }

  /*SIDEBAR*/
  .sidebar-nav-btn {
    width: 100%; padding: 11px 20px;
    background: transparent; border: none;
    border-left: 2.5px solid transparent;
    cursor: pointer; text-align: left;
    display: flex; align-items: center; gap: 12px;
    transition: background .15s, border-color .15s;
    font-family: 'DM Sans', sans-serif;
  }
  .sidebar-nav-btn:hover { background: var(--mint-light); }
  .sidebar-nav-btn.active {
    background: var(--mint-light);
    border-left-color: var(--mint);
  }
  .sidebar-nav-icon { font-size: .9rem; color: var(--text-muted); }
  .sidebar-nav-btn.active .sidebar-nav-icon { color: var(--mint); }
  .sidebar-nav-label { font-size: .85rem; color: var(--text-soft); font-weight: 400; }
  .sidebar-nav-btn.active .sidebar-nav-label { color: var(--text); font-weight: 600; }
  .sidebar-badge {
    margin-left: auto; background: rgba(232,194,74,0.18); color: #E8C24A;
    border-radius: 20px; font-size: .65rem; font-weight: 700; padding: 2px 8px;
  }

  /*SIDEBAR FOOTER*/
  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
  }
  .sidebar-quick-btn {
    width: 100%; padding: 9px 12px;
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 10px; color: var(--text-soft);
    cursor: pointer; font-size: .8rem; font-family: 'DM Sans',sans-serif;
    text-align: left; transition: border-color .2s, color .2s;
  }
  .sidebar-quick-btn:hover { border-color: var(--mint); color: var(--mint); }
  .sidebar-logout-btn {
    flex: 1; padding: 9px 12px;
    background: rgba(244,132,95,0.08); border: 1.5px solid rgba(244,132,95,0.25);
    border-radius: 10px; color: #F4845F;
    cursor: pointer; font-size: .8rem; font-family: 'DM Sans',sans-serif;
    transition: background .2s;
  }
  .sidebar-logout-btn:hover { background: rgba(244,132,95,0.15); }

  /*MAIN CONTENT*/
  .main-content {
    flex: 1; overflow-y: auto;
    background: var(--main-bg);
    transition: background .3s;
  }

  /*SECTION WRAP*/
  .section-wrap { padding: 44px 48px; }

  .section-eyebrow {
    font-size: .7rem; font-weight: 600; color: var(--mint);
    letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;
  }
  .section-title {
    font-family: 'DM Serif Display',serif;
    font-size: 2.2rem; font-weight: 400;
    color: var(--text); letter-spacing: -.02em; margin-bottom: 8px;
  }
  .section-desc { font-size: .88rem; color: var(--text-muted); }

  /*EMPTY STATE*/
  .empty-state {
    text-align: center; padding: 64px 24px;
    background: var(--card-bg); border-radius: 18px;
    border: 1.5px solid var(--border);
    backdrop-filter: blur(20px);
  }

  /*CLUB CARD*/
  .club-card {
    background: var(--card-bg); border: 1.5px solid var(--border);
    border-radius: 14px; overflow: hidden;
    padding: 20px 24px; display: flex; align-items: center; gap: 16px;
    cursor: pointer; transition: border-color .2s, background .2s, transform .2s;
    box-shadow: var(--shadow);
    backdrop-filter: blur(20px);
  }
  .club-card:hover {
    border-color: var(--border-h);
    background: var(--card-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  .club-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--mint-light); border: 1.5px solid rgba(61,191,160,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; color: var(--mint); flex-shrink: 0;
  }

  /*JOIN BUTTON*/
  .join-btn {
    padding: 8px 18px;
    background: var(--mint-light); color: var(--mint);
    border: 1.5px solid rgba(61,191,160,0.35);
    border-radius: 10px; font-size: .78rem; font-weight: 600;
    font-family: 'DM Sans',sans-serif;
    transition: background .2s, transform .2s;
  }
  .join-btn:hover:not(:disabled) {
    background: var(--mint); color: white;
    transform: translateY(-1px);
  }

  /*MEMBERSHIP CARD*/
  .membership-card {
    background: var(--card-bg); border: 1.5px solid var(--border);
    border-radius: 14px; padding: 18px 24px;
    display: flex; align-items: center; gap: 16px;
    cursor: pointer; transition: border-color .2s, background .2s, transform .2s;
    box-shadow: var(--shadow);
    backdrop-filter: blur(20px);
  }
  .membership-card:hover {
    border-color: var(--border-h);
    background: var(--card-hover);
    transform: translateY(-2px);
  }
  .membership-club-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--mint-light); border: 1.5px solid rgba(61,191,160,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; color: var(--mint); flex-shrink: 0;
  }

  /*CANCEL BUTTON*/
  .cancel-btn {
    padding: 5px 14px;
    background: rgba(244,132,95,0.08); color: #F4845F;
    border: 1.5px solid rgba(244,132,95,0.25); border-radius: 8px;
    cursor: pointer; font-size: .74rem; font-weight: 600;
    font-family: 'DM Sans',sans-serif; transition: background .2s;
  }
  .cancel-btn:hover { background: rgba(244,132,95,0.18); }

  /*PRIMARY BUTTON*/
  .btn-primary {
    padding: 12px 28px; border-radius: 12px; border: none;
    background: var(--mint); color: white; font-size: .88rem; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans',sans-serif;
    box-shadow: 0 4px 16px rgba(61,191,160,0.35);
    transition: background .2s, transform .2s;
  }
  .btn-primary:hover { background: var(--mint-dark); transform: translateY(-2px); }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  @media (max-width: 768px) {
    .sidebar { width: 200px; }
    .section-wrap { padding: 28px 24px; }
    .club-card > div[style*="gap:20"] { display: none; }
  }
`;
