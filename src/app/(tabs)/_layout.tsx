import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

export default function TabLayout() {
  const { theme } = useTheme();

  const isDark = theme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
        },
        headerShadowVisible: false,
        headerTintColor: isDark ? "#fafafa" : "#171717",
        tabBarActiveTintColor: "#4f46e5",
        tabBarInactiveTintColor: isDark ? "#71717a" : "#a1a1aa",
        tabBarStyle: {
          backgroundColor: isDark ? "#0a0a0a" : "#ffffff",
          borderTopColor: isDark ? "#27272a" : "#e5e5e5",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice-setup"
        options={{
          title: "Practice",
          tabBarLabel: "Practice",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="menu-book" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="jamb-setup"
        options={{
          title: "JAMB",
          tabBarLabel: "JAMB",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="auto-stories" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mock-setup"
        options={{
          title: "Mock Exam",
          tabBarLabel: "Mock",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="timer" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
