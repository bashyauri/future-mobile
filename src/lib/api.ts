import { storage } from "@/lib/storage";
import axios from "axios";

const API_BASE_URL = __DEV__
  ? "http://future-academy.test/api/v1"
  : "https://futureacademy-rm.com/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 36000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await storage.getItem("auth_token");
    console.log('>>> Request interceptor - token:', token);
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn("Token error", e);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized");
    }
    return Promise.reject(error);
  },
);

export default api;
