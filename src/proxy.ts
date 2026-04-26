import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applySessionCookies,
  createClearedAuthRedirect,
  refreshBackendSession,
} from "@/lib/server-auth";
import {
  isAdminPortalRole,
  isSupportAgentRole,
  resolveHomePathByRole,
  resolveLoginPathByPathname,
} from "@/lib/auth-role";

const protectedRoutes = [
  "/dashboard",
  "/deposit",
  "/withdrawal",
  "/transfer",
  "/profile",
  "/notifications",
  "/referral",
  "/admin",
  "/agent",
];

// These paths under /admin are public (no token required)
const publicAuthPaths = ["/admin/login", "/agent/login"];

type SessionUser = {
  role?: string;
  status?: string;
};

type SessionUserLookupResult = {
  user: SessionUser | null;
  status: number | null;
  isTerminalError: boolean;
  isTransientError: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

function getOrigin(value?: string | null) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildSecurityHeaders(): Record<string, string> {
  const connectSources = new Set(["'self'", "https:", "ws:", "wss:"]);
  const formActionSources = new Set(["'self'", "https:"]);

  const apiOrigin = getOrigin(API_URL);
  const socketOrigin = getOrigin(SOCKET_URL);

  if (apiOrigin) {
    connectSources.add(apiOrigin);
    formActionSources.add(apiOrigin);
  }

  if (socketOrigin) {
    connectSources.add(socketOrigin);
  }

  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      `connect-src ${Array.from(connectSources).join(" ")}`,
      "font-src 'self' data: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      `form-action ${Array.from(formActionSources).join(" ")}`,
    ].join("; "),
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

const SECURITY_HEADERS: Record<string, string> = buildSecurityHeaders();

function withSecurityHeaders(response: NextResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

async function getSessionUser(token: string) {
  if (!API_URL) {
    return {
      user: null,
      status: null,
      isTerminalError: false,
      isTransientError: true,
    } satisfies SessionUserLookupResult;
  }

  try {
    const response = await fetch(`${API_URL}/user/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        user: null,
        status: response.status,
        isTerminalError: response.status === 401,
        isTransientError: response.status !== 401,
      } satisfies SessionUserLookupResult;
    }

    const body = (await response.json()) as {
      data?: SessionUser;
    };

    if (!body.data) {
      return {
        user: null,
        status: response.status,
        isTerminalError: false,
        isTransientError: true,
      } satisfies SessionUserLookupResult;
    }

    return {
      user: body.data,
      status: response.status,
      isTerminalError: false,
      isTransientError: false,
    } satisfies SessionUserLookupResult;
  } catch {
    return {
      user: null,
      status: null,
      isTerminalError: false,
      isTransientError: true,
    } satisfies SessionUserLookupResult;
  }
}

export async function proxy(request: NextRequest) {
  let token =
    request.cookies.get("accessToken")?.value ??
    request.cookies.get("auth_token")?.value;
  const refreshToken =
    request.cookies.get("refreshToken")?.value ??
    request.cookies.get("refresh_token")?.value;
  const pathname = request.nextUrl.pathname;

  const isAdminPublicPath = publicAuthPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const isProtectedRoute =
    !isAdminPublicPath &&
    protectedRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );

  let refreshedSession:
    | Awaited<ReturnType<typeof refreshBackendSession>>
    | null = null;
  let refreshHadTerminalFailure = false;
  let refreshHadTransientFailure = false;

  const finalizeResponse = (response: NextResponse) => {
    if (refreshedSession?.accessToken) {
      applySessionCookies(response.cookies, refreshedSession);
    }

    return withSecurityHeaders(response);
  };

  if (!token && refreshToken) {
    const refreshResult = await refreshBackendSession({
      cookieHeader: request.headers.get("cookie"),
      refreshToken,
    });

    if (refreshResult?.accessToken) {
      refreshedSession = refreshResult;
      token = refreshResult.accessToken;
    } else if (refreshResult?.isTerminalError) {
      refreshHadTerminalFailure = true;
    } else if (refreshResult?.isTransientError) {
      refreshHadTransientFailure = true;
    }
  }

  if (!token && isProtectedRoute) {
    if (refreshHadTransientFailure && refreshToken) {
      return finalizeResponse(NextResponse.next());
    }

    const loginPath = resolveLoginPathByPathname(pathname);
    return withSecurityHeaders(
      createClearedAuthRedirect(new URL(loginPath, request.url)),
    );
  }

  if (!token) {
    return finalizeResponse(NextResponse.next());
  }

  let sessionLookup = await getSessionUser(token);
  let sessionUser = sessionLookup.user;

  if (!sessionUser && refreshToken) {
    const refreshResult = await refreshBackendSession({
      cookieHeader: request.headers.get("cookie"),
      refreshToken,
    });

    if (refreshResult?.accessToken) {
      refreshedSession = refreshResult;
      token = refreshResult.accessToken;
      sessionLookup = await getSessionUser(token);
      sessionUser = sessionLookup.user;
    } else if (refreshResult?.isTerminalError) {
      refreshHadTerminalFailure = true;
    } else if (refreshResult?.isTransientError) {
      refreshHadTransientFailure = true;
    }
  }

  if (!sessionUser) {
    if (
      !refreshHadTerminalFailure &&
      (sessionLookup.isTransientError || refreshHadTransientFailure)
    ) {
      return finalizeResponse(NextResponse.next());
    }

    const loginPath = resolveLoginPathByPathname(pathname);
    return withSecurityHeaders(
      createClearedAuthRedirect(new URL(loginPath, request.url)),
    );
  }

  const response = NextResponse.next();

  const isAdmin = isAdminPortalRole(sessionUser.role);
  const isSupportAgent = isSupportAgentRole(sessionUser.role);

  // Banned user can only access /profile
  if (
    sessionUser.status === "BANNED" &&
    !isAdmin &&
    !isSupportAgent &&
    pathname !== "/profile" &&
    !pathname.startsWith("/profile/")
  ) {
    return finalizeResponse(
      NextResponse.redirect(new URL("/profile", request.url)),
    );
  }

  // Non-admin trying to access admin-only paths (excluding admin/login)
  if (pathname.startsWith("/admin") && !isAdminPublicPath && !isAdmin) {
    return finalizeResponse(
      NextResponse.redirect(
        new URL(resolveHomePathByRole(sessionUser.role), request.url),
      ),
    );
  }

  if (pathname.startsWith("/agent") && !isAdminPublicPath && !isSupportAgent) {
    return finalizeResponse(
      NextResponse.redirect(
        new URL(resolveHomePathByRole(sessionUser.role), request.url),
      ),
    );
  }

  // Already logged-in users sent away from auth pages
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/admin/login" ||
    pathname === "/agent/login"
  ) {
    const redirectTo = resolveHomePathByRole(sessionUser.role);
    return finalizeResponse(
      NextResponse.redirect(new URL(redirectTo, request.url)),
    );
  }

  if (pathname === "/") {
    const redirectTo = resolveHomePathByRole(sessionUser.role);
    return finalizeResponse(
      NextResponse.redirect(new URL(redirectTo, request.url)),
    );
  }

  return finalizeResponse(response);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
