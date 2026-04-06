import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

const API = "http://localhost:5000/api";
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

export default function ClubFeed() {
  const { clubId } = useParams();
  const navigate   = useNavigate();

  const [user,     setUser]     = useState(null);
  const [club,     setClub]     = useState(null);
  const [posts,    setPosts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showReactions, setShowReactions] = useState({});

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { navigate("/login"); return; }
    setUser(JSON.parse(raw));
  }, [navigate]);

  const loadClub = useCallback(async () => {
    if (!clubId) return;
    try {
      const r = await fetch(`${API}/student/clubs/${clubId}`);
      const d = await r.json();
      if (r.ok) setClub(d);
    } catch {}
  }, [clubId]);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/club/feed/${clubId}?user_id=${user.id}`);
      const d = await r.json();
      if (r.ok) setPosts(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  }, [user, clubId]);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

  useEffect(() => {
    if (user) { loadFeed(); }
  }, [user, loadFeed]);

  const loadComments = async (postId) => {
    try {
      const r = await fetch(`${API}/feed/comments/${postId}`);
      const d = await r.json();
      if (r.ok) setComments(c => ({ ...c, [postId]: d }));
    } catch {}
  };

  const react = async (postId, reaction) => {
    try {
      await fetch(`${API}/feed/react`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, post_id: postId, reaction }),
      });
      setShowReactions(s => ({ ...s, [postId]: false }));
      loadFeed();
    } catch {}
  };

  const submitComment = async (postId) => {
    const content = newComment[postId]?.trim();
    if (!content) return;
    try {
      await fetch(`${API}/feed/comment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, post_id: postId, content }),
      });
      setNewComment(c => ({ ...c, [postId]: "" }));
      loadComments(postId);
      loadFeed();
    } catch {}
  };

  const share = async (postId) => {
    try {
      await fetch(`${API}/feed/share`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, post_id: postId }),
      });
      loadFeed();
    } catch {}
  };

  if (!user) return null;

  return (
    <>
      <style>{clubFeedStyles}</style>

      {}
      <div className="bg-canvas" aria-hidden="true">
        <div className="bg-bottom-accent" />
        <div className="bg-noise" />
      </div>

      <div className="club-feed-container">

        {}
        <div className="topbar">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>
          <div className="topbar-divider" />
          <div className="topbar-title">
            {club?.name || "Club"} <em className="topbar-subtitle">· Notices</em>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
          </div>
        </div>

        <div className="feed-inner">

          {/*CLUB*/}
          {club && (
            <div className="club-header">
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div className="club-icon">◈</div>
                <div>
                  <div className="club-name">{club.name}</div>
                  {club.description && (
                    <div className="club-desc">{club.description}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/*POSTS*/}
          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <p style={{ fontSize:".88rem", color:"var(--text-muted)", fontWeight:300 }}>No notices posted by this club yet.</p>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post, i) => (
                <div key={post.id} className="post-card" style={{ animationDelay: `${i * .05}s` }}>
                  
                  {/*Post*/}
                  <div className="post-header">
                    <div className="author-avatar">
                      {post.author_name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div className="author-name">{post.author_name}</div>
                      <div className="post-date">{fmt(post.created_at)}</div>
                    </div>
                    <span className="notice-badge">📢 Notice</span>
                  </div>

                  {/*Content*/}
                  {post.content && (
                    <div className="post-content">{post.content}</div>
                  )}

                  {/*Media*/}
                  {post.media_url && post.media_type === "image" && (
                    <img 
                      src={`http://localhost:5000${post.media_url}`} 
                      alt="" 
                      className="post-media"
                    />
                  )}

                  {/*Stats*/}
                  <div className="post-stats">
                    {post.reaction_count > 0 && (
                      <span className="stat-text">
                        {post.reaction_count} reaction{post.reaction_count !== 1 ? "s" : ""}
                      </span>
                    )}
                    {post.comment_count > 0 && (
                      <span className="stat-text" style={{ marginLeft:"auto" }}>
                        {post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/*Actions*/}
                  <div className="post-actions">
                    
                    {/*React*/}
                    <div style={{ position:"relative" }}>
                      <button
                        onClick={() => setShowReactions(s => ({ ...s, [post.id]: !s[post.id] }))}
                        className={`action-btn ${post.my_reaction ? 'active' : ''}`}
                      >
                        {post.my_reaction || "👍"} React
                      </button>
                      {showReactions[post.id] && (
                        <div className="reactions-popup">
                          {REACTIONS.map(r => (
                            <button 
                              key={r} 
                              onClick={() => react(post.id, r)} 
                              className="reaction-btn"
                            >{r}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/*Comment*/}
                    <button
                      onClick={() => {
                        if (!comments[post.id]) loadComments(post.id);
                        else setComments(c => { const n = {...c}; delete n[post.id]; return n; });
                      }}
                      className="action-btn"
                    >💬 Comment</button>

                    {/*Share*/}
                    <button
                      onClick={() => share(post.id)}
                      className="action-btn"
                    >↗ Share</button>
                  </div>

                  {/*Comments*/}
                  {comments[post.id] && (
                    <div className="comments-section">
                      {comments[post.id].map(c => (
                        <div key={c.id} className="comment-row">
                          <div className="comment-avatar">
                            {c.author_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="comment-bubble">
                            <div className="comment-author">{c.author_name}</div>
                            <div className="comment-content">{c.content}</div>
                          </div>
                        </div>
                      ))}
                      {/*New comment*/}
                      <div className="new-comment-row">
                        <input
                          placeholder="Write a comment…"
                          value={newComment[post.id] || ""}
                          onChange={e => setNewComment(c => ({ ...c, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && submitComment(post.id)}
                          className="comment-input"
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          className="comment-submit-btn"
                        >Post</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

//STYLES
const clubFeedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

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
    --card-bg-alt:  rgba(247,249,248,0.95);
    --surface2:     #F7F9F8;
    --topbar-bg:    rgba(244,249,248,0.92);
    --shadow:       0 2px 12px rgba(61,191,160,0.08);
    --shadow-lg:    0 6px 28px rgba(61,191,160,0.14);
    --yellow:       #E8C24A;
    --yellow-bg:    rgba(232,194,74,0.12);
    --yellow-border: rgba(232,194,74,0.25);
  }

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
    --card-bg-alt:  rgba(29,44,63,0.98);
    --surface2:     #1d2c3f;
    --topbar-bg:    rgba(14,24,37,0.92);
    --shadow:       0 2px 12px rgba(0,0,0,0.20);
    --shadow-lg:    0 6px 28px rgba(0,0,0,0.35);
    --yellow:       #f0c060;
    --yellow-bg:    rgba(240,192,96,0.12);
    --yellow-border: rgba(240,192,96,0.25);
  }

  html, body {
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    transition: background .3s, color .3s;
  }

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

  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  .club-feed-container {
    min-height: 100vh;
    position: relative;
    z-index: 1;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--topbar-bg);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    padding: 0 32px;
    height: 56px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 1rem;
    font-family: 'DM Sans', sans-serif;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    transition: color .2s;
  }
  .back-btn:hover {
    color: var(--mint);
  }

  .topbar-divider {
    width: 1px;
    height: 20px;
    background: var(--border);
  }

  .topbar-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1rem;
    font-weight: 500;
    color: var(--text);
  }

  .topbar-subtitle {
    font-style: italic;
    font-weight: 300;
    color: var(--text-soft);
    font-size: .9rem;
  }

  .feed-inner {
    max-width: 680px;
    margin: 0 auto;
    padding: 32px 20px;
  }

  .club-header {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 24px 28px;
    margin-bottom: 28px;
    animation: fadeUp .5s ease both;
    backdrop-filter: blur(20px);
    box-shadow: var(--shadow);
  }

  .club-icon {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: var(--mint-light);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    color: var(--mint);
    flex-shrink: 0;
  }

  .club-name {
    font-family: 'DM Serif Display', serif;
    font-size: 1.3rem;
    font-weight: 500;
    color: var(--text);
  }

  .club-desc {
    font-size: .82rem;
    color: var(--text-muted);
    font-weight: 300;
    margin-top: 3px;
  }

  .loading-container {
    text-align: center;
    padding: 60px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--border);
    border-top-color: var(--mint);
    animation: spin .7s linear infinite;
    margin: 0 auto;
  }

  .empty-state {
    text-align: center;
    padding: 60px 24px;
    background: var(--card-bg);
    border-radius: 14px;
    border: 1px solid var(--border);
    animation: fadeUp .5s ease both;
    backdrop-filter: blur(20px);
    box-shadow: var(--shadow);
  }

  .posts-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .post-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    animation: fadeUp .4s ease both;
    backdrop-filter: blur(20px);
    box-shadow: var(--shadow);
    transition: all .2s;
  }

  .post-card:hover {
    box-shadow: var(--shadow-lg);
  }

  .post-header {
    padding: 18px 20px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .author-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    flex-shrink: 0;
    background: linear-gradient(135deg, var(--mint), var(--mint-dark));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .9rem;
    font-weight: 700;
    color: white;
  }

  .author-name {
    font-size: .88rem;
    font-weight: 500;
    color: var(--text);
  }

  .post-date {
    font-size: .72rem;
    color: var(--text-muted);
    margin-top: 1px;
  }

  .notice-badge {
    font-size: .65rem;
    font-weight: 600;
    color: var(--yellow);
    background: var(--yellow-bg);
    border: 1px solid var(--yellow-border);
    border-radius: 10px;
    padding: 3px 8px;
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .post-content {
    padding: 0 20px 16px;
    font-size: .9rem;
    color: var(--text-soft);
    font-weight: 300;
    line-height: 1.7;
  }

  .post-media {
    width: 100%;
    max-height: 360px;
    object-fit: cover;
    display: block;
  }

  /*POST*/
  .post-stats {
    padding: 10px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .stat-text {
    font-size: .75rem;
    color: var(--text-muted);
  }

  /*POST*/
  .post-actions {
    padding: 8px 20px 12px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
  }

  .action-btn {
    padding: 7px 14px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-muted);
    font-size: .8rem;
    font-family: 'DM Sans', sans-serif;
    transition: all .2s;
  }

  .action-btn:hover {
    border-color: var(--border-h);
    color: var(--text-soft);
  }

  .action-btn.active {
    background: var(--mint-light);
    color: var(--mint);
    border-color: var(--mint);
  }

  /*REACTIONS POPUP*/
  .reactions-popup {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    background: var(--card-bg-alt);
    border: 1px solid var(--border-h);
    border-radius: 10px;
    padding: 8px 10px;
    display: flex;
    gap: 6px;
    z-index: 10;
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(20px);
  }

  .reaction-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.3rem;
    padding: 2px 4px;
    border-radius: 6px;
    transition: transform .15s;
  }

  .reaction-btn:hover {
    transform: scale(1.3);
  }

  /*COMMENTS*/
  .comments-section {
    border-top: 1px solid var(--border);
    background: var(--card-bg-alt);
    padding: 14px 20px;
    backdrop-filter: blur(20px);
  }

  .comment-row {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
  }

  .comment-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    flex-shrink: 0;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .75rem;
    font-weight: 700;
    color: #fff;
  }

  .comment-bubble {
    background: var(--card-bg);
    border-radius: 10px;
    padding: 8px 12px;
    flex: 1;
    border: 1px solid var(--border);
  }

  .comment-author {
    font-size: .75rem;
    font-weight: 500;
    color: var(--mint);
    margin-bottom: 3px;
  }

  .comment-content {
    font-size: .83rem;
    color: var(--text-soft);
    font-weight: 300;
  }

  /*COMMENT*/
  .new-comment-row {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .comment-input {
    flex: 1;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: .83rem;
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
    padding: 8px 16px;
    background: var(--mint);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: .8rem;
    font-weight: 500;
    transition: all .2s;
  }

  .comment-submit-btn:hover {
    background: var(--mint-dark);
    transform: translateY(-1px);
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  @media (max-width: 768px) {
    .topbar {
      padding: 0 16px;
    }
    .feed-inner {
      padding: 24px 16px;
    }
  }
`;