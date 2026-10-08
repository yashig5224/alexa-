import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// In a real app, attach JWT here:
// api.interceptors.request.use(cfg => {
//   const token = localStorage.getItem('tm_token');
//   if (token) cfg.headers!['Authorization'] = `Bearer ${token}`;
//   return cfg;
// });

api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error('[API Error]', err.response?.data ?? err.message);
    return Promise.reject(err);
  }
);

export default api;
