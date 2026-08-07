import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components";
import { Heading, BodyText } from "@/components/Typography";
import { MaterialIcons } from "@expo/vector-icons";

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshUser } = useAuth();
  const [verifying, setVerifying] = useState(true);

  const reference = typeof params.reference === "string" ? params.reference : null;

  useEffect(() => {
    if (!reference) {
      router.replace("/(tabs)");
      return;
    }

    const verify = async () => {
      try {
        setVerifying(true);
        await api.post("/payment/verify", { reference });
        await refreshUser();
        Alert.alert("Success", "Your subscription is now active!");
        router.replace("/(tabs)");
      } catch (error: any) {
        console.warn("Payment callback verify error:", error);
        Alert.alert("Payment Failed", error.response?.data?.message || "Payment verification failed.");
        router.replace("/pricing");
      } finally {
        setVerifying(false);
      }
    };

    void verify();
  }, [reference, refreshUser, router]);

  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <View className="items-center rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <MaterialIcons name="payments" size={48} color="#2563eb" />
        <Heading size="lg" className="mt-4 text-center">
          Finalizing your subscription
        </Heading>
        <BodyText className="mt-2 text-center text-neutral-600 dark:text-neutral-400">
          {verifying ? "We are confirming your payment. This will only take a moment." : "You can close this screen and continue."}
        </BodyText>
        <Button variant="outline" className="mt-6" onPress={() => router.replace("/(tabs)")}>
          Continue to dashboard
        </Button>
      </View>
    </View>
  );
}
