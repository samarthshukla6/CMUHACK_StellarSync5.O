export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * AUTH DISABLED: this endpoint only ever served an authenticated Auth0 session, so it
 * now reports that it is unavailable. Importing the Auth0 helper also constructed an
 * Auth0 client at module load, which logged missing-config warnings on every request.
 * The original handler is preserved below.
 */

export async function GET() {
  return NextResponse.json(
    { error: "Profile API is disabled", status: 404 },
    { status: 404 }
  );
}

/* ---------------------------------------------------------------------------
 * ORIGINAL AUTH0 IMPLEMENTATION (preserved, intentionally disabled)
 * ---------------------------------------------------------------------------
import { getSessionAndToken } from "@/lib/auth0-api";
import { logger } from "@/lib/utils/logger";

const PROFILE_API_BASE_URL =
  process.env.NEXT_PUBLIC_PROFILE_API_BASE_URL ||
  process.env.PROFILE_API_BASE_URL ||
  "";
const PROFILE_API_URL = `${PROFILE_API_BASE_URL}/api/v1/user/my-profile`;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

async function profileHandler(
  request: Request,
  _ctx: { params: Promise<Record<string, string | string[]>> }
) {
  try {
    if (!PROFILE_API_BASE_URL) {
      logger.error("PROFILE_API_BASE_URL is not configured");
      return NextResponse.json(
        { error: "Profile API base URL is not configured" },
        { status: 500 }
      );
    }

    const tokenRes = new NextResponse();
    const result = await getSessionAndToken(request, tokenRes, AUTH0_AUDIENCE ?? undefined);
    if (!result) {
      return NextResponse.json(
        { error: "Unauthorized - No access token", status: 401 },
        { status: 401 }
      );
    }

    const profileResponse = await fetch(PROFILE_API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${result.token}`,
        "Content-Type": "application/json",
      },
    });

    if (profileResponse.status === 401) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid or expired token", status: 401 },
        { status: 401 }
      );
    }

    if (profileResponse.status === 404) {
      return NextResponse.json(
        { error: "User not found", status: 404 },
        { status: 404 }
      );
    }

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      return NextResponse.json(
        { error: `Profile API error: ${errorText}`, status: profileResponse.status },
        { status: profileResponse.status }
      );
    }

    const profileData = await profileResponse.json();
    const out = NextResponse.json({ profile: profileData });
    tokenRes.headers.forEach((value, key) => out.headers.set(key, value));
    return out;
  } catch (error) {
    logger.error("Error in profile API route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

export const GET = profileHandler;
 * ------------------------------------------------------------------------- */
