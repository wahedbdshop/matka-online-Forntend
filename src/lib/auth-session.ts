import { clearClientAuthCookies, setClientAuthCookies } from "@/lib/auth-cookie";
import { useAuthStore } from "@/store/auth.store";

export type SessionSyncPayload = {
  accessToken?: string | null;
  refreshToken?: string | null;
  sessionToken?: string | null;
};

export type RefreshedSessionPayload = SessionSyncPayload & {
  user?: unknown;
};

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
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to refresh auth session");
  }

  return parseJsonResponse<{ data: RefreshedSessionPayload }>(response);
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
