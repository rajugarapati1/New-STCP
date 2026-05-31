import axios from 'axios';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api', withCredentials: true });

API.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
API.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; }
  return Promise.reject(err);
});

export const authAPI = {
  register: d => API.post('/auth/register', d),
  login: d => API.post('/auth/login', d),
  me: () => API.get('/auth/me'),
  updateProfile: d => API.put('/auth/profile', d),
  changePassword: d => API.put('/auth/password', d),
};
export const userAPI = { getAll: p => API.get('/users', { params: p }) };
export const projectAPI = {
  getAll: () => API.get('/projects'),
  getById: id => API.get(`/projects/${id}`),
  create: d => API.post('/projects', d),
  update: (id, d) => API.put(`/projects/${id}`, d),
  delete: id => API.delete(`/projects/${id}`),
  addMember: (id, d) => API.post(`/projects/${id}/members`, d),
  removeMember: (id, uid) => API.delete(`/projects/${id}/members/${uid}`),
  getStats: id => API.get(`/projects/${id}/stats`),
};
export const taskAPI = {
  getAll: p => API.get('/tasks', { params: p }),
  getMy: () => API.get('/tasks/my'),
  getBoard: pid => API.get(`/tasks/board/${pid}`),
  getById: id => API.get(`/tasks/${id}`),
  create: d => API.post('/tasks', d),
  update: (id, d) => API.put(`/tasks/${id}`, d),
  delete: id => API.delete(`/tasks/${id}`),
  addComment: (id, d) => API.post(`/tasks/${id}/comments`, d),
  updateChecklist: (id, iid, d) => API.put(`/tasks/${id}/checklist/${iid}`, d),
};
export const teamAPI = {
  getAll: () => API.get('/teams'),
  create: d => API.post('/teams', d),
  addMember: (id, d) => API.post(`/teams/${id}/members`, d),
  delete: id => API.delete(`/teams/${id}`),
};
export const notifAPI = {
  getAll: () => API.get('/notifications'),
  markRead: id => API.put(`/notifications/${id}/read`),
  markAllRead: () => API.put('/notifications/read-all'),
};
export default API;
