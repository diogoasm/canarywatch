import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// A paused or unreachable Supabase project can hang the auth call; give up
// after this long and let the request through instead.
const AUTH_TIMEOUT_MS = 3000;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — required for Server Components to pick up updated tokens
  let user: User | null;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Supabase auth timed out after ${AUTH_TIMEOUT_MS}ms`)),
        AUTH_TIMEOUT_MS
      );
    });
    const { data } = await Promise.race([supabase.auth.getUser(), timeout]);
    user = data.user;
  } catch (error) {
    // Supabase is down or slow — let the request through. A logged-out user
    // briefly seeing a protected page beats the request erroring.
    console.error("[middleware] Supabase auth check failed:", error);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }

  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    "/watchlist",
    "/advisor",
    "/settings",
    "/onboarding",
    "/valuation",
    "/learn",
  ];
  const authRoutes = ["/login", "/signup"];

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  // Not signed in → redirect to login
  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in → skip auth pages
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/watchlist", request.url));
  }

  return response;
}

// Only run on routes that need auth. Public pages (/, /features, /pricing,
// /privacy, /terms), API routes, sitemap/robots and static assets skip the
// middleware entirely, so a Supabase outage can't take them down.
// `:path*` matches the route itself as well as anything nested under it.
export const config = {
  matcher: [
    "/watchlist/:path*",
    "/advisor/:path*",
    "/valuation/:path*",
    "/learn/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login/:path*",
    "/signup/:path*",
  ],
};
