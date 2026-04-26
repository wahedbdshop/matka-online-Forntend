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
  sessionMaxAgeMs?: number;
  refreshTokenMaxAgeMs?: number;
};

export type RefreshedSession = SessionTokens & {
  user?: SessionUser | null;
  errorStatus?: number | null;
  isTerminalError?: boolean;
  isTransientError?: boolean;
};

const REFRESH_PATH_CANDIDATES = ["/auth/refresh-token"];
const isProduction = process.env.NODE_ENV === "production";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

const getServerAuthCookieOptions = (maxAge = THIRTY_DAYS) => ({
  httpOnly: true,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  secure: isProduction,
  path: "/",
  maxAge,
});

const serverAuthFlagCookieOptions = {
  httpOnly: false,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  secure: isProduction,
  path: "/",
  maxAge: THIRTY_DAYS,
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
  const sessionCookieMaxAgeSeconds =
    typeof tokens.sessionMaxAgeMs === "number" && tokens.sessionMaxAgeMs > 0
      ? Math.max(1, Math.floor(tokens.sessionMaxAgeMs / 1000))
      : THIRTY_DAYS;
  const refreshCookieMaxAgeSeconds =
    typeof tokens.refreshTokenMaxAgeMs === "number" &&
    tokens.refreshTokenMaxAgeMs > 0
      ? Math.max(1, Math.floor(tokens.refreshTokenMaxAgeMs / 1000))
      : sessionCookieMaxAgeSeconds;

  if (tokens.accessToken) {
    // Keep accessToken non-httpOnly so client-side JS (getClientAccessTokenCookie)
    // can read it on page refresh and skip the full token-refresh round-trip.
    const accessTokenOptions = {
      ...getServerAuthCookieOptions(sessionCookieMaxAgeSeconds),
      httpOnly: false,
    };
    cookieStore.set("accessToken", tokens.accessToken, accessTokenOptions);
    cookieStore.set("auth_token", tokens.accessToken, accessTokenOptions);
  }

  if (tokens.refreshToken) {
    cookieStore.set(
      "refreshToken",
      tokens.refreshToken,
      getServerAuthCookieOptions(refreshCookieMaxAgeSeconds),
    );
    cookieStore.set(
      "refresh_token",
      tokens.refreshToken,
      getServerAuthCookieOptions(refreshCookieMaxAgeSeconds),
    );
  }

  if (tokens.sessionToken) {
    cookieStore.set(
      "betterAuthSession",
      tokens.sessionToken,
      getServerAuthCookieOptions(sessionCookieMaxAgeSeconds),
    );
    cookieStore.set(
      "token",
      tokens.sessionToken,
      getServerAuthCookieOptions(sessionCookieMaxAgeSeconds),
    );
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

function isTerminalRefreshStatus(status: number | null) {
  return status === 401 || status === 429;
}

export async function refreshBackendSession(options: {
  cookieHeader?: string | null;
  refreshToken?: string | null;
}): Promise<RefreshedSession | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl || !options.refreshToken) {
    return null;
  }

  let lastStatus: number | null = null;
  let sawTransientFailure = false;

  for (const path of REFRESH_PATH_CANDIDATES) {
    try {
      const response = await fetch(`${apiUrl}${path}`, {
        method: "POST",
        headers: {
          ...(options.cookieHeader ? { Cookie: options.cookieHeader } : {}),
        },
        cache: "no-store",
      });

      if (!response.ok) {
        lastStatus = response.status;

        if (isTerminalRefreshStatus(response.status)) {
          return {
            errorStatus: response.status,
            isTerminalError: true,
            isTransientError: false,
          };
        }

        sawTransientFailure = true;
        continue;
      }

      const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
      const data =
        body && typeof body.data === "object" && body.data !== null
          ? body.data
          : null;

      if (!data) {
        lastStatus = response.status;
        sawTransientFailure = true;
        continue;
      }

      const accessToken = readString(data, "accessToken") ?? readString(data, "token");

      if (!accessToken) {
        lastStatus = response.status;
        sawTransientFailure = true;
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
        errorStatus: null,
        isTerminalError: false,
        isTransientError: false,
      };
    } catch {
      sawTransientFailure = true;
      continue;
    }
  }

  if (sawTransientFailure) {
    return {
      errorStatus: lastStatus,
      isTerminalError: false,
      isTransientError: true,
    };
  }

  return null;
}
