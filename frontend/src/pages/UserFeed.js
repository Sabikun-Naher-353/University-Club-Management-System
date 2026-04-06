// pages/UserFeed.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { reactToPost, getReactions, getComments, addComment, deleteComment, sharePost } from '../services/api';
import API from '../services/api';

const API_BASE  = 'http://localhost:5000';
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const REACT_MAP = { '👍': 'like', '❤️': 'love', '😂': 'haha', '😮': 'wow', '😢': 'sad', '😡': 'angry' };
const REACT_EMO = Object.fromEntries(Object.entries(REACT_MAP).map(([e, k]) => [k, e]));

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Avatar({ src, name, size = 42 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#6366f1,#a855f7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff', overflow: 'hidden',
    }}>
      {src
        ? <img src={`${API_BASE}${src}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  );
}

function CommentSection({ postId, viewer }) {
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    getComments(postId)
      .then(r => setComments(r.data.comments || []))
      .catch(e => console.error('Load comments error:', e));
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

  const remove = async (commentId, commentUserId) => {
    if (commentUserId !== viewer?.id && viewer?.role !== 'super_admin') return;
    if (!window.confirm('Delete comment?')) return;
    await deleteComment(commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  return (
    <div style={{ 
      marginTop: 12, borderTop: '1px solid var(--border)', 
      paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 
    }}>
      {comments.map(c => (
        <div key={c.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <Avatar src={c.author_avatar} name={c.author_name} size={34} />
          <div style={{ 
            background: 'var(--surface2)', borderRadius: 12, padding: '8px 12px', 
            flex: 1, border: '1px solid var(--border)' 
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
              {c.author_name}
              <span style={{ fontWeight: 300, color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>
                {timeAgo(c.created_at)}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-soft)', fontWeight: 300 }}>
              {c.content}
            </p>
          </div>
          {(c.user_id === viewer?.id || viewer?.role === 'super_admin') && (
            <button onClick={() => remove(c.id, c.user_id)} className="delete-btn">✕</button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
        <Avatar src={viewer?.avatar} name={viewer?.name} size={34} />
        <input
          placeholder="Write a comment…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="comment-input"
        />
        <button onClick={submit} disabled={loading || !text.trim()} className="comment-submit-btn">
          Send
        </button>
      </div>
    </div>
  );
}

function WhoReacted({ breakdown, users = [] }) {
  const [activeTab, setActiveTab] = useState('all');
  const tabs       = ['all', ...breakdown.map(r => r.reaction)];
  const totalCount = breakdown.reduce((s, r) => s + Number(r.count), 0);
  const filtered   = activeTab === 'all' ? users : users.filter(u => u.reaction === activeTab);

  return (
    <div style={{ 
      background: 'var(--card-bg)', borderRadius: 10, padding: 12, 
      marginBottom: 8, border: '1px solid var(--border)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? 'var(--mint-light)' : 'transparent',
            color: activeTab === tab ? 'var(--mint)' : 'var(--text-muted)',
            border: `1px solid ${activeTab === tab ? 'var(--mint)' : 'var(--border)'}`,
            borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all .2s',
          }}>
            {tab === 'all' ? `All · ${totalCount}` : `${REACT_EMO[tab] || '👍'} ${breakdown.find(r => r.reaction === tab)?.count || 0}`}
          </button>
        ))}
      </div>
      {filtered.map((u, i) => (
        <div key={`${u.id}-${i}`} style={{ 
          display: 'flex', alignItems: 'center', gap: 10, 
          padding: '8px 4px', borderBottom: '1px solid var(--border)' 
        }}>
          <Avatar src={u.avatar} name={u.name} size={36} />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', flex: 1 }}>{u.name}</span>
          <span style={{ fontSize: 20 }}>{REACT_EMO[u.reaction] || '👍'}</span>
        </div>
      ))}
      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, margin: '8px 0' }}>
          No reactions yet.
        </p>
      )}
    </div>
  );
}

function PostCard({ post, viewer }) {
  const [showComments,      setShowComments]      = useState(false);
  const [showReactions,     setShowReactions]     = useState(false);
  const [showWhoReacted,    setShowWhoReacted]    = useState(false);
  const [myReaction,        setMyReaction]        = useState(post.my_reaction);
  const [reactionCount,     setReactionCount]     = useState(parseInt(post.reaction_count) || 0);
  const [reactionBreakdown, setReactionBreakdown] = useState([]);
  const [reactionUsers,     setReactionUsers]     = useState([]);
  const [shareLoading,      setShareLoading]      = useState(false);

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
    getReactions(post.id)
      .then(r => {
        const reactions = r.data.reactions || [];
        setReactionBreakdown(reactions);
        setReactionUsers(r.data.users || []);
        setReactionCount(reactions.reduce((s, r) => s + Number(r.count), 0));
      })
      .catch(() => {});
  };

  const handleReact = async (emojiKey) => {
    setShowReactions(false);
    const prev = myReaction, prevCount = reactionCount;
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

  return (
    <div className="post-card">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Avatar src={post.author_avatar} name={post.author_name} size={44} />
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>{post.author_name}</strong>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <span className="role-badge">
              {post.author_role?.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(post.created_at)}</span>
          </div>
        </div>
        {viewer?.role === 'super_admin' && (
          <span className="admin-badge">👁 Admin</span>
        )}
      </div>

      {/*Content*/}
      {post.content && (
        <p style={{ 
          fontSize: 15, lineHeight: 1.7, margin: '0 0 14px', 
          color: 'var(--text-soft)', fontWeight: 300 
        }}>{post.content}</p>
      )}

      {/*Media*/}
      {post.media_url && (
        <div style={{ marginBottom: 14, borderRadius: 10, overflow: 'hidden' }}>
          {post.media_type === 'video'
            ? <video src={`${API_BASE}${post.media_url}`} controls style={{ width: '100%', borderRadius: 10 }} />
            : <img src={`${API_BASE}${post.media_url}`} alt="post" style={{ width: '100%', maxHeight: 500, objectFit: 'cover', display: 'block' }} />
          }
        </div>
      )}

      {/*Reaction bar*/}
      {reactionCount > 0 && (
        <div onClick={() => setShowWhoReacted(v => !v)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 0', borderTop: '1px solid var(--border)',
          cursor: 'pointer', userSelect: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {reactionBreakdown.sort((a, b) => b.count - a.count).map(r => (
              <div key={r.reaction} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: myReaction === r.reaction ? 'var(--mint-light)' : 'var(--surface2)',
                border: `1px solid ${myReaction === r.reaction ? 'var(--mint)' : 'transparent'}`,
                borderRadius: 20, padding: '3px 8px', fontSize: 13,
              }}>
                <span style={{ fontSize: 15 }}>{REACT_EMO[r.reaction] || '👍'}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-soft)' }}>{r.count}</span>
              </div>
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 2 }}>
              {reactionCount} reaction{reactionCount !== 1 ? 's' : ''} {showWhoReacted ? '▲' : '▼'}
            </span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''} · {post.share_count || 0} share{(post.share_count || 0) !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {reactionCount === 0 && (
        <div style={{ 
          display: 'flex', justifyContent: 'flex-end', 
          padding: '6px 0', borderTop: '1px solid var(--border)', 
          fontSize: 13, color: 'var(--text-muted)' 
        }}>
          {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''} · {post.share_count || 0} share{(post.share_count || 0) !== 1 ? 's' : ''}
        </div>
      )}

      {showWhoReacted && reactionBreakdown.length > 0 && (
        <WhoReacted breakdown={reactionBreakdown} users={reactionUsers} />
      )}

      {/*Action buttons*/}
      <div style={{ 
        display: 'flex', gap: 4, padding: '4px 0', 
        borderTop: '1px solid var(--border)', marginTop: 4 
      }}>
        <div style={{ flex: 1, position: 'relative' }}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}>
          <button onClick={() => handleReact(myReaction || 'like')} className={`action-btn ${myReaction ? 'active' : ''}`}>
            {myReaction ? REACT_EMO[myReaction] : '👍'}{' '}
            {myReaction ? myReaction.charAt(0).toUpperCase() + myReaction.slice(1) : 'Like'}
          </button>
          {showReactions && (
            <div className="reactions-popup">
              {REACTIONS.map(e => (
                <button key={e} onClick={() => handleReact(REACT_MAP[e])} className="reaction-btn">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setShowComments(v => !v)} className={`action-btn ${showComments ? 'active' : ''}`}>
          💬 Comment
        </button>

        <button onClick={handleShare} disabled={shareLoading} className="action-btn">
          🔗 Share
        </button>
      </div>

      {showComments && <CommentSection postId={post.id} viewer={viewer} />}
    </div>
  );
}

export default function UserFeed() {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [viewer, setViewer]   = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setViewer(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true); setError(null);
    Promise.all([API.get(`/profile/${userId}`), API.get(`/profile/${userId}/posts`)])
      .then(([profileRes, postsRes]) => {
        setProfileUser(profileRes.data);
        setPosts(postsRes.data.posts || postsRes.data || []);
      })
      .catch(e => {
        if (e.response?.status === 403) navigate(-1);
        else setError(e.response?.data?.message || e.response?.data?.error || 'Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, [userId, navigate]);

  if (loading) return (
    <>
      <style>{userFeedStyles}</style>
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    </>
  );

  if (error) return (
    <>
      <style>{userFeedStyles}</style>
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>
      <div className="error-screen">
        <p className="error-text">⚠️ {error}</p>
        <button onClick={() => navigate(-1)} className="back-btn-error">← Go Back</button>
      </div>
    </>
  );

  if (!profileUser) return null;

  const avatarSrc = profileUser.avatar ? `${API_BASE}${profileUser.avatar}` : null;
  const initials  = profileUser.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isGlobal  = profileUser.role === 'super_admin';

  return (
    <>
      <style>{userFeedStyles}</style>

      {/*GEOMETRIC BACKGROUND*/}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      <div className="user-feed-container">
        <div className="feed-content">

          {/*Back & Theme Toggle*/}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <button onClick={() => navigate(-1)} className="back-btn">
              ← Back
            </button>
            <ThemeToggle />
          </div>

          {/*Profile header*/}
          <div className="profile-header">
            <div className="profile-avatar-large">
              {avatarSrc ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="profile-name">{profileUser.name}</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                <span className="role-badge-large">
                  {profileUser.role?.replace(/_/g, ' ')}
                </span>
                {isGlobal && (
                  <span className="global-badge">🌐 Global</span>
                )}
              </div>
              {profileUser.bio && (
                <p className="profile-bio">{profileUser.bio}</p>
              )}
              <p className="profile-stats">
                {posts.length} post{posts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/*Posts*/}
          {posts.length === 0 ? (
            <div className="empty-posts">
              No posts yet.
            </div>
          ) : (
            posts.map((post, i) => (
              <div key={post.id} style={{ animation: `fadeUp .5s ease ${.1 + i * .04}s both` }}>
                <PostCard post={post} viewer={viewer} />
              </div>
            ))
          )}

        </div>
      </div>
    </>
  );
}

const userFeedStyles = `
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
    --shadow:       0 2px 12px rgba(61,191,160,0.08);
    --shadow-lg:    0 6px 28px rgba(61,191,160,0.14);
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
    --shadow:       0 2px 12px rgba(0,0,0,0.20);
    --shadow-lg:    0 6px 28px rgba(0,0,0,0.35);
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

  @keyframes fadeUp { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
  @keyframes pulse { 0%,100%{opacity:.4;} 50%{opacity:1;} }
  @keyframes spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }

  .user-feed-container {
    min-height: 100vh;
    padding: 24px 16px;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    z-index: 1;
  }

  .feed-content {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /*LOADING & ERROR SCREENS*/
  .loading-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justifyContent: center;
    color: var(--text-muted);
    fontSize: 15;
    fontFamily: 'DM Sans', sans-serif;
    position: relative;
    z-index: 1;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--mint);
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }

  .error-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    z-index: 1;
  }

  .error-text {
    color: #e07070;
    font-weight: 500;
    fontSize: 15;
  }

  .back-btn-error {
    padding: 8px 20px;
    border-radius: 8px;
    background: transparent;
    color: var(--text-soft);
    border: 1px solid var(--border);
    cursor: pointer;
    fontSize: 14;
    transition: all .2s;
  }

  .back-btn-error:hover {
    border-color: var(--mint);
    color: var(--mint);
  }

  /*BUTTONS*/
  .back-btn {
    align-self: flex-start;
    background: transparent;
    color: var(--mint);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 16px;
    fontSize: 13;
    font-weight: 500;
    cursor: pointer;
    transition: border-color .2s;
    animation: fadeUp .4s ease both;
    font-family: 'DM Sans', sans-serif;
  }

  .back-btn:hover {
    border-color: var(--mint);
  }

  /*PROFILE HEADER*/
  .profile-header {
    background: var(--card-bg);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid var(--border);
    display: flex;
    gap: 18px;
    align-items: center;
    animation: fadeUp .5s ease .05s both;
    backdrop-filter: blur(20px);
    box-shadow: var(--shadow);
  }

  .profile-avatar-large {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    overflow: hidden;
    border: 3px solid var(--border);
    flex-shrink: 0;
  }

  .profile-name {
    font-family: 'DM Serif Display', serif;
    font-size: 1.4rem;
    font-weight: 500;
    margin: 0 0 6px;
    color: var(--text);
    letter-spacing: -.02em;
  }

  .role-badge-large {
    background: var(--mint-light);
    color: var(--mint);
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    text-transform: capitalize;
    letter-spacing: .03em;
    border: 1px solid var(--mint);
  }

  .global-badge {
    background: rgba(99,102,241,.18);
    color: #818cf8;
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid rgba(99,102,241,.3);
  }

  .profile-bio {
    font-size: 14px;
    color: var(--text-soft);
    margin: 4px 0 0;
    line-height: 1.6;
    font-weight: 300;
  }

  .profile-stats {
    font-size: 13px;
    color: var(--text-muted);
    margin: 6px 0 0;
  }

  /*EMPTY POSTS*/
  .empty-posts {
    text-align: center;
    padding: 40px;
    color: var(--text-muted);
    background: var(--card-bg);
    border-radius: 12px;
    border: 1px solid var(--border);
    font-size: 14px;
    backdrop-filter: blur(20px);
  }

  /*POST CARD*/
  .post-card {
    background: var(--card-bg);
    border-radius: 14px;
    padding: 18px;
    border: 1px solid var(--border);
    transition: all .2s;
    backdrop-filter: blur(20px);
    box-shadow: var(--shadow);
  }

  .post-card:hover {
    box-shadow: var(--shadow-lg);
  }

  .role-badge {
    background: var(--mint-light);
    color: var(--mint);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
    border: 1px solid var(--mint);
  }

  .admin-badge {
    font-size: 11px;
    color: var(--text-muted);
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  /*ACTION BUTTONS*/
  .action-btn {
    width: 100%;
    background: none;
    border: none;
    border-radius: 8px;
    padding: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-muted);
    transition: color .2s;
    font-family: 'DM Sans', sans-serif;
  }

  .action-btn:hover {
    color: var(--text-soft);
  }

  .action-btn.active {
    color: var(--mint);
  }

  /*REACTIONS POPUP*/
  .reactions-popup {
    position: absolute;
    bottom: 44px;
    left: 0;
    background: var(--card-bg);
    border: 1px solid var(--border-h);
    border-radius: 30px;
    padding: 6px 10px;
    display: flex;
    gap: 4px;
    z-index: 100;
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(20px);
  }

  .reaction-btn {
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    transition: transform .15s;
  }

  .reaction-btn:hover {
    transform: scale(1.3);
  }

  /*COMMENTS*/
  .delete-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px 6px;
    font-size: 14px;
    transition: color .2s;
  }

  .delete-btn:hover {
    color: #e07070;
  }

  .comment-input {
    flex: 1;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 22px;
    padding: 8px 14px;
    font-size: 14px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color .2s;
  }

  .comment-input:focus {
    border-color: var(--mint);
  }

  .comment-input::placeholder {
    color: var(--text-muted);
  }

  .comment-submit-btn {
    background: var(--mint);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all .2s;
  }

  .comment-submit-btn:hover:not(:disabled) {
    background: var(--mint-dark);
    transform: translateY(-1px);
  }

  .comment-submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;