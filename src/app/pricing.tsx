import React, { useEffect, useState } from "react";
import { View, ScrollView, Alert, TouchableOpacity, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Button } from "@/components";
import { Heading, Subheading, BodyText, Caption } from "@/components/Typography";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { CardSkeleton } from "@/components/Skeleton";

export default function PricingScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [plans, setPlans] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const studentId = params.studentId ? parseInt(params.studentId as string, 10) : null;
  const isParent =
    user?.account_type === "guardian" ||
    user?.account_type === "school" ||
    user?.account_type === "community";
  const isAlreadySubscribed = user?.has_active_subscription === true;

  useEffect(() => {
    fetchPricing();
    if (isParent && !studentId) {
      fetchLinkedStudents();
    }
  }, []);

  const fetchLinkedStudents = async () => {
    try {
      setLoadingStudents(true);
      const res = await api.get("/parent/linked-students");
      setLinkedStudents(res.data?.data ?? []);
    } catch (e: any) {
      console.warn("Failed to fetch linked students:", e);
    } finally {
      setLoadingStudents(false);
    }
  };

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

  const handleActivateViaWhatsApp = (planKey: string, amount: number) => {
    const targetStudentId = selectedStudentId || studentId;
    const targetStudentName = linkedStudents.find((s) => s.id === targetStudentId)?.name;

    let message = `Hello Future Academy Support, I would like to activate the ${planKey.toUpperCase()} plan (₦${amount?.toLocaleString()}) for my account.`;

    if (user?.email) {
      message += `\nAccount Email: ${user.email}`;
    }

    if (targetStudentId) {
      message += `\nStudent: ${targetStudentName ? `${targetStudentName} (ID: ${targetStudentId})` : `Student ID: ${targetStudentId}`}`;
    }

    const encoded = encodeURIComponent(message);
    Linking.openURL(`https://wa.me/2347071100037?text=${encoded}`);
  };

  const handleOpenWebsite = () => {
    Linking.openURL("https://futureacademy-rm.com");
  };

  const handleRefreshStatus = async () => {
    try {
      setRefreshing(true);
      const updated = await refreshUser();
      if (updated?.has_active_subscription) {
        Alert.alert("Subscription Active", "Your account has full premium access!", [
          { text: "Go to Dashboard", onPress: () => router.replace("/(tabs)") },
        ]);
      } else {
        Alert.alert(
          "Subscription Not Detected",
          "Your subscription has not been confirmed yet. If you just made a payment via transfer or on the website, please allow a moment or contact our WhatsApp support desk.",
        );
      }
    } catch (e) {
      Alert.alert("Check Failed", "Could not verify subscription status. Please check your internet connection.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  if (isAlreadySubscribed) {
    return (
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <View className="pt-16 pb-4 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center">
          <Button
            variant="ghost"
            onPress={handleBack}
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

        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-white dark:bg-neutral-900 rounded-2xl border border-green-200 dark:border-green-800 p-8 items-center w-full">
            <MaterialIcons name="check-circle" size={56} color="#22c55e" />
            <Heading size="lg" className="mt-4 text-center">
              You're already subscribed!
            </Heading>
            <BodyText className="mt-2 text-center text-neutral-500 dark:text-neutral-400">
              You have full access to all premium features, mock exams, and lessons.
            </BodyText>
            <Button
              variant="primary"
              fullWidth
              className="mt-6"
              onPress={() => router.replace("/(tabs)")}
            >
              Go to Dashboard
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="pt-16 pb-4 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex-row items-center">
        <Button
          variant="ghost"
          onPress={handleBack}
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
        {/* Activation Guidance Banner */}
        <Card variant="bordered" padding="md" className="mb-6 bg-white dark:bg-neutral-900 border-primary-500/30">
          <View className="flex-row items-center mb-2">
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-2.5 ${isDark ? "bg-primary-950/60" : "bg-primary-100"}`}>
              <MaterialIcons name="verified" size={18} color="#4f46e5" />
            </View>
            <View className="flex-1">
              <BodyText className="font-bold text-xs uppercase tracking-wider text-primary-600 dark:text-primary-400">
                How to Activate
              </BodyText>
              <Heading size="sm">Direct Activation & Support</Heading>
            </View>
          </View>
          <BodyText variant="subtle" size="sm" className="leading-relaxed">
            Subscriptions can be activated online at <BodyText className="font-semibold text-neutral-900 dark:text-white">futureacademy-rm.com</BodyText> or via our official WhatsApp desk using Bank Transfer, Card, or USSD. Once paid, your account unlocks instantly.
          </BodyText>
        </Card>

        {isParent && (
          <View className="mb-6">
            {!studentId && (
              <View className="mb-4">
                <Subheading size="md" className="mb-2">Select Linked Student</Subheading>
                {loadingStudents ? (
                  <View className="flex-row items-center">
                    <MaterialIcons name="hourglass-empty" size={20} color="#9ca3af" />
                    <Caption className="ml-2 text-neutral-500">Loading students...</Caption>
                  </View>
                ) : linkedStudents.length === 0 ? (
                  <View className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                    <BodyText className="text-amber-900 dark:text-amber-100 text-sm">
                      No linked students available. Link a student from your guardian dashboard first.
                    </BodyText>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {linkedStudents.map((student) => (
                      <TouchableOpacity
                        key={student.id}
                        onPress={() => setSelectedStudentId(student.id)}
                        className={`px-4 py-2 rounded-full border-2 ${
                          selectedStudentId === student.id
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                            : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                        }`}
                      >
                        <BodyText
                          className={`text-sm ${
                            selectedStudentId === student.id
                              ? "text-primary-700 dark:text-primary-300 font-semibold"
                              : "text-neutral-700 dark:text-neutral-300"
                          }`}
                        >
                          {student.name}
                        </BodyText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
            {(studentId || selectedStudentId) && (
              <View className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl flex-row items-center">
                <MaterialIcons name="info" size={24} color="#3b82f6" />
                <BodyText className="ml-3 flex-1 text-blue-900 dark:text-blue-100">
                  You are subscribing for: {studentId ? `Student ID: ${studentId}` : linkedStudents.find((s) => s.id === selectedStudentId)?.name}
                </BodyText>
              </View>
            )}
          </View>
        )}

        {loading ? (
          <View className="gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : plans ? (
          <View className="gap-6 pb-6">
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
                  ₦{plan.amount.toLocaleString()}
                  <Caption> / {key === "monthly" ? "month" : "year"}</Caption>
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

                <View className="gap-2.5">
                  <TouchableOpacity
                    onPress={() => handleActivateViaWhatsApp(key, plan.amount)}
                    className="bg-emerald-600 dark:bg-emerald-500 py-3.5 px-4 rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="chat" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <BodyText className="text-white font-semibold text-base">
                      Activate via WhatsApp
                    </BodyText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleOpenWebsite}
                    className="border border-neutral-300 dark:border-neutral-700 py-3 px-4 rounded-xl flex-row items-center justify-center bg-white dark:bg-neutral-900"
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="language" size={18} color={isDark ? "#d4d4d8" : "#52525b"} style={{ marginRight: 8 }} />
                    <BodyText className="text-neutral-700 dark:text-neutral-300 font-medium text-sm">
                      Activate on Website (futureacademy-rm.com)
                    </BodyText>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <View className="items-center mt-10">
            <MaterialIcons name="error-outline" size={48} color="#9ca3af" />
            <BodyText className="mt-4 text-center">No plans available at the moment.</BodyText>
          </View>
        )}

        {/* Sync / Refresh Subscription Status Card */}
        <Card variant="bordered" padding="md" className="mb-12 bg-white dark:bg-neutral-900">
          <View className="items-center text-center">
            <MaterialIcons name="sync" size={28} color="#4f46e5" className="mb-2" />
            <Heading size="sm" className="mb-1 text-center">Already Paid?</Heading>
            <BodyText variant="subtle" size="sm" className="text-center mb-4 leading-relaxed">
              If you made a payment via Bank Transfer or online on our portal, tap below to sync your subscription status immediately.
            </BodyText>
            <Button
              variant="outline"
              fullWidth
              loading={refreshing}
              disabled={refreshing}
              onPress={handleRefreshStatus}
            >
              {refreshing ? "Checking Status..." : "Refresh Subscription Status"}
            </Button>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
