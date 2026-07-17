import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

const PARENT_ACCOUNT_TYPES = ["guardian", "school", "community"];

export default function TabLayout() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const isDark = theme === "dark";
  const isParent = PARENT_ACCOUNT_TYPES.includes(user?.account_type ?? "");

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
          title: isParent ? "Guardian Dashboard" : "Dashboard",
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
          href: isParent ? null : undefined,
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
          href: isParent ? null : undefined,
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
          href: isParent ? null : undefined,
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

