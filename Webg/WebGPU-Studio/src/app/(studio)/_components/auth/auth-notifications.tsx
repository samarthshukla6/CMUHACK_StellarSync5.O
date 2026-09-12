"use client";

import { useAuth } from "@/hooks/useAuth";
import { Notification } from "@/studio/_components/common/notification";
import { AuthLoginTrigger } from "@/studio/_components/auth/auth-login-trigger";

export function AuthNotifications() {
  const auth = useAuth();

  const showOnboarding = auth.showOnboardingNotification;
  const showQueryLimit = auth.showQueryLimitNotification;

  if (!showOnboarding && !showQueryLimit) return null;

  return (
    <>
      {showOnboarding && (
        <Notification
          message="Check the link on email to complete onboarding to access all features"
          onClose={() => auth.setShowOnboardingNotification(false)}
          type="info"
        />
      )}
      {showQueryLimit && (
        <Notification
          message={
            <>
              You&apos;ve reached the limit of 10 queries. Please{" "}
              <AuthLoginTrigger style={{ textDecoration: "underline", fontWeight: 600 }}>
                log in
              </AuthLoginTrigger>{" "}
              to access more features.
            </>
          }
          onClose={() => auth.setShowQueryLimitNotification(false)}
          type="warning"
        />
      )}
    </>
  );
}
