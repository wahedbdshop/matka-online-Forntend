import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAMES } from "@/lib/auth-cookie";
import { ApiResponse } from "@/types";

type CookieWriter = {
  set: (name: string, value: string, options?: Record<string, unknown>) => void;
  delete: (name: string) => void;
};

type SessionUser = {
  role?: string;
  status?: string;
};

export type SessionTokens = {
  accessToken?: string | null;
  refreshToken?: string | null;
  sessionToken?: string | null;
};

export type RefreshedSession = SessionTokens & {
  user?: SessionUser | null;
};

const REFRESH_PATH_CANDIDATES = ["/auth/refresh-token", "/auth/refresh"];
const isProduction = process.env.NODE_ENV === "production";

export const serverAuthCookieOptions = {
  httpOnly: true,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  secure: isProduction,
  path: "/",
};

export const serverAuthFlagCookieOptions = {
  httpOnly: false,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  secure: isProduction,
  path: "/",
};

function readString(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readObject(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = source[key];
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export function applySessionCookies(
  cookieStore: CookieWriter,
  tokens: SessionTokens,
) {
  if (tokens.accessToken) {
    cookieStore.set("accessToken", tokens.accessToken, serverAuthCookieOptions);
    cookieStore.set("auth_token", tokens.accessToken, serverAuthCookieOptions);
  }

  if (tokens.refreshToken) {
    cookieStore.set(
      "refreshToken",
      tokens.refreshToken,
      serverAuthCookieOptions,
    );
    cookieStore.set(
      "refresh_token",
      tokens.refreshToken,
      serverAuthCookieOptions,
    );
  }

  if (tokens.sessionToken) {
    cookieStore.set(
      "betterAuthSession",
      tokens.sessionToken,
      serverAuthCookieOptions,
    );
    cookieStore.set("token", tokens.sessionToken, serverAuthCookieOptions);
  }

  cookieStore.set("auth_flag", "1", serverAuthFlagCookieOptions);
}

export function clearSessionCookies(cookieStore: CookieWriter) {
  [...AUTH_COOKIE_NAMES, "auth_flag"].forEach((name) => {
    cookieStore.delete(name);
  });
}

export function createClearedAuthRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  clearSessionCookies(response.cookies);
  return response;
}

export async function refreshBackendSession(options: {
  cookieHeader?: string | null;
  refreshToken?: string | null;
}): Promise<RefreshedSession | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl || !options.refreshToken) {
    return null;
  }

  for (const path of REFRESH_PATH_CANDIDATES) {
    try {
      const response = await fetch(`${apiUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.cookieHeader ? { Cookie: options.cookieHeader } : {}),
        },
        body: JSON.stringify({ refreshToken: options.refreshToken }),
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
      const data =
        body && typeof body.data === "object" && body.data !== null
          ? body.data
          : null;

      if (!data) {
        continue;
      }

      const accessToken = readString(data, "accessToken") ?? readString(data, "token");

      if (!accessToken) {
        continue;
      }

      const refreshToken =
        readString(data, "refreshToken") ?? options.refreshToken ?? null;
      const sessionToken = readString(data, "token");
      const user = readObject(data, "user") as SessionUser | null;

      return {
        accessToken,
        refreshToken,
        sessionToken,
        user,
      };
    } catch {
      continue;
    }
  }

  return null;
}
