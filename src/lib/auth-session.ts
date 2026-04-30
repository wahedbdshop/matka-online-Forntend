import { clearClientAuthCookies, setClientAuthCookies } from "@/lib/auth-cookie";
import { pathnameMatchesRoute } from "@/lib/auth-role";
import { useAuthStore } from "@/store/auth.store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
const REFRESH_ENDPOINT_PATH = "/auth/refresh-token";
const LOGIN_REDIRECT_PATHS = [
  "/dashboard",
  "/deposit",
  "/withdrawal",
  "/transfer",
  "/profile",
  "/notifications",
  "/referral",
  "/chat",
  "/admin",
  "/agent",
];

export type SessionSyncPayload = {
  accessToken?: string | null;
  refreshToken?: string | null;
  sessionToken?: string | null;
  sessionMaxAgeMs?: number;
  refreshTokenMaxAgeMs?: number;
};

export type RefreshedSessionPayload = SessionSyncPayload & {
  user?: unknown;
};

export type SessionRefreshResult = {
  accessToken: string | null;
  payload: { data: RefreshedSessionPayload } | null;
  status: number | null;
  blocked: boolean;
  redirected: boolean;
};

export class AuthSessionRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthSessionRequestError";
    this.status = status;
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

let refreshPromise: Promise<SessionRefreshResult> | null = null;
let refreshBlockedStatus: number | null = null;
let hasRedirectedToLogin = false;

function isTerminalRefreshStatus(status: number | null) {
  return status === 401 || status === 429;
}

function getLoginPath() {
  if (typeof window === "undefined") {
    return "/login";
  }

  return pathnameMatchesRoute(window.location.pathname, "/admin")
    ? "/admin/login"
    : "/login";
}

function shouldRedirectToLogin() {
  if (typeof window === "undefined") {
    return false;
  }

  const pathname = window.location.pathname;

  return LOGIN_REDIRECT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function clearRefreshBlock() {
  refreshBlockedStatus = null;
  hasRedirectedToLogin = false;
}

async function redirectToLoginOnce(trigger: string, status: number | null) {
  if (typeof window === "undefined") {
    return false;
  }

  const loginPath = getLoginPath();

  if (hasRedirectedToLogin) {
    return true;
  }

  hasRedirectedToLogin = true;

  if (window.location.pathname !== loginPath && shouldRedirectToLogin()) {
    window.location.replace(loginPath);
  }

  return true;
}

export async function syncServerSession(payload: SessionSyncPayload) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to sync local auth session");
  }

  return parseJsonResponse(response);
}

export function logAuthBootstrapStart(_details?: Record<string, unknown>) {}

export async function requestSessionRefresh(
  trigger = "unknown",
): Promise<SessionRefreshResult> {
  if (refreshPromise) {
    return refreshPromise;
  }

  if (isTerminalRefreshStatus(refreshBlockedStatus)) {
    await redirectToLoginOnce(trigger, refreshBlockedStatus);
    return {
      accessToken: null,
      payload: null,
      status: refreshBlockedStatus,
      blocked: true,
      redirected: hasRedirectedToLogin,
    };
  }

  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${REFRESH_ENDPOINT_PATH}`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new AuthSessionRequestError(
          "Failed to refresh auth session",
          response.status,
        );
      }

      const payload = await parseJsonResponse<{ data: RefreshedSessionPayload }>(
        response,
      );

      if (payload.data) {
        applyClientSession(payload.data);

        try {
          await syncServerSession(payload.data);
        } catch {
          // Keep the freshly refreshed client session even if local cookie mirroring fails.
        }
      }

      return {
        accessToken: payload.data?.accessToken ?? null,
        payload,
        status: response.status,
        blocked: false,
        redirected: false,
      };
    } catch (error) {
      const status =
        error instanceof AuthSessionRequestError ? error.status : null;
      const isTerminalFailure = isTerminalRefreshStatus(status);

      if (isTerminalFailure) {
        refreshBlockedStatus = status;
        await resetClientSession();
      }

      return {
        accessToken: null,
        payload: null,
        status,
        blocked: isTerminalFailure,
        redirected: isTerminalFailure
          ? await redirectToLoginOnce(trigger, status)
          : false,
      };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function refreshServerSession(trigger = "unknown") {
  const result = await requestSessionRefresh(trigger);

  if (!result.payload) {
    throw new AuthSessionRequestError(
      "Failed to refresh auth session",
      result.status ?? 500,
    );
  }

  return result.payload;
}

export async function clearServerSession() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function applyClientSession(payload: SessionSyncPayload) {
  if (payload.accessToken || payload.refreshToken || payload.sessionToken) {
    clearRefreshBlock();
  }

  setClientAuthCookies(payload);

  if (payload.accessToken) {
    useAuthStore.getState().setToken(payload.accessToken);
  }
}

export async function resetClientSession() {
  clearClientAuthCookies();
  useAuthStore.getState().clearAuth();
  await clearServerSession();
}
