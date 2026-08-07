import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

/**
 * Centralised entitlement guard for premium screens.
 *
 * Returns:
 *  - isPremiumAllowed: true when the user has an active subscription or an active trial.
 *  - isOnActiveTrial: true when the user is currently on a trial (not yet expired).
 *
 * Side-effect: automatically replaces the current route with /pricing when the
 * user is authenticated but has no entitlement, so callers don't need to redirect
 * themselves.
 */
export function useSubscriptionGuard() {
  const router = useRouter();
  const { user } = useAuth();

  const hasActiveSubscription = user?.has_active_subscription === true;

  const isOnActiveTrial =
    user?.on_trial === true &&
    Boolean(user?.trial_ends_at) &&
    new Date(user!.trial_ends_at!).getTime() > Date.now();

  const isPremiumAllowed = hasActiveSubscription || isOnActiveTrial;

  useEffect(() => {
    // Only redirect once we know the user object (not during loading)
    if (user && !isPremiumAllowed) {
      router.replace("/pricing");
    }
  }, [user, isPremiumAllowed, router]);

  return { isPremiumAllowed, isOnActiveTrial, hasActiveSubscription };
}
