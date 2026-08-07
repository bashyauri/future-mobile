import { storage } from "@/lib/storage";
import axios from "axios";
import { Alert, Platform } from "react-native";

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
    console.log(">>> Request interceptor - token:", token);
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

    // Network error handling
    if (!error.response) {
      let errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";

      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (error.message?.includes("Network Error")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }

      // Show alert for network errors
      if (Platform.OS !== "web") {
        Alert.alert(
          "Connection Error",
          errorMessage,
          [
            { text: "OK", style: "default" },
          ],
          { cancelable: false }
        );
      }
    }

    return Promise.reject(error);
  },
);

export default api;
