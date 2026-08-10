import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import {
  Heading,
  BodyText,
} from "@/components/Typography";

type GuardOptions = {
  /**
   * true  = requires an active paid subscription
   * false = active subscription OR active trial is allowed
   */
  requirePaidOnly?: boolean;
};

export function useSubscriptionGuard(
  options?: GuardOptions,
) {
  const {
    user,
    isLoading: authLoading,
  } = useAuth();

  const requirePaidOnly =
    options?.requirePaidOnly === true;

  // ---------------------------------------------------------------------------
  // Authentication is still being resolved.
  //
  // IMPORTANT:
  // Do not interpret missing user data as "not subscribed" while auth is
  // still bootstrapping.
  // ---------------------------------------------------------------------------

  const isChecking = authLoading;

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  const hasActiveSubscription =
    user?.has_active_subscription === true;

  // ---------------------------------------------------------------------------
  // Trial
  // ---------------------------------------------------------------------------

  const trialEndsAt = user?.trial_ends_at
    ? new Date(user.trial_ends_at).getTime()
    : 0;

  const isOnActiveTrial =
    user?.on_trial === true &&
    trialEndsAt > Date.now();

  // ---------------------------------------------------------------------------
  // Entitlement
  // ---------------------------------------------------------------------------

  let isAllowed = false;

  if (!isChecking) {
    if (requirePaidOnly) {
      isAllowed = hasActiveSubscription;
    } else {
      isAllowed =
        hasActiveSubscription ||
        isOnActiveTrial;
    }
  }

  return {
    isAllowed,
    isChecking,

    hasActiveSubscription,
    isOnActiveTrial,

    // Useful if screens want to know why access was denied.
    requirePaidOnly,
  };
}

/**
 * Screen shown when a user does not have the entitlement required
 * by the current feature.
 */
export function SubscriptionGuardView({
  featureName,
}: {
  featureName: string;
}) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <View className="flex-1 items-center justify-center px-6">
        <Card
          variant="bordered"
          padding="lg"
          className="w-full max-w-md bg-white dark:bg-neutral-900"
        >
          <View className="items-center">
            <View className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-5">
              <MaterialIcons
                name="workspace-premium"
                size={32}
                color="#4f46e5"
              />
            </View>

            <Heading
              size="lg"
              className="text-center mb-3"
            >
              Subscription Required
            </Heading>

            <BodyText className="text-center text-neutral-500 dark:text-neutral-400 mb-6">
              {featureName} is available exclusively
              to premium subscribers. Upgrade your
              plan to access practice questions and
              exams.
            </BodyText>

            <Button
              variant="primary"
              fullWidth
              onPress={() =>
                router.push("/pricing")
              }
            >
              View Subscription Plans
            </Button>
          </View>
        </Card>
      </View>
    </View>
  );
}