import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  checkRateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const LOGIN_URL = "/login";

const getIp = (request: NextRequest): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  request.headers.get("x-real-ip") ??
  "unknown";

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Rate limit auth routes (login, register) — Option A: same as Story 1.3
  if (pathname === "/login" || pathname === "/register") {
    const ip = getIp(request);
    const result = await checkRateLimit(
      `auth:${ip}`,
      RATE_LIMITS.AUTH_PER_IP.limit,
      RATE_LIMITS.AUTH_PER_IP.windowMs,
    );
    if (!result.success) {
      const redirectUrl = new URL(LOGIN_URL, request.url);
      redirectUrl.searchParams.set("error", "rate_limit");
      return NextResponse.redirect(redirectUrl);
    }
  }

  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () =>
          request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes
  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/candidates") ||
    pathname.startsWith("/offers") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/notes")

  if (isDashboard && !user) {
    const redirectUrl = new URL(LOGIN_URL, request.url);
    const redirect = NextResponse.redirect(redirectUrl);
    // Preserve Set-Cookie from session refresh on the redirect response
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
    return redirect;
  }

  return response;
};

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
