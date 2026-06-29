import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import api from '@/lib/api';

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
          setUser(response.data);
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

  const login = async (token: string, userData: User) => {
    await storage.setItem('auth_token', token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    await storage.deleteItem('auth_token');
    setUser(null);
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
