import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";

const FEATURES = [
  { num: "01", title: "Club Directory",        desc: "A structured registry of all clubs across every university which is searchable, organised, and always current.",      icon: "🏛️", lightBg: "#E8F5F0", lightAccent: "#3DBFA0", darkBg: "rgba(61,191,160,0.08)",  darkAccent: "#3DBFA0" },
  { num: "02", title: "Membership Management", desc: "Enroll students, assign roles, and maintain accurate membership records with minimal effort.",                        icon: "👥", lightBg: "#FEF0EC", lightAccent: "#F4845F", darkBg: "rgba(244,132,95,0.08)",  darkAccent: "#F4845F" },
  { num: "03", title: "Multi-level Access",    desc: "Distinct portals for admins, university administrators, and club representatives.",                                   icon: "🔐", lightBg: "#EEF2FB", lightAccent: "#7B93D4", darkBg: "rgba(123,147,212,0.08)", darkAccent: "#7B93D4" },
  { num: "04", title: "Activity & Reporting",  desc: "Track events, monitor engagement, and generate structured reports for institutional review.",                        icon: "📊", lightBg: "#FDF7E4", lightAccent: "#E8C24A", darkBg: "rgba(232,194,74,0.08)",  darkAccent: "#E8C24A" },
];

const REGISTER_ROLES = [
  { key: "varsity", icon: "🏫", title: "University Authority",   desc: "Manage clubs within your university.",       lightBg: "#E8F5F0", lightAccent: "#3DBFA0", darkBg: "rgba(61,191,160,0.10)",  darkAccent: "#3DBFA0" },
  { key: "club",    icon: "🎯", title: "Club Representative",    desc: "Manage your club's members and activities.", lightBg: "#FEF0EC", lightAccent: "#F4845F", darkBg: "rgba(244,132,95,0.10)",  darkAccent: "#F4845F" },
  { key: "student", icon: "🎓", title: "Student",                desc: "Join clubs and track your memberships.",     lightBg: "#EEF2FB", lightAccent: "#7B93D4", darkBg: "rgba(123,147,212,0.10)", darkAccent: "#7B93D4" },
];

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

export default function Home() {
  const navigate       = useNavigate();
  const { isDark }     = useTheme();

  const [stats,   setStats]   = useState({ clubs: "—", members: "—", varsities: "—" });
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);

  /*scroll*/
  const [heroLeftRef,    heroLeftVis]    = useInView();
  const [heroRightRef,   heroRightVis]   = useInView();
  const [sectionLblRef,  sectionLblVis]  = useInView();
  const [featGridRef,    featGridVis]    = useInView();
  const [statsGridRef,   statsGridVis]   = useInView();

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/stats")
      .then(r => r.json())
      .then(d => { setStats({ clubs: d.clubs ?? "—", members: d.members ?? "—", varsities: d.varsities ?? "—" }); setLoading(false); })
      .catch(() => { setStats({ clubs: "—", members: "—", varsities: "—" }); setLoading(false); });
  }, []);

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const STATS = [
    { value: loading ? "…" : stats.clubs,     label: "Registered Clubs", icon: "🏆", accent: "#3DBFA0" },
    { value: loading ? "…" : stats.members,   label: "Active Members",   icon: "👨‍🎓", accent: "#F4845F" },
    { value: loading ? "…" : stats.varsities, label: "Universities",     icon: "🏫", accent: "#7B93D4" },
  ];

  const handleRole = path => { setModal(null); navigate(path); };

  return (
    <>
      <style>{`
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
          --bg:           #FFFFFF;
          --bg-alt:       #F7F9F8;
          --surface:      #FFFFFF;
          --surface2:     #F7F9F8;
          --shadow:       0 4px 20px rgba(61,191,160,0.10);
          --shadow-lg:    0 8px 36px rgba(61,191,160,0.18);
          --nav-bg:       rgba(244,249,248,0.88);
          --nav-border:   #DCE9E5;
          --feat-bg:      rgba(255,255,255,0.92);
          --footer-bg:    rgba(255,255,255,0.85);
          --modal-bg:     #ffffff;
          --modal-shadow: 0 24px 60px rgba(42,59,53,0.15);
          --overlay-bg:   rgba(42,59,53,0.45);
          --card-bg:      #ffffff;
          --stat-hover:   var(--shadow-lg);
          --role-bg:      #ffffff;
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
          --border:       rgba(196,178,140,0.12);
          --bg:           #0e1825;
          --bg-alt:       #162030;
          --surface:      #162030;
          --surface2:     #1d2c3f;
          --shadow:       0 4px 20px rgba(0,0,0,0.30);
          --shadow-lg:    0 8px 36px rgba(0,0,0,0.40);
          --nav-bg:       rgba(14,24,37,0.92);
          --nav-border:   rgba(196,178,140,0.12);
          --feat-bg:      rgba(22,32,48,0.95);
          --footer-bg:    rgba(14,24,37,0.95);
          --modal-bg:     #162030;
          --modal-shadow: 0 24px 60px rgba(0,0,0,0.50);
          --overlay-bg:   rgba(5,10,18,0.75);
          --card-bg:      #1d2c3f;
          --stat-hover:   0 8px 36px rgba(0,0,0,0.40);
          --role-bg:      #1d2c3f;
        }

        html, body {
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
          transition: background .3s, color .3s;
        }

        /*BACKGROUND*/
        .bg-canvas {
          position: fixed; inset: 0; z-index: 0;
          overflow: hidden; pointer-events: none; transition: opacity .3s;
        }
        body.theme-light .bg-canvas::before {
          content: ''; position: absolute; inset: 0; background: #f0ebe3;
        }
        body.theme-light .bg-canvas::after {
          content: ''; position: absolute; top: 0; right: 0;
          width: 55%; height: 55%; background: #c9a8b2;
          clip-path: polygon(45% 0%, 100% 0%, 100% 100%, 0% 100%);
        }
        body.theme-light .bg-bottom-accent { background: #ddb8c0; }
        body.theme-dark .bg-canvas::before {
          content: ''; position: absolute; inset: 0; background: #0a1520;
        }
        body.theme-dark .bg-canvas::after {
          content: ''; position: absolute; top: 0; right: 0;
          width: 55%; height: 55%; background: #0f2535;
          clip-path: polygon(45% 0%, 100% 0%, 100% 100%, 0% 100%);
        }
        body.theme-dark .bg-bottom-accent { background: #0d1e30; }
        .bg-bottom-accent {
          position: absolute; bottom: 0; left: 0;
          width: 40%; height: 35%;
          clip-path: polygon(0% 0%, 100% 100%, 0% 100%);
        }
        .bg-noise {
          position: absolute; inset: 0; opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
        }

        /*KEYFRAMES*/
        @keyframes fadeUp    { from{opacity:0;transform:translateY(18px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn    { from{opacity:0}                              to{opacity:1} }
        @keyframes float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shimmer   { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes modalIn   { from{opacity:0;transform:scale(.96) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }

        /*SCROLL*/
        @keyframes slideFromLeft  { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideFromRight { from{opacity:0;transform:translateX(60px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes slideFromDown  { from{opacity:0;transform:translateY(40px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes popIn          { from{opacity:0;transform:scale(0.88) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }

        /*REVEAL*/
        .reveal-left {
          opacity: 0;
          transform: translateX(-60px);
          transition: opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1);
        }
        .reveal-left.visible {
          opacity: 1;
          transform: translateX(0);
        }
        .reveal-right {
          opacity: 0;
          transform: translateX(60px);
          transition: opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1);
        }
        .reveal-right.visible {
          opacity: 1;
          transform: translateX(0);
        }
        .reveal-up {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.6s cubic-bezier(.22,1,.36,1), transform 0.6s cubic-bezier(.22,1,.36,1);
        }
        .reveal-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .stagger-child {
          opacity: 0;
          transform: translateY(36px) scale(0.97);
          transition: opacity 0.55s cubic-bezier(.22,1,.36,1), transform 0.55s cubic-bezier(.22,1,.36,1);
        }
        .stagger-child.visible { opacity: 1; transform: translateY(0) scale(1); }
        .stagger-child:nth-child(1) { transition-delay: 0.05s; }
        .stagger-child:nth-child(2) { transition-delay: 0.18s; }
        .stagger-child:nth-child(3) { transition-delay: 0.31s; }
        .stagger-child:nth-child(4) { transition-delay: 0.44s; }

        /*NAV*/
        .nav {
          position:sticky; top:0; z-index:100;
          background: var(--nav-bg);
          backdrop-filter:blur(20px);
          border-bottom:1px solid var(--nav-border);
          padding:0 64px; height:66px;
          display:flex; align-items:center; justify-content:space-between;
          animation:fadeIn .4s ease both;
        }
        .nav-brand { display:flex; align-items:center; gap:11px; }
        .nav-logo-box {
          width:36px; height:36px; border-radius:10px;
          background:var(--mint);
          display:flex; align-items:center; justify-content:center;
          font-size:1rem; color:white; font-weight:700;
          font-family:'DM Serif Display',serif;
          box-shadow:0 4px 12px rgba(61,191,160,0.30);
        }
        .nav-logo { font-family:'DM Serif Display',serif; font-size:1.15rem; color:var(--text); letter-spacing:-0.01em; }
        .nav-sub  { font-size:.68rem; color:var(--text-muted); letter-spacing:.08em; text-transform:uppercase; }
        .nav-actions { display:flex; gap:10px; align-items:center; }
        .nav-btn-ghost {
          padding:8px 22px; border-radius:10px; border:1.5px solid var(--border);
          background:var(--card-bg); color:var(--text-soft); font-size:.83rem; font-weight:500;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .2s;
        }
        .nav-btn-ghost:hover { border-color:var(--mint); color:var(--mint); }
        .nav-btn-fill {
          padding:8px 22px; border-radius:10px; border:none;
          background:var(--mint); color:white; font-size:.83rem; font-weight:600;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .2s;
          box-shadow:0 4px 14px rgba(61,191,160,0.30);
        }
        .nav-btn-fill:hover { background:var(--mint-dark); transform:translateY(-1px); }

        /*PAGE WRAP*/
        .page { position:relative; z-index:1; }

        /*HERO*/
        .hero {
          padding:72px 64px 56px;
          display:grid; grid-template-columns:1fr 1fr;
          gap:56px; align-items:center;
          max-width:1200px; margin:0 auto;
        }
        .hero-badge {
          display:inline-flex; align-items:center; gap:8px;
          background:var(--card-bg); color:var(--mint);
          border:1.5px solid var(--mint-light);
          padding:6px 14px; border-radius:20px; font-size:.72rem;
          font-weight:600; letter-spacing:.08em; margin-bottom:22px;
          animation:fadeUp .5s .1s ease both;
          box-shadow:0 2px 8px rgba(61,191,160,0.10);
        }
        .hero-badge-dot { width:6px; height:6px; border-radius:50%; background:var(--mint); }
        .hero-title {
          font-family:'DM Serif Display',serif;
          font-size:clamp(2rem,3.8vw,3rem);
          font-weight:400; line-height:1.25;
          color:var(--text); margin-bottom:18px;
          letter-spacing:-0.02em;
        }
        .hero-title em { color:var(--mint); font-style:italic; }
        .hero-desc {
          font-size:.95rem; font-weight:400; line-height:1.8;
          color:var(--text-soft); max-width:420px; margin-bottom:34px;
        }
        .hero-actions { display:flex; gap:12px; }
        .btn-primary {
          padding:12px 30px; border-radius:12px; border:none;
          background:var(--mint); color:white; font-size:.88rem; font-weight:600;
          cursor:pointer; font-family:'DM Sans',sans-serif;
          box-shadow:0 4px 16px rgba(61,191,160,0.35);
          transition:all .2s;
        }
        .btn-primary:hover { background:var(--mint-dark); transform:translateY(-2px); box-shadow:0 8px 24px rgba(61,191,160,0.40); }
        .btn-secondary {
          padding:12px 30px; border-radius:12px;
          border:1.5px solid var(--border); background:var(--card-bg);
          color:var(--text-soft); font-size:.88rem; font-weight:500;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .2s;
        }
        .btn-secondary:hover { border-color:var(--mint); color:var(--mint); transform:translateY(-2px); }

        /*HERO RIGHT*/
        .hero-welcome-card {
          background:var(--card-bg);
          border-radius:18px; padding:28px 30px; margin-bottom:16px;
          border:1.5px solid var(--border);
          box-shadow:var(--shadow);
          position:relative; overflow:hidden;
        }
        .hero-welcome-card::before {
          content:''; position:absolute;
          top:-40px; right:-40px; width:130px; height:130px;
          border-radius:50%; background:var(--mint-light);
        }
        .welcome-tag   { font-size:.7rem; font-weight:600; color:var(--mint); letter-spacing:.08em; text-transform:uppercase; margin-bottom:8px; }
        .welcome-title { font-family:'DM Serif Display',serif; font-size:1.45rem; font-weight:400; color:var(--text); margin-bottom:4px; letter-spacing:-0.01em; }
        .welcome-sub   { font-size:.84rem; color:var(--text-muted); }
        .welcome-illus { position:absolute; right:24px; bottom:6px; font-size:3.4rem; animation:float 3s ease-in-out infinite; }

        .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .stat-card {
          background:var(--card-bg); border-radius:14px; padding:18px 14px;
          border:1.5px solid var(--border);
          transition:all .25s; text-align:center;
          box-shadow:var(--shadow);
          cursor:default;
        }
        .stat-card:hover { transform:translateY(-4px); box-shadow:var(--shadow-lg); }
        .stat-icon { font-size:1.5rem; margin-bottom:8px; }
        .stat-num  { font-family:'DM Serif Display',serif; font-size:1.9rem; font-weight:400; line-height:1; margin-bottom:4px; }
        .stat-num.loading { animation:shimmer 1.4s ease-in-out infinite; }
        .stat-lbl  { font-size:.68rem; font-weight:500; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; }

        /*FEATURES*/
        .features-wrapper {
          background:var(--feat-bg);
          border-top:1px solid var(--border);
          border-bottom:1px solid var(--border);
          padding:68px 0;
          position:relative;
          backdrop-filter:blur(8px);
        }
        .features-inner  { max-width:1200px; margin:0 auto; padding:0 64px; }
        .section-label   { font-size:.7rem; font-weight:600; color:var(--mint); letter-spacing:.12em; text-transform:uppercase; margin-bottom:10px; }
        .section-title   { font-family:'DM Serif Display',serif; font-size:2rem; font-weight:400; color:var(--text); margin-bottom:6px; letter-spacing:-0.02em; }
        .section-sub     { font-size:.9rem; color:var(--text-soft); margin-bottom:44px; }
        .features-grid   { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .feat-card {
          border-radius:18px; padding:30px;
          border:1.5px solid var(--border); transition:all .25s; cursor:default;
        }
        .feat-card:hover { transform:translateY(-3px); box-shadow:var(--shadow); border-color:transparent; }
        .feat-icon-box {
          width:46px; height:46px; border-radius:12px;
          display:flex; align-items:center;
          justify-content:center; font-size:1.3rem; margin-bottom:16px;
        }
        .feat-num   { font-family:'DM Serif Display',serif; font-size:1.3rem; font-weight:400; margin-bottom:6px; }
        .feat-title { font-size:.95rem; font-weight:600; color:var(--text); margin-bottom:8px; }
        .feat-desc  { font-size:.82rem; font-weight:400; color:var(--text-soft); line-height:1.75; }

        /*FOOTER*/
        .footer {
          background:var(--footer-bg);
          backdrop-filter:blur(8px);
          border-top:1px solid var(--border);
          padding:22px 64px; display:flex; align-items:center; justify-content:space-between;
          position:relative; z-index:1;
        }
        .footer-copy  { font-size:.76rem; color:var(--text-muted); }
        .footer-brand { font-family:'DM Serif Display',serif; font-size:.95rem; color:var(--mint); }

        /*OVERLAY*/
        .overlay {
          position:fixed; inset:0; z-index:200;
          background:var(--overlay-bg); backdrop-filter:blur(10px);
          display:flex; align-items:center; justify-content:center; padding:24px;
          animation:fadeIn .2s ease both;
        }

        /*MODAL*/
        .modal {
          background:var(--modal-bg); border-radius:22px; padding:40px 38px 32px;
          width:100%; max-width:540px; position:relative;
          animation:modalIn .3s cubic-bezier(.22,1,.36,1) both;
          max-height:90vh; overflow-y:auto;
          box-shadow:var(--modal-shadow);
          border:1.5px solid var(--border);
        }
        .modal-close {
          position:absolute; top:16px; right:16px;
          width:30px; height:30px; border-radius:8px;
          background:var(--surface2); border:1px solid var(--border);
          cursor:pointer; font-size:.85rem; color:var(--text-soft);
          display:flex; align-items:center; justify-content:center;
          transition:all .2s;
        }
        .modal-close:hover { background:var(--mint-light); color:var(--mint); }
        .modal-badge {
          display:inline-flex; align-items:center; gap:6px;
          background:var(--mint-light); color:var(--mint);
          padding:5px 12px; border-radius:20px; font-size:.7rem;
          font-weight:600; letter-spacing:.07em; margin-bottom:14px;
          text-transform:uppercase;
        }
        .modal-title {
          font-family:'DM Serif Display',serif;
          font-size:1.65rem; font-weight:400; color:var(--text);
          margin-bottom:6px; letter-spacing:-0.02em;
        }
        .modal-title span { color:var(--mint); font-style:italic; }
        .modal-sub { font-size:.84rem; color:var(--text-soft); margin-bottom:26px; }

        .role-grid { display:grid; grid-template-columns:1fr 1fr; gap:11px; margin-bottom:22px; }
        .role-card {
          border:1.5px solid var(--border);
          border-radius:14px; padding:18px 16px; cursor:pointer;
          transition:all .2s; text-align:left; background:var(--role-bg);
        }
        .role-card:hover { transform:translateY(-3px); box-shadow:var(--shadow); border-color:transparent; }
        .role-icon  { font-size:1.5rem; margin-bottom:10px; display:block; }
        .role-title { font-size:.86rem; font-weight:600; color:var(--text); margin-bottom:4px; }
        .role-desc  { font-size:.74rem; color:var(--text-soft); line-height:1.6; }
        .role-arrow { display:block; margin-top:10px; font-size:.74rem; font-weight:600; }

        .modal-footer { text-align:center; font-size:.81rem; color:var(--text-muted); padding-top:14px; border-top:1px solid var(--border); }
        .modal-footer button {
          background:none; border:none; cursor:pointer;
          color:var(--mint); font-size:.81rem; font-family:'DM Sans',sans-serif;
          font-weight:600; transition:color .2s;
        }
        .modal-footer button:hover { color:var(--mint-dark); }

        @media (max-width:860px) {
          .nav { padding:0 24px; }
          .hero { grid-template-columns:1fr; padding:44px 24px 36px; gap:36px; }
          .features-inner { padding:0 24px; }
          .features-grid  { grid-template-columns:1fr; }
          .footer { padding:18px 24px; }
          .modal { padding:30px 22px 26px; }
          .role-grid { grid-template-columns:1fr; }
        }
      `}</style>

      {/*BACKGROUND*/}
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
              <div className="nav-sub">priorities unity</div>
            </div>
          </div>
          <div className="nav-actions">
            <ThemeToggle />
            <button className="nav-btn-ghost" onClick={() => navigate("/login")}>Sign In</button>
            <button className="nav-btn-fill"  onClick={() => setModal("register")}>Register</button>
          </div>
        </nav>

        {/*HERO*/}
        <div>
          <div className="hero">

            {}
            <div
              ref={heroLeftRef}
              className={`reveal-left${heroLeftVis ? " visible" : ""}`}
            >
              <div className="hero-badge">
                <div className="hero-badge-dot" />
                UNIVERSITY CLUB PORTAL
              </div>
              <h1 className="hero-title">
                Engage all clubs across every university <br />
                <em>with clarity and efficiency.</em>
              </h1>
              <p className="hero-desc">
                A structured and user friendly platform designed for university administrators and student leaders
                to oversee clubs, memberships, and activities seamlessly while eliminating unnecessary complexity
                and enhancing organizational effectiveness.
              </p>
              <div className="hero-actions">
                <button className="btn-primary"   onClick={() => navigate("/login")}>Sign In</button>
                <button className="btn-secondary" onClick={() => setModal("register")}>Register</button>
              </div>
            </div>

            {}
            <div
              ref={heroRightRef}
              className={`reveal-right${heroRightVis ? " visible" : ""}`}
            >
              <div className="hero-welcome-card">
                <div className="welcome-tag">✦ Your portal</div>
                <div className="welcome-title">Welcome to Societas!</div>
                <div className="welcome-sub">A university club management platform</div>
                <div className="welcome-illus">🎓</div>
              </div>

              {/*scroll*/}
              <div
                ref={statsGridRef}
                className="stats-grid"
              >
                {STATS.map((s, i) => (
                  <div
                    key={i}
                    className={`stat-card stagger-child${statsGridVis ? " visible" : ""}`}
                    style={{ borderTop: `3px solid ${s.accent}` }}
                    
                  >
                    <div className="stat-icon">{s.icon}</div>
                    <div className={`stat-num${loading ? " loading" : ""}`} style={{ color: s.accent }}>{s.value}</div>
                    <div className="stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/*FEATURES*/}
        <div className="features-wrapper">
          <div className="features-inner">

            {}
            <div
              ref={sectionLblRef}
              className={`reveal-up${sectionLblVis ? " visible" : ""}`}
            >
              <div className="section-label">Platform Features</div>
              <div className="section-title">What the platform does</div>
              <div className="section-sub">Four core capabilities to manage university clubs</div>
            </div>

            {}
            <div
              ref={featGridRef}
              className="features-grid"
            >
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className={`feat-card stagger-child${featGridVis ? " visible" : ""}`}
                  style={{ background: isDark ? f.darkBg : f.lightBg }}
                >
                  <div
                    className="feat-icon-box"
                    style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)" }}
                  >
                    {f.icon}
                  </div>
                  <div className="feat-num" style={{ color: isDark ? f.darkAccent : f.lightAccent }}>{f.num}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/*FOOTER*/}
        <footer className="footer">
          <span className="footer-copy">© 2026 Societas Management System. All rights reserved.</span>
          <span className="footer-brand">Societas</span>
        </footer>

      </div>

      {/*REGISTER MODAL*/}
      {modal === "register" && (
        <div className="overlay" onClick={e => { if (e.target.classList.contains("overlay")) setModal(null); }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <div className="modal-badge">✨ Create Account</div>
            <h2 className="modal-title">Register <span>as who?</span></h2>
            <p className="modal-sub">Select your role to continue with registration.</p>

            <div className="role-grid">
              {REGISTER_ROLES.map(role => (
                <div
                  className="role-card"
                  key={role.key}
                  onClick={() => handleRole(`/register?role=${role.key}`)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = isDark ? role.darkBg : role.lightBg;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isDark ? "var(--role-bg)" : "#ffffff";
                  }}
                >
                  <span className="role-icon">{role.icon}</span>
                  <div className="role-title">{role.title}</div>
                  <div className="role-desc">{role.desc}</div>
                  <span className="role-arrow" style={{ color: isDark ? role.darkAccent : role.lightAccent }}>Continue →</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")}>Sign in here</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}