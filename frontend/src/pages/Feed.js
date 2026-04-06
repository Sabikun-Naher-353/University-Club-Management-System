// pages/Feed.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ThemeToggle from "../components/ThemeToggle";
import {
  getFeed, createPost, deletePost,
  reactToPost, getReactions,
  getComments, addComment, deleteComment, sharePost,
} from '../services/api';

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
  const s = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg,#6366f1,#a855f7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.35, fontWeight: 700, color: '#fff', overflow: 'hidden',
  };
  return (
    <div style={s}>
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
    <div style={{
      background: 'var(--card-bg)', borderRadius: 10, padding: 12,
      marginBottom: 8, border: '1px solid var(--border)',
      backdropFilter: 'blur(20px)',
    }}>
      {/*Tabs*/}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? 'var(--mint-light)' : 'transparent',
              color: activeTab === tab ? 'var(--mint)' : 'var(--text-muted)',
              border: `1px solid ${activeTab === tab ? 'var(--mint)' : 'var(--border)'}`,
              borderRadius: 20,
              padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all .2s',
            }}>
            {tab === 'all'
              ? `All · ${totalCount}`
              : `${REACT_EMO[tab] || '👍'} ${breakdown.find(r => r.reaction === tab)?.count || 0}`}
          </button>
        ))}
      </div>

      {/*User rows*/}
      {filtered.map((u, i) => (
        <div key={`${u.id}-${i}`} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 4px', borderBottom: '1px solid var(--border)',
        }}>
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

//POST BOX
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
      background: 'var(--card-bg)',
      borderRadius: 18,
      padding: '20px 22px',
      border: '1.5px solid var(--border)',
      backdropFilter: 'blur(20px)',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar src={user?.avatar} name={user?.name} size={42} />
        <textarea
          placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={2}
          style={{
            flex: 1, border: '1.5px solid var(--border)', borderRadius: 14,
            padding: '10px 16px', fontSize: 14, resize: 'none',
            background: 'var(--surface2)', outline: 'none', fontFamily: "'DM Sans', sans-serif",
            color: 'var(--text)',
            transition: 'border-color .2s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--mint)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {preview && (
        <div style={{ margin: '10px 0', position: 'relative' }}>
          {preview.type === 'video'
            ? <video src={preview.url} controls style={{ maxWidth: '100%', borderRadius: 10, maxHeight: 300 }} />
            : <img src={preview.url} alt="preview" style={{ maxWidth: '100%', borderRadius: 10, maxHeight: 300, objectFit: 'cover' }} />
          }
          <button onClick={() => { setMedia(null); setPreview(null); }}
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,.65)', color: '#fff',
              border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer', fontSize: 13,
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ✕
          </button>
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
                padding: '7px 14px', borderRadius: 10,
                fontSize: 13, fontWeight: 500,
                color: 'var(--text-soft)', cursor: 'pointer',
                transition: 'all .2s', fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--mint)'; e.currentTarget.style.color = 'var(--mint)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-soft)'; }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
        <button onClick={handleSubmit} disabled={loading || (!content.trim() && !mediaFile)}
          style={{
            background: 'var(--mint)', color: 'white',
            border: 'none', borderRadius: 10, padding: '9px 24px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            opacity: (loading || (!content.trim() && !mediaFile)) ? .5 : 1,
            transition: 'all .2s',
            boxShadow: '0 4px 14px rgba(61,191,160,0.30)',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'var(--mint-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--mint)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {loading ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}

//COMMENT 
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
    <div style={{
      marginTop: 14, borderTop: '1px solid var(--border)',
      paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10
    }}>
      {comments.map(c => (
        <div key={c.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <Avatar src={c.author_avatar} name={c.author_name} size={34} />
          <div style={{
            background: 'var(--surface2)',
            borderRadius: 14,
            padding: '9px 14px',
            flex: 1,
            border: '1.5px solid var(--border)'
          }}>
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
                padding: '4px 8px', fontSize: 13, borderRadius: 8,
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#F4845F'; e.currentTarget.style.color = '#F4845F'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >✕</button>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
        <Avatar src={user?.avatar} name={user?.name} size={34} />
        <input
          placeholder="Write a comment…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{
            flex: 1, border: '1.5px solid var(--border)', borderRadius: 22,
            padding: '9px 16px', fontSize: 14, outline: 'none',
            fontFamily: "'DM Sans', sans-serif", background: 'var(--surface2)',
            color: 'var(--text)',
            transition: 'border-color .2s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--mint)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button onClick={submit} disabled={loading || !text.trim()}
          style={{
            background: 'var(--mint)', color: 'white',
            border: 'none', borderRadius: 10, padding: '9px 18px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: (loading || !text.trim()) ? .5 : 1,
            transition: 'all .2s',
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 4px 12px rgba(61,191,160,0.25)',
          }}>
          Send
        </button>
      </div>
    </div>
  );
}

//POST CARD
function PostCard({ post, user, onDeleted }) {
  const [showComments,       setShowComments]       = useState(false);
  const [showReactions,      setShowReactions]      = useState(false);
  const [showWhoReacted,     setShowWhoReacted]     = useState(false);
  const [myReaction,         setMyReaction]         = useState(post.my_reaction);
  const [reactionCount,      setReactionCount]      = useState(parseInt(post.reaction_count) || 0);
  const [reactionBreakdown,  setReactionBreakdown]  = useState([]);
  const [reactionUsers,      setReactionUsers]      = useState([]);
  const [shareLoading,       setShareLoading]       = useState(false);
  const isGlobal = post.university_id === null;

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
    const prev      = myReaction;
    const prevCount = reactionCount;
    if (myReaction === emojiKey) {
      setMyReaction(null);
      setReactionCount(c => c - 1);
    } else {
      if (!myReaction) setReactionCount(c => c + 1);
      setMyReaction(emojiKey);
    }
    try {
      await reactToPost(post.id, emojiKey);
      refreshReactions();
    } catch {
      setMyReaction(prev);
      setReactionCount(prevCount);
      refreshReactions();
    }
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

  const actionBtn = (active) => ({
    flex: 1, background: 'none', border: 'none', borderRadius: 10,
    padding: '9px 8px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    color: active ? 'var(--mint)' : 'var(--text-soft)',
    transition: 'all .2s', fontFamily: "'DM Sans', sans-serif",
  });

  return (
    <div style={{
      background: 'var(--card-bg)',
      borderRadius: 18,
      padding: '18px 20px',
      border: '1.5px solid var(--border)',
      backdropFilter: 'blur(20px)',
      boxShadow: 'var(--shadow)',
      transition: 'all .25s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
    >
      {/*Header*/}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
        <Avatar src={post.author_avatar} name={post.author_name} size={44} />
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>
            {post.author_name}
          </strong>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
            <span style={{
              background: 'var(--mint-light)',
              color: 'var(--mint)',
              padding: '2px 9px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'capitalize',
              border: '1px solid var(--mint)',
            }}>
              {post.author_role?.replace(/_/g, ' ')}
            </span>
            {isGlobal && (
              <span style={{
                background: 'rgba(99,102,241,.15)',
                color: '#818cf8',
                padding: '2px 9px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                border: '1px solid rgba(99,102,241,.28)',
              }}>
                🌐 Global
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{timeAgo(post.created_at)}</span>
          </div>
        </div>
        {(post.author_id === user?.id || user?.role === 'super_admin') && (
          <button onClick={handleDelete}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              fontSize: 16, cursor: 'pointer', borderRadius: 10,
              padding: '6px 10px', color: 'var(--text-muted)',
              transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F4845F'; e.currentTarget.style.color = '#F4845F'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >🗑️</button>
        )}
      </div>

      {/*Content*/}
      {post.content && (
        <p style={{
          fontSize: 15,
          lineHeight: 1.7,
          margin: '0 0 14px',
          color: 'var(--text-soft)',
          fontWeight: 400,
          fontFamily: "'DM Sans', sans-serif",
        }}>{post.content}</p>
      )}

      {/*Media*/}
      {post.media_url && (
        <div style={{ marginBottom: 14, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {post.media_type === 'video'
            ? <video src={`${API_BASE}${post.media_url}`} controls style={{ width: '100%', borderRadius: 12 }} />
            : <img src={`${API_BASE}${post.media_url}`} alt="post" style={{ width: '100%', maxHeight: 500, objectFit: 'cover', display: 'block' }} />
          }
        </div>
      )}

      {/*Reaction bar*/}
      {reactionCount > 0 && (
        <div
          onClick={() => setShowWhoReacted(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 0', borderTop: '1px solid var(--border)',
            cursor: 'pointer', userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {reactionBreakdown.sort((a, b) => b.count - a.count).map(r => (
              <div key={r.reaction} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: myReaction === r.reaction ? 'var(--mint-light)' : 'var(--surface2)',
                border: myReaction === r.reaction ? '1.5px solid var(--mint)' : '1.5px solid var(--border)',
                borderRadius: 20, padding: '3px 9px', fontSize: 13,
                transition: 'all .2s',
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
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '7px 0', borderTop: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-muted)'
        }}>
          {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''} · {post.share_count || 0} share{(post.share_count || 0) !== 1 ? 's' : ''}
        </div>
      )}

      {showWhoReacted && reactionBreakdown.length > 0 && (
        <WhoReacted breakdown={reactionBreakdown} users={reactionUsers} />
      )}

      {/*Actions*/}
      <div style={{
        display: 'flex', gap: 4, padding: '6px 0',
        borderTop: '1px solid var(--border)',
        marginTop: 4, position: 'relative'
      }}>
        {/*React button*/}
        <div style={{ flex: 1, position: 'relative' }}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}>
          <button
            style={actionBtn(!!myReaction)}
            onClick={() => handleReact(myReaction || 'like')}
            onMouseEnter={e => { if (!myReaction) e.currentTarget.style.color = 'var(--mint)'; }}
            onMouseLeave={e => { if (!myReaction) e.currentTarget.style.color = 'var(--text-soft)'; }}
          >
            {myReaction ? REACT_EMO[myReaction] : '👍'} {myReaction ? myReaction.charAt(0).toUpperCase() + myReaction.slice(1) : 'Like'}
          </button>
          {showReactions && (
            <div style={{
              position: 'absolute', bottom: 46, left: 0,
              background: 'var(--card-bg)',
              border: '1.5px solid var(--border)',
              borderRadius: 30, padding: '8px 12px',
              display: 'flex', gap: 4, zIndex: 100,
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'blur(20px)',
            }}>
              {REACTIONS.map(e => (
                <button key={e} onClick={() => handleReact(REACT_MAP[e])}
                  style={{
                    background: myReaction === REACT_MAP[e] ? 'var(--mint-light)' : 'none',
                    border: 'none', fontSize: 22, cursor: 'pointer',
                    padding: 4, borderRadius: '50%',
                    transform: myReaction === REACT_MAP[e] ? 'scale(1.3)' : 'scale(1)',
                    transition: 'transform .15s',
                  }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          style={actionBtn(showComments)}
          onClick={() => setShowComments(v => !v)}
          onMouseEnter={e => { if (!showComments) e.currentTarget.style.color = 'var(--mint)'; }}
          onMouseLeave={e => { if (!showComments) e.currentTarget.style.color = 'var(--text-soft)'; }}
        >💬 Comment</button>

        <button
          style={actionBtn(false)}
          onClick={handleShare}
          disabled={shareLoading}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--mint)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-soft)'}
        >🔗 Share</button>
      </div>

      {showComments && <CommentSection postId={post.id} user={user} />}
    </div>
  );
}

//MAIN FEED
export default function Feed() {
  const [posts, setPosts]     = useState([]);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [user, setUser]       = useState(null);

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

  const handleDeleted = (id) => setPosts(prev => prev.filter(p => p.id !== id));

  return (
    <>
      <style>{feedStyles}</style>

      {/*BACKGROUND*/}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      {/*TOGGLE*/}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 200,
        background: 'var(--card-bg)',
        border: '1.5px solid var(--border)',
        borderRadius: 12,
        padding: '6px 10px',
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <ThemeToggle />
      </div>

      <div className="feed-container">
        <div className="feed-inner">

          {user && <CreatePostBox user={user} onPostCreated={() => loadPosts(1, true)} />}

          {posts.map(post => (
            <PostCard key={post.id} post={post} user={user} onDeleted={handleDeleted} />
          ))}

          {loading && (
            <div style={{
              textAlign: 'center', padding: 24,
              color: 'var(--text-muted)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
            }}>Loading posts…</div>
          )}

          {!loading && hasMore && (
            <button onClick={() => loadPosts(page + 1)} className="load-more-btn">
              Load more
            </button>
          )}

          {!loading && posts.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 48,
              color: 'var(--text-muted)', fontSize: 15,
              fontFamily: "'DM Sans', sans-serif",
              background: 'var(--card-bg)',
              borderRadius: 18,
              border: '1.5px solid var(--border)',
              backdropFilter: 'blur(20px)',
              boxShadow: 'var(--shadow)',
            }}>
              No posts yet. Be the first to share something! ✨
            </div>
          )}
        </div>
      </div>
    </>
  );
}

//STYLES
const feedStyles = `
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

  /*Light background layers*/
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

  /*Dark background layers*/
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

  .feed-container {
    min-height: 100vh;
    padding: 28px 16px;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    z-index: 1;
  }

  .feed-inner {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .load-more-btn {
    background: var(--card-bg);
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 13px;
    font-size: 14px;
    font-weight: 600;
    color: var(--mint);
    cursor: pointer;
    backdrop-filter: blur(20px);
    transition: all .2s;
    font-family: 'DM Sans', sans-serif;
    box-shadow: var(--shadow);
    width: 100%;
  }

  .load-more-btn:hover {
    border-color: var(--mint);
    background: var(--mint-light);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  @media (max-width: 680px) {
    .feed-container {
      padding: 16px 10px;
    }
  }
`;