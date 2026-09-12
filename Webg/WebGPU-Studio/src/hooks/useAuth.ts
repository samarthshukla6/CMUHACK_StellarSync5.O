/**
 * Hook for managing authentication state and query limits
 *
 * AUTH DISABLED: every feature is open to everyone with no login requirement and
 * no query cap. This stub keeps the original hook's return shape so callers stay
 * unchanged. The full Auth0-backed implementation is preserved verbatim below and
 * can be restored by deleting the stub and uncommenting it.
 */

const ignoreBoolean = (value: boolean): void => {
  void value;
};

export function useAuth() {
  return {
    user: null,
    authLoading: false,
    queryCount: 0,
    isFeatureDisabled: false,
    showOnboardingNotification: false,
    setShowOnboardingNotification: ignoreBoolean,
    showQueryLimitNotification: false,
    setShowQueryLimitNotification: ignoreBoolean,
    incrementQueryCount: () => {},
  };
}

/* ---------------------------------------------------------------------------
 * ORIGINAL AUTH0 IMPLEMENTATION (preserved, intentionally disabled)
 * ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { getGuestQueryCount, setGuestQueryCount, removeGuestQueryCount, getSigningUpFlag, removeSigningUpFlag, setHasSeenOnboarding } from "@/lib/utils/storage";
import { logger } from "@/lib/utils/logger";

const QUERY_LIMIT = 10;

export function useAuth() {
  const { user, isLoading: authLoading } = useUser();
  const [queryCount, setQueryCount] = useState(0);
  const [showOnboardingNotification, setShowOnboardingNotification] = useState(false);
  const [showQueryLimitNotification, setShowQueryLimitNotification] = useState(false);

  // Check for new signup and show onboarding notification
  useEffect(() => {
    if (authLoading) return;

    try {
      const isSigningUp = getSigningUpFlag();

      if (user && isSigningUp) {
        setShowOnboardingNotification(true);
        setHasSeenOnboarding();
        removeSigningUpFlag();
      }
    } catch (error) {
      logger.warn('sessionStorage not available:', error);
    }
  }, [user, authLoading]);

  // Load query count from localStorage for non-logged-in users
  useEffect(() => {
    if (authLoading) return;

    try {
      if (!user) {
        const storedCount = getGuestQueryCount();
        setQueryCount(storedCount);
      } else {
        removeGuestQueryCount();
        setQueryCount(0);
        setShowQueryLimitNotification(false);
      }
    } catch (error) {
      logger.warn('localStorage not available:', error);
    }
  }, [user, authLoading]);

  const isFeatureDisabled = !user && queryCount >= QUERY_LIMIT;

  // Show query limit notification when limit is reached
  useEffect(() => {
    if (!authLoading && !user && queryCount >= QUERY_LIMIT) {
      setShowQueryLimitNotification(true);
    }
  }, [queryCount, user, authLoading]);

  const incrementQueryCount = () => {
    if (!user) {
      const newCount = queryCount + 1;
      setQueryCount(newCount);
      setGuestQueryCount(newCount);
    }
  };

  return {
    user,
    authLoading,
    queryCount,
    isFeatureDisabled,
    showOnboardingNotification,
    setShowOnboardingNotification,
    showQueryLimitNotification,
    setShowQueryLimitNotification,
    incrementQueryCount,
  };
}
 * ------------------------------------------------------------------------- */
