// pages/Profile.js
import React, { useState, useEffect, useRef } from 'react';
import ThemeToggle from "../components/ThemeToggle";
import { getMyProfile, updateMyProfile, changePassword } from '../services/api';

const API_BASE = 'http://localhost:5000';

export default function Profile() {
  const [profile, setProfile]   = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState({ name: '', bio: '', phone: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [pwForm, setPwForm]     = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg]           = useState({ type: '', text: '' });
  const [loading, setLoading]   = useState(false);
  const [hoverAvatar, setHoverAvatar] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    getMyProfile().then(r => {
      setProfile(r.data);
      setForm({ name: r.data.name || '', bio: r.data.bio || '', phone: r.data.phone || '' });
    });
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('bio', form.bio);
    fd.append('phone', form.phone);
    if (avatarFile) fd.append('avatar', avatarFile);
    try {
      await updateMyProfile(fd);
      const r = await getMyProfile();
      setProfile(r.data);
      setEditMode(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setMsg({ type: 'success', text: 'Profile updated!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Update failed' });
    } finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm)
      return setMsg({ type: 'error', text: 'New passwords do not match' });
    setLoading(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg({ type: 'success', text: 'Password changed successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    } finally { setLoading(false); }
  };

  if (!profile) return (
    <>
      <style>{profileStyles}</style>
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--text-muted)',
        fontSize: 15, fontFamily: "'DM Sans', sans-serif",
        animation: 'pulse 1.8s ease-in-out infinite',
        position: 'relative', zIndex: 1,
      }}>
        Loading…
      </div>
    </>
  );

  const avatarSrc = avatarPreview || (profile.avatar ? `${API_BASE}${profile.avatar}` : null);
  const initials  = profile.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const inputStyle = {
    background: 'var(--surface2)', border: '1.5px solid var(--border)',
    borderRadius: 10, padding: '11px 14px', color: 'var(--text)',
    fontFamily: "'DM Sans', sans-serif", fontSize: '.9rem', fontWeight: 400,
    transition: 'border-color .2s', width: '100%', boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: '.72rem', fontWeight: 600, color: 'var(--text-muted)',
    letterSpacing: '.08em', textTransform: 'uppercase',
  };

  return (
    <>
      <style>{profileStyles}</style>

      {/*GEOMETRIC BACKGROUND*/}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      {/*FLOATING THEME TOGGLE*/}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 200,
        background: 'var(--card-bg)',
        border: '1.5px solid var(--border)',
        borderRadius: 12, padding: '6px 10px',
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <ThemeToggle />
      </div>

      <div className="profile-container">
        <div className="profile-inner">

          {/*Page header*/}
          <div style={{ marginBottom: 4, animation: 'fadeUp .5s ease both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 1, background: 'var(--mint)', opacity: .7 }} />
              <span style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--mint)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Account</span>
              <div style={{ width: 28, height: 1, background: 'var(--mint)', opacity: .7 }} />
            </div>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '2rem', fontWeight: 400,
              color: 'var(--text)', letterSpacing: '-.02em', margin: 0,
            }}>
              My <em style={{ fontStyle: 'italic', color: 'var(--mint)' }}>Profile.</em>
            </h1>
          </div>

          {/*Feedback banner*/}
          {msg.text && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 500,
              background: msg.type === 'success' ? 'rgba(61,191,160,.12)' : 'rgba(224,112,112,.12)',
              border: `1.5px solid ${msg.type === 'success' ? 'rgba(61,191,160,.35)' : 'rgba(224,112,112,.35)'}`,
              color: msg.type === 'success' ? 'var(--mint)' : '#e07070',
              animation: 'fadeUp .4s ease both',
            }}>
              {msg.text}
              <button onClick={() => setMsg({ type: '', text: '' })}
                style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', opacity: .6, color: 'inherit' }}>✕</button>
            </div>
          )}

          {/*Profile card*/}
          <div className="profile-card" style={{ animationDelay: '.1s' }}>

            {/*Avatar*/}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div
                onMouseEnter={() => setHoverAvatar(true)}
                onMouseLeave={() => setHoverAvatar(false)}
                onClick={() => editMode && fileRef.current.click()}
                style={{
                  width: 110, height: 110, borderRadius: '50%', overflow: 'hidden',
                  background: 'linear-gradient(135deg,#6366f1,#a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: editMode ? 'pointer' : 'default', position: 'relative',
                  border: '3px solid var(--border-h)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                {avatarSrc
                  ? <img src={avatarSrc} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{initials}</span>
                }
                {editMode && hoverAvatar && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 600, borderRadius: '50%',
                  }}>📷 Change</div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            {/*View mode*/}
            {!editMode ? (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: '1.6rem', fontWeight: 400,
                  color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-.02em',
                }}>
                  {profile.name}
                </h2>
                <span style={{
                  display: 'inline-block', background: 'var(--mint-light)',
                  color: 'var(--mint)', fontSize: 12, fontWeight: 600,
                  padding: '3px 14px', borderRadius: 20,
                  textTransform: 'capitalize', marginBottom: 14,
                  letterSpacing: '.03em', border: '1px solid var(--mint)',
                }}>
                  {profile.role?.replace(/_/g, ' ')}
                </span>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0', fontWeight: 400 }}>{profile.email}</p>
                {profile.phone && <p style={{ fontSize: 14, color: 'var(--text-soft)', margin: '4px 0' }}>📞 {profile.phone}</p>}
                {profile.bio   && <p style={{ fontSize: 14, color: 'var(--text-soft)', margin: '16px auto 0', lineHeight: 1.7, maxWidth: 400 }}>{profile.bio}</p>}
                <button
                  onClick={() => setEditMode(true)}
                  className="btn-primary"
                  style={{ marginTop: 20 }}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              /*Edit mode*/
              <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Full Name', key: 'name', type: 'text', required: true,  placeholder: '' },
                  { label: 'Phone',     key: 'phone', type: 'text', required: false, placeholder: '+1 …' },
                ].map(({ label, key, type, required, placeholder }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>{label}</label>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      required={required}
                      placeholder={placeholder}
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--mint)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm({ ...form, bio: e.target.value })}
                    rows={3}
                    placeholder="Tell us about yourself…"
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => e.target.style.borderColor = 'var(--mint)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="submit" disabled={loading} className="btn-primary"
                    style={{ opacity: loading ? .6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                    {loading ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn-ghost"
                    onClick={() => { setEditMode(false); setAvatarPreview(null); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/*Change Password card*/}
          <div className="profile-card" style={{
            borderLeft: '3px solid var(--mint)',
            animationDelay: '.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <span style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: '1.05rem', fontWeight: 400, color: 'var(--mint)',
              }}>
                Change Password
              </span>
            </div>

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Current Password',     key: 'currentPassword' },
                { label: 'New Password',         key: 'newPassword'     },
                { label: 'Confirm New Password', key: 'confirm'         },
              ].map(({ label, key }) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    type="password"
                    value={pwForm[key]}
                    onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                    required
                    minLength={key === 'newPassword' ? 6 : undefined}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--mint)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              ))}
              <button type="submit" disabled={loading} className="btn-primary"
                style={{ alignSelf: 'flex-start', opacity: loading ? .6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}

//STYLES
const profileStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

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
    --card-bg:      rgba(255,255,255,0.92);
    --surface2:     #F7F9F8;
    --shadow:       0 4px 20px rgba(61,191,160,0.10);
    --shadow-lg:    0 8px 36px rgba(61,191,160,0.18);
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
    --border-h:     rgba(196,178,140,0.28);
    --card-bg:      rgba(22,32,48,0.95);
    --surface2:     #1d2c3f;
    --shadow:       0 4px 20px rgba(0,0,0,0.25);
    --shadow-lg:    0 8px 36px rgba(0,0,0,0.40);
  }

  /*BACKGROUND CANVAS*/
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
  body.theme-light .bg-bottom-accent {
    background: #ddb8c0;
  }

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

  /*LAYOUT*/
  .profile-container {
    min-height: 100vh;
    padding: 32px 16px 48px;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    z-index: 1;
  }

  .profile-inner {
    max-width: 620px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /*CARD*/
  .profile-card {
    background: var(--card-bg);
    border: 1.5px solid var(--border);
    border-radius: 18px;
    padding: 28px;
    backdrop-filter: blur(20px);
    box-shadow: var(--shadow);
    animation: fadeUp .5s ease both;
    transition: box-shadow .25s;
  }
  .profile-card:hover {
    box-shadow: var(--shadow-lg);
  }

  /*BUTTONS*/
  .btn-primary {
    padding: 10px 26px;
    background: var(--mint);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: .88rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all .2s;
    box-shadow: 0 4px 14px rgba(61,191,160,0.28);
  }
  .btn-primary:hover {
    background: var(--mint-dark);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(61,191,160,0.36);
  }

  .btn-ghost {
    padding: 10px 24px;
    background: transparent;
    color: var(--text-muted);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    font-size: .88rem;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all .2s;
  }
  .btn-ghost:hover {
    border-color: var(--border-h);
    color: var(--text-soft);
  }

  /*ANIMATIONS*/
  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse   { 0%,100%{opacity:.4} 50%{opacity:1} }

  /*INPUT PLACEHOLDERS*/
  input::placeholder, textarea::placeholder { color: var(--text-muted); }

  @media (max-width: 680px) {
    .profile-container { padding: 20px 10px 40px; }
    .profile-card      { padding: 20px 16px; }
  }
`;