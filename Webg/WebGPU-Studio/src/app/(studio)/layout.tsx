"use client";

import { useEffect } from "react";
import { StudioMainArea } from "@/studio/_components/studio-main-area";
import { bootWebLLMRuntime } from "@/lib/ai/webllm-session";

// AUTH DISABLED: inactivity auto-logout and the login/onboarding notifications are
// switched off. Components remain in the codebase.
// import { InactivityLogout } from "@/studio/_components/common/inactivity-logout";
// import { AuthNotifications } from "@/studio/_components/auth/auth-notifications";
import styles from "../page.module.css";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    bootWebLLMRuntime();
  }, []);

  return (
    <div className={`${styles.page} ${styles.light}`}>
      {/* <InactivityLogout /> */}
      {/* <AuthNotifications /> */}
      <StudioMainArea>{children}</StudioMainArea>
    </div>
  );
}
