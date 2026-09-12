/**
 * AUTH DISABLED: the profile API requires an Auth0 session, so this hook is a
 * no-op stub. The original implementation is preserved at the bottom of the file.
 */

import { useState, useCallback } from "react";
// import { useUser } from "@auth0/nextjs-auth0/client";
// import { logger } from "@/lib/utils/logger";

interface ProfileData {
  id: string;
  email: string;
  name: string;
  deleted: boolean;
  isOnboarded: boolean;
  lastLogin: string | null;
  status: string;
  authId: string;
  userName: string;
  userInterests: string[];
  emailVerified: boolean;
  memberships: Array<{
    id: string;
    joinedAt: string;
    invitedBy: string | null;
    role: {
      id: string;
      name: string;
      roleScopes: Array<{
        scope: {
          name: string;
        };
      }>;
    };
    organization: {
      id: string;
      name: string;
      fullName: string;
      kind: string;
      orgSubscription?: {
        id: string | null;
        status: string;
        endDate: string | null;
        priceId: string;
        subscription?: {
          id: string;
          title: string;
          prices: {
            yearly?: {
              amount: number;
              credits: number;
              currency: string;
              interval: string;
              stripePriceId: string;
              stripeSubscriptionId: string | null;
              isActive: boolean;
            };
            monthly?: {
              amount: number;
              credits: number;
              currency: string;
              interval: string;
              stripePriceId: string;
              stripeSubscriptionId: string | null;
              isActive: boolean;
            };
          };
        };
      };
    };
  }>;
}

export function useProfile() {
  const [profile] = useState<ProfileData | null>(null);
  const fetchProfile = useCallback(async () => {}, []);

  return {
    profile,
    loading: false,
    error: null as string | null,
    fetchProfile,
    isAuthenticated: false,
  };
}

/* ---------------------------------------------------------------------------
 * ORIGINAL AUTH0 IMPLEMENTATION (preserved, intentionally disabled)
 * ---------------------------------------------------------------------------
export function useProfile() {
  const { user } = useUser();
  const isAuthenticated = !!user;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch profile");
      }

      setProfile(data.profile);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      logger.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    isAuthenticated,
  };
}
 * ------------------------------------------------------------------------- */
