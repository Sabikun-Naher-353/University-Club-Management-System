import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

const API = "http://localhost:5000/api";

const Badge = ({ count }) =>
  count > 0 ? (
    <span style={{
      background:"rgba(244,132,95,0.18)", color:"#F4845F",
      fontSize:".66rem", fontWeight:700,
      borderRadius:20, padding:"2px 8px", marginLeft:8,
    }}>{count}</span>
  ) : null;

const Pill = ({ label, color }) => (
  <span style={{
    fontSize:".7rem", fontWeight:700, color,
    background:`${color}18`, border:`1.5px solid ${color}33`,
    borderRadius:20, padding:"3px 10px",
    letterSpacing:".04em", textTransform:"capitalize",
  }}>{label}</span>
);

const ConfirmModal = ({ item, onConfirm, onCancel }) => (
  <div className="overlay" onClick={e => { if (e.target.classList.contains("overlay")) onCancel(); }}>
    <div className="confirm-modal">
      <div style={{ fontSize:"2rem", marginBottom:14 }}>⚠️</div>
      <h3 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.3rem", fontWeight:400, color:"var(--text)", marginBottom:10 }}>
        Confirm Deletion
      </h3>
      <p style={{ fontSize:".88rem", color:"var(--text-soft)", lineHeight:1.75, marginBottom:28 }}>
        Are you sure you want to permanently delete <strong style={{ color:"var(--text)" }}>{item}</strong>? This action cannot be undone.
      </p>
      <div style={{ display:"flex", gap:12 }}>
        <button className="confirm-btn-danger" onClick={onConfirm} style={{ flex:1 }}>Confirm Deletion</button>
        <button className="confirm-btn-ghost"  onClick={onCancel}  style={{ flex:1 }}>Cancel</button>
      </div>
    </div>
  </div>
);

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [user,       setUser]       = useState(null);
  const [section,    setSection]    = useState("overview");
  const [visible,    setVisible]    = useState(false);
  const [stats,      setStats]      = useState({ clubs:0, members:0, varsities:0 });
  const [pending,    setPending]    = useState([]);
  const [varsities,  setVarsities]  = useState([]);
  const [clubs,      setClubs]      = useState([]);
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [confirm,    setConfirm]    = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { navigate("/home"); return; }
    const u = JSON.parse(stored);
    if (u.role !== "super_admin") { navigate("/home"); return; }
    setUser(u);
    setTimeout(() => setVisible(true), 60);
  }, [navigate]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/admin/stats`);
      const d = await r.json();
      setStats({ clubs: d.clubs||0, members: d.members||0, varsities: d.varsities||0 });
    } catch {}
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const r = await fetch(`${API}/admin/pending-universities`);
      const d = await r.json();
      setPending(Array.isArray(d) ? d : []);
    } catch {}
  }, []);

  const toArray = (d, ...keys) => {
    if (Array.isArray(d)) return d;
    for (const k of keys) {
      if (d && Array.isArray(d[k])) return d[k];
    }
    return [];
  };

  const fetchSection = useCallback(async (sec) => {
    setLoading(true);
    try {
      const map = { varsity:"universities", club:"clubs", members:"members" };
      if (map[sec]) {
        const r = await fetch(`${API}/admin/${map[sec]}`);
        const d = await r.json();
        if (sec === "varsity") setVarsities(toArray(d, "universities", "varsities", "data"));
        if (sec === "club")    setClubs(toArray(d, "clubs", "data"));
        if (sec === "members") setMembers(toArray(d, "members", "users", "data"));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); fetchPending(); }, [fetchStats, fetchPending]);
  useEffect(() => { if (section !== "overview") fetchSection(section); }, [section, fetchSection]);

  const approveVarsity = async id => {
    const r = await fetch(`${API}/admin/approve-university/${id}`, { method:"PUT" });
    if (r.ok) { setPending(p => p.filter(v => v.id !== id)); fetchStats(); showToast("University registration approved."); }
    else showToast("Failed to approve the request.", "error");
  };

  const rejectVarsity = async id => {
    const r = await fetch(`${API}/admin/reject-university/${id}`, { method:"DELETE" });
    if (r.ok) { setPending(p => p.filter(v => v.id !== id)); showToast("Registration request rejected."); }
    else showToast("Failed to reject the request.", "error");
  };

  const deleteVarsity = v => setConfirm({
    label: v.name,
    onConfirm: async () => {
      setConfirm(null);
      const r = await fetch(`${API}/admin/delete-university/${v.id}`, { method:"DELETE" });
      if (r.ok) { setVarsities(p => p.filter(x => x.id !== v.id)); fetchStats(); showToast("University removed from the platform."); }
      else showToast("Failed to delete the university.", "error");
    },
  });

  const deleteClub = c => setConfirm({
    label: c.name,
    onConfirm: async () => {
      setConfirm(null);
      const r = await fetch(`${API}/admin/delete-club/${c.id}`, { method:"DELETE" });
      if (r.ok) { setClubs(p => p.filter(x => x.id !== c.id)); fetchStats(); showToast("Club removed from the platform."); }
      else showToast("Failed to delete the club.", "error");
    },
  });

  const deleteMember = m => setConfirm({
    label: `${m.name} (${m.email})`,
    onConfirm: async () => {
      setConfirm(null);
      const r = await fetch(`${API}/admin/remove-member/${m.id}`, { method:"DELETE" });
      if (r.ok) { setMembers(p => p.filter(x => x.id !== m.id)); fetchStats(); showToast("Member account removed successfully."); }
      else showToast("Failed to remove the member.", "error");
    },
  });

  const logout = () => { localStorage.removeItem("user"); navigate("/home"); };

  if (!user) return null;

  const NAV_ITEMS = [
    { key:"overview", icon:"◎", label:"Overview"    },
    { key:"varsity",  icon:"⬢", label:"Universities" },
    { key:"club",     icon:"◈", label:"Clubs"        },
    { key:"members",  icon:"◉", label:"Members"      },
  ];

  const STAT_CARDS = [
    { label:"Universities", value:stats.varsities, icon:"🏫", accent:"#3DBFA0", bg:"rgba(61,191,160,0.10)",  section:"varsity"  },
    { label:"Clubs",        value:stats.clubs,     icon:"🎯", accent:"#7B93D4", bg:"rgba(123,147,212,0.10)", section:"club"     },
    { label:"Members",      value:stats.members,   icon:"👥", accent:"#F4845F", bg:"rgba(244,132,95,0.10)",  section:"members"  },
  ];

  const ROLE_COLORS = {
    super_admin:   "#7B93D4",
    varsity_admin: "#3DBFA0",
    club_rep:      "#F4845F",
    student:       "#E8C24A",
  };

  return (
    <>
      <style>{pageStyles}</style>

      {/*GEOMETRIC BACKGROUND*/}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      {/*CONFIRM MODAL*/}
      {confirm && <ConfirmModal item={confirm.label} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/*TOAST*/}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className={`shell${visible ? " in" : ""}`}>

        {/*SIDEBAR*/}
        <aside className="sidebar">

          {/*Logo*/}
          <div className="sidebar-logo-wrap">
            <div className="nav-logo-box">SC</div>
            <div>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.05rem", color:"var(--text)" }}>Societas</div>
              <div style={{ fontSize:".62rem", color:"var(--mint)", letterSpacing:".1em", textTransform:"uppercase", fontWeight:600 }}>Administration</div>
            </div>
          </div>

          {/*Nav*/}
          <nav style={{ flex:1, padding:"10px 0" }}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`sidebar-nav-btn${section === item.key ? " active" : ""}`}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
                {item.key === "overview" && pending.length > 0 && (
                  <span className="sidebar-badge">{pending.length}</span>
                )}
              </button>
            ))}
          </nav>

          {/*Footer*/}
          <div className="sidebar-footer">
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:".8rem", color:"var(--text-soft)", fontWeight:500, marginBottom:2 }}>{user.name}</div>
              <div style={{ fontSize:".72rem", color:"var(--text-muted)", wordBreak:"break-word" }}>{user.email}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
              {[
                { label:"📰 News Feed",      path:"/feed"    },
                { label:"📢 Notices",        path:"/notices" },
                { label:"👤 My Profile",     path:"/profile" },
                { label:"👥 User Directory", path:"/users"   },
              ].map(item => (
                <button key={item.path} onClick={() => navigate(item.path)} className="sidebar-quick-btn">
                  {item.label}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={logout} className="sidebar-logout-btn">Sign Out</button>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        {/*MAIN*/}
        <main className="main-area">

          {/*TOPBAR*/}
          <div className="topbar">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:"1.1rem" }}>{NAV_ITEMS.find(n => n.key === section)?.icon}</span>
              <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.05rem", color:"var(--text)" }}>
                {NAV_ITEMS.find(n => n.key === section)?.label}
              </span>
            </div>
            <span style={{ fontSize:".76rem", color:"var(--text-muted)" }}>
              {new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
            </span>
          </div>

          {/*CONTENT*/}
          <div className="content">

            {/*OVERVIEW*/}
            {section === "overview" && <>
              <div className="page-header" style={{ animation:"fadeUp .5s ease both" }}>
                <div className="section-eyebrow">Administration Dashboard</div>
                <h1 className="section-title">
                  Welcome, <em style={{ fontStyle:"italic", color:"var(--mint)" }}>{user.name?.split(" ")[0]}.</em>
                </h1>
                <p className="section-desc">A summary of all registered institutions, clubs, and members across the platform.</p>
              </div>

              {/*STAT CARDS*/}
              <div className="stat-grid" style={{ animation:"fadeUp .5s .1s ease both" }}>
                {STAT_CARDS.map((s, i) => (
                  <div
                    key={i} className="stat-card"
                    onClick={() => setSection(s.section)}
                    style={{ animationDelay:`${i * .06}s` }}
                  >
                    <div style={{
                      width:48, height:48, borderRadius:14,
                      background:s.bg, border:`1.5px solid ${s.accent}33`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"1.4rem", marginBottom:16,
                    }}>{s.icon}</div>
                    <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2.2rem", fontWeight:400, color:s.accent, lineHeight:1, marginBottom:6 }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize:".72rem", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:12 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize:".76rem", color:"var(--mint)", fontWeight:500 }}>View all →</div>
                  </div>
                ))}
              </div>

              {/*PENDING TABLE*/}
              <div className="t-card" style={{ animation:"fadeUp .5s .15s ease both" }}>
                <div className="t-card-header">
                  <div>
                    <div className="t-card-title">Pending University Requests <Badge count={pending.length} /></div>
                    <div className="t-card-sub">Institutions awaiting administrative approval</div>
                  </div>
                </div>
                {pending.length === 0
                  ? <EmptyState icon="✓" text="No pending registration requests at this time." />
                  : <table className="tbl">
                      <thead><tr><th>#</th><th>Institution</th><th>Country</th><th>Submitted</th><th>Action</th></tr></thead>
                      <tbody>
                        {pending.map((v, i) => (
                          <tr key={v.id}>
                            <td style={{ color:"var(--text-muted)" }}>{i + 1}</td>
                            <td><strong>{v.name}</strong></td>
                            <td>{v.country || "—"}</td>
                            <td>{v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}</td>
                            <td>
                              <div style={{ display:"flex", gap:8 }}>
                                <button className="btn-approve" onClick={() => approveVarsity(v.id)}>Approve</button>
                                <button className="btn-reject"  onClick={() => rejectVarsity(v.id)}>Reject</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
            </>}

            {/*UNIVERSITIES*/}
            {section === "varsity" && <>
              <div className="page-header" style={{ animation:"fadeUp .5s ease both" }}>
                <div className="section-eyebrow">Institutional Management</div>
                <h1 className="section-title"><em style={{ fontStyle:"italic", color:"var(--mint)" }}>Registered Universities</em></h1>
                <p className="section-desc">All approved and active universities registered on the platform.</p>
              </div>
              <div className="t-card" style={{ animation:"fadeUp .5s .1s ease both" }}>
                <div className="t-card-header">
                  <div>
                    <div className="t-card-title">All Universities <Badge count={varsities.length} /></div>
                    <div className="t-card-sub">Approved and active institutions</div>
                  </div>
                </div>
                {loading ? <Spinner /> : varsities.length === 0
                  ? <EmptyState icon="🏫" text="No universities have been registered yet." />
                  : <table className="tbl">
                      <thead><tr><th>#</th><th>Institution Name</th><th>Country</th><th>Status</th><th>Registration Date</th><th>Action</th></tr></thead>
                      <tbody>
                        {varsities.map((v, i) => (
                          <tr key={v.id}>
                            <td style={{ color:"var(--text-muted)" }}>{i + 1}</td>
                            <td><strong>{v.name}</strong></td>
                            <td>{v.country || "—"}</td>
                            <td><Pill label={v.status || "active"} color="#3DBFA0" /></td>
                            <td>{v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}</td>
                            <td><button className="btn-delete" onClick={() => deleteVarsity(v)}>Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
            </>}

            {/*CLUBS*/}
            {section === "club" && <>
              <div className="page-header" style={{ animation:"fadeUp .5s ease both" }}>
                <div className="section-eyebrow">Club Management</div>
                <h1 className="section-title">Club <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Directory</em></h1>
                <p className="section-desc">Every registered club across all affiliated universities.</p>
              </div>
              <div className="t-card" style={{ animation:"fadeUp .5s .1s ease both" }}>
                <div className="t-card-header">
                  <div>
                    <div className="t-card-title">All Clubs <Badge count={clubs.length} /></div>
                    <div className="t-card-sub">Clubs registered across all universities on the platform</div>
                  </div>
                </div>
                {loading ? <Spinner /> : clubs.length === 0
                  ? <EmptyState icon="🎯" text="No clubs have been registered yet." />
                  : <table className="tbl">
                      <thead><tr><th>#</th><th>Club Name</th><th>University</th><th>Registration Date</th><th>Action</th></tr></thead>
                      <tbody>
                        {clubs.map((c, i) => (
                          <tr key={c.id}>
                            <td style={{ color:"var(--text-muted)" }}>{i + 1}</td>
                            <td><strong>{c.name}</strong></td>
                            <td>{c.university_name || "—"}</td>
                            <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                            <td><button className="btn-delete" onClick={() => deleteClub(c)}>Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
            </>}

            {/*MEMBERS*/}
            {section === "members" && <>
              <div className="page-header" style={{ animation:"fadeUp .5s ease both" }}>
                <div className="section-eyebrow">Member Management</div>
                <h1 className="section-title">Member <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Registry</em></h1>
                <p className="section-desc">All registered users and their assigned roles across the platform.</p>
              </div>
              <div className="t-card" style={{ animation:"fadeUp .5s .1s ease both" }}>
                <div className="t-card-header">
                  <div>
                    <div className="t-card-title">All Members <Badge count={members.length} /></div>
                    <div className="t-card-sub">Every registered user account on the platform</div>
                  </div>
                </div>
                {loading ? <Spinner /> : members.length === 0
                  ? <EmptyState icon="👥" text="No members have been registered yet." />
                  : <table className="tbl">
                      <thead><tr><th>#</th><th>Full Name</th><th>Email Address</th><th>Role</th><th>Registration Date</th><th>Action</th></tr></thead>
                      <tbody>
                        {members.map((m, i) => (
                          <tr key={m.id}>
                            <td style={{ color:"var(--text-muted)" }}>{i + 1}</td>
                            <td><strong>{m.name}</strong></td>
                            <td style={{ color:"var(--text-muted)" }}>{m.email}</td>
                            <td>
                              <Pill
                                label={m.role?.replace(/_/g, " ")}
                                color={ROLE_COLORS[m.role] || "#E8C24A"}
                              />
                            </td>
                            <td>{m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}</td>
                            <td>
                              {m.id === user.id
                                ? <span style={{ fontSize:".75rem", color:"var(--text-muted)" }}>Current User</span>
                                : m.role === "super_admin"
                                ? <span style={{ fontSize:".75rem", color:"var(--text-muted)" }}>Protected Account</span>
                                : <button className="btn-delete" onClick={() => deleteMember(m)}>Remove</button>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
            </>}

          </div>
        </main>
      </div>
    </>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", padding:"48px 0" }}>
      <div style={{
        width:28, height:28, borderRadius:"50%",
        border:"2.5px solid var(--border)",
        borderTopColor:"var(--mint)",
        animation:"spin .7s linear infinite",
      }} />
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"56px 24px" }}>
      <div style={{ fontSize:"2rem", marginBottom:12, opacity:.35 }}>{icon}</div>
      <p style={{ fontSize:".88rem", color:"var(--text-muted)" }}>{text}</p>
    </div>
  );
}

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
    --sidebar-bg:  rgba(255,255,255,0.82);
    --main-bg:     transparent;
    --topbar-bg:   rgba(244,249,248,0.88);
    --card-bg:     rgba(255,255,255,0.92);
    --card-hover:  rgba(240,250,247,0.98);
    --surface2:    rgba(247,249,248,0.90);
    --shadow:      0 2px 10px rgba(61,191,160,0.07);
    --shadow-lg:   0 6px 24px rgba(61,191,160,0.14);
    --tbl-hover:   rgba(240,250,247,0.80);
    --tbl-stripe:  rgba(61,191,160,0.03);
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
    --sidebar-bg:  rgba(17,32,48,0.88);
    --main-bg:     transparent;
    --topbar-bg:   rgba(14,24,37,0.92);
    --card-bg:     rgba(22,32,48,0.90);
    --card-hover:  rgba(29,44,63,0.96);
    --surface2:    rgba(29,44,63,0.88);
    --shadow:      0 2px 10px rgba(0,0,0,0.20);
    --shadow-lg:   0 6px 24px rgba(0,0,0,0.35);
    --tbl-hover:   rgba(29,44,63,0.80);
    --tbl-stripe:  rgba(196,178,140,0.02);
  }

  html, body {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    height: 100%; overflow: hidden;
    transition: background .3s, color .3s;
  }

  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes toastIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes modalIn { from{opacity:0;transform:scale(.96) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }

  /*GEOMETRIC BACKGROUND*/
  .bg-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    transition: opacity .3s;
  }

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
  body.theme-light .bg-bottom-accent { background: #ddb8c0; }

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
  body.theme-dark .bg-bottom-accent { background: #0d1e30; }

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

  .shell {
    display: flex;
    height: 100vh;
    opacity: 0;
    transition: opacity .5s ease;
    position: relative;
    z-index: 1;
  }
  .shell.in { opacity: 1; }

  .sidebar {
    width:248px; flex-shrink:0;
    background: var(--sidebar-bg);
    backdrop-filter: blur(20px);
    border-right:1px solid var(--border);
    display:flex; flex-direction:column;
    transition:background .3s, border-color .3s;
    overflow-y:auto;
  }
  .sidebar-logo-wrap {
    display:flex; align-items:center; gap:12px;
    padding:24px 20px 20px; border-bottom:1px solid var(--border);
  }
  .nav-logo-box {
    width:36px; height:36px; border-radius:10px; background:var(--mint);
    color:white; font-family:'DM Serif Display',serif; font-size:1rem; font-weight:700;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    box-shadow:0 4px 12px rgba(61,191,160,0.30);
  }

  .sidebar-nav-btn {
    width:100%; padding:11px 20px;
    background:transparent; border:none; border-left:2.5px solid transparent;
    cursor:pointer; text-align:left;
    display:flex; align-items:center; gap:12px;
    transition:background .15s, border-color .15s;
    font-family:'DM Sans',sans-serif;
  }
  .sidebar-nav-btn:hover { background:var(--mint-light); }
  .sidebar-nav-btn.active { background:var(--mint-light); border-left-color:var(--mint); }
  .sidebar-nav-icon { font-size:.9rem; color:var(--text-muted); }
  .sidebar-nav-btn.active .sidebar-nav-icon { color:var(--mint); }
  .sidebar-nav-label { font-size:.85rem; color:var(--text-soft); font-weight:400; }
  .sidebar-nav-btn.active .sidebar-nav-label { color:var(--text); font-weight:600; }
  .sidebar-badge {
    margin-left:auto; background:rgba(244,132,95,0.18); color:#F4845F;
    border-radius:20px; font-size:.66rem; font-weight:700; padding:2px 8px;
  }

  .sidebar-footer { padding:16px 20px; border-top:1px solid var(--border); }
  .sidebar-quick-btn {
    width:100%; padding:9px 12px;
    background:var(--surface2); border:1.5px solid var(--border);
    border-radius:10px; color:var(--text-soft);
    cursor:pointer; font-size:.8rem; font-family:'DM Sans',sans-serif;
    text-align:left; transition:border-color .2s, color .2s;
  }
  .sidebar-quick-btn:hover { border-color:var(--mint); color:var(--mint); }
  .sidebar-logout-btn {
    flex:1; padding:9px 12px;
    background:rgba(244,132,95,0.08); border:1.5px solid rgba(244,132,95,0.25);
    border-radius:10px; color:#F4845F;
    cursor:pointer; font-size:.8rem; font-family:'DM Sans',sans-serif;
    transition:background .2s;
  }
  .sidebar-logout-btn:hover { background:rgba(244,132,95,0.18); }

  .main-area {
    flex:1; display:flex; flex-direction:column;
    background: var(--main-bg);
    overflow:hidden;
  }

  .topbar {
    height:60px; flex-shrink:0;
    background:var(--topbar-bg); backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border);
    display:flex; align-items:center; justify-content:space-between;
    padding:0 36px; animation:fadeIn .4s ease both;
  }

  .content { flex:1; overflow-y:auto; padding:40px 40px 60px; }

  .page-header { margin-bottom:32px; }
  .section-eyebrow {
    font-size:.7rem; font-weight:600; color:var(--mint);
    letter-spacing:.12em; text-transform:uppercase; margin-bottom:8px;
  }
  .section-title {
    font-family:'DM Serif Display',serif;
    font-size:2rem; font-weight:400; color:var(--text);
    letter-spacing:-.02em; margin-bottom:6px;
  }
  .section-desc { font-size:.88rem; color:var(--text-muted); }

  .stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:32px; }
  .stat-card {
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:18px; padding:24px;
    cursor:pointer; transition:border-color .2s, background .2s, transform .2s;
    box-shadow:var(--shadow);
    backdrop-filter: blur(12px);
  }
  .stat-card:hover {
    border-color:var(--border-h); background:var(--card-hover);
    transform:translateY(-3px); box-shadow:var(--shadow-lg);
  }
  .t-card {
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:18px; overflow:hidden; margin-bottom:20px;
    box-shadow:var(--shadow);
    backdrop-filter: blur(12px);
  }
  .t-card-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:20px 28px; border-bottom:1px solid var(--border);
  }
  .t-card-title {
    font-family:'DM Serif Display',serif; font-size:1.05rem;
    font-weight:400; color:var(--text);
  }
  .t-card-sub { font-size:.76rem; color:var(--text-muted); margin-top:3px; }

  .tbl { width:100%; border-collapse:collapse; }
  .tbl th {
    font-size:.68rem; font-weight:700; color:var(--text-muted);
    letter-spacing:.1em; text-transform:uppercase;
    padding:14px 28px; text-align:left;
    border-bottom:1px solid var(--border);
    background:var(--surface2);
  }
  .tbl td {
    padding:14px 28px; font-size:.86rem; color:var(--text-soft);
    border-bottom:1px solid var(--border);
  }
  .tbl tr:last-child td { border-bottom:none; }
  .tbl tr:hover td { background:var(--tbl-hover); color:var(--text); }
  .tbl td strong { color:var(--text); font-weight:600; }

  .btn-approve {
    padding:6px 14px; background:rgba(61,191,160,0.12); color:#3DBFA0;
    border:1.5px solid rgba(61,191,160,0.3); border-radius:8px;
    font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:600;
    cursor:pointer; transition:background .2s;
  }
  .btn-approve:hover { background:rgba(61,191,160,0.25); }
  .btn-reject {
    padding:6px 14px; background:rgba(244,132,95,0.10); color:#F4845F;
    border:1.5px solid rgba(244,132,95,0.3); border-radius:8px;
    font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:600;
    cursor:pointer; transition:background .2s;
  }
  .btn-reject:hover { background:rgba(244,132,95,0.22); }
  .btn-delete {
    padding:6px 14px; background:rgba(244,132,95,0.08); color:#F4845F;
    border:1.5px solid rgba(244,132,95,0.25); border-radius:8px;
    font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:600;
    cursor:pointer; transition:background .2s;
  }
  .btn-delete:hover { background:rgba(244,132,95,0.20); }

  .toast {
    position:fixed; bottom:28px; right:28px; z-index:500;
    padding:13px 22px; border-radius:12px; font-size:.85rem; font-weight:500;
    animation:toastIn .3s ease both; backdrop-filter:blur(12px);
    box-shadow:var(--shadow-lg);
  }
  .toast-success { background:rgba(61,191,160,0.12); border:1.5px solid rgba(61,191,160,0.35); color:#3DBFA0; }
  .toast-error   { background:rgba(244,132,95,0.12);  border:1.5px solid rgba(244,132,95,0.35);  color:#F4845F; }

  .overlay {
    position:fixed; inset:0; z-index:300;
    background:rgba(8,14,24,0.75); backdrop-filter:blur(8px);
    display:flex; align-items:center; justify-content:center; padding:24px;
    animation:fadeIn .2s ease both;
  }

  .confirm-modal {
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:20px; padding:36px; max-width:400px; width:100%;
    text-align:center; animation:modalIn .25s cubic-bezier(.22,1,.36,1) both;
    box-shadow:var(--shadow-lg); backdrop-filter:blur(16px);
  }
  .confirm-btn-danger {
    padding:11px; background:#F4845F; color:white;
    border:none; border-radius:10px; cursor:pointer;
    font-family:'DM Sans',sans-serif; font-size:.86rem; font-weight:600;
    transition:background .2s;
  }
  .confirm-btn-danger:hover { background:#e06840; }
  .confirm-btn-ghost {
    padding:11px; background:transparent; color:var(--text-muted);
    border:1.5px solid var(--border); border-radius:10px; cursor:pointer;
    font-family:'DM Sans',sans-serif; font-size:.86rem; transition:border-color .2s;
  }
  .confirm-btn-ghost:hover { border-color:var(--border-h); }

  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

  @media (max-width:1024px) { .stat-grid { grid-template-columns:repeat(2,1fr); } }
  @media (max-width:768px)  {
    .sidebar { width:200px; }
    .content { padding:28px 20px 48px; }
    .tbl th, .tbl td { padding:12px 16px; }
  }
`;