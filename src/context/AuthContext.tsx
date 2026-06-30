import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import api from '@/lib/api';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

type User = {
  id: number;
  name: string;
  email: string;
  has_completed_onboarding: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => { },
  logout: async () => { },
  updateUser: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const token = await storage.getItem('auth_token');
        if (token) {
          // Verify token and fetch latest user profile
          const response = await api.get('/user');
          // The API returns an object with a nested "user" field and possibly a top-level flag.
          const payload = response.data ?? {};
          const apiUser = payload.user ?? {} as User;
          // Ensure onboarding flag is defined on the user object.
          const onboardingFlag = apiUser.has_completed_onboarding ?? false;
          const finalUser = { ...apiUser, has_completed_onboarding: onboardingFlag } as User;
          setUser(finalUser);
          console.log('Auth check user:', finalUser);
        }
      } catch (error) {
        // Token invalid or network error
        console.log('Auth check failed:', error);
        await storage.deleteItem('auth_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const router = useRouter();

  const login = async (token: string, userData: User) => {
    await storage.setItem('auth_token', token);
    // Use server-provided onboarding flag directly; avoid overwriting with false
    setUser(userData);
    console.log('Login successful, user:', userData);
  };

  const logout = async () => {
    console.log("logout function started");

    try {
      const res = await api.post('/logout');

      console.log('Logout API success:', res.data);

    } catch (e: any) {
      console.log('Logout API error:', e.response?.data || e.message);
    }

    await storage.deleteItem('auth_token');

    console.log("Token deleted");

    setUser(null);

    router.replace('/(auth)/login');

    console.log("Redirect done");
  };


  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
