import { clearClientAuthCookies, setClientAuthCookies } from "@/lib/auth-cookie";
import { useAuthStore } from "@/store/auth.store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
const REFRESH_ENDPOINT_PATH = "/auth/refresh-token";

export type SessionSyncPayload = {
  accessToken?: string | null;
  refreshToken?: string | null;
  sessionToken?: string | null;
};

export type RefreshedSessionPayload = SessionSyncPayload & {
  user?: unknown;
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

export async function refreshServerSession() {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

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

  return payload;
}

export async function clearServerSession() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function applyClientSession(payload: SessionSyncPayload) {
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
