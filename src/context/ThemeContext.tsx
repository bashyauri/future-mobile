import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '@/lib/storage';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  colorScheme: Theme;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  colorScheme: 'system',
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<Theme>('system');
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await storage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setColorScheme(savedTheme);
        }
      } catch (error) {
        console.log('Failed to load theme:', error);
      }
    };

    loadTheme();
  }, []);

  useEffect(() => {
    // Determine actual theme based on color scheme preference
    if (colorScheme === 'system') {
      setThemeState(systemColorScheme === 'dark' ? 'dark' : 'light');
    } else {
      setThemeState(colorScheme);
    }
  }, [colorScheme, systemColorScheme]);

  const setTheme = async (newTheme: Theme) => {
    try {
      await storage.setItem('theme', newTheme);
      setColorScheme(newTheme);
    } catch (error) {
      console.log('Failed to save theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
