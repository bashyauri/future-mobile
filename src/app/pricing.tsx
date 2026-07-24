import React, { useEffect, useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Button } from "@/components";
import { Heading, Subheading, BodyText, Caption } from "@/components/Typography";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { CardSkeleton } from "@/components/Skeleton";

// Make sure the web browser can be dismissed on android
WebBrowser.maybeCompleteAuthSession();

export default function PricingScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [plans, setPlans] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribingTo, setSubscribingTo] = useState<string | null>(null);

  const studentId = params.studentId ? parseInt(params.studentId as string, 10) : null;
  const isParent = user?.account_type === 'guardian' || user?.account_type === 'school' || user?.account_type === 'community';

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payment/pricing");
      setPlans(res.data?.data?.plans ?? {});
    } catch (e: any) {
      console.warn("Pricing error:", e);
      Alert.alert("Error", "Could not load pricing plans. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planKey: string) => {
    if (isParent && !studentId) {
      Alert.alert("Error", "Please select a student to pay for.");
      return;
    }

    try {
      setSubscribingTo(planKey);
      
      const payload = {
        plan: planKey,
        type: "recurring",
        student_id: studentId,
      };

      const res = await api.post("/payment/initialize", payload);
      
      const { authorization_url, reference } = res.data?.data ?? {};
      
      if (!authorization_url) {
        throw new Error("No authorization URL returned");
      }

      const returnUrl = Linking.createURL("payment/callback");
      
      const authResult = await WebBrowser.openAuthSessionAsync(
        authorization_url,
        returnUrl
      );

      if (authResult.type === "success") {
        // Expo linking parsed the return URL successfully
        // The URL should contain ?reference=XYZ but we can also just use the one we got from init
        await verifyPayment(reference);
      } else {
        // If they just closed the browser (authResult.type === "cancel")
        // We can optionally verify anyway just in case the webhook fired and payment actually succeeded,
        // but typically we just abort.
        console.log("Browser closed or cancelled");
      }

    } catch (e: any) {
      console.warn("Payment init error:", e);
      Alert.alert("Error", e.response?.data?.message || "Could not start payment process.");
    } finally {
      setSubscribingTo(null);
    }
  };

  const verifyPayment = async (reference: string) => {
    try {
      setSubscribingTo("verify"); // Shows loading state
      const res = await api.post("/payment/verify", { reference });
      
      Alert.alert("Success", "Your subscription is now active!");
      router.back();
    } catch (e: any) {
      console.warn("Payment verify error:", e);
      Alert.alert("Payment Failed", e.response?.data?.message || "Payment verification failed.");
    } finally {
      setSubscribingTo(null);
    }
  };

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="pt-16 pb-4 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center">
        <Button
          variant="ghost"
          onPress={() => router.back()}
          className="mr-2"
          accessibilityLabel="Go back"
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={isDark ? "#fff" : "#171717"}
          />
        </Button>
        <Heading size="lg">Subscription Plans</Heading>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {isParent && studentId ? (
          <View className="mb-6 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl flex-row items-center">
            <MaterialIcons name="info" size={24} color="#3b82f6" />
            <BodyText className="ml-3 flex-1 text-blue-900 dark:text-blue-100">
              You are subscribing for Student ID: {studentId}
            </BodyText>
          </View>
        ) : null}

        {loading ? (
          <View className="gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : plans ? (
          <View className="gap-6 pb-12">
            {Object.entries(plans).map(([key, plan]: [string, any]) => (
              <Card
                key={key}
                variant="bordered"
                className={`border-2 ${
                  key === "yearly"
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                {key === "yearly" && (
                  <View className="absolute -top-3 right-4 bg-primary-500 px-3 py-1 rounded-full">
                    <Caption className="text-white font-bold text-xs uppercase tracking-wider">
                      Best Value
                    </Caption>
                  </View>
                )}
                
                <Subheading size="xl" className="capitalize mb-1">{key}</Subheading>
                <Heading size="2xl" className="mb-4">
                  ₦{(plan.amount / 100).toLocaleString()}
                  <Caption> / {key === 'monthly' ? 'month' : 'year'}</Caption>
                </Heading>
                
                <View className="gap-3 mb-6">
                  {plan.features?.map((feature: string, index: number) => (
                    <View key={index} className="flex-row items-center">
                      <MaterialIcons name="check-circle" size={20} color="#10b981" />
                      <BodyText className="ml-2">{feature}</BodyText>
                    </View>
                  ))}
                  {!plan.features && (
                    <View className="flex-row items-center">
                      <MaterialIcons name="check-circle" size={20} color="#10b981" />
                      <BodyText className="ml-2">Full access to all lessons and quizzes</BodyText>
                    </View>
                  )}
                </View>

                <Button
                  variant={key === "yearly" ? "primary" : "outline"}
                  fullWidth
                  loading={subscribingTo === key || subscribingTo === "verify"}
                  disabled={subscribingTo !== null}
                  onPress={() => handleSubscribe(key)}
                >
                  {subscribingTo === "verify" ? "Verifying..." : `Subscribe ${key}`}
                </Button>
              </Card>
            ))}
          </View>
        ) : (
          <View className="items-center mt-10">
            <MaterialIcons name="error-outline" size={48} color="#9ca3af" />
            <BodyText className="mt-4 text-center">No plans available at the moment.</BodyText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
