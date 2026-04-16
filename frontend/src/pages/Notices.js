import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getNotices, createNotice, deleteNotice } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";

const API_BASE     = "http://localhost:5000";
const NOTICE_ROLES = ["super_admin", "varsity_admin", "club_rep"];

function timeAgo(d) {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

// Avatar
function Avatar({ src, name, size = 44 }) {
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
        : initials}
    </div>
  );
}

// Role badge
const ROLE_META = {
  super_admin:   { bg:"rgba(123,147,212,0.15)", color:"#7B93D4" },
  varsity_admin: { bg:"rgba(61,191,160,0.15)",  color:"#3DBFA0" },
  club_rep:      { bg:"rgba(244,132,95,0.15)",  color:"#F4845F" },
  student:       { bg:"rgba(232,194,74,0.15)",  color:"#E8C24A" },
};

export default function Notices() {
  const navigate    = useNavigate();
  const [notices, setNotices] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [user,    setUser]    = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    // Trigger header animation after mount
    const t = setTimeout(() => setHeaderVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getNotices();
      setNotices(r.data.notices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePost = async e => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await createNotice({ content: content.trim() });
      setContent("");
      load();
    } catch (err) { alert(err.response?.data?.error || "Failed to post notice"); }
    finally { setPosting(false); }
  };

  const handleDelete = async id => {
    await deleteNotice(id);
    setNotices(prev => prev.filter(n => n.id !== id));
    setDeleting(null);
  };

  const canPost = user && NOTICE_ROLES.includes(user.role);

  return (
    <>
      <style>{pageStyles}</style>

      {/* GEOMETRIC BACKGROUND */}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      {/* DELETE CONFIRM MODAL */}
      {deleting && (
        <div className="overlay" onClick={e => { if (e.target.classList.contains("overlay")) setDeleting(null); }}>
          <div className="confirm-modal">
            <div style={{ fontSize:"2rem", marginBottom:14 }}>🗑️</div>
            <p style={{ fontSize:".9rem", color:"var(--text-soft)", lineHeight:1.75, marginBottom:28 }}>
              Delete this notice? This action cannot be undone.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button className="confirm-btn-danger" onClick={() => handleDelete(deleting)}>Delete</button>
              <button className="confirm-btn-ghost"  onClick={() => setDeleting(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="page">

        {/* NAV */}
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

        {/* PAGE BODY */}
        <div className="page-body">
          <div className="content-wrap">

            {/* ANIMATED HEADER */}
            <div className={`header-block${headerVisible ? " header-visible" : ""}`} style={{ marginBottom:36 }}>
              {/* Eyebrow */}
              <div className="header-eyebrow section-eyebrow">Announcements</div>

              {/* Title — each word slides in with a stagger */}
              <h1 className="section-title header-title">
                <span className="word-anim word-anim-1">Notice</span>{" "}
                <em className="word-anim word-anim-2" style={{ fontStyle:"italic", color:"var(--mint)" }}>Board.</em>
              </h1>

              {/* Description types in letter-by-letter via CSS */}
              <p className="section-desc header-desc">
                {canPost
                  ? "Post important announcements for your varsity or club."
                  : "Read-only — notices are posted by admins and club representatives."}
              </p>
            </div>

            {/* POST FORM */}
            {canPost && (
              <form
                onSubmit={handlePost}
                className="post-form"
                style={{ animation:"fadeUp .5s .1s ease both" }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
                  <div style={{
                    width:40, height:40, borderRadius:10,
                    background:"var(--mint-light)", border:"1.5px solid rgba(61,191,160,0.3)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem",
                  }}>📢</div>
                  <div>
                    <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.1rem", color:"var(--text)", letterSpacing:"-.01em" }}>Post a Notice</div>
                    <div style={{ fontSize:".75rem", color:"var(--text-muted)" }}>Visible to all members of your varsity</div>
                  </div>
                </div>

                <textarea
                  placeholder="Write your notice here…"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  required
                  className="notice-textarea"
                />

                <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
                  <button
                    type="submit"
                    disabled={posting || !content.trim()}
                    className="btn-primary"
                    style={{
                      padding:"11px 28px",
                      opacity: (!content.trim()) ? .5 : 1,
                      cursor: (posting || !content.trim()) ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={e => { if (!posting && content.trim()) e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {posting ? "Posting…" : "Post Notice"}
                  </button>
                </div>
              </form>
            )}

            {/* READ-ONLY BANNER */}
            {user && !canPost && (
              <div className="info-banner" style={{ animation:"fadeUp .5s .1s ease both" }}>
                <span style={{ fontSize:"1rem" }}>📖</span>
                Notices are posted by admins and club representatives. You can read but not post.
              </div>
            )}

            {/* LOADING */}
            {loading && (
              <div style={{ textAlign:"center", padding:"48px 0", color:"var(--text-muted)", fontSize:".9rem", animation:"shimmer 1.8s ease-in-out infinite" }}>
                Loading notices…
              </div>
            )}

            {/* EMPTY STATE */}
            {!loading && notices.length === 0 && (
              <div className="empty-state">
                <p style={{ fontSize:".9rem", color:"var(--text-muted)" }}>No notices yet.</p>
              </div>
            )}

            {/* NOTICE CARDS */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {notices.map((notice, i) => {
                const isGlobal = notice.university_id === null;
                const rm       = ROLE_META[notice.author_role] || ROLE_META.student;
                const canDel   = notice.author_id === user?.id || user?.role === "super_admin";

                return (
                  <div
                    key={notice.id}
                    className="notice-card"
                    style={{
                      borderLeft: `3px solid ${isGlobal ? "#7B93D4" : "#3DBFA0"}`,
                      animation: `fadeUp .5s ease ${.15 + i * .05}s both`,
                    }}
                  >
                    {isGlobal && (
                      <div className="global-badge">
                        <span>🌐</span> All Varsities
                      </div>
                    )}

                    <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
                      <Avatar src={notice.author_avatar} name={notice.author_name} />

                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1rem", color:"var(--text)", marginBottom:5 }}>
                          {notice.author_name}
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                          <span style={{
                            background: rm.bg, color: rm.color,
                            padding:"3px 10px", borderRadius:20, fontSize:".7rem", fontWeight:700,
                            textTransform:"capitalize", letterSpacing:".04em",
                            border:`1.5px solid ${rm.color}33`,
                          }}>
                            {notice.author_role?.replace(/_/g, " ")}
                          </span>
                          <span style={{ fontSize:".76rem", color:"var(--text-muted)" }}>
                            {timeAgo(notice.created_at)}
                          </span>
                        </div>
                      </div>

                      {canDel && (
                        <button
                          onClick={() => setDeleting(notice.id)}
                          className="delete-btn"
                          title="Delete notice"
                        >🗑️</button>
                      )}
                    </div>

                    <div className="notice-content">
                      {notice.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTTOM BACK BUTTON */}
            <div className="bottom-back-wrap" style={{ animation:`fadeUp .5s ease ${.2 + notices.length * .05}s both` }}>
              <button className="bottom-back-btn" onClick={() => navigate(-1)}>
                Back
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// Styles
const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  /* LIGHT THEME */
  body.theme-light {
    --mint:        #3DBFA0;
    --mint-light:  #E8F5F0;
    --mint-dark:   #2A9E83;
    --text:        #2A3B35;
    --text-soft:   #6B7F78;
    --text-muted:  #9DB5AE;
    --border:      #DCE9E5;
    --border-h:    #A8D4CB;
    --card-bg:     #ffffff;
    --card-hover:  #F0FAF7;
    --surface2:    #F7F9F8;
    --nav-bg:      rgba(244,249,248,0.88);
    --nav-border:  #DCE9E5;
    --shadow:      0 2px 10px rgba(61,191,160,0.07);
    --shadow-lg:   0 6px 24px rgba(61,191,160,0.14);
    --info-bg:     #E8F5F0;
    --info-border: rgba(61,191,160,0.3);
  }

  /* DARK THEME */
  body.theme-dark {
    --mint:        #3DBFA0;
    --mint-light:  rgba(61,191,160,0.15);
    --mint-dark:   #2A9E83;
    --text:        #dde4ee;
    --text-soft:   #8fa0b5;
    --text-muted:  #5e738a;
    --border:      rgba(196,178,140,0.12);
    --border-h:    rgba(196,178,140,0.30);
    --card-bg:     #162030;
    --card-hover:  #1d2c3f;
    --surface2:    #1d2c3f;
    --nav-bg:      rgba(14,24,37,0.92);
    --nav-border:  rgba(196,178,140,0.12);
    --shadow:      0 2px 10px rgba(0,0,0,0.20);
    --shadow-lg:   0 6px 24px rgba(0,0,0,0.35);
    --info-bg:     rgba(61,191,160,0.07);
    --info-border: rgba(61,191,160,0.2);
  }

  html, body {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  /* BACKGROUND */
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

  /* ---- KEYFRAMES ---- */
  @keyframes fadeUp     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
  @keyframes shimmer    { 0%,100%{opacity:.4} 50%{opacity:1} }

  /* Header animations */
  @keyframes eyebrowIn  { from{opacity:0;letter-spacing:.3em} to{opacity:1;letter-spacing:.12em} }
  @keyframes slideWord  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes descReveal { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
  @keyframes underlineGrow { from{width:0} to{width:100%} }

  /* Bottom back button animations */
  @keyframes pulseBack  { 0%,100%{box-shadow:0 0 0 0 rgba(61,191,160,0)} 50%{box-shadow:0 0 0 6px rgba(61,191,160,0.12)} }

  .page { position:relative; z-index:1; min-height:100vh; }

  /* NAV */
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

  /* PAGE BODY */
  .page-body {
    min-height:calc(100vh - 66px);
    padding:52px 24px 80px;
    display:flex; justify-content:center;
  }
  .content-wrap { width:100%; max-width:660px; }

  /* ---- ANIMATED HEADER ---- */
  .header-block { opacity:0; }
  .header-block.header-visible .header-eyebrow {
    animation: eyebrowIn .55s cubic-bezier(.22,1,.36,1) .05s both;
  }
  .header-block.header-visible .word-anim-1 {
    animation: slideWord .55s cubic-bezier(.22,1,.36,1) .18s both;
  }
  .header-block.header-visible .word-anim-2 {
    animation: slideWord .55s cubic-bezier(.22,1,.36,1) .32s both;
  }
  .header-block.header-visible .header-desc {
    animation: descReveal .5s ease .52s both;
  }
  .header-block.header-visible {
    opacity: 1;
  }

  /* Underline accent under the title */
  .header-title {
    position: relative;
    display: inline-block;
  }
  .header-block.header-visible .header-title::after {
    content: '';
    position: absolute;
    left: 0; bottom: -4px;
    height: 2px;
    background: linear-gradient(90deg, var(--mint) 0%, transparent 100%);
    animation: underlineGrow .6s cubic-bezier(.22,1,.36,1) .6s both;
  }

  .word-anim { display:inline-block; opacity:0; }
  .header-desc { opacity:0; }

  /* HEADER TEXT */
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

  /* POST FORM */
  .post-form {
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:20px; padding:28px 28px 24px;
    margin-bottom:24px; box-shadow:var(--shadow-lg);
    position:relative; overflow:hidden;
  }
  .post-form::before {
    content:''; position:absolute; top:-40px; right:-40px;
    width:120px; height:120px; border-radius:50%;
    background:var(--mint-light); pointer-events:none;
  }

  /* TEXTAREA */
  .notice-textarea {
    width:100%; background:var(--surface2);
    border:1.5px solid var(--border); border-radius:12px;
    padding:14px 16px; font-size:.9rem; font-weight:400;
    color:var(--text); font-family:'DM Sans',sans-serif;
    resize:vertical; outline:none; transition:border-color .2s, box-shadow .2s;
    line-height:1.7;
  }
  .notice-textarea::placeholder { color:var(--text-muted); }
  .notice-textarea:focus {
    border-color:var(--mint);
    box-shadow:0 0 0 3px rgba(61,191,160,0.12);
  }

  /* PRIMARY BUTTON */
  .btn-primary {
    border-radius:12px; border:none;
    background:var(--mint); color:white;
    font-size:.88rem; font-weight:600;
    cursor:pointer; font-family:'DM Sans',sans-serif;
    box-shadow:0 4px 16px rgba(61,191,160,0.35);
    transition:background .2s, transform .2s, box-shadow .2s;
  }
  .btn-primary:hover:not(:disabled) {
    background:var(--mint-dark);
    box-shadow:0 8px 24px rgba(61,191,160,0.40);
  }

  /* INFO BANNER */
  .info-banner {
    display:flex; align-items:center; gap:10px;
    background:var(--info-bg); border:1.5px solid var(--info-border);
    border-radius:12px; padding:14px 18px;
    font-size:.85rem; color:var(--text-soft);
    margin-bottom:24px; line-height:1.6;
  }

  /* NOTICE CARD */
  .notice-card {
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:16px; padding:22px 24px;
    box-shadow:var(--shadow);
    transition:border-color .2s, box-shadow .2s, transform .2s;
  }
  .notice-card:hover {
    border-color:var(--border-h);
    box-shadow:var(--shadow-lg);
    transform:translateY(-2px);
  }

  /* GLOBAL BADGE */
  .global-badge {
    display:inline-flex; align-items:center; gap:6px;
    background:rgba(123,147,212,0.12); color:#7B93D4;
    border:1.5px solid rgba(123,147,212,0.3);
    padding:4px 12px; border-radius:20px;
    font-size:.72rem; font-weight:700; letter-spacing:.05em;
    margin-bottom:14px;
  }

  /* NOTICE CONTENT */
  .notice-content {
    font-size:.9rem; line-height:1.78; color:var(--text-soft);
    white-space:pre-wrap; border-top:1px solid var(--border);
    padding-top:14px; margin-top:2px;
  }

  /* DELETE BUTTON */
  .delete-btn {
    background:none; border:1.5px solid var(--border);
    border-radius:8px; padding:5px 10px;
    font-size:.9rem; cursor:pointer; color:var(--text-muted);
    transition:border-color .2s, color .2s, background .2s; flex-shrink:0;
  }
  .delete-btn:hover {
    border-color:rgba(244,132,95,0.5);
    color:#F4845F; background:rgba(244,132,95,0.08);
  }

  /* OVERLAY */
  .overlay {
    position:fixed; inset:0; z-index:9000;
    background:rgba(10,21,32,0.65); backdrop-filter:blur(10px);
    display:flex; align-items:center; justify-content:center; padding:24px;
    animation:fadeIn .2s ease both;
  }

  /* CONFIRM MODAL */
  .confirm-modal {
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:20px; padding:36px;
    max-width:360px; width:100%; text-align:center;
    box-shadow:var(--shadow-lg);
    animation:fadeUp .3s cubic-bezier(.22,1,.36,1) both;
  }
  .confirm-btn-danger {
    padding:10px 26px; background:#F4845F; color:white;
    border:none; border-radius:10px; cursor:pointer;
    font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:600;
    transition:background .2s;
  }
  .confirm-btn-danger:hover { background:#e06840; }
  .confirm-btn-ghost {
    padding:10px 26px; background:transparent; color:var(--text-muted);
    border:1.5px solid var(--border); border-radius:10px; cursor:pointer;
    font-family:'DM Sans',sans-serif; font-size:.85rem; transition:border-color .2s;
  }
  .confirm-btn-ghost:hover { border-color:var(--border-h); }

  /* EMPTY STATE */
  .empty-state {
    text-align:center; padding:56px 24px;
    background:var(--card-bg); border:1.5px solid var(--border);
    border-radius:18px; box-shadow:var(--shadow);
  }

  /* ---- BOTTOM BACK BUTTON ---- */
  .bottom-back-wrap {
    display: flex;
    justify-content: center;
    padding-top: 40px;
    padding-bottom: 8px;
  }

  .bottom-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 13px 32px;
    border-radius: 14px;
    border: 1.5px solid var(--border);
    background: #000;;
    color: var(--text-muted);
    font-family: 'DM Sans', sans-serif;
    font-size: .88rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color .22s, color .22s, background .22s, transform .22s, box-shadow .22s;
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
  }

  .bottom-back-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(61,191,160,0.08) 0%, transparent 60%);
    opacity: 0;
    transition: opacity .25s;
    border-radius: inherit;
  }

  .bottom-back-btn:hover {
    border-color: var(--mint);
    color: var(--mint);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    animation: pulseBack 1.8s ease-in-out infinite;
  }

  .bottom-back-btn:hover::before { opacity: 1; }

  .bottom-back-btn:active {
    transform: translateY(0);
    animation: none;
  }

  .back-arrow {
    display: inline-block;
    transition: transform .22s;
    font-size: 1rem;
  }

  .bottom-back-btn:hover .back-arrow {
    transform: translateX(-4px);
  }

  @media (max-width:600px) {
    .nav { padding:0 20px; }
    .section-title { font-size:2rem; }
    .post-form { padding:22px 18px 20px; }
    .notice-card { padding:18px 16px; }
    .bottom-back-btn { padding:12px 24px; font-size:.84rem; }
  }
`;
