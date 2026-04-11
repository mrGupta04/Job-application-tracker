import axios from 'axios';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const normalizeApiBaseUrl = (value?: string) => {
  if (!value) {
    return '/api';
  }

  const trimmed = value.replace(/\/+$/, '');

  if (trimmed === '/api') {
    return '/api';
  }

  if (trimmed.endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
};

const apiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl);

export const API_BASE_URL = apiBaseUrl;

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
    }

    return Promise.reject(error);
  },
);

export default api;
