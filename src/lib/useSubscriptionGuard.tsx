import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Heading, BodyText } from "@/components/Typography";
import { MaterialIcons } from "@expo/vector-icons";

type GuardOptions = {
  /**
   * Set to `true` for features that require a paid subscription only (e.g. Practice, JAMB, Mock exams).
   * Set to `false` (default) for features accessible during the 48-hour trial (e.g. Lessons & Quizzes).
   */
  requirePaidOnly?: boolean;
};

/**
 * Centralised entitlement guard for premium screens.
 */
export function useSubscriptionGuard(options?: GuardOptions) {
  const { user } = useAuth();

  const hasActiveSubscription = user?.has_active_subscription === true;

  const isOnActiveTrial =
    user?.on_trial === true &&
    Boolean(user?.trial_ends_at) &&
    new Date(user!.trial_ends_at!).getTime() > Date.now();

  const isAllowed = options?.requirePaidOnly
    ? hasActiveSubscription
    : hasActiveSubscription || isOnActiveTrial;

  return { isAllowed, isOnActiveTrial, hasActiveSubscription };
}

/**
 * Clean UI banner shown when a feature requires subscription, preventing native screen unmount race conditions.
 */
export function SubscriptionGuardView({ featureName }: { featureName: string }) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950 items-center justify-center p-6">
      <Card variant="bordered" className="w-full max-w-sm p-6 items-center text-center border-amber-200 dark:border-amber-900/50">
        <View className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-4">
          <MaterialIcons name="lock" size={32} color="#f59e0b" />
        </View>
        <Heading size="lg" className="text-center mb-2">
          Subscription Required
        </Heading>
        <BodyText className="text-center text-neutral-600 dark:text-neutral-400 mb-6">
          {featureName} is available exclusively for premium subscribers. Upgrade your plan to get full access to practice questions and exams.
        </BodyText>
        <Button
          variant="primary"
          fullWidth
          onPress={() => router.push("/pricing")}
        >
          View Subscription Plans
        </Button>
      </Card>
    </View>
  );
}
