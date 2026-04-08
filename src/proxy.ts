import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/deposit",
  "/withdrawal",
  "/transfer",
  "/profile",
  "/notifications",
  "/referral",
  "/admin",
];

type SessionUser = {
  role?: string;
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
  if (!API_URL) return null;

  try {
    const response = await fetch(`${API_URL}/user/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      data?: SessionUser;
    };

    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const token =
    request.cookies.get("accessToken")?.value ??
    request.cookies.get("auth_token")?.value;
  const pathname = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (!token && isProtectedRoute) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/login", request.url)),
    );
  }

  if (!token) {
    return withSecurityHeaders(NextResponse.next());
  }

  const sessionUser = await getSessionUser(token);

  if (!sessionUser) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("accessToken");
    response.cookies.delete("auth_token");
    response.cookies.delete("refreshToken");
    response.cookies.delete("refresh_token");
    response.cookies.delete("betterAuthSession");
    response.cookies.delete("token");
    return withSecurityHeaders(response);
  }

  if (pathname.startsWith("/admin") && sessionUser.role !== "ADMIN") {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", request.url)),
    );
  }

  if (pathname === "/login" || pathname === "/register") {
    const redirectTo = sessionUser.role === "ADMIN" ? "/admin" : "/dashboard";
    return withSecurityHeaders(
      NextResponse.redirect(new URL(redirectTo, request.url)),
    );
  }

  if (pathname === "/") {
    const redirectTo = sessionUser.role === "ADMIN" ? "/admin" : "/dashboard";
    return withSecurityHeaders(
      NextResponse.redirect(new URL(redirectTo, request.url)),
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
