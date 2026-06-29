import axios from 'axios';
import { storage } from '@/lib/storage';

const API_BASE_URL = __DEV__
  ? 'https://future-academy.test/api/v1'
  : 'https://futureacademy-rm.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;