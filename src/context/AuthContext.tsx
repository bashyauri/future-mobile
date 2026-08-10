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

  /**
   * Persist the user object to storage so it can be restored instantly on
   * next launch — eliminating the sequential auth → guard → data-fetch delay.
   */
  const persistUser = useCallback(
    async (userData: User | null) => {
      try {
        if (userData) {
          await storage.setItem("cached_user", JSON.stringify(userData));
        } else {
          await storage.deleteItem("cached_user");
        }
      } catch {
        // Non-fatal — worst case the next launch will just wait for /user
      }
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    try {
      const token = await storage.getItem("auth_token");
      if (!token) {
        setUser(null);
        await persistUser(null);
        return null;
      }

      const response = await api.get("/user");
      const payload = response.data ?? {};
      const apiUser = payload.user ?? payload;
      const finalUser = normalizeUser(apiUser);

      setUser(finalUser);
      // Persist in the background — don't await to avoid blocking the caller
      persistUser(finalUser).catch(() => {});
      return finalUser;
    } catch (error) {
      console.log("Auth refresh failed:", error);

      setUser((prevUser) => {
        if (!prevUser) {
          storage.deleteItem("auth_token").catch(() => {});
          persistUser(null).catch(() => {});
          return null;
        }
        return prevUser;
      });

      throw error;
    }
  }, [normalizeUser, persistUser]);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        // --- Fast path: restore user from cache so screens render immediately ---
        const token = await storage.getItem("auth_token");
        if (token) {
          const cached = await storage.getItem("cached_user");
          if (cached) {
            try {
              const cachedUser = normalizeUser(JSON.parse(cached) as Partial<User>);
              if (!cancelled) {
                setUser(cachedUser);
                // Release the loading gate immediately so screens can render
                setHasBootstrapped(true);
                setIsLoading(false);
              }
            } catch {
              // Corrupt cache — fall through to full refresh below
            }
          }
        }

        // --- Background refresh: always sync with the server ---
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
  }, [refreshUser, normalizeUser]);

  const router = useRouter();

  const login = async (token: string, userData: User) => {
    await storage.setItem("auth_token", token);
    // Use server-provided onboarding flag directly; avoid overwriting with false
    setUser(userData);
    // Cache the user so the next launch resolves isAllowed instantly
    persistUser(userData).catch(() => {});
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
    // Clear cached user so a new login starts fresh
    await persistUser(null);

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
