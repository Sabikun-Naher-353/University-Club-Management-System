// pages/Feed.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ThemeToggle from "../components/ThemeToggle";
import {
  getFeed, createPost, deletePost,
  reactToPost, getReactions,
  getComments, addComment, deleteComment, sharePost,
  reportPost, getPostReports,
} from '../services/api';
import axios from 'axios';

const API_BASE  = 'http://localhost:5000';
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const REACT_MAP = { '👍': 'like', '❤️': 'love', '😂': 'haha', '😮': 'wow', '😢': 'sad', '😡': 'angry' };
const REACT_EMO = Object.fromEntries(Object.entries(REACT_MAP).map(([e, k]) => [k, e]));

const REPORT_REASONS = [
  'Spam or misleading',
  'Harassment or bullying',
  'Hate speech',
  'Inappropriate content',
  'False information',
  'Other',
];

const getUserId = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u?.id ?? u?.user_id ?? u?._id ?? null;
  } catch { return null; }
};
const editPost    = (id, content) => axios.put(`${API_BASE}/api/feed/${id}`, { user_id: getUserId(), content });
const searchPosts = (q)           => axios.get(`${API_BASE}/api/feed/search`, { params: { user_id: getUserId(), q } });

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function LoadingDots({ label = 'Loading' }) {
  return (
    <div className="loading-dots-wrap">
      <span className="loading-label">{label}</span>
      <span className="dot dot1">·</span>
      <span className="dot dot2">·</span>
      <span className="dot dot3">·</span>
    </div>
  );
}

function AnimatedCard({ children, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref}
      className={`animated-card${visible ? ' animated-card--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function Avatar({ src, name, size = 42 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const s = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg,#6366f1,#a855f7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.35, fontWeight: 700, color: '#fff', overflow: 'hidden',
  };
  return (
    <div style={s} className="avatar-ring">
      {src
        ? <img src={`${API_BASE}${src}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  );
}

function WhoReacted({ breakdown, users = [] }) {
  const [activeTab, setActiveTab] = useState('all');
  const tabs       = ['all', ...breakdown.map(r => r.reaction)];
  const totalCount = breakdown.reduce((s, r) => s + Number(r.count), 0);
  const filtered   = activeTab === 'all' ? users : users.filter(u => u.reaction === activeTab);
  return (
    <div className="who-reacted-anim" style={{
      background: 'var(--card-bg)', borderRadius: 10, padding: 12,
      marginBottom: 8, border: '1px solid var(--border)', backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? 'var(--mint-light)' : 'transparent',
            color: activeTab === tab ? 'var(--mint)' : 'var(--text-muted)',
            border: `1px solid ${activeTab === tab ? 'var(--mint)' : 'var(--border)'}`,
            borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all .2s',
          }}>
            {tab === 'all' ? `All · ${totalCount}` : `${REACT_EMO[tab] || '👍'} ${breakdown.find(r => r.reaction === tab)?.count || 0}`}
          </button>
        ))}
      </div>
      {filtered.map((u, i) => (
        <div key={`${u.id}-${i}`} className="who-reacted-row"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--border)', animationDelay: `${i * 40}ms` }}>
          <Avatar src={u.avatar} name={u.name} size={36} />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', flex: 1 }}>{u.name}</span>
          <span style={{ fontSize: 20 }}>{REACT_EMO[u.reaction] || '👍'}</span>
        </div>
      ))}
      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, margin: '8px 0' }}>No reactions yet.</p>
      )}
    </div>
  );
}

function ReportModal({ postId, onClose }) {
  const [selected, setSelected] = useState('');
  const [custom,   setCustom]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  const reason = selected === 'Other' ? custom.trim() : selected;

  const submit = async () => {
    if (!reason) { setError('Please select or enter a reason.'); return; }
    setLoading(true); setError('');
    try {
      await reportPost(postId, reason);
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      {}
      <div
        onMouseDown={e => e.stopPropagation()}
        className="report-modal-anim"
        style={{
          background: 'var(--card-bg)', borderRadius: 20,
          width: '100%', maxWidth: 400,
          border: '1.5px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', fontFamily: "'DM Sans', sans-serif",
          maxHeight: '88vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {done ? (
          /* Success */
          <div style={{ textAlign: 'center', padding: '36px 28px' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              Report Submitted
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.6 }}>
              Thanks for letting us know. Our team will review this post.
            </p>
            <button onClick={onClose} style={{
              background: 'var(--mint)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '11px 36px', fontSize: 14,
              fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
              boxShadow: '0 4px 14px rgba(61,191,160,0.30)',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'var(--mint-dark)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--mint)'; }}
            >Done</button>
          </div>
        ) : (
          /* Form */
          <div style={{ padding: '20px 20px 20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                🚩 Report Post
              </h3>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, width: 30, height: 30, fontSize: 14,
                  cursor: 'pointer', color: 'var(--text-muted)', transition: 'all .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#F4845F'; e.currentTarget.style.color = '#F4845F'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >✕</button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>
              Why are you reporting this post? Your report is anonymous.
            </p>

            {}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 14 }}>
              {REPORT_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setSelected(r); setError(''); }}
                  style={{
                    background: selected === r ? 'var(--mint-light)' : 'var(--surface2)',
                    border: `1.5px solid ${selected === r ? 'var(--mint)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '9px 10px', fontSize: 12.5,
                    fontWeight: selected === r ? 600 : 400,
                    color: selected === r ? 'var(--mint)' : 'var(--text-soft)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all .18s',
                    fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3,
                    gridColumn: r === 'Other' ? '1 / -1' : undefined,
                  }}
                  onMouseEnter={e => {
                    if (selected !== r) {
                      e.currentTarget.style.borderColor = 'var(--mint)';
                      e.currentTarget.style.color = 'var(--mint)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (selected !== r) {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-soft)';
                    }
                  }}
                >
                  {selected === r ? '✓ ' : ''}{r}
                </button>
              ))}
            </div>

            {}
            {selected === 'Other' && (
              <textarea
                autoFocus
                placeholder="Please describe the issue…"
                value={custom}
                onChange={e => { setCustom(e.target.value); setError(''); }}
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', marginBottom: 12,
                  border: '1.5px solid var(--mint)', borderRadius: 10,
                  padding: '10px 12px', fontSize: 13, resize: 'none',
                  background: 'var(--surface2)', outline: 'none',
                  fontFamily: "'DM Sans', sans-serif", color: 'var(--text)',
                  boxShadow: '0 0 0 3px rgba(61,191,160,0.12)',
                }}
              />
            )}

            {/* Error */}
            {error && (
              <p style={{
                margin: '0 0 12px', fontSize: 12.5, color: '#F4845F',
                background: 'rgba(244,132,95,0.10)', borderRadius: 8,
                padding: '7px 11px', border: '1px solid rgba(244,132,95,0.25)',
              }}>{error}</p>
            )}

            {}
            <button
              type="button"
              onClick={submit}
              disabled={loading || !reason}
              style={{
                width: '100%', background: 'var(--mint)', color: '#fff',
                border: 'none', borderRadius: 12, padding: '12px',
                fontSize: 14, fontWeight: 600,
                cursor: loading || !reason ? 'not-allowed' : 'pointer',
                opacity: loading || !reason ? 0.5 : 1,
                transition: 'all .2s', fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 4px 14px rgba(61,191,160,0.28)',
              }}
              onMouseEnter={e => {
                if (!loading && reason) {
                  e.currentTarget.style.background = 'var(--mint-dark)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--mint)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? <span className="posting-spinner">⟳</span> : 'Submit Report'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WhoReportedPanel({ postId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    getPostReports(postId)
      .then(r => setReports(r.data.reports || []))
      .catch(e => setError(e.response?.data?.error || 'Could not load reports'))
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) return <div style={{ padding: '10px 0' }}><LoadingDots label="Loading reports" /></div>;
  if (error)   return <p style={{ fontSize: 13, color: '#F4845F', margin: '8px 0' }}>{error}</p>;

  return (
    <div className="who-reported-anim" style={{
      background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px',
      border: '1.5px solid rgba(244,132,95,0.35)', marginTop: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: reports.length ? 10 : 0 }}>
        <span>🚩</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F4845F' }}>
          {reports.length === 0 ? 'No reports yet' : `${reports.length} Report${reports.length !== 1 ? 's' : ''}`}
        </span>
      </div>
      {reports.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>This post has not been reported.</p>
      ) : (
        reports.map((rep, i) => (
          <div key={rep.id} className="who-reacted-row"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 0',
              borderBottom: i < reports.length - 1 ? '1px solid var(--border)' : 'none',
              animationDelay: `${i * 50}ms`,
            }}>
            <Avatar src={rep.reporter_avatar} name={rep.reporter_name} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{rep.reporter_name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(rep.reported_at)}</span>
                {rep.action_taken && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(61,191,160,0.15)', color: 'var(--mint)',
                    border: '1px solid var(--mint)',
                  }}>{rep.action_taken}</span>
                )}
              </div>
              <p style={{
                margin: '5px 0 0', fontSize: 13, color: 'var(--text-soft)',
                background: 'var(--card-bg)', borderRadius: 8,
                padding: '6px 10px', border: '1px solid var(--border)', fontStyle: 'italic',
              }}>"{rep.reason}"</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CreatePostBox({ user, onPostCreated }) {
  const [content, setContent] = useState('');
  const [mediaFile, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setMedia(f);
    setPreview({ url: URL.createObjectURL(f), type: f.type.startsWith('video') ? 'video' : 'image' });
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) return;
    setLoading(true);
    const fd = new FormData();
    if (content.trim()) fd.append('content', content.trim());
    if (mediaFile) fd.append('media', mediaFile);
    try {
      await createPost(fd);
      setContent(''); setMedia(null); setPreview(null);
      onPostCreated();
    } catch (e) { alert(e.response?.data?.error || 'Failed to post'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 18, padding: '20px 22px',
      border: '1.5px solid var(--border)', backdropFilter: 'blur(20px)', boxShadow: 'var(--shadow)',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar src={user?.avatar} name={user?.name} size={42} />
        <textarea
          placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
          value={content} onChange={e => setContent(e.target.value)} rows={2}
          style={{
            flex: 1, border: '1.5px solid var(--border)', borderRadius: 14,
            padding: '10px 16px', fontSize: 14, resize: 'none',
            background: 'var(--surface2)', outline: 'none',
            fontFamily: "'DM Sans', sans-serif", color: 'var(--text)',
            transition: 'border-color .25s, box-shadow .25s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--mint)'; e.target.style.boxShadow = '0 0 0 3px rgba(61,191,160,0.14)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      {preview && (
        <div className="preview-fade-in" style={{ margin: '10px 0', position: 'relative' }}>
          {preview.type === 'video'
            ? <video src={preview.url} controls style={{ maxWidth: '100%', borderRadius: 10, maxHeight: 300 }} />
            : <img src={preview.url} alt="preview" style={{ maxWidth: '100%', borderRadius: 10, maxHeight: 300, objectFit: 'cover' }} />
          }
          <button onClick={() => { setMedia(null); setPreview(null); }}
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,.65)', color: '#fff', border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer', fontSize: 13, backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .25s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
          >✕</button>
        </div>
      )}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['🖼️', 'Photo', 'image/*'], ['🎬', 'Video', 'video/*']].map(([icon, label, accept]) => (
            <button key={label}
              onClick={() => { fileRef.current.accept = accept; fileRef.current.value = ''; fileRef.current.click(); }}
              style={{
                background: 'var(--surface2)', border: '1.5px solid var(--border)',
                padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                color: 'var(--text-soft)', cursor: 'pointer', transition: 'all .2s',
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--mint)'; e.currentTarget.style.color = 'var(--mint)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-soft)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >{icon} {label}</button>
          ))}
        </div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
        <button onClick={handleSubmit} disabled={loading || (!content.trim() && !mediaFile)}
          style={{
            background: 'var(--mint)', color: 'white', border: 'none', borderRadius: 10,
            padding: '9px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            opacity: (loading || (!content.trim() && !mediaFile)) ? .5 : 1,
            transition: 'all .2s', boxShadow: '0 4px 14px rgba(61,191,160,0.30)',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'var(--mint-dark)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--mint)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {loading ? <span className="posting-spinner">⟳</span> : 'Post'}
        </button>
      </div>
    </div>
  );
}

function CommentSection({ postId, user }) {
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    getComments(postId).then(r => setComments(r.data.comments || []));
  }, [postId]);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const r = await addComment(postId, text.trim());
      setComments(prev => [...prev, r.data.comment]);
      setText('');
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const remove = async (commentId) => {
    if (!window.confirm('Delete comment?')) return;
    await deleteComment(commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  return (
    <div className="comment-section-anim" style={{
      marginTop: 14, borderTop: '1px solid var(--border)',
      paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10
    }}>
      {comments.map((c, i) => (
        <div key={c.id} className="comment-item-anim"
          style={{ display: 'flex', gap: 9, alignItems: 'flex-start', animationDelay: `${i * 50}ms` }}>
          <Avatar src={c.author_avatar} name={c.author_name} size={34} />
          <div style={{
            background: 'var(--surface2)', borderRadius: 14, padding: '9px 14px',
            flex: 1, border: '1.5px solid var(--border)', transition: 'border-color .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-h)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {c.author_name}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 7, fontSize: 11 }}>{timeAgo(c.created_at)}</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-soft)', fontWeight: 400 }}>{c.content}</p>
          </div>
          {(c.user_id === user?.id || user?.role === 'super_admin') && (
            <button onClick={() => remove(c.id)}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'pointer',
                padding: '4px 8px', fontSize: 13, borderRadius: 8, transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#F4845F'; e.currentTarget.style.color = '#F4845F'; e.currentTarget.style.transform = 'rotate(90deg)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.transform = 'rotate(0deg)'; }}
            >✕</button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
        <Avatar src={user?.avatar} name={user?.name} size={34} />
        <input
          placeholder="Write a comment…" value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{
            flex: 1, border: '1.5px solid var(--border)', borderRadius: 22,
            padding: '9px 16px', fontSize: 14, outline: 'none',
            fontFamily: "'DM Sans', sans-serif", background: 'var(--surface2)',
            color: 'var(--text)', transition: 'border-color .2s, box-shadow .2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--mint)'; e.target.style.boxShadow = '0 0 0 3px rgba(61,191,160,0.12)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
        />
        <button onClick={submit} disabled={loading || !text.trim()}
          style={{
            background: 'var(--mint)', color: 'white', border: 'none', borderRadius: 10,
            padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: (loading || !text.trim()) ? .5 : 1, transition: 'all .2s',
            fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 12px rgba(61,191,160,0.25)',
          }}
          onMouseEnter={e => { if (!loading && text.trim()) { e.currentTarget.style.transform = 'translateY(-2px)'; }}}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >Send</button>
      </div>
    </div>
  );
}

function EditPostBox({ post, onSaved, onCancel }) {
  const [content, setContent] = useState(post.content || '');
  const [saving, setSaving]   = useState(false);

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try { await editPost(post.id, content.trim()); onSaved(content.trim()); }
    catch (e) { alert(e.response?.data?.message || 'Could not save edit'); }
    finally { setSaving(false); }
  };

  return (
    <div className="edit-box-anim" style={{ marginBottom: 14 }}>
      <textarea value={content} onChange={e => setContent(e.target.value)}
        rows={3} autoFocus
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1.5px solid var(--mint)', borderRadius: 12,
          padding: '10px 14px', fontSize: 14, resize: 'vertical',
          background: 'var(--surface2)', outline: 'none',
          fontFamily: "'DM Sans', sans-serif", color: 'var(--text)',
          boxShadow: '0 0 0 3px rgba(61,191,160,0.15)',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel}
          style={{
            background: 'var(--surface2)', border: '1.5px solid var(--border)',
            borderRadius: 10, padding: '7px 18px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', color: 'var(--text-soft)', fontFamily: "'DM Sans', sans-serif", transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--mint)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >Cancel</button>
        <button onClick={save} disabled={saving || !content.trim()}
          style={{
            background: 'var(--mint)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '7px 18px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', opacity: (saving || !content.trim()) ? .5 : 1,
            fontFamily: "'DM Sans', sans-serif", transition: 'all .2s',
            boxShadow: '0 4px 12px rgba(61,191,160,0.28)',
          }}
          onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-1px)'; }}}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {saving ? <span className="posting-spinner">⟳</span> : 'Save'}
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, user, onDeleted, index = 0 }) {
  const [showComments,      setShowComments]      = useState(false);
  const [showReactions,     setShowReactions]     = useState(false);
  const [showWhoReacted,    setShowWhoReacted]    = useState(false);
  const [myReaction,        setMyReaction]        = useState(post.my_reaction);
  const [reactionCount,     setReactionCount]     = useState(parseInt(post.reaction_count) || 0);
  const [reactionBreakdown, setReactionBreakdown] = useState([]);
  const [reactionUsers,     setReactionUsers]     = useState([]);
  const [shareLoading,      setShareLoading]      = useState(false);
  const [isEditing,         setIsEditing]         = useState(false);
  const [postContent,       setPostContent]       = useState(post.content || '');
  const [reactBounce,       setReactBounce]       = useState(false);
  const [showReportModal,   setShowReportModal]   = useState(false);
  const [showReports,       setShowReports]       = useState(false);

  const isGlobal = post.university_id === null;
  const userId   = user?.id ?? user?.user_id ?? user?._id;
  const isAuthor = userId != null && (
    String(post.user_id)   === String(userId) ||
    String(post.author_id) === String(userId)
  );
  const canViewReports = isAuthor || ['super_admin', 'varsity_admin'].includes(user?.role);

  useEffect(() => {
    getReactions(post.id)
      .then(r => {
        const reactions = r.data.reactions || [];
        setReactionBreakdown(reactions);
        setReactionUsers(r.data.users || []);
        setReactionCount(reactions.reduce((s, r) => s + Number(r.count), 0));
      })
      .catch(() => {});
  }, [post.id]);

  const refreshReactions = () => {
    getReactions(post.id).then(r => {
      const reactions = r.data.reactions || [];
      setReactionBreakdown(reactions);
      setReactionUsers(r.data.users || []);
      setReactionCount(reactions.reduce((s, r) => s + Number(r.count), 0));
    }).catch(() => {});
  };

  const handleReact = async (emojiKey) => {
    setShowReactions(false); setReactBounce(true);
    setTimeout(() => setReactBounce(false), 500);
    const prev = myReaction; const prevCount = reactionCount;
    if (myReaction === emojiKey) { setMyReaction(null); setReactionCount(c => c - 1); }
    else { if (!myReaction) setReactionCount(c => c + 1); setMyReaction(emojiKey); }
    try { await reactToPost(post.id, emojiKey); refreshReactions(); }
    catch { setMyReaction(prev); setReactionCount(prevCount); refreshReactions(); }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try { await sharePost(post.id); alert('Post shared!'); }
    catch (e) { alert(e.response?.data?.error || 'Share failed'); }
    finally { setShareLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    await deletePost(post.id);
    onDeleted(post.id);
  };

  const ab = (active, danger = false) => ({
    flex: 1, background: 'none', border: 'none', borderRadius: 10,
    padding: '9px 8px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    color: danger && active ? '#F4845F' : active ? 'var(--mint)' : 'var(--text-soft)',
    transition: 'all .2s', fontFamily: "'DM Sans', sans-serif",
  });

  return (
    <AnimatedCard delay={Math.min(index * 60, 300)}>
      <div className="post-card" style={{
        background: 'var(--card-bg)', borderRadius: 18, padding: '18px 20px',
        border: '1.5px solid var(--border)', backdropFilter: 'blur(20px)', boxShadow: 'var(--shadow)',
        transition: 'box-shadow .3s, transform .3s, border-color .3s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--border-h)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
          <Avatar src={post.author_avatar} name={post.author_name} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>
              {post.author_name}
            </strong>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
              <span style={{
                background: 'var(--mint-light)', color: 'var(--mint)',
                padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                textTransform: 'capitalize', border: '1px solid var(--mint)',
              }}>{post.author_role?.replace(/_/g, ' ')}</span>
              {isGlobal && (
                <span style={{
                  background: 'rgba(99,102,241,.15)', color: '#818cf8',
                  padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: '1px solid rgba(99,102,241,.28)',
                }}>🌐 Global</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{timeAgo(post.created_at)}</span>
            </div>
          </div>
          {/* Icon buttons */}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {isAuthor && (
              <button onClick={() => setIsEditing(v => !v)} title="Edit"
                style={{
                  background: isEditing ? 'var(--mint-light)' : 'var(--surface2)',
                  border: `1px solid ${isEditing ? 'var(--mint)' : 'var(--border)'}`,
                  fontSize: 14, cursor: 'pointer', borderRadius: 9,
                  width: 34, height: 34, color: isEditing ? 'var(--mint)' : 'var(--text-muted)',
                  transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => { if (!isEditing) { e.currentTarget.style.borderColor = 'var(--mint)'; e.currentTarget.style.color = 'var(--mint)'; e.currentTarget.style.transform = 'rotate(-8deg) scale(1.1)'; }}}
                onMouseLeave={e => { if (!isEditing) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.transform = 'none'; }}}
              >✏️</button>
            )}
            {(isAuthor || user?.role === 'super_admin') && (
              <button onClick={handleDelete} title="Delete"
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  fontSize: 14, cursor: 'pointer', borderRadius: 9,
                  width: 34, height: 34, color: 'var(--text-muted)', transition: 'all .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#F4845F'; e.currentTarget.style.color = '#F4845F'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.transform = 'none'; }}
              >🗑️</button>
            )}
            {!isAuthor && (
              <button onClick={() => setShowReportModal(true)} title="Report this post"
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  fontSize: 14, cursor: 'pointer', borderRadius: 9,
                  width: 34, height: 34, color: 'var(--text-muted)', transition: 'all .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#F4845F'; e.currentTarget.style.color = '#F4845F'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.transform = 'none'; }}
              >🚩</button>
            )}
          </div>
        </div>

        {/* Body */}
        {isEditing
          ? <EditPostBox post={{ ...post, content: postContent }} onSaved={(c) => { setPostContent(c); setIsEditing(false); }} onCancel={() => setIsEditing(false)} />
          : postContent && (
              <p style={{ fontSize: 15, lineHeight: 1.7, margin: '0 0 14px', color: 'var(--text-soft)', fontWeight: 400, fontFamily: "'DM Sans', sans-serif" }}>
                {postContent}
              </p>
            )
        }

        {/* Media */}
        {post.media_url && (
          <div className="media-fade-in" style={{ marginBottom: 14, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {post.media_type === 'video'
              ? <video src={`${API_BASE}${post.media_url}`} controls style={{ width: '100%', borderRadius: 12 }} />
              : <img src={`${API_BASE}${post.media_url}`} alt="post"
                  style={{ width: '100%', maxHeight: 500, objectFit: 'cover', display: 'block', transition: 'transform .4s ease' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.025)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
            }
          </div>
        )}

        {/* Reaction bar */}
        {reactionCount > 0 && (
          <div onClick={() => setShowWhoReacted(v => !v)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 0', borderTop: '1px solid var(--border)', cursor: 'pointer', userSelect: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              {reactionBreakdown.sort((a, b) => b.count - a.count).map(r => (
                <div key={r.reaction} className="reaction-chip" style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: myReaction === r.reaction ? 'var(--mint-light)' : 'var(--surface2)',
                  border: myReaction === r.reaction ? '1.5px solid var(--mint)' : '1.5px solid var(--border)',
                  borderRadius: 20, padding: '3px 9px', fontSize: 13, transition: 'all .2s',
                }}>
                  <span style={{ fontSize: 15 }}>{REACT_EMO[r.reaction] || '👍'}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-soft)', fontSize: 12 }}>{r.count}</span>
                </div>
              ))}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 3 }}>
                {reactionCount} reaction{reactionCount !== 1 ? 's' : ''} {showWhoReacted ? '▲' : '▼'}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''} · {post.share_count || 0} share{(post.share_count || 0) !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {reactionCount === 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
            {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''} · {post.share_count || 0} share{(post.share_count || 0) !== 1 ? 's' : ''}
          </div>
        )}
        {showWhoReacted && reactionBreakdown.length > 0 && <WhoReacted breakdown={reactionBreakdown} users={reactionUsers} />}

        {/* Action row */}
        <div style={{ display: 'flex', gap: 2, padding: '6px 0', borderTop: '1px solid var(--border)', marginTop: 4, position: 'relative' }}>
          {/* Like */}
          <div style={{ flex: 1, position: 'relative' }}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}>
            <button style={ab(!!myReaction)} className={reactBounce ? 'react-bounce' : ''}
              onClick={() => handleReact(myReaction || 'like')}
              onMouseEnter={e => { if (!myReaction) e.currentTarget.style.color = 'var(--mint)'; }}
              onMouseLeave={e => { if (!myReaction) e.currentTarget.style.color = 'var(--text-soft)'; }}
            >
              {myReaction ? REACT_EMO[myReaction] : '👍'} {myReaction ? myReaction.charAt(0).toUpperCase() + myReaction.slice(1) : 'Like'}
            </button>
            {showReactions && (
              <div className="reaction-picker-anim" style={{
                position: 'absolute', bottom: 46, left: 0,
                background: 'var(--card-bg)', border: '1.5px solid var(--border)',
                borderRadius: 30, padding: '8px 12px', display: 'flex', gap: 4,
                zIndex: 100, boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(20px)',
              }}>
                {REACTIONS.map((e, i) => (
                  <button key={e} onClick={() => handleReact(REACT_MAP[e])} className="emoji-btn"
                    style={{
                      background: myReaction === REACT_MAP[e] ? 'var(--mint-light)' : 'none',
                      border: 'none', fontSize: 22, cursor: 'pointer', padding: 4, borderRadius: '50%',
                      transform: myReaction === REACT_MAP[e] ? 'scale(1.3)' : 'scale(1)',
                      transition: 'transform .15s', animationDelay: `${i * 30}ms`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.45) translateY(-5px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >{e}</button>
                ))}
              </div>
            )}
          </div>

          {/* Comment */}
          <button style={ab(showComments)} onClick={() => setShowComments(v => !v)}
            onMouseEnter={e => { if (!showComments) e.currentTarget.style.color = 'var(--mint)'; }}
            onMouseLeave={e => { if (!showComments) e.currentTarget.style.color = 'var(--text-soft)'; }}
          >💬 Comment</button>

          {/* Share */}
          <button style={ab(false)} onClick={handleShare} disabled={shareLoading}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--mint)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-soft)'}
          >{shareLoading ? <span className="posting-spinner">⟳</span> : '🔗'} Share</button>

          {/* Reports (author + admins only) */}
          {canViewReports && (
            <button style={ab(showReports, true)} onClick={() => setShowReports(v => !v)}
              onMouseEnter={e => e.currentTarget.style.color = '#F4845F'}
              onMouseLeave={e => e.currentTarget.style.color = showReports ? '#F4845F' : 'var(--text-soft)'}
            >🚩 Reports</button>
          )}
        </div>

        {showReports && canViewReports && <WhoReportedPanel postId={post.id} />}
        {showComments && <CommentSection postId={post.id} user={user} />}
      </div>

      {showReportModal && <ReportModal postId={post.id} onClose={() => setShowReportModal(false)} />}
    </AnimatedCard>
  );
}

function SearchBar({ onResults, onClear }) {
  const [q, setQ]                 = useState('');
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (value) => {
    const trimmed = value.trim();
    if (!trimmed) { onClear(); return; }
    setSearching(true);
    try { const r = await searchPosts(trimmed); onResults(r.data || []); }
    catch (e) { console.error(e); }
    finally { setSearching(false); }
  }, [onResults, onClear]);

  const handleChange = (e) => {
    const val = e.target.value; setQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 400);
  };

  return (
    <div className={`search-bar${searching ? ' search-bar--active' : ''}`} style={{
      background: 'var(--card-bg)', borderRadius: 18, padding: '14px 18px',
      border: '1.5px solid var(--border)', backdropFilter: 'blur(20px)', boxShadow: 'var(--shadow)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span className={`search-icon${searching ? ' search-icon--spin' : ''}`} style={{ fontSize: 18, flexShrink: 0 }}>🔍</span>
      <input placeholder="Search posts by keyword…" value={q} onChange={handleChange}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: 'var(--text)',
        }}
        onFocus={e => { const p = e.target.closest('.search-bar'); p.style.borderColor = 'var(--mint)'; p.style.boxShadow = '0 0 0 3px rgba(61,191,160,0.12)'; }}
        onBlur={e => { const p = e.target.closest('.search-bar'); p.style.borderColor = 'var(--border)'; p.style.boxShadow = 'var(--shadow)'; }}
      />
      {searching && <LoadingDots label="Searching" />}
      {q && !searching && (
        <button onClick={() => { setQ(''); clearTimeout(debounceRef.current); onClear(); }}
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '4px 10px', fontSize: 12,
            cursor: 'pointer', color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif", transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#F4845F'; e.currentTarget.style.color = '#F4845F'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >✕ Clear</button>
      )}
    </div>
  );
}

export default function Feed() {
  const [posts, setPosts]                 = useState([]);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(true);
  const [loading, setLoading]             = useState(false);
  const [user, setUser]                   = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const isSearching = searchResults !== null;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const loadPosts = useCallback(async (pageNum = 1, replace = false) => {
    setLoading(true);
    try {
      const r = await getFeed(pageNum);
      const newPosts = r.data.posts || [];
      setPosts(prev => replace ? newPosts : [...prev, ...newPosts]);
      setHasMore(newPosts.length === 20);
      setPage(pageNum);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPosts(1, true); }, [loadPosts]);

  const handleDeleted = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    if (isSearching) setSearchResults(prev => prev.filter(p => p.id !== id));
  };

  const displayedPosts = isSearching ? searchResults : posts;

  return (
    <>
      <style>{feedStyles}</style>
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 200,
        background: 'var(--card-bg)', border: '1.5px solid var(--border)',
        borderRadius: 12, padding: '6px 10px',
        backdropFilter: 'blur(20px)', boxShadow: 'var(--shadow-lg)',
      }}>
        <ThemeToggle />
      </div>
      <div className="feed-container">
        <div className="feed-inner">
          {user && (
            <div className="create-box-entrance">
              <CreatePostBox user={user} onPostCreated={() => { setSearchResults(null); loadPosts(1, true); }} />
            </div>
          )}
          <SearchBar onResults={r => setSearchResults(r)} onClear={() => setSearchResults(null)} />
          {isSearching && (
            <div className="search-label-anim" style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif", paddingLeft: 4 }}>
              {searchResults.length === 0 ? 'No posts found.' : `Found ${searchResults.length} post${searchResults.length !== 1 ? 's' : ''}`}
            </div>
          )}
          {displayedPosts.map((post, i) => (
            <PostCard key={post.id} post={post} user={user} onDeleted={handleDeleted} index={i} />
          ))}
          {loading && <div style={{ textAlign: 'center', padding: 28 }}><LoadingDots label="Loading posts" /></div>}
          {!isSearching && !loading && hasMore && (
            <button onClick={() => loadPosts(page + 1)} className="load-more-btn">Load more ↓</button>
          )}
          {!loading && displayedPosts.length === 0 && !isSearching && (
            <div className="empty-state-anim" style={{
              textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 15,
              fontFamily: "'DM Sans', sans-serif", background: 'var(--card-bg)', borderRadius: 18,
              border: '1.5px solid var(--border)', backdropFilter: 'blur(20px)', boxShadow: 'var(--shadow)',
            }}>No posts yet. Be the first to share something! ✨</div>
          )}
        </div>
      </div>
    </>
  );
}

const feedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

  @keyframes fadeSlideUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes popUp  { 0%{opacity:0;transform:scale(.72) translateY(10px)} 70%{transform:scale(1.06) translateY(-2px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes popIn  { 0%{opacity:0;transform:scale(.5)} 70%{transform:scale(1.18)} 100%{opacity:1;transform:scale(1)} }
  @keyframes bouncePulse { 0%,100%{transform:scale(1)} 25%{transform:scale(1.38)} 55%{transform:scale(.88)} 75%{transform:scale(1.12)} }
  @keyframes commentBounceIn { 0%{opacity:0;transform:translateX(-18px) scale(.94)} 60%{transform:translateX(4px) scale(1.02)} 100%{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes dotPulse { 0%,80%,100%{opacity:.2;transform:scale(.75)} 40%{opacity:1;transform:scale(1.25)} }
  @keyframes spinCW   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes avatarRingPulse { 0%{box-shadow:0 0 0 0 rgba(61,191,160,.55)} 70%{box-shadow:0 0 0 8px rgba(61,191,160,0)} 100%{box-shadow:0 0 0 0 rgba(61,191,160,0)} }
  @keyframes createEntrance { 0%{opacity:0;transform:translateY(-18px) scale(.97)} 100%{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes emptyFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes modalSlideUp { from{opacity:0;transform:scale(.93) translateY(24px)} to{opacity:1;transform:scale(1) translateY(0)} }

  .animated-card { opacity:0; transform:translateY(28px); transition:opacity .45s ease, transform .45s cubic-bezier(.22,.68,0,1.2); will-change:opacity,transform; }
  .animated-card--visible { opacity:1; transform:translateY(0); }
  .create-box-entrance { animation:createEntrance .52s cubic-bezier(.22,.68,0,1.2) both; }
  .post-card { will-change:transform,box-shadow; }
  .reaction-picker-anim { animation:popUp 1.2s cubic-bezier(.22,.68,0,1.35) both; transform-origin:bottom left; }
  .emoji-btn { animation:popIn .28s cubic-bezier(.22,.68,0,1.4) both; display:inline-flex; align-items:center; justify-content:center; }
  .react-bounce         { animation:bouncePulse 1.5s ease; }
  .comment-section-anim { animation:fadeSlideDown .28s ease both; }
  .comment-item-anim    { animation:commentBounceIn .34s cubic-bezier(.22,.68,0,1.2) both; }
  .edit-box-anim        { animation:fadeSlideDown .24s ease both; }
  .who-reacted-anim     { animation:fadeSlideDown .24s ease both; }
  .who-reacted-row      { animation:fadeSlideUp .3s ease both; }
  .media-fade-in        { animation:fadeIn .4s ease both; }
  .preview-fade-in      { animation:popIn .3s ease both; }
  .search-label-anim    { animation:fadeIn .3s ease both; }
  .who-reported-anim    { animation:fadeSlideDown .28s ease both; }
  .report-modal-anim    { animation:modalSlideUp .3s cubic-bezier(.22,.68,0,1.2) both; transform-origin:center bottom; }

  .search-bar { transition:border-color .25s,box-shadow .25s; }
  .search-bar--active { border-color:var(--mint)!important; box-shadow:0 0 0 3px rgba(61,191,160,.13)!important; }
  .search-icon { display:inline-block; transition:transform .3s; }
  .search-icon--spin { animation:spinCW 1s linear infinite; }
  .empty-state-anim { animation:createEntrance .5s ease both, emptyFloat 3.2s ease .8s infinite; }
  .reaction-chip { cursor:pointer; }
  .reaction-chip:hover { transform:translateY(-2px) scale(1.07); }
  .avatar-ring { transition:box-shadow .3s; }
  .avatar-ring:hover { animation:avatarRingPulse .7s ease; }

  .loading-dots-wrap { display:inline-flex; align-items:center; gap:3px; color:var(--text-muted); font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; }
  .loading-label { margin-right:2px; }
  .dot { display:inline-block; font-size:18px; line-height:1; animation:dotPulse 1.4s ease infinite; }
  .dot1{animation-delay:0ms} .dot2{animation-delay:160ms} .dot3{animation-delay:320ms}
  .posting-spinner { display:inline-block; animation:spinCW .7s linear infinite; }

  body.theme-light {
    --mint:#3DBFA0; --mint-light:#E8F5F0; --mint-mid:#5ECDB3; --mint-dark:#2A9E83;
    --text:#2A3B35; --text-soft:#6B7F78; --text-muted:#9DB5AE;
    --border:#DCE9E5; --border-h:#A8D4CB;
    --card-bg:rgba(255,255,255,0.92); --surface2:#F7F9F8;
    --shadow:0 4px 20px rgba(61,191,160,.10); --shadow-lg:0 8px 36px rgba(61,191,160,.18);
  }
  body.theme-dark {
    --mint:#3DBFA0; --mint-light:rgba(61,191,160,.15); --mint-mid:#5ECDB3; --mint-dark:#2A9E83;
    --text:#dde4ee; --text-soft:#8fa0b5; --text-muted:#5e738a;
    --border:rgba(196,178,140,.12); --border-h:rgba(196,178,140,.28);
    --card-bg:rgba(22,32,48,.95); --surface2:#1d2c3f;
    --shadow:0 4px 20px rgba(0,0,0,.25); --shadow-lg:0 8px 36px rgba(0,0,0,.40);
  }

  .bg-canvas { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; transition:opacity .3s; }
  body.theme-light .bg-canvas::before { content:''; position:absolute; inset:0; background:#f0ebe3; }
  body.theme-light .bg-canvas::after  { content:''; position:absolute; top:0; right:0; width:55%; height:55%; background:#c9a8b2; clip-path:polygon(45% 0%,100% 0%,100% 100%,0% 100%); }
  body.theme-light .bg-bottom-accent  { background:#ddb8c0; }
  body.theme-dark  .bg-canvas::before { content:''; position:absolute; inset:0; background:#0a1520; }
  body.theme-dark  .bg-canvas::after  { content:''; position:absolute; top:0; right:0; width:55%; height:55%; background:#0f2535; clip-path:polygon(45% 0%,100% 0%,100% 100%,0% 100%); }
  body.theme-dark  .bg-bottom-accent  { background:#0d1e30; }
  .bg-bottom-accent { position:absolute; bottom:0; left:0; width:40%; height:35%; clip-path:polygon(0% 0%,100% 100%,0% 100%); }
  .bg-noise { position:absolute; inset:0; opacity:.035; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); background-size:200px 200px; }

  .feed-container { min-height:100vh; padding:28px 16px; font-family:'DM Sans',sans-serif; position:relative; z-index:1; }
  .feed-inner { max-width:640px; margin:0 auto; display:flex; flex-direction:column; gap:14px; }
  .load-more-btn {
    background:var(--card-bg); border:1.5px solid var(--border); border-radius:12px; padding:13px;
    font-size:14px; font-weight:600; color:var(--mint); cursor:pointer; backdrop-filter:blur(20px);
    transition:all .25s; font-family:'DM Sans',sans-serif; box-shadow:var(--shadow); width:100%; letter-spacing:.3px;
  }
  .load-more-btn:hover { border-color:var(--mint); background:var(--mint-light); transform:translateY(-3px); box-shadow:var(--shadow-lg); letter-spacing:.8px; }
  @media (max-width:680px) { .feed-container { padding:16px 10px; } }
`;
