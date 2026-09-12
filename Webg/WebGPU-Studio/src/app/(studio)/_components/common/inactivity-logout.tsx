"use client";

/**
 * AUTH DISABLED: there is no session to expire, so this component is inert.
 * The original inactivity auto-logout logic is preserved below.
 */

export function InactivityLogout() {
  return null;
}

/* ---------------------------------------------------------------------------
 * ORIGINAL IMPLEMENTATION (preserved, intentionally disabled)
 * ---------------------------------------------------------------------------
import { useCallback, useEffect, useRef } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";

const DEFAULT_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours
const RESET_THROTTLE_MS = 1000;

function getTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_AUTO_LOGOUT_TIMEOUT_MS;
  if (raw == null || raw === "") return DEFAULT_TIMEOUT_MS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

export function InactivityLogout() {
  const { user } = useUser();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResetRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleLogout = useCallback(() => {
    clearTimer();
    const ms = getTimeoutMs();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      window.location.href = "/auth/logout";
    }, ms);
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastResetRef.current < RESET_THROTTLE_MS) return;
    lastResetRef.current = now;
    scheduleLogout();
  }, [scheduleLogout]);

  useEffect(() => {
    if (!user) return;
    scheduleLogout();
    const events = ["mousedown", "keydown", "scroll", "touchstart", "focus"] as const;
    const opts = { passive: true, capture: true };
    events.forEach((e) => window.addEventListener(e, resetTimer, opts));
    return () => {
      clearTimer();
      events.forEach((e) => window.removeEventListener(e, resetTimer, opts));
    };
  }, [user, scheduleLogout, resetTimer, clearTimer]);

  return null;
}
 * ------------------------------------------------------------------------- */
