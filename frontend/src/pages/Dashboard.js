import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

const SAPI = "http://localhost:5000/api/student";
const fmt  = d => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";

export default function Dashboard() {
  const navigate    = useNavigate();

  const [user,    setUser]    = useState(null);
  const [section, setSection] = useState("home");  
  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [clubs,         setClubs]         = useState([]);
  const [memberships,   setMemberships]   = useState([]);
  const [trendingClubs, setTrendingClubs] = useState([]);
  const [joining,       setJoining]       = useState({});
  const [uniName,       setUniName]       = useState("—");

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

  const loadTrendingClubs = useCallback(async () => {
    if (!uid) return;
    try {
      const r = await fetch(`${SAPI}/trending-clubs?university_id=${uid}`);
      const d = await r.json();
      if (r.ok) setTrendingClubs(d);
    } catch {}
  }, [uid]);

  useEffect(() => {
    if (!uid || !sid) return;
    loadClubs();
    loadMemberships();
    loadTrendingClubs();
  }, [uid, sid, loadClubs, loadMemberships, loadTrendingClubs]);

  const sendJoinRequest = async (clubId) => {
    const key = `c-${clubId}`;
    setJoining(j => ({ ...j, [key]: true }));
    try {
      const r = await fetch(`${SAPI}/join-request`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ student_id: sid, club_id: clubId }),
      });
      const d = await r.json();
      if (r.ok) { showToast("Join request sent ✓"); loadMemberships(); loadClubs(); loadTrendingClubs(); }
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
        if (r.ok) { showToast("Request cancelled.", "info"); loadMemberships(); loadClubs(); loadTrendingClubs(); }
        else       showToast(d.message || "Error", "error");
      }
    });
  };

  const getMembership = clubId => memberships.find(m => m.club_id === clubId);
  const logout = () => { localStorage.removeItem("user"); navigate("/login"); };

  const pendingCount = memberships.filter(m => m.membership_status === "pending").length;

  const firstName = user?.name?.split(" ")[0] || "Student";

  const navItems = [
    { id:"home",        label:"Home",          icon:"⌂"  },
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
        {/* Animated floating orbs */}
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
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
              <button className="confirm-btn-danger" onClick={() => { confirm.onConfirm(); setConfirm(null); }}>Confirm</button>
              <button className="confirm-btn-ghost"  onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-container">

        {/*SIDEBAR*/}
        <aside className="sidebar">

          <div className="sidebar-logo">
            <div className="nav-logo-box">SC</div>
            <div>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.05rem", color:"var(--text)" }}>Societas</div>
              <div style={{ fontSize:".62rem", color:"var(--text-muted)", letterSpacing:".1em", textTransform:"uppercase" }}>Student Portal</div>
            </div>
          </div>

          <div className="sidebar-uni">
            <div style={{ fontSize:".66rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:5 }}>University</div>
            <div style={{ fontSize:".85rem", color:"var(--mint)", fontWeight:600 }}>{uniName}</div>
          </div>

          <nav style={{ flex:1, padding:"10px 0" }}>
            {navItems.map((item, idx) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`sidebar-nav-btn${active ? " active" : ""}`}
                  style={{ animationDelay: `${idx * 0.08}s` }}
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

          <div className="sidebar-footer">
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:".8rem", color:"var(--text-soft)", fontWeight:500, marginBottom:2 }}>{user?.name}</div>
              <div style={{ fontSize:".72rem", color:"var(--text-muted)", wordBreak:"break-word" }}>{user?.email}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
              {[
                { label:"📰 User Feed",      path:"/feed"    },
                { label:"📢 Notices",        path:"/notices" },
                { label:"👤 My Profile",     path:"/profile" },
                { label:"👥 User Directory", path:"/users"   },
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

          {/*HOME */}
          {section === "home" && (
            <div className="section-wrap" style={{ animation:"fadeUp .5s ease both" }}>

              {/*Welcome*/}
              <div className="welcome-hero">
                <div className="welcome-badge">Student Portal</div>
                <h1 className="welcome-heading">
                  Welcome back,{" "}
                  <em className="welcome-name">{firstName}</em> 
                </h1>
                <p className="welcome-sub">
                  You're part of <strong style={{ color:"var(--mint)" }}>{uniName}</strong>.
                  Explore clubs, track your memberships, and stay connected.
                </p>

                {/* Quick stats row */}
                <div className="welcome-stats">
                  <WelcomeStat
                    value={clubs.length}
                    label="clubs available"
                    color="#7B93D4"
                    onClick={() => setSection("explore")}
                    delay="0s"
                  />
                  <WelcomeStat
                    value={memberships.filter(m => m.membership_status === "approved").length}
                    label="clubs joined"
                    color="#3DBFA0"
                    onClick={() => setSection("memberships")}
                    delay="0.1s"
                  />
                  <WelcomeStat
                    value={pendingCount}
                    label="pending requests"
                    color="#E8C24A"
                    onClick={() => setSection("memberships")}
                    delay="0.2s"
                  />
                </div>
              </div>

              <div style={{ marginTop:44 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                  <div>
                    <div className="section-eyebrow">Your University</div>
                    <h2 className="section-title" style={{ fontSize:"1.6rem", marginBottom:4 }}>
                      🔥 Trending <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Clubs</em>
                    </h2>
                    <p className="section-desc">Most popular clubs by membership this month.</p>
                  </div>
                  <button
                    onClick={() => setSection("explore")}
                    className="btn-ghost"
                  >
                    View all →
                  </button>
                </div>

                {trendingClubs.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ fontSize:"2rem", marginBottom:12, opacity:.4 }}>🔥</div>
                    <p style={{ fontSize:".9rem", color:"var(--text-muted)" }}>No clubs yet — be the first to join one!</p>
                  </div>
                ) : (
                  <div className="trending-grid">
                    {trendingClubs.map((club, idx) => {
                      const mem  = getMembership(club.id);
                      const cKey = `c-${club.id}`;
                      const full = club.max_seats > 0 && club.seats_available <= 0;
                      const rankColors = ["#E8C24A", "#9DB5AE", "#C4845F"];
                      const rankLabels = ["#1 Trending", "#2 Popular", "#3 Rising"];

                      return (
                        <div
                          key={club.id}
                          className="trending-card"
                          style={{ animationDelay: `${idx * 0.12}s` }}
                          onClick={() => navigate(`/club/${club.id}`)}
                        >
                          {/* Rank badge */}
                          <div
                            className="trending-rank"
                            style={{ color: rankColors[idx] || "var(--text-muted)", borderColor: rankColors[idx] || "var(--border)" }}
                          >
                            {rankLabels[idx] || `#${idx + 1}`}
                          </div>

                          {/* Club icon + name */}
                          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                            <div className="trending-icon">◈</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.1rem", color:"var(--text)", marginBottom:2 }}>
                                {club.name}
                              </div>
                              {club.description && (
                                <div style={{ fontSize:".76rem", color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  {club.description}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stats row */}
                          <div style={{ display:"flex", gap:20, marginBottom:18 }}>
                            <StatMini label="Members"    value={club.member_count}    color="#7B93D4" />
                            <StatMini label="Seats Left" value={club.seats_available} color={full ? "#F4845F" : "#3DBFA0"} />
                            <StatMini label="Capacity"   value={club.max_seats}       color="var(--text-muted)" />
                          </div>

                          {/* Action */}
                          <div style={{ marginTop:16 }} onClick={e => e.stopPropagation()}>
                            {mem ? (
                              <MembershipBadge
                                status={mem.membership_status}
                                onCancel={mem.membership_status === "pending" ? () => cancelRequest(mem.membership_id) : null}
                              />
                            ) : full ? (
                              <span style={{ fontSize:".76rem", color:"#F4845F", fontWeight:600 }}>● Club is full</span>
                            ) : (
                              <button
                                disabled={joining[cKey]}
                                onClick={() => sendJoinRequest(club.id)}
                                className="join-btn"
                                style={{ width:"100%", opacity: joining[cKey] ? .6 : 1, cursor: joining[cKey] ? "not-allowed" : "pointer" }}
                              >
                                {joining[cKey] ? "Sending…" : "Join Club"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/*EXPLORE CLUBS */}
          {section === "explore" && (
            <div className="section-wrap" style={{ animation:"fadeUp .5s ease both" }}>
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
                  {clubs.map((club, idx) => {
                    const mem  = getMembership(club.id);
                    const cKey = `c-${club.id}`;
                    const full = club.max_seats > 0 && club.seats_available <= 0;

                    return (
                      <div
                        key={club.id}
                        className="club-card"
                        style={{ animationDelay: `${idx * 0.07}s` }}
                        onClick={() => navigate(`/club/${club.id}`)}
                      >
                        <div className="club-icon">◈</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.05rem", color:"var(--text)", marginBottom:3 }}>{club.name}</div>
                          {club.description && (
                            <div style={{ fontSize:".78rem", color:"var(--text-muted)" }}>{club.description}</div>
                          )}
                        </div>
                        <div style={{ display:"flex", gap:20, flexShrink:0 }}>
                          <StatMini label="Members"    value={club.member_count}    color="#7B93D4" />
                          <StatMini label="Seats Left" value={club.seats_available} color={full ? "#F4845F" : "#3DBFA0"} />
                          <StatMini label="Capacity"   value={club.max_seats}       color="var(--text-muted)" />
                        </div>
                        <div style={{ flexShrink:0, marginLeft:8 }} onClick={e => e.stopPropagation()}>
                          {mem ? (
                            <MembershipBadge
                              status={mem.membership_status}
                              onCancel={mem.membership_status === "pending" ? () => cancelRequest(mem.membership_id) : null}
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

          {/*MEMBERSHIPS */}
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
                  {memberships.map((m, idx) => (
                    <div
                      key={m.membership_id}
                      className="membership-card"
                      style={{ animationDelay: `${idx * 0.07}s` }}
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
                        <StatusBadge status={m.membership_status} />
                        {m.membership_status === "pending" && (
                          <button onClick={() => cancelRequest(m.membership_id)} className="cancel-btn">Cancel</button>
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


function WelcomeStat({ value, label, color, onClick, delay = "0s" }) {
  return (
    <button onClick={onClick} className="welcome-stat-btn" style={{ animationDelay: delay }}>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2rem", fontWeight:400, color, lineHeight:1, marginBottom:4 }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize:".72rem", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".06em" }}>
        {label}
      </div>
    </button>
  );
}

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

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

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

  .bg-canvas {
    position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; transition: opacity .3s;
  }
  body.theme-light .bg-canvas::before { content:''; position:absolute; inset:0; background:#f0ebe3; }
  body.theme-light .bg-canvas::after  { content:''; position:absolute; top:0; right:0; width:55%; height:55%; background:#c9a8b2; clip-path:polygon(45% 0%,100% 0%,100% 100%,0% 100%); }
  body.theme-light .bg-bottom-accent  { background:#ddb8c0; }
  body.theme-dark  .bg-canvas::before { content:''; position:absolute; inset:0; background:#0a1520; }
  body.theme-dark  .bg-canvas::after  { content:''; position:absolute; top:0; right:0; width:55%; height:55%; background:#0f2535; clip-path:polygon(45% 0%,100% 0%,100% 100%,0% 100%); }
  body.theme-dark  .bg-bottom-accent  { background:#0d1e30; }
  .bg-bottom-accent { position:absolute; bottom:0; left:0; width:40%; height:35%; clip-path:polygon(0% 0%,100% 100%,0% 100%); }
  .bg-noise { position:absolute; inset:0; opacity:.035; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); background-size:200px 200px; }

  .bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    opacity: 0;
    animation: orbFloat linear infinite;
  }
  body.theme-light .bg-orb-1 { width:420px; height:420px; top:5%; left:60%; background:radial-gradient(circle, rgba(61,191,160,0.18) 0%, transparent 70%); animation-duration:18s; animation-delay:0s; }
  body.theme-light .bg-orb-2 { width:320px; height:320px; top:55%; left:15%; background:radial-gradient(circle, rgba(201,168,178,0.22) 0%, transparent 70%); animation-duration:24s; animation-delay:-6s; }
  body.theme-light .bg-orb-3 { width:260px; height:260px; top:30%; left:40%; background:radial-gradient(circle, rgba(123,147,212,0.12) 0%, transparent 70%); animation-duration:20s; animation-delay:-12s; }
  body.theme-dark  .bg-orb-1 { width:420px; height:420px; top:5%; left:60%; background:radial-gradient(circle, rgba(61,191,160,0.10) 0%, transparent 70%); animation-duration:18s; animation-delay:0s; }
  body.theme-dark  .bg-orb-2 { width:320px; height:320px; top:55%; left:15%; background:radial-gradient(circle, rgba(15,37,53,0.60) 0%, transparent 70%); animation-duration:24s; animation-delay:-6s; }
  body.theme-dark  .bg-orb-3 { width:260px; height:260px; top:30%; left:40%; background:radial-gradient(circle, rgba(123,147,212,0.07) 0%, transparent 70%); animation-duration:20s; animation-delay:-12s; }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes toastIn { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes modalIn { from{opacity:0;transform:scale(.96) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }

  @keyframes orbFloat {
    0%   { opacity:0; transform: translate(0px,   0px)   scale(1);    }
    10%  { opacity:1; }
    50%  { opacity:1; transform: translate(40px, -60px)  scale(1.08); }
    90%  { opacity:1; }
    100% { opacity:0; transform: translate(0px,   0px)   scale(1);    }
  }

  @keyframes sidebarSlideIn {
    from { opacity:0; transform:translateX(-20px); }
    to   { opacity:1; transform:translateX(0); }
  }

  @keyframes cardStagger {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }

  @keyframes statPop {
    0%   { opacity:0; transform:scale(0.85) translateY(8px); }
    60%  { transform:scale(1.05) translateY(-2px); }
    100% { opacity:1; transform:scale(1) translateY(0); }
  }

  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }

  @keyframes pulse-ring {
    0%   { transform:scale(1);    opacity:.6; }
    100% { transform:scale(1.55); opacity:0;  }
  }

  @keyframes logoSpin {
    0%   { transform: rotateY(0deg); }
    100% { transform: rotateY(360deg); }
  }

  @keyframes badgePop {
    0%   { transform:scale(0); opacity:0; }
    70%  { transform:scale(1.2); }
    100% { transform:scale(1); opacity:1; }
  }

  @keyframes welcomeGlow {
    0%, 100% { box-shadow: 0 6px 28px rgba(61,191,160,0.14); }
    50%       { box-shadow: 0 6px 40px rgba(61,191,160,0.28); }
  }

  .toast { position:fixed; top:20px; right:20px; z-index:9999; padding:12px 20px; border-radius:12px; font-size:.84rem; font-weight:500; animation:toastIn .3s ease both; backdrop-filter:blur(12px); box-shadow:var(--shadow-lg); }
  .toast-success { background:rgba(61,191,160,0.12); border:1.5px solid rgba(61,191,160,0.35); color:#3DBFA0; }
  .toast-error   { background:rgba(244,132,95,0.12);  border:1.5px solid rgba(244,132,95,0.35);  color:#F4845F; }
  .toast-info    { background:rgba(123,147,212,0.12); border:1.5px solid rgba(123,147,212,0.35); color:#7B93D4; }

  .overlay { position:fixed; inset:0; z-index:9000; background:rgba(10,21,32,0.65); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:24px; }
  .confirm-modal { background:var(--card-bg); border:1.5px solid var(--border); border-radius:20px; padding:36px; max-width:380px; width:100%; text-align:center; animation:modalIn .3s cubic-bezier(.22,1,.36,1) both; box-shadow:var(--shadow-lg); backdrop-filter:blur(20px); }
  .confirm-btn-danger { padding:10px 26px; background:#F4845F; color:white; border:none; border-radius:10px; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:600; transition:background .2s,transform .15s; }
  .confirm-btn-danger:hover { background:#e06840; transform:scale(1.04); }
  .confirm-btn-ghost  { padding:10px 26px; background:transparent; color:var(--text-muted); border:1.5px solid var(--border); border-radius:10px; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.85rem; transition:border-color .2s,transform .15s; }
  .confirm-btn-ghost:hover { border-color:var(--border-h); transform:scale(1.03); }

  .page-container { display:flex; min-height:100vh; position:relative; z-index:1; }

  .sidebar {
    width:248px; flex-shrink:0; background:var(--sidebar-bg); border-right:1px solid var(--border);
    display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow-y:auto;
    transition:background .3s,border-color .3s; backdrop-filter:blur(20px);
    animation: sidebarSlideIn .45s cubic-bezier(.22,1,.36,1) both;
  }

  .sidebar-logo { display:flex; align-items:center; gap:12px; padding:24px 20px 20px; border-bottom:1px solid var(--border); }

  .nav-logo-box {
    width:36px; height:36px; border-radius:10px; background:var(--mint); color:white;
    font-family:'DM Serif Display',serif; font-size:1rem; font-weight:700;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    box-shadow:0 4px 12px rgba(61,191,160,0.30);
    transition: transform .6s ease;
    transform-style: preserve-3d;
  }
  .nav-logo-box:hover { animation: logoSpin .7s ease; }

  .sidebar-uni { padding:14px 20px; border-bottom:1px solid var(--border); }

  .sidebar-nav-btn {
    width:100%; padding:11px 20px; background:transparent; border:none; border-left:2.5px solid transparent;
    cursor:pointer; text-align:left; display:flex; align-items:center; gap:12px;
    transition:background .2s, border-color .2s, transform .15s;
    font-family:'DM Sans',sans-serif;
    animation: sidebarSlideIn .4s cubic-bezier(.22,1,.36,1) both;
    opacity:0;
    animation-fill-mode: forwards;
  }
  .sidebar-nav-btn:hover { background:var(--mint-light); transform:translateX(4px); }
  .sidebar-nav-btn.active { background:var(--mint-light); border-left-color:var(--mint); }
  .sidebar-nav-btn.active .sidebar-nav-icon { color:var(--mint); }
  .sidebar-nav-btn.active .sidebar-nav-label { color:var(--text); font-weight:600; }

  .sidebar-nav-icon { font-size:.9rem; color:var(--text-muted); transition:transform .2s,color .2s; }
  .sidebar-nav-btn:hover .sidebar-nav-icon { transform:scale(1.25); }
  .sidebar-nav-label { font-size:.85rem; color:var(--text-soft); font-weight:400; }

  .sidebar-badge {
    margin-left:auto; background:rgba(232,194,74,0.18); color:#E8C24A; border-radius:20px;
    font-size:.65rem; font-weight:700; padding:2px 8px;
    animation: badgePop .4s cubic-bezier(.22,1,.36,1) both;
  }

  .sidebar-footer { padding:16px 20px; border-top:1px solid var(--border); }

  .sidebar-quick-btn {
    width:100%; padding:9px 12px; background:var(--surface2); border:1.5px solid var(--border);
    border-radius:10px; color:var(--text-soft); cursor:pointer; font-size:.8rem;
    font-family:'DM Sans',sans-serif; text-align:left; transition:border-color .2s,color .2s,transform .15s;
  }
  .sidebar-quick-btn:hover { border-color:var(--mint); color:var(--mint); transform:translateX(3px); }

  .sidebar-logout-btn {
    flex:1; padding:9px 12px; background:rgba(244,132,95,0.08); border:1.5px solid rgba(244,132,95,0.25);
    border-radius:10px; color:#F4845F; cursor:pointer; font-size:.8rem; font-family:'DM Sans',sans-serif;
    transition:background .2s,transform .15s;
  }
  .sidebar-logout-btn:hover { background:rgba(244,132,95,0.15); transform:scale(1.03); }

  .main-content { flex:1; overflow-y:auto; background:var(--main-bg); transition:background .3s; }
  .section-wrap { padding:44px 48px; }
  .section-eyebrow { font-size:.7rem; font-weight:600; color:var(--mint); letter-spacing:.12em; text-transform:uppercase; margin-bottom:8px; }
  .section-title { font-family:'DM Serif Display',serif; font-size:2.2rem; font-weight:400; color:var(--text); letter-spacing:-.02em; margin-bottom:8px; }
  .section-desc { font-size:.88rem; color:var(--text-muted); }

  .welcome-hero {
    background:var(--card-bg);
    border:1.5px solid var(--border);
    border-radius:20px;
    padding:36px 40px;
    backdrop-filter:blur(20px);
    box-shadow:var(--shadow-lg);
    position:relative;
    overflow:hidden;
    animation: fadeUp .5s ease both, welcomeGlow 4s ease-in-out 1s infinite;
  }
  .welcome-hero::before {
    content:'';
    position:absolute;
    top:-60px; right:-60px;
    width:220px; height:220px;
    background:radial-gradient(circle, rgba(61,191,160,0.12) 0%, transparent 70%);
    pointer-events:none;
    animation: orbFloat 10s ease-in-out infinite;
    opacity: 1;
  }
  .welcome-hero::after {
    content:'';
    position:absolute;
    top:0; left:0; right:0;
    height:2px;
    background: linear-gradient(90deg, transparent 0%, var(--mint) 40%, var(--mint-mid) 60%, transparent 100%);
    background-size: 400px 100%;
    animation: shimmer 3s linear infinite;
  }

  .welcome-badge {
    display:inline-block;
    font-size:.68rem; font-weight:600; color:var(--mint);
    letter-spacing:.12em; text-transform:uppercase;
    background:rgba(61,191,160,0.10);
    border:1px solid rgba(61,191,160,0.25);
    border-radius:20px;
    padding:4px 12px;
    margin-bottom:16px;
    animation: fadeUp .4s ease .1s both;
  }
  .welcome-heading {
    font-family:'DM Serif Display',serif;
    font-size:2.4rem; font-weight:400;
    color:var(--text); letter-spacing:-.02em;
    line-height:1.2; margin-bottom:12px;
    animation: fadeUp .45s ease .15s both;
  }
  .welcome-name {
    font-style:italic;
    color:var(--mint);
  }
  .welcome-sub {
    font-size:.9rem; color:var(--text-soft);
    line-height:1.65; max-width:520px;
    margin-bottom:32px;
    animation: fadeUp .45s ease .22s both;
  }
  .welcome-stats {
    display:flex; gap:0;
    background:var(--surface2);
    border:1.5px solid var(--border);
    border-radius:14px;
    overflow:hidden;
    width:fit-content;
    animation: fadeUp .45s ease .3s both;
  }
  .welcome-stat-btn {
    background:none; border:none; cursor:pointer;
    padding:18px 28px;
    text-align:center;
    border-right:1px solid var(--border);
    transition:background .2s, transform .2s;
    font-family:'DM Sans',sans-serif;
    animation: statPop .5s cubic-bezier(.22,1,.36,1) both;
  }
  .welcome-stat-btn:last-child { border-right:none; }
  .welcome-stat-btn:hover { background:var(--mint-light); transform:translateY(-3px); }

  /*TRENDING*/
  .trending-grid {
    display:grid;
    grid-template-columns:repeat(auto-fill, minmax(280px,1fr));
    gap:16px;
  }
  .trending-card {
    background:var(--card-bg);
    border:1.5px solid var(--border);
    border-radius:16px;
    padding:24px;
    cursor:pointer;
    transition:border-color .25s, background .25s, transform .25s, box-shadow .25s;
    box-shadow:var(--shadow);
    backdrop-filter:blur(20px);
    position:relative;
    overflow:hidden;
    animation: cardStagger .45s cubic-bezier(.22,1,.36,1) both;
    opacity:0;
    animation-fill-mode: forwards;
  }
  .trending-card::before {
    content:'';
    position:absolute;
    top:0; left:0; right:0;
    height:3px;
    background:linear-gradient(90deg, var(--mint), var(--mint-mid));
    opacity:0;
    transition:opacity .25s;
  }
  /* Shimmer overlay on hover */
  .trending-card::after {
    content:'';
    position:absolute;
    inset:0;
    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%);
    background-size: 300% 100%;
    background-position: 200% 0;
    transition: background-position .5s ease;
    pointer-events: none;
  }
  .trending-card:hover {
    border-color:var(--border-h);
    background:var(--card-hover);
    transform:translateY(-5px) scale(1.01);
    box-shadow:var(--shadow-lg);
  }
  .trending-card:hover::before { opacity:1; }
  .trending-card:hover::after { background-position: -100% 0; }

  .trending-rank {
    display:inline-block;
    font-size:.65rem; font-weight:700;
    letter-spacing:.1em; text-transform:uppercase;
    border:1.5px solid;
    border-radius:20px;
    padding:3px 10px;
    margin-bottom:14px;
    transition: transform .2s;
  }
  .trending-card:hover .trending-rank { transform: scale(1.06); }

  .trending-icon {
    width:42px; height:42px; border-radius:11px;
    background:var(--mint-light); border:1.5px solid rgba(61,191,160,0.3);
    display:flex; align-items:center; justify-content:center;
    font-size:1.1rem; color:var(--mint); flex-shrink:0;
    transition:transform .25s, background .25s;
    position:relative;
  }
  .trending-card:hover .trending-icon { transform:rotate(12deg) scale(1.12); background:rgba(61,191,160,0.25); }

  /*GHOST BUTTON*/
  .btn-ghost {
    background:transparent;
    border:1.5px solid var(--border);
    color:var(--text-soft);
    border-radius:10px;
    padding:9px 18px;
    font-size:.82rem; font-weight:500;
    font-family:'DM Sans',sans-serif;
    cursor:pointer;
    transition:border-color .2s, color .2s, transform .15s, background .2s;
    white-space:nowrap;
  }
  .btn-ghost:hover { border-color:var(--mint); color:var(--mint); transform:translateY(-2px); background:rgba(61,191,160,0.06); }

  /* CARDS*/
  .empty-state { text-align:center; padding:64px 24px; background:var(--card-bg); border-radius:18px; border:1.5px solid var(--border); backdrop-filter:blur(20px); animation:fadeUp .5s ease both; }

  .club-card {
    background:var(--card-bg); border:1.5px solid var(--border); border-radius:14px; overflow:hidden;
    padding:20px 24px; display:flex; align-items:center; gap:16px; cursor:pointer;
    transition:border-color .22s, background .22s, transform .22s, box-shadow .22s;
    box-shadow:var(--shadow); backdrop-filter:blur(20px);
    animation: cardStagger .4s cubic-bezier(.22,1,.36,1) both;
    opacity:0; animation-fill-mode:forwards;
  }
  .club-card:hover {
    border-color:var(--border-h); background:var(--card-hover);
    transform:translateX(6px);
    box-shadow:var(--shadow-lg);
  }

  .club-icon {
    width:44px; height:44px; border-radius:12px;
    background:var(--mint-light); border:1.5px solid rgba(61,191,160,0.3);
    display:flex; align-items:center; justify-content:center;
    font-size:1.1rem; color:var(--mint); flex-shrink:0;
    transition:transform .22s, background .22s;
  }
  .club-card:hover .club-icon { transform:rotate(10deg) scale(1.1); background:rgba(61,191,160,0.22); }

  .join-btn {
    padding:8px 18px; background:var(--mint-light); color:var(--mint);
    border:1.5px solid rgba(61,191,160,0.35); border-radius:10px;
    font-size:.78rem; font-weight:600; font-family:'DM Sans',sans-serif;
    transition:background .2s, transform .2s, box-shadow .2s;
    position: relative; overflow:hidden;
  }
  /* Ripple-ish glow on join button */
  .join-btn::after {
    content:'';
    position:absolute;
    inset:-2px;
    border-radius:12px;
    border:2px solid var(--mint);
    opacity:0;
    transform:scale(0.85);
    transition:opacity .3s, transform .3s;
    pointer-events:none;
  }
  .join-btn:hover:not(:disabled) { background:var(--mint); color:white; transform:translateY(-2px); box-shadow:0 4px 16px rgba(61,191,160,0.35); }
  .join-btn:hover:not(:disabled)::after { opacity:0.5; transform:scale(1.05); }
  .join-btn:active:not(:disabled) { transform:scale(0.97); }

  .membership-card {
    background:var(--card-bg); border:1.5px solid var(--border); border-radius:14px;
    padding:18px 24px; display:flex; align-items:center; gap:16px; cursor:pointer;
    transition:border-color .22s, background .22s, transform .22s;
    box-shadow:var(--shadow); backdrop-filter:blur(20px);
    animation: cardStagger .4s cubic-bezier(.22,1,.36,1) both;
    opacity:0; animation-fill-mode:forwards;
  }
  .membership-card:hover { border-color:var(--border-h); background:var(--card-hover); transform:translateX(6px); }

  .membership-club-icon {
    width:38px; height:38px; border-radius:10px;
    background:var(--mint-light); border:1.5px solid rgba(61,191,160,0.3);
    display:flex; align-items:center; justify-content:center;
    font-size:1rem; color:var(--mint); flex-shrink:0;
    transition:transform .22s;
    position:relative;
  }
  .membership-card:hover .membership-club-icon { transform:scale(1.15) rotate(-8deg); }

  .cancel-btn {
    padding:5px 14px; background:rgba(244,132,95,0.08); color:#F4845F;
    border:1.5px solid rgba(244,132,95,0.25); border-radius:8px; cursor:pointer;
    font-size:.74rem; font-weight:600; font-family:'DM Sans',sans-serif;
    transition:background .2s,transform .15s;
  }
  .cancel-btn:hover { background:rgba(244,132,95,0.18); transform:scale(1.05); }

  .btn-primary {
    padding:12px 28px; border-radius:12px; border:none; background:var(--mint); color:white;
    font-size:.88rem; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif;
    box-shadow:0 4px 16px rgba(61,191,160,0.35); transition:background .2s,transform .2s,box-shadow .2s;
  }
  .btn-primary:hover { background:var(--mint-dark); transform:translateY(-3px); box-shadow:0 8px 24px rgba(61,191,160,0.45); }
  .btn-primary:active { transform:scale(0.97); }

  /*SCROLLBAR*/
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

  /*RESPONSIVE*/
  @media (max-width:768px) {
    .sidebar { width:200px; }
    .section-wrap { padding:28px 24px; }
    .club-card > div[style*="gap:20"] { display:none; }
    .welcome-heading { font-size:1.8rem; }
    .welcome-stats { flex-direction:column; width:100%; }
    .welcome-stat-btn { border-right:none; border-bottom:1px solid var(--border); }
    .trending-grid { grid-template-columns:1fr; }
  }
`;