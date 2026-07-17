import "@/global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/Toast";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { initOfflineDatabase } from "@/lib/offlineDb";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace("/(auth)/login");
    } else if (user) {
      // Parent types (guardian, school, community) bypass onboarding
      const parentTypes = ["guardian", "school", "community"];
      const isParentUser = parentTypes.includes(user.account_type ?? "");

      if (isParentUser && inAuthGroup) {
        // Parents go straight to dashboard, skip onboarding entirely
        router.replace("/(tabs)");
      } else if (!isParentUser && !user.has_completed_onboarding && segments[1] !== "onboarding") {
        // Redirect students to onboarding if not completed
        router.replace("/(auth)/onboarding");
      } else if (user.has_completed_onboarding && inAuthGroup) {
        // Redirect to tabs if authenticated and onboarded
        router.replace("/(tabs)");
      }
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="parent" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initOfflineDatabase().catch((error) => {
      console.warn("Failed to initialize offline database", error);
    });
  }, []);

  return (
    <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
