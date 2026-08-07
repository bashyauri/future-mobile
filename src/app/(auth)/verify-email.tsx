import React, { useEffect, useState } from "react";
import { Alert, AppState, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/Button";
import { Heading, BodyText } from "@/components/Typography";
import api from "@/lib/api";

export default function VerifyEmailScreen() {
  const { user, logout, refreshUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const resendVerification = async () => {
    setSending(true);

    try {
      const response = await api.post("/email/verification-notification");
      Alert.alert(
        "Verification Email Sent",
        response.data?.message || "Check your inbox for the verification link.",
      );
    } catch (error: any) {
      Alert.alert(
        "Unable to Send",
        error.response?.data?.message || "Please try again later.",
      );
    } finally {
      setSending(false);
    }
  };

  const refreshVerificationStatus = async (silent = false) => {
    setChecking(true);

    try {
      const refreshedUser = (await refreshUser()) as {
        email_verified_at?: string | null;
      } | null;

      if (!silent && refreshedUser?.email_verified_at) {
        Alert.alert("Email Verified", "Your email is now verified.");
      }
    } catch (error: any) {
      if (!silent) {
        Alert.alert(
          "Unable to Check",
          error.response?.data?.message || "Please try again.",
        );
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (user?.email_verified_at) {
      return;
    }

    const interval = setInterval(() => {
      refreshVerificationStatus(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.email_verified_at]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        refreshVerificationStatus(true);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <View
      className={`flex-1 px-6 justify-center ${isDark ? "bg-neutral-950" : "bg-white"}`}
    >
      <View className="mb-10">
        <View className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-6">
          <MaterialIcons name="mark-email-unread" size={32} color="#d97706" />
        </View>
        <Heading size="xl">Verify Your Email</Heading>
        <BodyText variant="subtle" className="mt-2">
          We sent a verification email to {user?.email || "your inbox"}. Please
          verify your email before continuing.
        </BodyText>
      </View>

      <View className="flex gap-4">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={resendVerification}
          loading={sending}
        >
          Resend Verification Email
        </Button>

        <Button
          variant="outline"
          size="lg"
          fullWidth
          onPress={() => refreshVerificationStatus(false)}
          loading={checking}
        >
          I Have Verified My Email
        </Button>

        <Button variant="ghost" size="lg" fullWidth onPress={logout}>
          Log Out
        </Button>

        <Text
          className={`text-sm text-center ${isDark ? "text-neutral-400" : "text-neutral-600"}`}
        >
          We’ll keep checking for the verification update automatically while
          you’re here.
        </Text>
      </View>
    </View>
  );
}
