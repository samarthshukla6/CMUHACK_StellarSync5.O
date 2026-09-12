import { NextResponse } from "next/server";

/**
 * AUTH DISABLED: the Auth0 middleware is bypassed so every route is public.
 * It also threw "Invalid URL" on every request whenever the AUTH0_* env vars were
 * absent. The original wiring is preserved below.
 */

// import { auth0 } from "./lib/auth0";

export async function middleware() {
  return NextResponse.next();
  // return await auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
