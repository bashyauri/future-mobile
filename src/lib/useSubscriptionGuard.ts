import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

type GuardOptions = {
  /**
   * Set to `true` for features that require a paid subscription only (e.g. Practice, JAMB, Mock exams).
   * Set to `false` (default) for features accessible during the 48-hour trial (e.g. Lessons & Quizzes).
   */
  requirePaidOnly?: boolean;
};

/**
 * Centralised entitlement guard for premium screens.
 *
 * Mirroring the web version rules:
 * - Paid subscribers have access to ALL features.
 * - Trial users have access to Lessons & Quizzes, but are restricted from Practice, JAMB, and Mock exams.
 * - Unsubscribed users (expired trial or no subscription) are restricted from ALL features.
 */
export function useSubscriptionGuard(options?: GuardOptions) {
  const router = useRouter();
  const { user } = useAuth();

  const hasActiveSubscription = user?.has_active_subscription === true;

  const isOnActiveTrial =
    user?.on_trial === true &&
    Boolean(user?.trial_ends_at) &&
    new Date(user!.trial_ends_at!).getTime() > Date.now();

  const isAllowed = options?.requirePaidOnly
    ? hasActiveSubscription
    : hasActiveSubscription || isOnActiveTrial;

  useEffect(() => {
    // Only redirect once user context is loaded
    if (user && !isAllowed) {
      router.replace("/pricing");
    }
  }, [user, isAllowed, router]);

  return { isAllowed, isOnActiveTrial, hasActiveSubscription };
}
