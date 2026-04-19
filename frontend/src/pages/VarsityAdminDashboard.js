import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

const API = "http://localhost:5000/api/varsity";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "Never";

export default function VarsityAdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser]         = useState(null);
  const [section, setSection]   = useState("overview");
  const [toast, setToast]       = useState(null);
  const [confirm, setConfirm]   = useState(null);

  const [stats,             setStats]             = useState(null);
  const [pendingClubs,      setPendingClubs]      = useState([]);
  const [pendingStudents,   setPendingStudents]   = useState([]);
  const [clubs,             setClubs]             = useState([]);
  const [archivedClubs,     setArchivedClubs]     = useState([]);
  const [students,          setStudents]          = useState([]);
  const [inactiveStudents,  setInactiveStudents]  = useState([]);
  const [uniSettings,       setUniSettings]       = useState(null);
  const [inactiveDays,      setInactiveDays]      = useState(30);

  const [addModal,    setAddModal]    = useState(false);
  const [addForm,     setAddForm]     = useState({ name:"", email:"", password:"" });
  const [addErrors,   setAddErrors]   = useState({});
  const [addBusy,     setAddBusy]     = useState(false);
  const [showAddPass, setShowAddPass] = useState(false);

  // University settings form
  const [settingsForm,   setSettingsForm]   = useState({ name:"", description:"", contact_email:"", website:"" });
  const [settingsErrors, setSettingsErrors] = useState({});
  const [settingsBusy,   setSettingsBusy]   = useState(false);
  const [logoFile,       setLogoFile]       = useState(null);
  const [logoPreview,    setLogoPreview]    = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { navigate("/login"); return; }
    const u = JSON.parse(raw);
    if (u.role !== "varsity_admin") { navigate("/login"); return; }
    setUser(u);
  }, [navigate]);

  const uid = user?.university_id;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const get = useCallback(async (path, setter, extra = "") => {
    if (!uid) return;
    try {
      const r = await fetch(`${API}/${path}?university_id=${uid}${extra}`);
      const d = await r.json();
      if (r.ok) setter(Array.isArray(d) ? d : d);
    } catch {}
  }, [uid]);

  const loadStats            = useCallback(() => get("stats",               setStats),            [get]);
  const loadPending          = useCallback(() => get("pending-clubs",       setPendingClubs),     [get]);
  const loadClubs            = useCallback(() => get("clubs",               setClubs),            [get]);
  const loadArchivedClubs    = useCallback(() => get("archived-clubs",      setArchivedClubs),    [get]);
  const loadStudents         = useCallback(() => get("students",            setStudents),         [get]);
  const loadPendingStudents  = useCallback(() => get("pending-students",    setPendingStudents),  [get]);
  const loadInactiveStudents = useCallback(() => get("inactive-students",   setInactiveStudents, `&days=${inactiveDays}`), [get, inactiveDays]);

  const loadUniSettings = useCallback(async () => {
    if (!uid) return;
    try {
      const r = await fetch(`${API}/university-settings?university_id=${uid}`);
      const d = await r.json();
      if (r.ok) {
        setUniSettings(d);
        setSettingsForm({
          name:          d.name          || "",
          description:   d.description   || "",
          contact_email: d.contact_email || "",
          website:       d.website       || "",
        });
        if (d.logo_url) setLogoPreview(`http://localhost:5000${d.logo_url}`);
      }
    } catch {}
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    loadStats(); loadPending(); loadClubs(); loadArchivedClubs();
    loadStudents(); loadPendingStudents(); loadInactiveStudents(); loadUniSettings();
  }, [uid, loadStats, loadPending, loadClubs, loadArchivedClubs, loadStudents, loadPendingStudents, loadInactiveStudents, loadUniSettings]);

  useEffect(() => {
    if (uid) { loadStats(); loadPendingStudents(); }
  }, [section, uid, loadStats, loadPendingStudents]);

  useEffect(() => {
    if (uid && section === "inactive-students") loadInactiveStudents();
  }, [inactiveDays, uid, section, loadInactiveStudents]);

  // CLUB ACTIONS

  const approveClub = async (id) => {
    const r = await fetch(`${API}/approve-club/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ university_id: uid }) });
    const d = await r.json();
    if (r.ok) { showToast("Club has been approved successfully"); loadPending(); loadClubs(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  };

  const rejectClub = (id) => setConfirm({ message:"Are you sure you want to reject this club request? This action cannot be undone.", onConfirm: async () => {
    const r = await fetch(`${API}/reject-club/${id}`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ university_id: uid }) });
    const d = await r.json();
    if (r.ok) { showToast("Club request has been rejected.", "info"); loadPending(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  }});

  const deleteClub = (id, name) => setConfirm({ message:`Are you sure you want to delete club "${name}"?`, onConfirm: async () => {
    const r = await fetch(`${API}/delete-club/${id}`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ university_id: uid }) });
    const d = await r.json();
    if (r.ok) { showToast("Club has been deleted successfully."); loadClubs(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  }});

  const archiveClub = (id, name) => setConfirm({ message:`Archive club "${name}"? It will be hidden from active clubs but all data will be kept.`, onConfirm: async () => {
    const r = await fetch(`${API}/archive-club/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ university_id: uid }) });
    const d = await r.json();
    if (r.ok) { showToast("Club archived successfully.", "info"); loadClubs(); loadArchivedClubs(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  }});

  const unarchiveClub = (id, name) => setConfirm({ message:`Restore club "${name}" back to active?`, onConfirm: async () => {
    const r = await fetch(`${API}/unarchive-club/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ university_id: uid }) });
    const d = await r.json();
    if (r.ok) { showToast("Club restored successfully."); loadClubs(); loadArchivedClubs(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  }});

  // STUDENT ACTIONS

  const removeStudent = (id, name) => setConfirm({ message:`Are you sure you want to remove student "${name}" from your university?`, onConfirm: async () => {
    const r = await fetch(`${API}/remove-student/${id}`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ university_id: uid }) });
    const d = await r.json();
    if (r.ok) { showToast("Student has been removed successfully."); loadStudents(); loadInactiveStudents(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  }});

  const handleAddStudent = async () => {
    const e = {};
    if (!addForm.name.trim())     e.name     = "Name is required";
    if (!addForm.email.trim())    e.email    = "Email is required";
    if (!addForm.password.trim()) e.password = "Password is required";
    if (Object.keys(e).length)    { setAddErrors(e); return; }
    setAddBusy(true);
    try {
      const r = await fetch(`${API}/add-student`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ ...addForm, university_id: uid }) });
      const d = await r.json();
      if (r.ok) { showToast("Student has been added successfully"); setAddModal(false); setAddForm({ name:"", email:"", password:"" }); loadStudents(); loadPendingStudents(); loadStats(); }
      else       setAddErrors({ submit: d.message || "Error adding student" });
    } catch { setAddErrors({ submit: "Server error" }); }
    setAddBusy(false);
  };

  const approveStudent = async (id, name) => {
    const r = await fetch(`${API}/approve-student/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ university_id: uid }) });
    const d = await r.json();
    if (r.ok) { showToast(`${name} has been approved successfully`); loadPendingStudents(); loadStudents(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  };

  const rejectStudent = (id, name) => setConfirm({ message:`Are you sure you want to reject and remove student "${name}"?`, onConfirm: async () => {
    const r = await fetch(`${API}/reject-student/${id}`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ university_id: uid }) });
    const d = await r.json();
    if (r.ok) { showToast("Student has been rejected.", "info"); loadPendingStudents(); loadStats(); }
    else       showToast(d.message || "Error", "error");
  }});

  const removeInactiveAll = () => setConfirm({
    message: `This will permanently remove ALL ${inactiveStudents.length} inactive student(s) who haven't logged in for ${inactiveDays}+ days. This cannot be undone.`,
    onConfirm: async () => {
      const r = await fetch(`${API}/remove-inactive-students`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ university_id: uid, days: inactiveDays }) });
      const d = await r.json();
      if (r.ok) { showToast(`${d.removed} inactive student(s) removed.`, "info"); loadInactiveStudents(); loadStudents(); loadStats(); }
      else       showToast(d.message || "Error", "error");
    }
  });

  // UNIVERSITY SETTINGS

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSaveSettings = async () => {
    const e = {};
    if (!settingsForm.name.trim()) e.name = "University name is required";
    if (settingsForm.contact_email && !/\S+@\S+\.\S+/.test(settingsForm.contact_email)) e.contact_email = "Invalid email format";
    if (Object.keys(e).length) { setSettingsErrors(e); return; }

    setSettingsBusy(true);
    try {
      const fd = new FormData();
      fd.append("university_id",  uid);
      fd.append("name",           settingsForm.name);
      fd.append("description",    settingsForm.description);
      fd.append("contact_email",  settingsForm.contact_email);
      fd.append("website",        settingsForm.website);
      if (logoFile) fd.append("logo", logoFile);

      const r = await fetch(`${API}/university-settings`, { method:"PUT", body: fd });
      const d = await r.json();
      if (r.ok) { showToast("University settings updated successfully"); loadUniSettings(); setLogoFile(null); }
      else       setSettingsErrors({ submit: d.message || "Error saving settings" });
    } catch { setSettingsErrors({ submit: "Server error" }); }
    setSettingsBusy(false);
  };

  const logout = () => { localStorage.removeItem("user"); navigate("/login"); };

  const navItems = [
    { id:"overview",          label:"Overview",         icon:"⬡" },
    { id:"pending",           label:"Pending Clubs",    icon:"◐", badge: pendingClubs.length   || null },
    { id:"clubs",             label:"Clubs",            icon:"◈" },
    { id:"archived-clubs",    label:"Archived Clubs",   icon:"▣", badge: archivedClubs.length  || null },
    { id:"pending-students",  label:"Pending Students", icon:"◑", badge: pendingStudents.length || null },
    { id:"students",          label:"Students",         icon:"◎" },
    { id:"inactive-students", label:"Inactive Students",icon:"◌", badge: stats?.inactiveStudents || null },
    { id:"settings",          label:"University Settings", icon:"⚙" },
  ];

  if (!user) return null;

  return (
    <>
      <style>{dashStyles}</style>

      {/*GEOMETRIC BACKGROUND*/}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      {/*TOAST*/}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/*CONFIRM MODAL*/}
      {confirm && (
        <div className="overlay" onClick={e => { if (e.target.classList.contains("overlay")) setConfirm(null); }}>
          <div className="modal-box" style={{ textAlign:"center", maxWidth:400 }}>
            <div style={{ fontSize:"2rem", marginBottom:16 }}>⚠️</div>
            <p style={{ fontSize:".9rem", color:"var(--text-soft)", lineHeight:1.75, marginBottom:28 }}>{confirm.message}</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button className="btn-danger" onClick={() => { confirm.onConfirm(); setConfirm(null); }}>Confirm</button>
              <button className="btn-ghost"  onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/*ADD STUDENT MODAL*/}
      {addModal && (
        <div className="overlay" onClick={e => { if (e.target.classList.contains("overlay")) { setAddModal(false); setAddErrors({}); } }}>
          <div className="modal-box" style={{ maxWidth:440 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:26 }}>
              <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.4rem", fontWeight:400, color:"var(--text)" }}>
                Add <em style={{ fontStyle:"italic", color:"var(--mint)" }}>Student</em>
              </h2>
              <button className="modal-close" onClick={() => { setAddModal(false); setAddErrors({}); setAddForm({name:"",email:"",password:""}); }}>✕</button>
            </div>

            {[
              { key:"name",     label:"Full Name", type:"text",  ph:"John Doe" },
              { key:"email",    label:"Email",     type:"email", ph:"student@uni.edu" },
              { key:"password", label:"Password",  type: showAddPass ? "text" : "password", ph:"Temporary password" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:16 }}>
                <label className="field-label">{f.label}</label>
                <div style={{ position:"relative" }}>
                  <input
                    type={f.type} placeholder={f.ph}
                    value={addForm[f.key]}
                    onChange={e => { setAddForm(p => ({...p,[f.key]:e.target.value})); setAddErrors(p => ({...p,[f.key]:"",submit:""})); }}
                    className="field-input"
                    style={{ borderColor: addErrors[f.key] ? "var(--red)" : undefined }}
                  />
                  {f.key === "password" && (
                    <button type="button" onClick={() => setShowAddPass(s => !s)}
                      style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:".75rem", fontFamily:"'DM Sans',sans-serif" }}>
                      {showAddPass ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
                {addErrors[f.key] && <span style={{ fontSize:".72rem", color:"var(--red)", marginTop:3, display:"block" }}>{addErrors[f.key]}</span>}
              </div>
            ))}

            {addErrors.submit && (
              <div style={{ padding:"10px 14px", background:"rgba(224,112,112,.1)", border:"1px solid rgba(224,112,112,.25)", borderRadius:8, fontSize:".8rem", color:"var(--red)", marginBottom:16 }}>{addErrors.submit}</div>
            )}

            <div style={{ display:"flex", gap:12, marginTop:8 }}>
              <button onClick={handleAddStudent} disabled={addBusy} className="btn-primary" style={{ flex:1, opacity: addBusy ? .6 : 1 }}>{addBusy ? "Adding…" : "Add Student"}</button>
              <button onClick={() => { setAddModal(false); setAddErrors({}); setAddForm({name:"",email:"",password:""}); }} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/*LAYOUT*/}
      <div className="dash-layout">

        {/*SIDEBAR*/}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo-box">SC</div>
            <div>
              <div className="sidebar-logo">Societas</div>
              <div className="sidebar-sub">University Panel</div>
            </div>
          </div>

          <div className="sidebar-varsity">
            <div className="sidebar-varsity-lbl">Your University</div>
            <div className="sidebar-varsity-name">{user?.varsity_name || "—"}</div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map(item => {
              const active = section === item.id;
              return (
                <button key={item.id} onClick={() => setSection(item.id)}
                  className={`nav-btn${active ? " nav-btn-active" : ""}`}>
                  <span className={`nav-icon${active ? " nav-icon-active" : ""}`}>{item.icon}</span>
                  <span className={`nav-label${active ? " nav-label-active" : ""}`}>{item.label}</span>
                  {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-email">{user?.email}</div>
            {[
              { label:"📰 News Feed",      path:"/feed"    },
              { label:"📢 Notices",        path:"/notices" },
              { label:"👤 My Profile",     path:"/profile" },
              { label:"👥 User Directory", path:"/users"   },
            ].map(({ label, path }) => (
              <button key={path} onClick={() => navigate(path)} className="sidebar-link-btn">{label}</button>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={logout} className="sidebar-logout-btn" style={{ flex:1 }}>Sign Out</button>
              <div style={{ flexShrink:0 }}><ThemeToggle /></div>
            </div>
          </div>
        </aside>

        {/*MAIN*/}
        <main className="dash-main">

          {!uid && (
            <div style={{ maxWidth:480, margin:"80px auto", textAlign:"center", padding:40 }} className="card">
              <div style={{ fontSize:"2.5rem", marginBottom:20 }}>⚠️</div>
              <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.6rem", fontWeight:400, marginBottom:12, color:"var(--text)" }}>Account Not Linked</h2>
              <p style={{ fontSize:".88rem", color:"var(--text-soft)", lineHeight:1.75, marginBottom:24 }}>Your account has not been linked to a university yet. Please contact a Super Administrator for assistance.</p>
              <button className="btn-primary" onClick={logout}>Sign Out</button>
            </div>
          )}

          {/*OVERVIEW*/}
          {uid && section === "overview" && (
            <div style={{ animation:"fadeUp .5s ease both" }}>
              <div style={{ marginBottom:36 }}>
                <div className="section-eyebrow">University Administration</div>
                <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2.2rem", fontWeight:400, letterSpacing:"-.02em", color:"var(--text)", margin:"8px 0 6px" }}>
                  Welcome, <em style={{ fontStyle:"italic", color:"var(--mint)" }}>{user?.name?.split(" ")[0] || "Administrator"}</em>
                </h1>
                <p style={{ fontSize:".88rem", color:"var(--text-muted)", marginTop:4 }}>
                  Administration of <span style={{ color:"var(--mint)", fontWeight:600 }}>{user?.varsity_name}</span>
                </p>
              </div>

              {stats && (
                <div className="stats-grid">
                  {[
                    { label:"Approved Clubs",    value: stats.clubs,             color:"var(--green)",  icon:"◈", section:"clubs" },
                    { label:"Pending Clubs",     value: stats.pendingClubs,      color:"var(--yellow)", icon:"◐", section:"pending" },
                    { label:"Archived Clubs",    value: stats.archivedClubs,     color:"var(--text-muted)", icon:"▣", section:"archived-clubs" },
                    { label:"Pending Students",  value: stats.pendingStudents ?? pendingStudents.length, color:"#e89a5a", icon:"◑", section:"pending-students" },
                    { label:"Students",          value: stats.students,          color:"#7db8e0",       icon:"◎", section:"students" },
                    { label:"Inactive Students", value: stats.inactiveStudents,  color:"var(--red)",    icon:"◌", section:"inactive-students" },
                  ].map(s => (
                    <div key={s.label} className="stat-card" onClick={() => setSection(s.section)} style={{ cursor:"pointer" }}>
                      <div style={{ fontSize:"1.2rem", marginBottom:10, color:s.color }}>{s.icon}</div>
                      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2rem", fontWeight:400, color:s.color, lineHeight:1 }}>{s.value ?? "—"}</div>
                      <div style={{ fontSize:".72rem", color:"var(--text-muted)", marginTop:6, textTransform:"uppercase", letterSpacing:".06em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {pendingClubs.length > 0 && (
                <div className="alert-banner">
                  <div>
                    <div style={{ fontSize:".75rem", color:"var(--yellow)", fontWeight:600, textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>
                      ● {pendingClubs.length} Club Request{pendingClubs.length > 1 ? "s" : ""} Pending
                    </div>
                    <div style={{ fontSize:".83rem", color:"var(--text-soft)" }}>Club registrations are awaiting your review.</div>
                  </div>
                  <button className="alert-btn" onClick={() => setSection("pending")}>Review →</button>
                </div>
              )}

              {stats?.inactiveStudents > 0 && (
                <div className="alert-banner" style={{ marginTop:12, background:"rgba(224,112,112,.06)", borderColor:"rgba(224,112,112,.22)" }}>
                  <div>
                    <div style={{ fontSize:".75rem", color:"var(--red)", fontWeight:600, textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>
                      ● {stats.inactiveStudents} Inactive Student{stats.inactiveStudents > 1 ? "s" : ""} Detected
                    </div>
                    <div style={{ fontSize:".83rem", color:"var(--text-soft)" }}>Students with no login activity in the last 30 days.</div>
                  </div>
                  <button className="alert-btn" style={{ background:"rgba(224,112,112,.12)", color:"var(--red)", borderColor:"rgba(224,112,112,.3)" }} onClick={() => setSection("inactive-students")}>Review →</button>
                </div>
              )}
            </div>
          )}

          {/*PENDING CLUBS*/}
          {uid && section === "pending" && (
            <div style={{ animation:"fadeUp .5s ease both" }}>
              <SectionHeader title="Pending" italic="Club Requests" subtitle="Review and approve or reject club registration requests for your university." />
              {pendingClubs.length === 0 ? <EmptyState icon="◐" message="No pending club requests at this time." /> : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {pendingClubs.map(c => (
                    <div key={c.rep_user_id || c.id} className="list-row">
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, color:"var(--text)", marginBottom:4 }}>{c.name || "(Pending club name)"}</div>
                        <div style={{ fontSize:".78rem", color:"var(--text-muted)" }}>
                          Requested by: <span style={{ color:"var(--text-soft)" }}>{c.requested_by_name || "—"}</span>
                          {" · "}<span>{c.requested_by_email || "—"}</span>
                          {" · "}{fmt(c.created_at)}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                        <ActionBtn label="Approve" color="var(--green)"  bg="rgba(126,196,156,.12)" border="rgba(126,196,156,.3)" onClick={() => approveClub(c.id)} />
                        <ActionBtn label="Reject"  color="var(--red)"    bg="rgba(224,112,112,.1)"  border="rgba(224,112,112,.3)" onClick={() => rejectClub(c.id)}  />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/*CLUBS*/}
          {uid && section === "clubs" && (
            <div style={{ animation:"fadeUp .5s ease both" }}>
              <SectionHeader title="Approved" italic="Clubs" subtitle="All active clubs in your university. You can archive a club to hide it without deleting data." />
              {clubs.length === 0 ? <EmptyState icon="◈" message="No approved clubs at this time." /> : (
                <Table
                  headers={["Club Name", "Joined", ""]}
                  rows={clubs.map(c => [
                    <span style={{ fontWeight:600 }}>{c.name}</span>,
                    <span style={{ color:"var(--text-muted)", fontSize:".8rem" }}>{fmt(c.created_at)}</span>,
                    <div style={{ display:"flex", gap:8 }}>
                      <ActionBtn label="Archive" color="var(--yellow)" bg="rgba(240,192,96,.1)" border="rgba(240,192,96,.3)" onClick={() => archiveClub(c.id, c.name)} />
                      <DangerBtn label="Delete"  onClick={() => deleteClub(c.id, c.name)} />
                    </div>,
                  ])}
                />
              )}
            </div>
          )}

          {/*ARCHIVED CLUBS*/}
          {uid && section === "archived-clubs" && (
            <div style={{ animation:"fadeUp .5s ease both" }}>
              <SectionHeader title="Archived" italic="Clubs" subtitle="These clubs are hidden from students but all their data is preserved. You can restore them anytime." />
              {archivedClubs.length === 0 ? <EmptyState icon="▣" message="No archived clubs at this time." /> : (
                <Table
                  headers={["Club Name", "Archived On", ""]}
                  rows={archivedClubs.map(c => [
                    <span style={{ fontWeight:600, color:"var(--text-muted)" }}>{c.name}</span>,
                    <span style={{ color:"var(--text-muted)", fontSize:".8rem" }}>{fmt(c.created_at)}</span>,
                    <ActionBtn label="Restore" color="var(--green)" bg="rgba(126,196,156,.12)" border="rgba(126,196,156,.3)" onClick={() => unarchiveClub(c.id, c.name)} />,
                  ])}
                />
              )}
            </div>
          )}

          {/*PENDING STUDENTS*/}
          {uid && section === "pending-students" && (
            <div style={{ animation:"fadeUp .5s ease both" }}>
              <SectionHeader title="Pending" italic="Student Approvals" subtitle="Students who registered and are awaiting your approval." />
              {pendingStudents.length === 0 ? <EmptyState icon="◑" message="No pending student approvals at this time." /> : (
                <Table
                  headers={["Name", "Email", "Registered", ""]}
                  rows={pendingStudents.map(s => [
                    <span style={{ fontWeight:600 }}>{s.name}</span>,
                    <span style={{ fontSize:".82rem", color:"var(--text-soft)" }}>{s.email}</span>,
                    <span style={{ color:"var(--text-muted)", fontSize:".8rem" }}>{fmt(s.created_at)}</span>,
                    <div style={{ display:"flex", gap:8 }}>
                      <ActionBtn label="Approve" color="var(--green)" bg="rgba(126,196,156,.12)" border="rgba(126,196,156,.3)" onClick={() => approveStudent(s.id, s.name)} />
                      <ActionBtn label="Reject"  color="var(--red)"   bg="rgba(224,112,112,.1)"  border="rgba(224,112,112,.3)" onClick={() => rejectStudent(s.id, s.name)}  />
                    </div>,
                  ])}
                />
              )}
            </div>
          )}

          {/*STUDENTS*/}
          {uid && section === "students" && (
            <div style={{ animation:"fadeUp .5s ease both" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, gap:16 }}>
                <SectionHeader title="Student" italic="Management" subtitle="Students enrolled in your university." noMargin />
                <button className="btn-primary" style={{ flexShrink:0, marginTop:4 }} onClick={() => { setAddModal(true); setAddErrors({}); }}>+ Add Student</button>
              </div>
              {students.length === 0 ? <EmptyState icon="◎" message="No students enrolled at this time." /> : (
                <Table
                  headers={["Name", "Email", "Club", "Last Login", "Status", "Joined", ""]}
                  rows={students.map(s => [
                    <span style={{ fontWeight:600 }}>{s.name}</span>,
                    <span style={{ fontSize:".82rem", color:"var(--text-soft)" }}>{s.email}</span>,
                    s.club_name
                      ? <span style={{ fontSize:".82rem", color:"var(--mint)", fontWeight:600 }}>{s.club_name}</span>
                      : <span style={{ color:"var(--text-muted)", fontSize:".82rem" }}>—</span>,
                    <span style={{ color:"var(--text-muted)", fontSize:".78rem" }}>{fmtDateTime(s.last_login)}</span>,
                    <StatusBadge status={s.status} />,
                    <span style={{ color:"var(--text-muted)", fontSize:".8rem" }}>{fmt(s.created_at)}</span>,
                    <DangerBtn label="Remove" onClick={() => removeStudent(s.id, s.name)} />,
                  ])}
                />
              )}
            </div>
          )}

          {/*INACTIVE STUDENTS*/}
          {uid && section === "inactive-students" && (
            <div style={{ animation:"fadeUp .5s ease both" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, gap:16, flexWrap:"wrap" }}>
                <SectionHeader title="Inactive" italic="Students" subtitle="Students who have not logged in within the selected period." noMargin />
                <div style={{ display:"flex", gap:10, alignItems:"center", flexShrink:0, marginTop:4 }}>
                  <label style={{ fontSize:".78rem", color:"var(--text-muted)", whiteSpace:"nowrap" }}>Inactive for</label>
                  <select
                    value={inactiveDays}
                    onChange={e => setInactiveDays(Number(e.target.value))}
                    style={{ background:"var(--surface2)", border:"1.5px solid var(--border)", borderRadius:8, padding:"7px 12px", color:"var(--text)", fontFamily:"'DM Sans',sans-serif", fontSize:".82rem", cursor:"pointer" }}
                  >
                    {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
                  </select>
                  {inactiveStudents.length > 0 && (
                    <button className="btn-danger" onClick={removeInactiveAll}>
                      Remove All ({inactiveStudents.length})
                    </button>
                  )}
                </div>
              </div>

              {inactiveStudents.length === 0
                ? <EmptyState icon="◌" message={`No students inactive for ${inactiveDays}+ days.`} />
                : (
                  <Table
                    headers={["Name", "Email", "Last Login", "Joined", ""]}
                    rows={inactiveStudents.map(s => [
                      <span style={{ fontWeight:600 }}>{s.name}</span>,
                      <span style={{ fontSize:".82rem", color:"var(--text-soft)" }}>{s.email}</span>,
                      <span style={{ fontSize:".82rem", color:"var(--red)" }}>{fmtDateTime(s.last_login)}</span>,
                      <span style={{ color:"var(--text-muted)", fontSize:".8rem" }}>{fmt(s.created_at)}</span>,
                      <DangerBtn label="Remove" onClick={() => removeStudent(s.id, s.name)} />,
                    ])}
                  />
                )
              }
            </div>
          )}

          {/*UNIVERSITY SETTINGS*/}
          {uid && section === "settings" && (
            <div style={{ animation:"fadeUp .5s ease both" }}>
              <SectionHeader title="University" italic="Settings" subtitle="Update your university's profile, contact information and branding." />

              <div className="card" style={{ maxWidth:620 }}>

                {/* Logo */}
                <div style={{ marginBottom:28 }}>
                  <label className="field-label">University Logo</label>
                  <div style={{ display:"flex", alignItems:"center", gap:20, marginTop:8 }}>
                    <div style={{
                      width:80, height:80, borderRadius:14,
                      background:"var(--surface2)", border:"1.5px solid var(--border)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      overflow:"hidden", flexShrink:0
                    }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : <span style={{ fontSize:"1.8rem", color:"var(--text-muted)", opacity:.4 }}>🏛</span>
                      }
                    </div>
                    <div>
                      <label htmlFor="logo-upload" style={{
                        padding:"8px 18px", background:"var(--mint-light)", color:"var(--mint)",
                        border:"1px solid var(--border)", borderRadius:8, cursor:"pointer",
                        fontSize:".8rem", fontWeight:500, fontFamily:"'DM Sans',sans-serif"
                      }}>
                        {logoFile ? "Change Logo" : "Upload Logo"}
                      </label>
                      <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} style={{ display:"none" }} />
                      {logoFile && <div style={{ fontSize:".72rem", color:"var(--text-muted)", marginTop:6 }}>{logoFile.name}</div>}
                      <div style={{ fontSize:".72rem", color:"var(--text-muted)", marginTop:4 }}>PNG, JPG up to 2MB</div>
                    </div>
                  </div>
                </div>

                {/* Fields */}
                {[
                  { key:"name",          label:"University Name",  type:"text",  ph:"e.g. University of Dhaka" },
                  { key:"contact_email", label:"Contact Email",    type:"email", ph:"contact@university.edu" },
                  { key:"website",       label:"Website URL",      type:"text",  ph:"https://university.edu" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom:18 }}>
                    <label className="field-label">{f.label}</label>
                    <input
                      type={f.type} placeholder={f.ph}
                      value={settingsForm[f.key]}
                      onChange={e => { setSettingsForm(p => ({...p,[f.key]:e.target.value})); setSettingsErrors(p => ({...p,[f.key]:"",submit:""})); }}
                      className="field-input"
                      style={{ borderColor: settingsErrors[f.key] ? "var(--red)" : undefined }}
                    />
                    {settingsErrors[f.key] && <span style={{ fontSize:".72rem", color:"var(--red)", marginTop:3, display:"block" }}>{settingsErrors[f.key]}</span>}
                  </div>
                ))}

                {/* Description */}
                <div style={{ marginBottom:18 }}>
                  <label className="field-label">Description</label>
                  <textarea
                    rows={4} placeholder="A brief description of your university…"
                    value={settingsForm.description}
                    onChange={e => setSettingsForm(p => ({...p, description:e.target.value}))}
                    className="field-input"
                    style={{ resize:"vertical", lineHeight:1.6 }}
                  />
                </div>

                {settingsErrors.submit && (
                  <div style={{ padding:"10px 14px", background:"rgba(224,112,112,.1)", border:"1px solid rgba(224,112,112,.25)", borderRadius:8, fontSize:".8rem", color:"var(--red)", marginBottom:16 }}>{settingsErrors.submit}</div>
                )}

                <button onClick={handleSaveSettings} disabled={settingsBusy} className="btn-primary" style={{ opacity: settingsBusy ? .6 : 1 }}>
                  {settingsBusy ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

// SUB-COMPONENTS

function SectionHeader({ title, italic, subtitle, noMargin }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : 28 }}>
      <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.8rem", fontWeight:400, letterSpacing:"-.02em", color:"var(--text)", marginBottom:6 }}>
        {title} <em style={{ fontStyle:"italic", color:"var(--mint)" }}>{italic}</em>
      </h2>
      {subtitle && <p style={{ fontSize:".83rem", color:"var(--text-muted)" }}>{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="card" style={{ textAlign:"center", padding:"60px 24px" }}>
      <div style={{ fontSize:"2rem", marginBottom:12, color:"var(--text-muted)", opacity:.4 }}>{icon}</div>
      <p style={{ fontSize:".88rem", color:"var(--text-muted)" }}>{message}</p>
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="card" style={{ padding:0, overflow:"hidden" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ borderBottom:"1px solid var(--border)" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding:"12px 20px", textAlign:"left", fontSize:".68rem", fontWeight:600, color:"var(--text-muted)", letterSpacing:".1em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}
              style={{ borderBottom: ri < rows.length - 1 ? "1px solid var(--border)" : "none", transition:"background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--row-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding:"14px 20px", verticalAlign:"middle" }}>{cell}</td>
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
      padding:"3px 10px", borderRadius:10, fontSize:".68rem", fontWeight:600,
      letterSpacing:".06em", textTransform:"uppercase",
      background: approved ? "rgba(126,196,156,.15)" : "rgba(240,192,96,.12)",
      color:      approved ? "var(--green)"           : "var(--yellow)",
      border:`1px solid ${approved ? "rgba(126,196,156,.3)" : "rgba(240,192,96,.25)"}`,
    }}>{status}</span>
  );
}

function ActionBtn({ label, color, bg, border, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding:"7px 16px", background:bg, color, border:`1px solid ${border}`, borderRadius:8, cursor:"pointer", fontSize:".78rem", fontWeight:500, fontFamily:"'DM Sans',sans-serif", transition:"opacity .15s" }}
      onMouseEnter={e => e.currentTarget.style.opacity=".75"}
      onMouseLeave={e => e.currentTarget.style.opacity="1"}
    >{label}</button>
  );
}

function DangerBtn({ label, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding:"6px 14px", background:"rgba(224,112,112,.1)", color:"var(--red)", border:"1px solid rgba(224,112,112,.22)", borderRadius:8, cursor:"pointer", fontSize:".75rem", fontWeight:500, fontFamily:"'DM Sans',sans-serif", transition:"opacity .15s" }}
      onMouseEnter={e => e.currentTarget.style.opacity=".7"}
      onMouseLeave={e => e.currentTarget.style.opacity="1"}
    >{label}</button>
  );
}

// STYLES

const dashStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  body.theme-light {
    --mint:#3DBFA0; --mint-light:#E8F5F0; --mint-mid:#5ECDB3; --mint-dark:#2A9E83;
    --text:#2A3B35; --text-soft:#6B7F78; --text-muted:#9DB5AE;
    --border:#DCE9E5; --border-h:#A8D4CB;
    --card-bg:rgba(255,255,255,0.92); --surface2:#F7F9F8;
    --sidebar-bg:rgba(244,249,248,0.96); --main-bg:transparent;
    --shadow:0 4px 20px rgba(61,191,160,0.10); --shadow-lg:0 8px 36px rgba(61,191,160,0.18);
    --row-hover:rgba(61,191,160,0.04); --nav-active:rgba(61,191,160,0.10);
    --green:#3dab7a; --yellow:#c8960a; --red:#d05050;
  }
  body.theme-dark {
    --mint:#3DBFA0; --mint-light:rgba(61,191,160,0.15); --mint-mid:#5ECDB3; --mint-dark:#2A9E83;
    --text:#dde4ee; --text-soft:#8fa0b5; --text-muted:#5e738a;
    --border:rgba(196,178,140,0.12); --border-h:rgba(196,178,140,0.28);
    --card-bg:rgba(22,32,48,0.95); --surface2:#1d2c3f;
    --sidebar-bg:rgba(14,24,37,0.98); --main-bg:transparent;
    --shadow:0 4px 20px rgba(0,0,0,0.25); --shadow-lg:0 8px 36px rgba(0,0,0,0.40);
    --row-hover:rgba(196,178,140,0.03); --nav-active:rgba(61,191,160,0.08);
    --green:#7ec49c; --yellow:#f0c060; --red:#e07070;
  }

  html, body { font-family:'DM Sans',sans-serif; color:var(--text); -webkit-font-smoothing:antialiased; min-height:100%; }

  .bg-canvas { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
  body.theme-light .bg-canvas::before { content:''; position:absolute; inset:0; background:#f0ebe3; }
  body.theme-light .bg-canvas::after  { content:''; position:absolute; top:0; right:0; width:55%; height:55%; background:#c9a8b2; clip-path:polygon(45% 0%,100% 0%,100% 100%,0% 100%); }
  body.theme-light .bg-bottom-accent  { background:#ddb8c0; }
  body.theme-dark  .bg-canvas::before { content:''; position:absolute; inset:0; background:#0a1520; }
  body.theme-dark  .bg-canvas::after  { content:''; position:absolute; top:0; right:0; width:55%; height:55%; background:#0f2535; clip-path:polygon(45% 0%,100% 0%,100% 100%,0% 100%); }
  body.theme-dark  .bg-bottom-accent  { background:#0d1e30; }
  .bg-bottom-accent { position:absolute; bottom:0; left:0; width:40%; height:35%; clip-path:polygon(0% 0%,100% 100%,0% 100%); }
  .bg-noise { position:absolute; inset:0; opacity:0.035; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); background-size:200px 200px; }

  .dash-layout { display:flex; min-height:100vh; position:relative; z-index:1; }

  .sidebar { width:240px; flex-shrink:0; background:var(--sidebar-bg); border-right:1px solid var(--border); backdrop-filter:blur(20px); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow-y:auto; }
  .sidebar-brand { padding:24px 20px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px; }
  .sidebar-logo-box { width:34px; height:34px; border-radius:9px; background:var(--mint); display:flex; align-items:center; justify-content:center; font-size:.95rem; color:white; font-weight:700; font-family:'DM Serif Display',serif; box-shadow:0 4px 12px rgba(61,191,160,.30); flex-shrink:0; }
  .sidebar-logo { font-family:'DM Serif Display',serif; font-size:1.05rem; color:var(--text); letter-spacing:-.01em; }
  .sidebar-sub  { font-size:.63rem; color:var(--text-muted); letter-spacing:.08em; text-transform:uppercase; margin-top:1px; }
  .sidebar-varsity { padding:14px 20px; border-bottom:1px solid var(--border); }
  .sidebar-varsity-lbl  { font-size:.63rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:.08em; margin-bottom:3px; }
  .sidebar-varsity-name { font-size:.85rem; color:var(--mint); font-weight:600; word-break:break-word; }
  .sidebar-nav { flex:1; padding:10px 0; }
  .nav-btn { width:100%; padding:10px 20px; background:transparent; border:none; border-left:2.5px solid transparent; cursor:pointer; text-align:left; display:flex; align-items:center; gap:10px; transition:background .15s, border-color .15s; }
  .nav-btn:hover { background:var(--nav-active); }
  .nav-btn-active { background:var(--nav-active) !important; border-left-color:var(--mint) !important; }
  .nav-icon        { font-size:.88rem; color:var(--text-muted); transition:color .15s; }
  .nav-icon-active { color:var(--mint) !important; }
  .nav-label        { font-size:.83rem; color:var(--text-soft); font-weight:400; transition:color .15s; }
  .nav-label-active { color:var(--text) !important; font-weight:600; }
  .nav-badge { margin-left:auto; background:rgba(240,192,96,.18); color:var(--yellow); border-radius:10px; font-size:.63rem; font-weight:700; padding:2px 7px; letter-spacing:.03em; }
  .sidebar-footer { padding:16px 20px; border-top:1px solid var(--border); }
  .sidebar-email { font-size:.72rem; color:var(--text-muted); margin-bottom:12px; word-break:break-word; }
  .sidebar-link-btn { width:100%; padding:8px 12px; margin-bottom:6px; background:var(--mint-light); border:1px solid var(--border); border-radius:8px; color:var(--mint); cursor:pointer; font-size:.78rem; font-family:'DM Sans',sans-serif; font-weight:500; text-align:left; transition:all .2s; }
  .sidebar-link-btn:hover { border-color:var(--mint); }
  .sidebar-logout-btn { padding:8px 12px; background:rgba(224,112,112,.1); border:1px solid rgba(224,112,112,.2); border-radius:8px; color:var(--red); cursor:pointer; font-size:.78rem; font-family:'DM Sans',sans-serif; font-weight:500; transition:all .2s; }
  .sidebar-logout-btn:hover { background:rgba(224,112,112,.18); }

  .dash-main { flex:1; padding:40px 44px; overflow-y:auto; background:var(--main-bg); }

  .card { background:var(--card-bg); border:1.5px solid var(--border); border-radius:16px; padding:24px; backdrop-filter:blur(20px); box-shadow:var(--shadow); transition:box-shadow .25s; }
  .card:hover { box-shadow:var(--shadow-lg); }

  .stats-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:14px; margin-bottom:32px; }
  .stat-card { background:var(--card-bg); border:1.5px solid var(--border); border-radius:14px; padding:22px 20px; backdrop-filter:blur(20px); box-shadow:var(--shadow); transition:all .25s; }
  .stat-card:hover { transform:translateY(-3px); box-shadow:var(--shadow-lg); }

  .list-row { background:var(--card-bg); border:1.5px solid var(--border); border-radius:14px; padding:18px 22px; display:flex; align-items:center; gap:18px; backdrop-filter:blur(20px); box-shadow:var(--shadow); transition:box-shadow .2s; }
  .list-row:hover { box-shadow:var(--shadow-lg); }

  .alert-banner { background:rgba(240,192,96,.07); border:1.5px solid rgba(240,192,96,.22); border-radius:14px; padding:18px 22px; display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:8px; }
  .alert-btn { padding:9px 20px; background:rgba(240,192,96,.15); color:var(--yellow); border:1px solid rgba(240,192,96,.3); border-radius:8px; cursor:pointer; font-size:.8rem; font-weight:600; white-space:nowrap; font-family:'DM Sans',sans-serif; transition:all .2s; }
  .alert-btn:hover { background:rgba(240,192,96,.25); }

  .btn-primary { padding:10px 24px; background:var(--mint); color:#fff; border:none; border-radius:10px; font-size:.85rem; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all .2s; box-shadow:0 4px 14px rgba(61,191,160,.28); }
  .btn-primary:hover { background:var(--mint-dark); transform:translateY(-1px); }
  .btn-ghost { padding:10px 20px; background:transparent; color:var(--text-muted); border:1.5px solid var(--border); border-radius:10px; font-size:.85rem; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all .2s; }
  .btn-ghost:hover { border-color:var(--border-h); color:var(--text-soft); }
  .btn-danger { padding:10px 24px; background:rgba(224,112,112,.12); color:var(--red); border:1px solid rgba(224,112,112,.3); border-radius:10px; font-size:.85rem; font-weight:500; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all .2s; }
  .btn-danger:hover { background:rgba(224,112,112,.2); }

  .field-label { display:block; margin-bottom:6px; font-size:.72rem; font-weight:600; color:var(--text-muted); letter-spacing:.08em; text-transform:uppercase; }
  .field-input { width:100%; background:var(--surface2); border:1.5px solid var(--border); border-radius:10px; padding:11px 14px; color:var(--text); font-family:'DM Sans',sans-serif; font-size:.88rem; outline:none; box-sizing:border-box; transition:border-color .2s; }
  .field-input:focus { border-color:var(--mint); }
  input::placeholder, textarea::placeholder { color:var(--text-muted); }

  .overlay { position:fixed; inset:0; z-index:9000; background:rgba(5,10,18,.75); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:24px; animation:fadeIn .2s ease both; }
  .modal-box { background:var(--card-bg); border:1.5px solid var(--border); border-radius:18px; padding:36px; width:100%; max-height:90vh; overflow-y:auto; animation:modalIn .3s cubic-bezier(.22,1,.36,1) both; box-shadow:var(--shadow-lg); backdrop-filter:blur(20px); }
  .modal-close { background:var(--surface2); border:1px solid var(--border); color:var(--text-muted); border-radius:8px; width:28px; height:28px; cursor:pointer; font-size:.85rem; display:flex; align-items:center; justify-content:center; transition:all .2s; }
  .modal-close:hover { background:var(--mint-light); color:var(--mint); }

  .toast { position:fixed; top:20px; right:20px; z-index:9999; padding:12px 20px; border-radius:10px; font-size:.83rem; font-weight:500; backdrop-filter:blur(12px); animation:toastIn .3s ease both; box-shadow:var(--shadow-lg); }
  .toast-success { background:rgba(61,191,160,.15); border:1px solid rgba(61,191,160,.35); color:var(--mint); }
  .toast-error   { background:rgba(224,112,112,.15); border:1px solid rgba(224,112,112,.35); color:var(--red); }
  .toast-info    { background:rgba(196,178,140,.12); border:1px solid rgba(196,178,140,.3);  color:var(--yellow); }

  .section-eyebrow { font-size:.68rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:.1em; }

  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes toastIn { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes modalIn { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }

  @media (max-width:860px) { .sidebar { width:200px; } .dash-main { padding:24px 20px; } }
  @media (max-width:640px) { .dash-layout { flex-direction:column; } .sidebar { width:100%; height:auto; position:relative; } .dash-main { padding:20px 14px; } }
`;
