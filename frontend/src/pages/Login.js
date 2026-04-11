import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";

const API = "http://localhost:5000/api";

export default function Login() {
  const navigate    = useNavigate();
  const { isDark }  = useTheme();

  const [visible,    setVisible]    = useState(false);
  const [form,       setForm]       = useState({ identifier: "", password: "" });
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [pending,    setPending]    = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: "", submit: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.identifier.trim()) e.identifier = "Enter your email or name.";
    if (!form.password)          e.password   = "Enter your password.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.identifier, password: form.password }),
      });
      const data = await res.json();
      if (res.status === 403 && data.message === "pending") {
        setPending(true);
      } else if (!res.ok) {
        setErrors({ submit: data.message || "Invalid credentials. Please try again." });
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        const role = data.user.role;
        if (role === "super_admin")        navigate("/super-admin");
        else if (role === "varsity_admin") navigate("/varsity-admin");
        else if (role === "club_rep")      navigate("/club-rep");
        else                               navigate("/dashboard");
      }
    } catch {
      setErrors({ submit: "Server error. Please try again." });
    }
    setSubmitting(false);
  };

  const handleKey = e => { if (e.key === "Enter") handleSubmit(); };

  //PENDING SCREEN 
  if (pending) return (
    <>
      <style>{sharedStyles}</style>

      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      <div className="page">
        <nav className="nav">
          <div className="nav-brand">
            <div className="nav-logo-box">U</div>
            <div>
              <div className="nav-logo">Societas</div>
              <div className="nav-sub">Mpriorities unity</div>
            </div>
          </div>
          <ThemeToggle />
        </nav>

        <div className="login-body">
          <div style={{ width:"100%", maxWidth:480, animation:"fadeUp .6s ease both", textAlign:"center" }}>

            {/*Pending icon*/}
            <div style={{
              width:72, height:72, borderRadius:"50%", margin:"0 auto 28px",
              background: isDark ? "rgba(61,191,160,0.12)" : "#E8F5F0",
              border: `2px solid ${isDark ? "rgba(61,191,160,0.3)" : "#3DBFA0"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1.8rem", animation:"float 2.5s ease-in-out infinite",
            }}>⏳</div>

            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2.2rem", fontWeight:400, color:"var(--text)", letterSpacing:"-.02em", marginBottom:10 }}>
              Pending <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Approval</em>
            </h1>
            <p style={{ fontSize:".92rem", color:"var(--text-soft)", fontWeight:400, lineHeight:1.8, marginBottom:8 }}>
              Your registration request has been submitted successfully.
            </p>
            <p style={{ fontSize:".88rem", color:"var(--text-muted)", lineHeight:1.75, marginBottom:36 }}>
              A <strong style={{ color:"var(--mint)" }}>Super Admin</strong> needs to review and approve
              your account before you can access the system.
            </p>

            {/*Status card*/}
            <div style={{
              background:"var(--card-bg)", border:"1.5px solid var(--border)",
              borderRadius:16, padding:"22px 26px", marginBottom:32, textAlign:"left",
              boxShadow:"var(--shadow)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#E8C24A", boxShadow:"0 0 8px rgba(232,194,74,0.5)", animation:"shimmer 1.8s ease-in-out infinite" }} />
                <span style={{ fontSize:".72rem", fontWeight:700, color:"#E8C24A", letterSpacing:".1em", textTransform:"uppercase" }}>
                  Status: Awaiting Review
                </span>
              </div>
              {[
                { step:"1", label:"Registration submitted", done: true  },
                { step:"2", label:"Super Admin review",     done: false },
                { step:"3", label:"Account activated",      done: false },
              ].map(s => (
                <div key={s.step} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <div style={{
                    width:24, height:24, borderRadius:"50%", flexShrink:0,
                    background: s.done ? (isDark ? "rgba(61,191,160,0.2)" : "#E8F5F0") : "var(--surface2)",
                    border: `1.5px solid ${s.done ? "#3DBFA0" : "var(--border)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:".65rem", fontWeight:700,
                    color: s.done ? "#3DBFA0" : "var(--text-muted)",
                  }}>
                    {s.done ? "✓" : s.step}
                  </div>
                  <span style={{ fontSize:".84rem", color: s.done ? "var(--text-soft)" : "var(--text-muted)" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setPending(false)}
              className="btn-primary"
              style={{ marginRight:10 }}
            >Try Again</button>

            <Link to="/" className="btn-secondary-link">Back to Home</Link>
          </div>
        </div>
      </div>
    </>
  );

  //MAIN LOGIN
  return (
    <>
      <style>{sharedStyles}</style>

      {/* ── GEOMETRIC BACKGROUND ── */}
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
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <ThemeToggle />
            <Link to="/" className="nav-back">← Back to Home</Link>
          </div>
        </nav>

        {/*PAGE BODY*/}
        <div className="login-body">
          <div
            className="login-container"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)" }}
          >

            {/*HEADER*/}
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <div className="login-badge">
                <div className="badge-dot" />
                SECURE ACCESS
              </div>
              <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2.4rem", fontWeight:400, color:"var(--text)", letterSpacing:"-.02em", marginBottom:10, lineHeight:1.2 }}>
                Welcome <em style={{ fontStyle:"italic", color:"var(--mint)" }}>back.</em>
              </h1>
              <p style={{ fontSize:".9rem", color:"var(--text-soft)", fontWeight:400, lineHeight:1.7 }}>
                Sign in with your email or name and password.
              </p>
            </div>

            {/*FORM CARD*/}
            <div className="form-card">

              {/*Decorative circle*/}
              <div className="form-card-deco" />

              {/*EMAIL-NAME*/}
              <div className="field-group">
                <label className="field-label">Email or Name</label>
                <div style={{ position:"relative" }}>
                  <input
                    type="text"
                    placeholder="xyz@gmail.com or your name"
                    value={form.identifier}
                    onChange={e => set("identifier", e.target.value)}
                    onKeyDown={handleKey}
                    className={`field-input${errors.identifier ? " field-input-error" : ""}`}
                    onFocus={e => { e.target.style.borderColor = errors.identifier ? "#F4845F" : "#3DBFA0"; e.target.style.boxShadow = errors.identifier ? "0 0 0 3px rgba(244,132,95,0.12)" : "0 0 0 3px rgba(61,191,160,0.12)"; }}
                    onBlur={e  => { e.target.style.borderColor = errors.identifier ? "#F4845F" : "var(--border)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                {errors.identifier && <span className="field-error">{errors.identifier}</span>}
              </div>

              {/*PASSWORD*/}
              <div className="field-group">
                <label className="field-label">Password</label>
                <div style={{ position:"relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    onKeyDown={handleKey}
                    className={`field-input${errors.password ? " field-input-error" : ""}`}
                    style={{ paddingRight:"52px" }}
                    onFocus={e => { e.target.style.borderColor = errors.password ? "#F4845F" : "#3DBFA0"; e.target.style.boxShadow = errors.password ? "0 0 0 3px rgba(244,132,95,0.12)" : "0 0 0 3px rgba(61,191,160,0.12)"; }}
                    onBlur={e  => { e.target.style.borderColor = errors.password ? "#F4845F" : "var(--border)"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPass(s => !s)}
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              {/*SUBMIT ERROR*/}
              {errors.submit && (
                <div className="error-box">
                  <span style={{ marginRight:8 }}>⚠</span>{errors.submit}
                </div>
              )}

              {/*SUBMIT BUTTON*/}
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ width:"100%", padding:"13px", marginTop:4, opacity: submitting ? .75 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {submitting ? "Signing in…" : "Sign In"}
              </button>

              {/*DIVIDER*/}
              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">or</span>
                <div className="divider-line" />
              </div>

              {/*REGISTER LINK*/}
              <p style={{ textAlign:"center", fontSize:".85rem", color:"var(--text-muted)", marginTop:-4 }}>
                Don't have an account?{" "}
                <Link to="/" style={{ color:"var(--mint)", textDecoration:"none", fontWeight:600 }}>
                  Register here
                </Link>
              </p>
            </div>

            <p style={{ textAlign:"center", fontSize:".73rem", color:"var(--text-muted)", marginTop:22 }}>
              Authorized personnel only. All sessions are monitored.
            </p>
          </div>
        </div>

      </div>
    </>
  );
}

//Styles 
const sharedStyles = `
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
    --surface2:    #F7F9F8;
    --card-bg:     #ffffff;
    --nav-bg:      rgba(244,249,248,0.88);
    --nav-border:  #DCE9E5;
    --shadow:      0 4px 20px rgba(61,191,160,0.10);
    --shadow-lg:   0 8px 36px rgba(61,191,160,0.18);
    --error-bg:    #FEF0EC;
    --error-border:#F4845F;
  }

  /*DARK THEME*/
  body.theme-dark {
    --mint:        #3DBFA0;
    --mint-light:  rgba(61,191,160,0.15);
    --mint-dark:   #2A9E83;
    --text:        #dde4ee;
    --text-soft:   #8fa0b5;
    --text-muted:  #5e738a;
    --border:      rgba(196,178,140,0.12);
    --surface2:    #1d2c3f;
    --card-bg:     #162030;
    --nav-bg:      rgba(14,24,37,0.92);
    --nav-border:  rgba(196,178,140,0.12);
    --shadow:      0 4px 20px rgba(0,0,0,0.30);
    --shadow-lg:   0 8px 36px rgba(0,0,0,0.40);
    --error-bg:    rgba(244,132,95,0.10);
    --error-border:rgba(244,132,95,0.40);
  }

  html, body {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  /*BACKGROUND CANVAS*/
  .bg-canvas {
    position: fixed; inset: 0; z-index: 0;
    overflow: hidden; pointer-events: none;
  }
  body.theme-light .bg-canvas::before {
    content: ''; position: absolute; inset: 0; background: #f0ebe3;
  }
  body.theme-light .bg-canvas::after {
    content: ''; position: absolute;
    top: 0; right: 0; width: 55%; height: 55%;
    background: #c9a8b2;
    clip-path: polygon(45% 0%, 100% 0%, 100% 100%, 0% 100%);
  }
  body.theme-light .bg-bottom-accent { background: #ddb8c0; }

  body.theme-dark .bg-canvas::before {
    content: ''; position: absolute; inset: 0; background: #0a1520;
  }
  body.theme-dark .bg-canvas::after {
    content: ''; position: absolute;
    top: 0; right: 0; width: 55%; height: 55%;
    background: #0f2535;
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

  @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:1} }

  .page { position: relative; z-index: 1; }

  /*NAV*/
  .nav {
    position: sticky; top: 0; z-index: 100;
    background: var(--nav-bg); backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--nav-border);
    padding: 0 64px; height: 66px;
    display: flex; align-items: center; justify-content: space-between;
    animation: fadeIn .4s ease both;
  }
  .nav-brand { display: flex; align-items: center; gap: 11px; }
  .nav-logo-box {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--mint); color: white;
    font-family: 'DM Serif Display', serif; font-size: 1rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(61,191,160,0.30);
  }
  .nav-logo { font-family: 'DM Serif Display', serif; font-size: 1.15rem; color: var(--text); letter-spacing: -0.01em; }
  .nav-sub  { font-size: .68rem; color: var(--text-muted); letter-spacing: .08em; text-transform: uppercase; }
  .nav-back {
    font-size: .83rem; color: var(--text-muted); text-decoration: none;
    font-weight: 500; transition: color .2s;
    padding: 8px 16px; border-radius: 10px;
    border: 1.5px solid var(--border);
    background: var(--card-bg);
  }
  .nav-back:hover { border-color: var(--mint); color: var(--mint); }

  /*PAGE BODY*/
  .login-body {
    min-height: calc(100vh - 66px);
    display: flex; align-items: center; justify-content: center;
    padding: 56px 24px;
  }

  /*LOGIN CONTAINER*/
  .login-container {
    width: 100%; max-width: 460px;
    transition: opacity .6s ease, transform .6s ease;
  }

  /*BADGE*/
  .login-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--card-bg); color: var(--mint);
    border: 1.5px solid var(--mint-light);
    padding: 6px 14px; border-radius: 20px;
    font-size: .72rem; font-weight: 600; letter-spacing: .08em;
    margin-bottom: 18px;
    box-shadow: 0 2px 8px rgba(61,191,160,0.10);
  }
  .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); }

  /*FORM CARD*/
  .form-card {
    background: var(--card-bg);
    border-radius: 20px; padding: 36px 36px 32px;
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow-lg);
    display: flex; flex-direction: column; gap: 20px;
    position: relative; overflow: hidden;
  }
  .form-card-deco {
    position: absolute; top: -50px; right: -50px;
    width: 150px; height: 150px; border-radius: 50%;
    background: var(--mint-light); pointer-events: none;
  }

  /*FIELDS*/
  .field-group { display: flex; flex-direction: column; gap: 7px; }
  .field-label {
    font-size: .72rem; font-weight: 600; color: var(--text-soft);
    letter-spacing: .08em; text-transform: uppercase;
  }
  .field-input {
    background: var(--surface2);
    border: 1.5px solid var(--border);
    border-radius: 10px; padding: 12px 14px;
    color: var(--text); font-family: 'DM Sans', sans-serif;
    font-size: .9rem; outline: none;
    transition: border-color .2s, box-shadow .2s; width: 100%;
  }
  .field-input::placeholder { color: var(--text-muted); }
  .field-input-error { border-color: #F4845F !important; }
  .field-error { font-size: .75rem; color: #F4845F; font-weight: 500; }

  /*ERROR BOX*/
  .error-box {
    padding: 12px 16px; border-radius: 10px;
    background: var(--error-bg); border: 1.5px solid var(--error-border);
    font-size: .84rem; color: #F4845F; font-weight: 500;
  }

  /*PASSWORD TOGGLE*/
  .pass-toggle {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: var(--text-muted); font-size: .8rem;
    font-family: 'DM Sans', sans-serif; font-weight: 600;
    padding: 4px 8px; border-radius: 6px; transition: color .2s, background .2s;
  }
  .pass-toggle:hover { color: var(--mint); background: var(--mint-light); }

  /*PRIMARY BUTTON*/
  .btn-primary {
    padding: 12px 28px; border-radius: 12px; border: none;
    background: var(--mint); color: white;
    font-size: .88rem; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    box-shadow: 0 4px 16px rgba(61,191,160,0.35);
    transition: background .2s, transform .2s, box-shadow .2s;
  }
  .btn-primary:hover:not(:disabled) { background: var(--mint-dark); box-shadow: 0 8px 24px rgba(61,191,160,0.40); }

  /*SECONDARY LINK BUTTON*/
  .btn-secondary-link {
    display: inline-block; padding: 12px 28px; border-radius: 12px;
    border: 1.5px solid var(--border); background: var(--card-bg);
    color: var(--text-soft); font-size: .88rem; font-weight: 500;
    text-decoration: none; font-family: 'DM Sans', sans-serif;
    transition: border-color .2s, color .2s, transform .2s;
  }
  .btn-secondary-link:hover { border-color: var(--mint); color: var(--mint); transform: translateY(-2px); }

  /* DIVIDER*/
  .divider      { display: flex; align-items: center; gap: 12px; }
  .divider-line { flex: 1; height: 1px; background: var(--border); }
  .divider-text { font-size: .76rem; color: var(--text-muted); font-weight: 500; }

  @media (max-width: 520px) {
    .nav { padding: 0 20px; }
    .form-card { padding: 26px 20px 24px; }
    .login-body { padding: 36px 16px; }
  }
`;
