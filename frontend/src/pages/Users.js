import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import API from "../services/api";

const API_BASE = "http://localhost:5000";

const ROLE_META = {
  super_admin:   { bg: "rgba(123,147,212,0.15)", color: "#7B93D4", label: "Super Admin"   },
  varsity_admin: { bg: "rgba(61,191,160,0.15)",  color: "#3DBFA0", label: "Varsity Admin" },
  club_rep:      { bg: "rgba(244,132,95,0.15)",  color: "#F4845F", label: "Club Rep"      },
  student:       { bg: "rgba(232,194,74,0.15)",  color: "#E8C24A", label: "Student"       },
};

// Avatar
function Avatar({ src, name, size = 46 }) {
  const initials = name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#3DBFA0,#7B93D4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color: "#fff", overflow: "hidden",
    }}>
      {src
        ? <img src={`${API_BASE}${src}`} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        : initials
      }
    </div>
  );
}

// UserCard
function UserCard({ user, onClick }) {
  const [hover, setHover] = useState(false);
  const rm = ROLE_META[user.role] || ROLE_META.student;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="user-card"
      style={{
        background: hover ? "var(--card-hover)" : "var(--card-bg)",
        borderColor: hover ? "var(--border-h)" : "var(--border)",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "var(--shadow-lg)" : "var(--shadow)",
      }}
    >
      <Avatar src={user.avatar} name={user.name} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1rem", color:"var(--text)", marginBottom:3 }}>
          {user.name}
        </div>
        <div style={{ fontSize:".78rem", color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {user.email}
        </div>
      </div>
      <span style={{
        background: rm.bg, color: rm.color,
        fontSize:".7rem", fontWeight:700, padding:"4px 12px",
        borderRadius:20, textTransform:"capitalize", flexShrink:0,
        letterSpacing:".04em", border:`1.5px solid ${rm.color}33`,
      }}>
        {rm.label}
      </span>
      <span style={{ fontSize:"1.1rem", color:"var(--text-muted)", flexShrink:0 }}>›</span>
    </div>
  );
}

//Main Component
export default function Users() {
  const navigate    = useNavigate();
  const { isDark }  = useTheme();

  const [users,         setUsers]         = useState([]);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState("all");
  const [clubFilter,    setClubFilter]    = useState("all");
  const [clubs,         setClubs]         = useState([]);
  const [clubMembers,   setClubMembers]   = useState(null);
  const [varsityFilter, setVarsityFilter] = useState("all");
  const [varsities,     setVarsities]     = useState([]);
  const [loading,       setLoading]       = useState(true);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const uid        = storedUser?.university_id;

  useEffect(() => {
    API.get("/profile/users")
      .then(r => setUsers(r.data.users || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (storedUser.role !== "super_admin") return;
    fetch("http://localhost:5000/api/admin/universities")
      .then(r => r.json())
      .then(d => setVarsities(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    if (storedUser.role === "super_admin") {
      if (varsityFilter !== "all") {
        fetch(`http://localhost:5000/api/admin/clubs?universityId=${varsityFilter}`)
          .then(r => r.json())
          .then(d => setClubs(Array.isArray(d) ? d : []))
          .catch(() => {});
      } else {
        fetch("http://localhost:5000/api/admin/clubs")
          .then(r => r.json())
          .then(d => setClubs(Array.isArray(d) ? d.filter(c => c.status === "approved") : []))
          .catch(() => {});
      }
    } else if (uid) {
      fetch(`http://localhost:5000/api/admin/clubs?universityId=${uid}`)
        .then(r => r.json())
        .then(d => setClubs(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [uid, varsityFilter]); // eslint-disable-line

  useEffect(() => {
    if (clubFilter === "all") { 
      setClubMembers(null); 
      return; 
    }
    
    const selectedClub = clubs.find(c => String(c.id) === String(clubFilter));
    if (!selectedClub) { 
      setClubMembers(null); 
      return; 
    }

    // Fetch memberships directly from the memberships table
    fetch(`http://localhost:5000/api/club/memberships/${selectedClub.id}`)
      .then(r => r.json())
      .then(data => {
        // Extract user IDs from approved memberships
        const memberIds = Array.isArray(data) 
          ? new Set(data.filter(m => m.status === 'approved').map(m => m.user_id))
          : new Set();
        setClubMembers(memberIds);
      })
      .catch(err => {
        console.error('Error fetching memberships:', err);
        setClubMembers(null);
      });
  }, [clubFilter, clubs]);

  const roles    = ["all", ...new Set(users.map(u => u.role).filter(r => r && r !== "sub_club_rep"))];
  const filtered = users.filter(u => {
    const matchSearch  = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole    = filter === "all" || u.role === filter;
    const matchClub    = clubFilter === "all" || (clubMembers && clubMembers.has(u.id));
    const matchVarsity = varsityFilter === "all" || String(u.university_id) === String(varsityFilter);
    return matchSearch && matchRole && matchClub && matchVarsity;
  });

  const superAdmins = filtered.filter(u => u.role === "super_admin");
  const others      = filtered.filter(u => u.role !== "super_admin");

  const activeVarsity = varsities.find(v => String(v.id) === String(varsityFilter));
  const activeClub    = clubs.find(c => String(c.id) === String(clubFilter));

  return (
    <>
      <style>{pageStyles}</style>

      {/*GEOMETRIC BACKGROUND*/}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      <div className="page">

        {/*NAV*/}
        <nav className="nav">
          <div className="nav-brand">
            <div className="nav-logo-box">SC</div>
            <div>
              <div className="nav-logo">Societas</div>
              <div className="nav-sub">Priorities Unity</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <ThemeToggle />
            <button className="nav-back-btn" onClick={() => navigate(-1)}>← Back</button>
          </div>
        </nav>

        {/*PAGE BODY*/}
        <div className="page-body">
          <div className="content-wrap">

            {/*HEADER*/}
            <div style={{ marginBottom:32, animation:"fadeUp .5s ease both" }}>
              <div className="section-eyebrow">Directory</div>
              <h1 className="section-title">
                <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Members</em>
              </h1>
              <p className="section-desc">Everyone registered at your university</p>
            </div>

            {/*SEARCH and FILTERS*/}
            <div className="filters-wrap" style={{ animation:"fadeUp .5s .1s ease both" }}>
              <input
                className="search-input"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
                {roles.map(r => (
                  <option key={r} value={r}>
                    {r === "all" ? "All Roles" : r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              {storedUser.role === "super_admin" && varsities.length > 0 && (
                <select
                  className="filter-select"
                  value={varsityFilter}
                  onChange={e => { setVarsityFilter(e.target.value); setClubFilter("all"); }}
                  style={{
                    borderColor: varsityFilter !== "all" ? "rgba(61,191,160,0.5)" : "var(--border)",
                    color:       varsityFilter !== "all" ? "#3DBFA0" : "var(--text-muted)",
                    background:  varsityFilter !== "all" ? (isDark ? "rgba(61,191,160,0.08)" : "#E8F5F0") : "var(--card-bg)",
                  }}
                >
                  <option value="all">All Varsities</option>
                  {varsities.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              )}

              {clubs.length > 0 && (
                <select
                  className="filter-select"
                  value={clubFilter}
                  onChange={e => setClubFilter(e.target.value)}
                  style={{
                    borderColor: clubFilter !== "all" ? "rgba(244,132,95,0.5)" : "var(--border)",
                    color:       clubFilter !== "all" ? "#F4845F" : "var(--text-muted)",
                    background:  clubFilter !== "all" ? (isDark ? "rgba(244,132,95,0.08)" : "#FEF0EC") : "var(--card-bg)",
                  }}
                >
                  <option value="all">All Clubs</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            {/*ACTIVE FILTER BADGES*/}
            {(varsityFilter !== "all" || clubFilter !== "all") && (
              <div className="badge-row" style={{ animation:"fadeUp .3s ease both" }}>
                {varsityFilter !== "all" && storedUser.role === "super_admin" && (
                  <div className="filter-badge" style={{ background: isDark ? "rgba(61,191,160,0.08)" : "#E8F5F0", borderColor:"rgba(61,191,160,0.3)", color:"#3DBFA0" }}>
                    <span>⬢ {activeVarsity?.name}</span>
                    <button className="badge-close" onClick={() => { setVarsityFilter("all"); setClubFilter("all"); }}>✕</button>
                  </div>
                )}
                {clubFilter !== "all" && (
                  <div className="filter-badge" style={{ background: isDark ? "rgba(244,132,95,0.08)" : "#FEF0EC", borderColor:"rgba(244,132,95,0.3)", color:"#F4845F" }}>
                    <span>◈ {activeClub?.name}</span>
                    <button className="badge-close" onClick={() => setClubFilter("all")}>✕</button>
                  </div>
                )}
              </div>
            )}

            {/*LOADING*/}
            {loading && (
              <div style={{ textAlign:"center", padding:"48px 0", color:"var(--text-muted)", fontSize:".9rem", animation:"shimmer 1.8s ease-in-out infinite" }}>
                Loading…
              </div>
            )}

            {/*SUPER ADMINS*/}
            {superAdmins.length > 0 && clubFilter === "all" && varsityFilter === "all" && (
              <div style={{ marginBottom:24, animation:"fadeUp .5s .15s ease both" }}>
                <div className="group-label" style={{ color:"#7B93D4" }}>
                  <span style={{ fontSize:".85rem" }}>🌐</span> Super Admins
                </div>
                <div className="user-list">
                  {superAdmins.map(u => <UserCard key={u.id} user={u} onClick={() => navigate(`/users/${u.id}`)} />)}
                </div>
              </div>
            )}

            {/*EVERYONE ELSE*/}
            {others.length > 0 && (
              <div style={{ animation:"fadeUp .5s .2s ease both" }}>
                <div className="group-label" style={{ color:"var(--text-muted)" }}>
                  {clubFilter !== "all"
                    ? `◈ ${activeClub?.name} · ${others.length} ${others.length === 1 ? "member" : "members"}`
                    : varsityFilter !== "all"
                    ? `⬢ ${activeVarsity?.name} · ${others.length} ${others.length === 1 ? "person" : "people"}`
                    : `👥 Your Varsity · ${others.length} ${others.length === 1 ? "person" : "people"}`
                  }
                </div>
                <div className="user-list">
                  {others.map(u => <UserCard key={u.id} user={u} onClick={() => navigate(`/users/${u.id}`)} />)}
                </div>
              </div>
            )}

            {/*EMPTY STATE*/}
            {!loading && filtered.length === 0 && (
              <div className="empty-state">
                <div style={{ fontSize:"2.5rem", marginBottom:14, opacity:.35 }}>👥</div>
                <p style={{ fontSize:".9rem", color:"var(--text-muted)" }}>
                  {clubFilter !== "all" ? "No members found in this club." : "No users found."}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  /*LIGHT THEME*/
  body.theme-light {
    --mint:       #3DBFA0;
    --mint-light: #E8F5F0;
    --mint-dark:  #2A9E83;
    --text:       #2A3B35;
    --text-soft:  #6B7F78;
    --text-muted: #9DB5AE;
    --border:     #DCE9E5;
    --border-h:   #A8D4CB;
    --card-bg:    #ffffff;
    --card-hover: #F0FAF7;
    --nav-bg:     rgba(244,249,248,0.88);
    --nav-border: #DCE9E5;
    --shadow:     0 2px 10px rgba(61,191,160,0.07);
    --shadow-lg:  0 6px 24px rgba(61,191,160,0.14);
  }

  /*DARK THEME*/
  body.theme-dark {
    --mint:       #3DBFA0;
    --mint-light: rgba(61,191,160,0.15);
    --mint-dark:  #2A9E83;
    --text:       #dde4ee;
    --text-soft:  #8fa0b5;
    --text-muted: #5e738a;
    --border:     rgba(196,178,140,0.12);
    --border-h:   rgba(196,178,140,0.32);
    --card-bg:    #162030;
    --card-hover: #1d2c3f;
    --nav-bg:     rgba(14,24,37,0.92);
    --nav-border: rgba(196,178,140,0.12);
    --shadow:     0 2px 10px rgba(0,0,0,0.20);
    --shadow-lg:  0 6px 24px rgba(0,0,0,0.36);
  }

  html, body {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  /*BACKGROUND*/
  .bg-canvas { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; }

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

  .bg-bottom-accent {
    position:absolute; bottom:0; left:0; width:40%; height:35%;
    clip-path:polygon(0% 0%,100% 100%,0% 100%);
  }
  .bg-noise {
    position:absolute; inset:0; opacity:0.035;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size:200px 200px;
  }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:1} }

  .page { position:relative; z-index:1; min-height:100vh; }

  /*NAV*/
  .nav {
    position:sticky; top:0; z-index:100;
    background:var(--nav-bg); backdrop-filter:blur(20px);
    border-bottom:1px solid var(--nav-border);
    padding:0 64px; height:66px;
    display:flex; align-items:center; justify-content:space-between;
    animation:fadeIn .4s ease both;
  }
  .nav-brand { display:flex; align-items:center; gap:11px; }
  .nav-logo-box {
    width:36px; height:36px; border-radius:10px; background:var(--mint);
    color:white; font-family:'DM Serif Display',serif; font-size:1rem; font-weight:700;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 12px rgba(61,191,160,0.30);
  }
  .nav-logo { font-family:'DM Serif Display',serif; font-size:1.15rem; color:var(--text); letter-spacing:-0.01em; }
  .nav-sub  { font-size:.68rem; color:var(--text-muted); letter-spacing:.08em; text-transform:uppercase; }
  .nav-back-btn {
    font-size:.83rem; color:var(--text-muted); font-weight:500;
    padding:8px 16px; border-radius:10px; border:1.5px solid var(--border);
    background:var(--card-bg); cursor:pointer; font-family:'DM Sans',sans-serif;
    transition:all .2s;
  }
  .nav-back-btn:hover { border-color:var(--mint); color:var(--mint); }

  /*PAGE BODY*/
  .page-body {
    min-height: calc(100vh - 66px);
    padding: 52px 24px 80px;
    display: flex; justify-content: center;
  }
  .content-wrap { width:100%; max-width:700px; }

  /*SECTION HEADER*/
  .section-eyebrow {
    font-size:.7rem; font-weight:600; color:var(--mint);
    letter-spacing:.12em; text-transform:uppercase; margin-bottom:8px;
  }
  .section-title {
    font-family:'DM Serif Display',serif;
    font-size:2.4rem; font-weight:400; color:var(--text);
    letter-spacing:-.02em; margin-bottom:8px; line-height:1.2;
  }
  .section-desc { font-size:.9rem; color:var(--text-muted); }

  /*FILTERS*/
  .filters-wrap {
    display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap;
  }
  .search-input {
    flex:1; min-width:200px;
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:12px; padding:11px 16px;
    font-size:.88rem; color:var(--text); font-family:'DM Sans',sans-serif;
    transition:border-color .2s, box-shadow .2s; outline:none;
  }
  .search-input::placeholder { color:var(--text-muted); }
  .search-input:focus { border-color:var(--mint); box-shadow:0 0 0 3px rgba(61,191,160,0.12); }

  .filter-select {
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:12px; padding:11px 14px;
    font-size:.85rem; color:var(--text-muted); font-family:'DM Sans',sans-serif;
    cursor:pointer; transition:all .2s; outline:none;
  }
  .filter-select:focus { border-color:var(--mint); }
  .filter-select option { background:var(--card-bg); color:var(--text); }

  /*FILTER BADGES*/
  .badge-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
  .filter-badge {
    display:inline-flex; align-items:center; gap:8px;
    border:1.5px solid; border-radius:20px; padding:5px 12px;
    font-size:.78rem; font-weight:600;
  }
  .badge-close {
    background:none; border:none; cursor:pointer;
    color:var(--text-muted); font-size:.85rem; padding:0; line-height:1;
    transition:color .2s;
  }
  .badge-close:hover { color:var(--text); }

  /*GROUP LABEL*/
  .group-label {
    font-size:.72rem; font-weight:700; text-transform:uppercase;
    letter-spacing:.1em; margin-bottom:12px;
    display:flex; align-items:center; gap:6px;
  }

  /*USER LIST*/
  .user-list { display:flex; flex-direction:column; gap:10px; }

  /*USER CARD*/
  .user-card {
    display:flex; align-items:center; gap:14px;
    border:1.5px solid; border-radius:14px; padding:14px 18px;
    cursor:pointer; transition:all .2s;
  }

  /*EMPTY STATE*/
  .empty-state {
    text-align:center; padding:56px 24px;
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:18px; box-shadow:var(--shadow);
  }

  @media (max-width:600px) {
    .nav { padding:0 20px; }
    .section-title { font-size:2rem; }
    .filters-wrap { flex-direction:column; }
    .filter-select, .search-input { width:100%; }
  }
`;