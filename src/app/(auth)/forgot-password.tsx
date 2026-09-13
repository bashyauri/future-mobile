import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Heading, BodyText } from "@/components/Typography";
import api from "@/lib/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleSendResetLink = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/forgot-password", { email });
      setSent(true);
      Alert.alert(
        "Email Sent",
        response.data?.message ||
          "Password reset link has been sent to your email address.",
      );
    } catch (error: any) {
      console.log("Forgot password error:", error.response?.data || error.message);
      Alert.alert(
        "Request Failed",
        error.response?.data?.message ||
          error.response?.data?.errors?.email?.[0] ||
          "Unable to send password reset link. Please check your email and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className={`flex-1 px-6 justify-center ${isDark ? "bg-neutral-950" : "bg-white"}`}
    >
      <Pressable
        onPress={() => router.back()}
        className="flex-row items-center mb-8 gap-1"
      >
        <MaterialIcons
          name="arrow-back-ios"
          size={18}
          color={isDark ? "#3b82f6" : "#2563eb"}
        />
        <Text className="text-sm font-semibold text-primary-600">
          Back to Sign In
        </Text>
      </Pressable>

      <View className="mb-8">
        <View className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center mb-6">
          <MaterialIcons
            name="lock-reset"
            size={32}
            color={isDark ? "#60a5fa" : "#2563eb"}
          />
        </View>
        <Heading size="xl">Forgot Password?</Heading>
        <BodyText variant="subtle" className="mt-2">
          Enter your registered email address and we'll send you instructions to reset your password.
        </BodyText>
      </View>

      {sent ? (
        <View className="space-y-4">
          <View
            className={`p-4 rounded-xl border ${
              isDark
                ? "bg-emerald-950/40 border-emerald-800"
                : "bg-emerald-50 border-emerald-200"
            }`}
          >
            <BodyText
              className={isDark ? "text-emerald-300" : "text-emerald-800"}
            >
              We've sent a password reset link to <Text className="font-semibold">{email}</Text>. Please check your inbox and follow the instructions.
            </BodyText>
          </View>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => setSent(false)}
          >
            Send Again
          </Button>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace("/(auth)/login")}
          >
            Return to Sign In
          </Button>
        </View>
      ) : (
        <View className="space-y-4">
          <Input
            label="Email Address"
            placeholder="student@futureacademy.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            leftIcon={
              <MaterialIcons
                name="email"
                size={20}
                color={isDark ? "#a1a1aa" : "#71717a"}
              />
            }
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSendResetLink}
            loading={loading}
          >
            Send Reset Link
          </Button>
        </View>
      )}

      <View className="flex-row items-center justify-center mt-8 gap-1">
        <Text
          className={`text-sm ${isDark ? "text-neutral-400" : "text-neutral-600"}`}
        >
          Remembered your password?
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text className="text-sm font-semibold text-primary-600">
              Sign In
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
