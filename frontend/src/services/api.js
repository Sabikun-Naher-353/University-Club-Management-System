// services/api.js
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((config) => {
  let token = localStorage.getItem('token');

  if (!token) {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.token) token = user.token;
    } catch {}
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

//AUTH
export const login    = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);

//PROFILE
export const getMyProfile    = ()     => API.get('/profile/me');
export const updateMyProfile = (form) => API.put('/profile/me', form, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const changePassword  = (data) => API.put('/profile/change-password', data);
export const getUserProfile  = (id)   => API.get(`/profile/${id}`);
export const getVarsityUsers = ()     => API.get('/profile/users');
export const getUserPosts    = (id)   => API.get(`/profile/${id}/posts`);

//POSTS
export const getFeed    = (page = 1) => API.get(`/posts?page=${page}`);
export const createPost = (form)     => API.post('/posts', form, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deletePost = (id)       => API.delete(`/posts/${id}`);

// Reactions
export const reactToPost  = (postId, type) => API.post(`/posts/${postId}/react`, { type });
export const getReactions = (postId)        => API.get(`/posts/${postId}/reactions`);

// Comments
export const getComments   = (postId)          => API.get(`/posts/${postId}/comments`);
export const addComment    = (postId, content) => API.post(`/posts/${postId}/comments`, { content });
export const deleteComment = (commentId)       => API.delete(`/posts/comments/${commentId}`);

// Share
export const sharePost = (postId) => API.post(`/posts/${postId}/share`);
export const reportPost     = (postId, reason) => API.post(`/posts/${postId}/report`, { reason });
export const getPostReports = (postId)         => API.get(`/posts/${postId}/reports`);
export const getNotices   = (page = 1) => API.get(`/notices?page=${page}`);
export const createNotice = (data)     => API.post('/notices', data);
export const deleteNotice = (id)       => API.delete(`/notices/${id}`);

export default API;
