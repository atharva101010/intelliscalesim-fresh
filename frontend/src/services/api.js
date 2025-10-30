import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get token - FIXED VERSION
const getToken = () => {
  try {
    const authStorage = localStorage.getItem('intelliscalesim-auth');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      // Zustand persist stores in state property
      const token = parsed?.state?.token;
      console.log('📌 Token from storage:', token ? token.substring(0, 30) + '...' : 'NO TOKEN');
      return token || null;
    }
  } catch (error) {
    console.error('❌ Error getting token:', error);
  }
  console.warn('⚠️ No auth storage found');
  return null;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token added to request:', config.url);
    } else {
      console.error('❌ NO TOKEN for request:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - FIXED: Don't logout on first 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url;
    console.error('❌ Request failed:', url, error.response?.status);
    
    if (error.response?.status === 401 && !url?.includes('/login')) {
      console.error('❌ 401 Unauthorized - clearing auth');
      localStorage.removeItem('intelliscalesim-auth');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
};

// Container APIs
export const containerAPI = {
  deploy: (data) => api.post('/api/containers/deploy', data),
  list: () => api.get('/api/containers/'),
  get: (id) => api.get(`/api/containers/${id}`),
  start: (id) => api.post(`/api/containers/${id}/start`),
  stop: (id) => api.post(`/api/containers/${id}/stop`),
  restart: (id) => api.post(`/api/containers/${id}/restart`),
  delete: (id) => api.delete(`/api/containers/${id}`),
  metrics: (id) => api.get(`/api/containers/${id}/metrics`),
  logs: (id) => api.get(`/api/containers/${id}/logs`),
};

// Load Test APIs
export const loadTestAPI = {
  run: (data) => api.post('/api/load-tests/run', data),
  list: () => api.get('/api/load-tests/'),
  get: (id) => api.get(`/api/load-tests/${id}`),
};

// Scaling APIs
export const scalingAPI = {
  createPolicy: (data) => api.post('/api/scaling/policies', data),
  listPolicies: () => api.get('/api/scaling/policies'),
  getPolicy: (id) => api.get(`/api/scaling/policies/${id}`),
  updatePolicy: (id, data) => api.put(`/api/scaling/policies/${id}`, data),
  deletePolicy: (id) => api.delete(`/api/scaling/policies/${id}`),
  listEvents: () => api.get('/api/scaling/events'),
};

// Billing APIs
export const billingAPI = {
  getPricing: () => api.get('/api/billing/pricing'),
  getProviderPricing: (provider) => api.get(`/api/billing/pricing/${provider}`),
  calculate: (data) => api.post('/api/billing/calculate', data),
  compare: (data) => api.post('/api/billing/compare', data),
};

export default api;
