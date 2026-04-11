import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";

const API = "http://localhost:5000/api";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bangladesh",
  "Belgium","Brazil","Cambodia","Canada","Chile","China","Colombia","Croatia",
  "Czech Republic","Denmark","Egypt","Ethiopia","Finland","France","Germany",
  "Ghana","Greece","Hungary","India","Indonesia","Iran","Iraq","Ireland",
  "Israel","Italy","Japan","Jordan","Kenya","South Korea","Malaysia","Mexico",
  "Morocco","Myanmar","Netherlands","New Zealand","Nigeria","Norway","Pakistan",
  "Peru","Philippines","Poland","Portugal","Romania","Russia","Saudi Arabia",
  "South Africa","Spain","Sri Lanka","Sweden","Switzerland","Thailand","Turkey",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Vietnam","Zimbabwe",
];

const ROLE_META = {
  varsity: { label: "University Authority",   icon: "🏫", accent: "#3DBFA0", lightBg: "#E8F5F0", darkBg: "rgba(61,191,160,0.12)"  },
  club:    { label: "Club Representative", icon: "🎯", accent: "#F4845F", lightBg: "#FEF0EC", darkBg: "rgba(244,132,95,0.12)"  },
  student: { label: "Student",             icon: "🎓", accent: "#7B93D4", lightBg: "#EEF2FB", darkBg: "rgba(123,147,212,0.12)" },
};

const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

//Reusable Field wrapper
const Field = ({ label, error, hint, children }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
    <label style={{ fontSize:".72rem", fontWeight:600, color:"var(--text-soft)", letterSpacing:".08em", textTransform:"uppercase" }}>
      {label}
    </label>
    {children}
    {error && <span style={{ fontSize:".75rem", color:"#F4845F", fontWeight:500 }}>{error}</span>}
    {hint && !error && <span style={{ fontSize:".74rem", color:"var(--text-muted)", lineHeight:1.6 }}>{hint}</span>}
  </div>
);

//Reusable Input
const Input = ({ error, style: extraStyle, ...props }) => (
  <input
    {...props}
    style={{
      background: "var(--surface2)",
      border: `1.5px solid ${error ? "#F4845F" : "var(--border)"}`,
      borderRadius: 10, padding: "12px 14px", color: "var(--text)",
      fontFamily: "'DM Sans', sans-serif", fontSize: ".9rem",
      outline: "none", transition: "border-color .2s, box-shadow .2s", width: "100%",
      ...extraStyle,
    }}
    onFocus={e => {
      e.target.style.borderColor = error ? "#F4845F" : "#3DBFA0";
      e.target.style.boxShadow   = error ? "0 0 0 3px rgba(244,132,95,0.12)" : "0 0 0 3px rgba(61,191,160,0.12)";
    }}
    onBlur={e => {
      e.target.style.borderColor = error ? "#F4845F" : "var(--border)";
      e.target.style.boxShadow   = "none";
    }}
  />
);

//Reusable Select
const Select = ({ error, children, ...props }) => (
  <select
    {...props}
    style={{
      background: "var(--surface2)",
      border: `1.5px solid ${error ? "#F4845F" : "var(--border)"}`,
      borderRadius: 10, padding: "12px 14px", color: "var(--text)",
      fontFamily: "'DM Sans', sans-serif", fontSize: ".9rem",
      outline: "none", width: "100%", cursor: "pointer",
      transition: "border-color .2s",
    }}
  >
    {children}
  </select>
);

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { isDark }     = useTheme();

  const rawRole = searchParams.get("role") || "student";
  const role    = rawRole === "admin" ? "student" : rawRole;
  const meta    = ROLE_META[role] || ROLE_META.student;

  const [universities,     setUniversities]     = useState([]);
  const [form,             setForm]             = useState({
    name:"", username:"", email:"", password:"", confirmPassword:"",
    birthday:"", country:"", universityId:"", varsityName:"", clubName:"", maxSeats:"",
  });
  const [errors,           setErrors]           = useState({});
  const [submitting,       setSubmitting]       = useState(false);
  const [success,          setSuccess]          = useState(false);
  const [serverInfo,       setServerInfo]       = useState("");
  const [checkingEmail,    setCheckingEmail]    = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [visible,          setVisible]          = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);

  useEffect(() => {
    fetch(`${API}/admin/universities`)
      .then(r => r.json())
      .then(d => setUniversities(d.map(u => ({ id: u.id, name: u.name }))))
      .catch(() => {});
  }, []);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: "" }));
  };

  const checkEmail = useCallback(async email => {
    if (!isValidEmail(email)) return;
    setCheckingEmail(true);
    try {
      const r = await fetch(`${API}/admin/check-email`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (d.exists) setErrors(e => ({ ...e, email:"This email is already registered." }));
    } catch {}
    setCheckingEmail(false);
  }, []);

  const checkUsername = useCallback(async username => {
    if (username.length < 3) return;
    setCheckingUsername(true);
    try {
      const r = await fetch(`${API}/admin/check-username`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ username }),
      });
      const d = await r.json();
      if (d.exists) setErrors(e => ({ ...e, username:"This username is already taken." }));
    } catch {}
    setCheckingUsername(false);
  }, []);

  const validate = () => {
    const e = {};
    if (!isValidEmail(form.email))                   e.email           = "Enter a valid email address.";
    if (!form.password || form.password.length < 6)  e.password        = "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword)      e.confirmPassword = "Passwords do not match.";
    if (role === "student") {
      if (!form.name.trim())        e.name         = "Name is required.";
      if (!form.username.trim())    e.username     = "Username is required.";
      if (form.username.length < 3) e.username     = "Username must be at least 3 characters.";
      if (!form.birthday)           e.birthday     = "Birthday is required.";
      if (!form.country)            e.country      = "Select your country.";
      if (!form.universityId)       e.universityId = "Select your university.";
    }
    if (role === "varsity") {
      if (!form.varsityName.trim()) e.varsityName  = "University name is required.";
      if (!form.country)            e.country      = "Select your country.";
    }
    if (role === "club") {
      if (!form.name.trim())        e.name         = "Name is required.";
      if (!form.universityId)       e.universityId = "Select your university.";
      if (!form.clubName.trim())    e.clubName     = "Club name is required.";
      
      const seats = parseInt(form.maxSeats, 10);
      if (!form.maxSeats || isNaN(seats) || seats <= 0)
        e.maxSeats = "Maximum members must be a positive number.";
      if (seats > 500)
        e.maxSeats = "Maximum members cannot exceed 500.";
    }
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const payload = { role, email: form.email, password: form.password };
      if (role === "student") Object.assign(payload, { name: form.name, username: form.username, birthday: form.birthday, country: form.country, universityId: form.universityId });
      if (role === "varsity") Object.assign(payload, { varsityName: form.varsityName, country: form.country });
      if (role === "club")    Object.assign(payload, { name: form.name, universityId: form.universityId, clubName: form.clubName, maxSeats: form.maxSeats });

      const res  = await fetch(`${API}/admin/register`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ submit: data.message || "Registration failed. Please try again." });
      } else {
        setServerInfo(data.info || "");
        setSuccess(true);
      }
    } catch {
      setErrors({ submit: "Server error. Please try again." });
    }
    setSubmitting(false);
  };

  //Shared Nav
  const Nav = ({ showBack = true }) => (
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
        {showBack && (
          <Link to="/" className="nav-back">← Back to Home</Link>
        )}
      </div>
    </nav>
  );

  //SUCCESS SCREEN
  if (success) return (
    <>
      <style>{pageStyles}</style>

      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      <div className="page">
        <Nav showBack={false} />

        <div style={{ minHeight:"calc(100vh - 66px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 24px" }}>
          <div style={{ textAlign:"center", animation:"fadeUp .6s ease both", maxWidth:480 }}>

            {/*Success icon*/}
            <div style={{
              width:80, height:80, borderRadius:"50%", margin:"0 auto 28px",
              background: isDark ? "rgba(61,191,160,0.12)" : "#E8F5F0",
              border:"2px solid #3DBFA0",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"2rem", color:"#3DBFA0", fontWeight:700,
              animation:"float 2.5s ease-in-out infinite",
            }}>✓</div>

            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2.2rem", fontWeight:400, color:"var(--text)", letterSpacing:"-.02em", marginBottom:12 }}>
              Registration <em style={{ fontStyle:"italic", color:"var(--mint)" }}>successful.</em>
            </h1>
            <p style={{ fontSize:".92rem", color:"var(--text-soft)", lineHeight:1.8, marginBottom:36, maxWidth:400, margin:"0 auto 36px" }}>
              {serverInfo ? serverInfo : "Your account has been created. You can now sign in."}
            </p>

            {!serverInfo && (
              <button
                onClick={() => navigate("/login")}
                className="btn-primary"
                style={{ padding:"13px 36px" }}
              >
                Go to Sign In →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  //MAIN REGISTER FORM
  return (
    <>
      <style>{pageStyles}</style>

      {/*GEOMETRIC BACKGROUND*/}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      <div className="page">
        <Nav />

        {/*PAGE BODY*/}
        <div style={{ display:"flex", justifyContent:"center", padding:"52px 24px 80px" }}>
          <div style={{
            width:"100%", maxWidth:620,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity .6s ease, transform .6s ease",
          }}>

            {/*HEADER*/}
            <div style={{ marginBottom:32 }}>
              <div className="login-badge" style={{ marginBottom:18 }}>
                <div className="badge-dot" />
                CREATE ACCOUNT
              </div>
              <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2.4rem", fontWeight:400, color:"var(--text)", letterSpacing:"-.02em", marginBottom:10, lineHeight:1.2 }}>
                Register <em style={{ fontStyle:"italic", color:"var(--mint)" }}>as {meta.label}</em>
              </h1>
              <p style={{ fontSize:".9rem", color:"var(--text-soft)", lineHeight:1.7 }}>
                All fields marked are required. Use a valid, unique email address.
              </p>
            </div>

            {/*ROLE BADGE*/}
            <div style={{
              display:"inline-flex", alignItems:"center", gap:10,
              padding:"10px 18px", borderRadius:12,
              background: isDark ? meta.darkBg : meta.lightBg,
              border:`1.5px solid ${meta.accent}40`,
              marginBottom:32,
            }}>
              <span style={{ fontSize:"1.1rem" }}>{meta.icon}</span>
              <span style={{ fontSize:".85rem", fontWeight:600, color: meta.accent }}>{meta.label}</span>
              <span style={{ color:"var(--border)", margin:"0 4px" }}>|</span>
              <button
                onClick={() => navigate("/")}
                style={{
                  background:"none", border:"none", cursor:"pointer",
                  fontSize:".8rem", color:"var(--text-muted)",
                  fontFamily:"'DM Sans',sans-serif", padding:0,
                  fontWeight:500, transition:"color .2s",
                }}
                onMouseEnter={e => e.target.style.color = meta.accent}
                onMouseLeave={e => e.target.style.color = "var(--text-muted)"}
              >Change role</button>
            </div>

            {/*FORM CARD*/}
            <div className="form-card">
              {/*Decorative circle*/}
              <div className="form-card-deco" />

              {/*EMAIL*/}
              <Field label="Email Address *" error={errors.email}>
                <div style={{ position:"relative" }}>
                  <Input
                    type="email" placeholder="you@example.com"
                    value={form.email} error={errors.email}
                    onChange={e => set("email", e.target.value)}
                    onBlur={e => {
                      if (!isValidEmail(e.target.value)) setErrors(er => ({ ...er, email:"Enter a valid email address." }));
                      else checkEmail(e.target.value);
                    }}
                  />
                  {checkingEmail && <span className="checking-badge">checking…</span>}
                </div>
              </Field>

              {/*PASSWORDS*/}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <Field label="Password *" error={errors.password}>
                  <Input type="password" placeholder="Min. 6 characters" value={form.password} error={errors.password} onChange={e => set("password", e.target.value)} />
                </Field>
                <Field label="Confirm Password *" error={errors.confirmPassword}>
                  <Input type="password" placeholder="Repeat password" value={form.confirmPassword} error={errors.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} />
                </Field>
              </div>

              {/*STUDENT FIELDS*/}
              {role === "student" && <>
                <div className="section-divider">
                  <div className="section-divider-line" />
                  <span className="section-divider-label">Personal Info</span>
                  <div className="section-divider-line" />
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <Field label="Full Name *" error={errors.name}>
                    <Input placeholder="Your full name" value={form.name} error={errors.name} onChange={e => set("name", e.target.value)} />
                  </Field>
                  <Field label="Username *" error={errors.username}>
                    <div style={{ position:"relative" }}>
                      <Input
                        placeholder="Unique username" value={form.username} error={errors.username}
                        onChange={e => set("username", e.target.value)}
                        onBlur={e => checkUsername(e.target.value)}
                      />
                      {checkingUsername && <span className="checking-badge">checking…</span>}
                    </div>
                  </Field>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <Field label="Date of Birth *" error={errors.birthday}>
                    <Input type="date" value={form.birthday} error={errors.birthday} onChange={e => set("birthday", e.target.value)} />
                  </Field>
                  <Field label="Country *" error={errors.country}>
                    <Select value={form.country} error={errors.country} onChange={e => set("country", e.target.value)}>
                      <option value="">Select country</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </Field>
                </div>

                <Field label="University *" error={errors.universityId}>
                  <Select value={form.universityId} error={errors.universityId} onChange={e => set("universityId", e.target.value)}>
                    <option value="">Select your university</option>
                    {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                </Field>

                <div className="info-box" style={{ background: isDark ? "rgba(61,191,160,0.07)" : "#E8F5F0", borderColor: isDark ? "rgba(61,191,160,0.2)" : "#B2DDD3" }}>
                  <span style={{ color:"#3DBFA0", marginRight:8 }}>ℹ</span>
                  After your account is approved by the University Authority, you can browse and request to join clubs from your student dashboard.
                </div>
              </>}

              {/*VARSITY FIELDS*/}
              {role === "varsity" && <>
                <div className="section-divider">
                  <div className="section-divider-line" />
                  <span className="section-divider-label">University Details</span>
                  <div className="section-divider-line" />
                </div>

                <Field label="University Name *" error={errors.varsityName}>
                  <Input placeholder="Name of the university you manage" value={form.varsityName} error={errors.varsityName} onChange={e => set("varsityName", e.target.value)} />
                </Field>
                <Field label="Country *" error={errors.country}>
                  <Select value={form.country} error={errors.country} onChange={e => set("country", e.target.value)}>
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>

                <div className="info-box" style={{ background: isDark ? "rgba(61,191,160,0.07)" : "#E8F5F0", borderColor: isDark ? "rgba(61,191,160,0.2)" : "#B2DDD3" }}>
                  <span style={{ color:"#3DBFA0", marginRight:8 }}>ℹ</span>
                  Your university registration will be reviewed by the Super Admin before approval.
                </div>
              </>}

              {/*CLUB FIELDS*/}
              {role === "club" && <>
                <div className="section-divider">
                  <div className="section-divider-line" />
                  <span className="section-divider-label">Club Details</span>
                  <div className="section-divider-line" />
                </div>

                <Field label="Full Name *" error={errors.name}>
                  <Input placeholder="Your full name" value={form.name} error={errors.name} onChange={e => set("name", e.target.value)} />
                </Field>
                <Field label="University *" error={errors.universityId}>
                  <Select value={form.universityId} error={errors.universityId} onChange={e => set("universityId", e.target.value)}>
                    <option value="">Select university</option>
                    {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                </Field>
                <Field label="New Club Name *" error={errors.clubName}>
                  <Input placeholder="e.g. Robotics Club" value={form.clubName} error={errors.clubName} onChange={e => set("clubName", e.target.value)} />
                </Field>

                <Field label="Maximum Members Allowed *" error={errors.maxSeats} hint="How many members can join your club? Enter a number between 1 and 500.">
                  <Input 
                    type="number" 
                    placeholder="e.g. 50" 
                    min="1" 
                    max="500"
                    value={form.maxSeats} 
                    error={errors.maxSeats} 
                    onChange={e => set("maxSeats", e.target.value)} 
                  />
                </Field>

                <div className="info-box" style={{ background: isDark ? "rgba(244,132,95,0.07)" : "#FEF0EC", borderColor: isDark ? "rgba(244,132,95,0.2)" : "#F4C5B0" }}>
                  <span style={{ color:"#F4845F", marginRight:8 }}>ℹ</span>
                  Your club registration request will be reviewed by the University Authority before it's approved. You can modify the maximum member limit anytime after approval.
                </div>
              </>}

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
                style={{
                  width:"100%", padding:"13px", marginTop:4,
                  opacity: submitting ? .75 : 1,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {submitting ? "Creating account…" : `Create ${meta.label} Account `}
              </button>

              <p style={{ textAlign:"center", fontSize:".85rem", color:"var(--text-muted)", marginTop:-4 }}>
                Already have an account?{" "}
                <Link to="/login" style={{ color:"var(--mint)", textDecoration:"none", fontWeight:600 }}>
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

//Styles
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
    --surface2:   #F7F9F8;
    --card-bg:    #ffffff;
    --nav-bg:     rgba(244,249,248,0.88);
    --nav-border: #DCE9E5;
    --shadow:     0 4px 20px rgba(61,191,160,0.10);
    --shadow-lg:  0 8px 36px rgba(61,191,160,0.18);
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
    --surface2:   #1d2c3f;
    --card-bg:    #162030;
    --nav-bg:     rgba(14,24,37,0.92);
    --nav-border: rgba(196,178,140,0.12);
    --shadow:     0 4px 20px rgba(0,0,0,0.30);
    --shadow-lg:  0 8px 36px rgba(0,0,0,0.40);
  }

  html, body {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }

  /*BACKGROUND*/
  .bg-canvas {
    position: fixed; inset: 0; z-index: 0;
    overflow: hidden; pointer-events: none;
  }
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

  @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

  .page { position:relative; z-index:1; }

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
  .nav-back {
    font-size:.83rem; color:var(--text-muted); text-decoration:none; font-weight:500;
    padding:8px 16px; border-radius:10px; border:1.5px solid var(--border);
    background:var(--card-bg); transition:all .2s;
  }
  .nav-back:hover { border-color:var(--mint); color:var(--mint); }

  /*BADGE*/
  .login-badge {
    display:inline-flex; align-items:center; gap:8px;
    background:var(--card-bg); color:var(--mint);
    border:1.5px solid var(--mint-light);
    padding:6px 14px; border-radius:20px;
    font-size:.72rem; font-weight:600; letter-spacing:.08em;
    box-shadow:0 2px 8px rgba(61,191,160,0.10);
  }
  .badge-dot { width:6px; height:6px; border-radius:50%; background:var(--mint); }

  /*FORM CARD*/
  .form-card {
    background:var(--card-bg); border-radius:20px; padding:36px 36px 32px;
    border:1.5px solid var(--border); box-shadow:var(--shadow-lg);
    display:flex; flex-direction:column; gap:22px;
    position:relative; overflow:hidden;
  }
  .form-card-deco {
    position:absolute; top:-50px; right:-50px; width:150px; height:150px;
    border-radius:50%; background:var(--mint-light); pointer-events:none;
  }

  /*SECTION DIVIDER*/
  .section-divider { display:flex; align-items:center; gap:12px; margin:4px 0; }
  .section-divider-line { flex:1; height:1px; background:var(--border); }
  .section-divider-label {
    font-size:.7rem; font-weight:700; color:var(--mint);
    letter-spacing:.1em; text-transform:uppercase; white-space:nowrap;
  }

  /*INFO BOX*/
  .info-box {
    padding:12px 16px; border-radius:10px; border:1.5px solid;
    font-size:.8rem; color:var(--text-soft); line-height:1.65;
  }

  /*ERROR BOX*/
  .error-box {
    padding:12px 16px; border-radius:10px; font-size:.84rem;
    color:#F4845F; font-weight:500;
    background:rgba(244,132,95,0.10); border:1.5px solid rgba(244,132,95,0.35);
  }

  /*CHECKING BADGE*/
  .checking-badge {
    position:absolute; right:12px; top:50%; transform:translateY(-50%);
    font-size:.72rem; color:var(--text-muted); font-style:italic;
  }

  /*BUTTON*/
  .btn-primary {
    padding:12px 28px; border-radius:12px; border:none;
    background:var(--mint); color:white; font-size:.9rem; font-weight:600;
    cursor:pointer; font-family:'DM Sans',sans-serif;
    box-shadow:0 4px 16px rgba(61,191,160,0.35);
    transition:background .2s, transform .2s, box-shadow .2s;
  }
  .btn-primary:hover:not(:disabled) {
    background:var(--mint-dark);
    box-shadow:0 8px 24px rgba(61,191,160,0.40);
  }

  /*MISC*/
  input::placeholder { color:var(--text-muted); }
  input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(.5); }
  select option { background:var(--card-bg); color:var(--text); }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

  @media (max-width:620px) {
    .nav { padding:0 20px; }
    .form-card { padding:26px 20px 24px; }
    .form-card > div[style*="grid"] { grid-template-columns:1fr !important; }
  }
`;
