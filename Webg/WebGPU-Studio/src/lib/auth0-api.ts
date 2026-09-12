import { NextRequest, type NextResponse } from "next/server";
import { auth0 } from "./auth0";

type Session = Awaited<ReturnType<typeof auth0.getSession>>;

function toNextRequest(req: Request): NextRequest {
  return req instanceof NextRequest ? req : new NextRequest(req.url, req);
}

/**
 * Returns the current session and access token for API use, or null if either is missing.
 * Use in API route handlers (after withApiAuthRequired or when you need both session and token).
 *
 * In App Router Route Handlers, next/headers cookies() may not see the request cookies.
 * Pass (req, res) so session and token are read from the incoming request and any token
 * refresh cookies are written to res.
 */
export async function getSessionAndToken(
  audienceOrReq?: string | Request,
  resOrAudience?: NextResponse | string,
  audience?: string
): Promise<{ session: Session; token: string } | null> {
  const hasRequest = audienceOrReq instanceof Request;
  const req = hasRequest ? (audienceOrReq as Request) : undefined;
  const nextReq = req ? toNextRequest(req) : undefined;
  const res = resOrAudience && typeof (resOrAudience as NextResponse).headers?.set === "function" ? (resOrAudience as NextResponse) : undefined;
  const aud = hasRequest ? (typeof resOrAudience === "string" ? resOrAudience : audience) : (audienceOrReq as string | undefined);

  const session = nextReq ? await auth0.getSession(nextReq) : await auth0.getSession();
  if (!session) return null;

  let token: string;
  if (nextReq && res) {
    const t = await auth0.getAccessToken(nextReq, res, { audience: aud ?? undefined });
    token = t.token;
  } else {
    const t = await auth0.getAccessToken({ audience: aud ?? undefined });
    token = t.token;
  }
  if (!token) return null;

  return { session, token };
}
