import { storage } from "@/lib/storage";
import axios from "axios";

const API_BASE_URL = __DEV__
  ? "https://futureacademy-rm.com/api/v1"
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

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
    }

    // Network error handling — do NOT show Alert here.
    // The dashboard already renders an offline banner via useNetInfo.
    // Showing Alert.alert for every failed call causes multiple stacked
    // dialogs when parallel requests all fail (e.g. on app load offline).

    return Promise.reject(error);
  },
);

export default api;
