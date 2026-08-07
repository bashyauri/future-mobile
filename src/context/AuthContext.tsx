import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { storage } from "@/lib/storage";
import api from "@/lib/api";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

type User = {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  has_completed_onboarding: boolean;
  account_type?: string;
  has_active_subscription?: boolean;
  on_trial?: boolean;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
  refreshUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: () => {},
  refreshUser: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  const normalizeUser = useCallback(
    (apiUser: Partial<User> | null | undefined): User | null => {
      if (!apiUser) {
        return null;
      }

      return {
        id: apiUser.id ?? 0,
        name: apiUser.name ?? "",
        email: apiUser.email ?? "",
        email_verified_at: apiUser.email_verified_at ?? null,
        has_completed_onboarding: apiUser.has_completed_onboarding ?? false,
        account_type: apiUser.account_type,
        has_active_subscription: apiUser.has_active_subscription,
        on_trial: apiUser.on_trial,
        trial_ends_at: apiUser.trial_ends_at ?? null,
        subscription_ends_at: apiUser.subscription_ends_at ?? null,
      } as User;
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    try {
      const token = await storage.getItem("auth_token");
      if (!token) {
        setUser(null);
        return null;
      }

      const response = await api.get("/user");
      const payload = response.data ?? {};
      const apiUser = payload.user ?? payload;
      const finalUser = normalizeUser(apiUser);

      setUser(finalUser);
      return finalUser;
    } catch (error) {
      console.log("Auth refresh failed:", error);

      setUser((prevUser) => {
        if (!prevUser) {
          storage.deleteItem("auth_token").catch(() => {});
          return null;
        }
        return prevUser;
      });

      throw error;
    }
  }, [normalizeUser]);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        await refreshUser();
      } catch (error) {
        console.log("Initial auth bootstrap failed:", error);
      } finally {
        if (!cancelled) {
          setHasBootstrapped(true);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const router = useRouter();

  const login = async (token: string, userData: User) => {
    await storage.setItem("auth_token", token);
    // Use server-provided onboarding flag directly; avoid overwriting with false
    setUser(userData);
    console.log("Login successful, user:", userData);
  };

  const logout = async () => {
    console.log("logout function started");

    try {
      const res = await api.post("/logout");

      console.log("Logout API success:", res.data);
    } catch (e: any) {
      console.log("Logout API error:", e.response?.data || e.message);
    }

    await storage.deleteItem("auth_token");

    console.log("Token deleted");

    setUser(null);

    router.replace("/(auth)/login");

    console.log("Redirect done");
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, updateUser, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
