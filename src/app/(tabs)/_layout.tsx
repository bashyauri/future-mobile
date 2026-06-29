import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
        },
        headerShadowVisible: false,
        headerTintColor: isDark ? '#fafafa' : '#171717',
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: isDark ? '#71717a' : '#a1a1aa',
        tabBarStyle: {
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderTopColor: isDark ? '#27272a' : '#e5e5e5',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="practice-setup"
        options={{
          title: 'Practice',
          tabBarLabel: 'Practice',
        }}
      />
      <Tabs.Screen
        name="jamb-setup"
        options={{
          title: 'JAMB',
          tabBarLabel: 'JAMB',
        }}
      />
      <Tabs.Screen
        name="mock-setup"
        options={{
          title: 'Mock Exam',
          tabBarLabel: 'Mock',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tabs>
  );
}
