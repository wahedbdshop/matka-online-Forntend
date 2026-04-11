import { cookies } from "next/headers";
import { refreshBackendSession } from "@/lib/server-auth";
import type { User } from "@/store/auth.store";

export type InitialSession = {
  user: User | null;
  accessToken: string | null;
};

function buildCookieHeader(
  entries: Array<{ name: string; value: string }>,
): string | null {
  if (entries.length === 0) return null;

  return entries.map(({ name, value }) => `${name}=${value}`).join("; ");
}

async function getSessionUser(accessToken: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl}/user/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const body = (await response.json()) as { data?: User };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function getInitialSession(): Promise<InitialSession> {
  const cookieStore = await cookies();
  const cookieEntries = cookieStore.getAll();

  let accessToken =
    cookieStore.get("accessToken")?.value ??
    cookieStore.get("auth_token")?.value ??
    null;
  const refreshToken =
    cookieStore.get("refreshToken")?.value ??
    cookieStore.get("refresh_token")?.value ??
    null;

  let user = accessToken ? await getSessionUser(accessToken) : null;

  if (!user && refreshToken) {
    const refreshed = await refreshBackendSession({
      cookieHeader: buildCookieHeader(cookieEntries),
      refreshToken,
    });

    if (refreshed?.accessToken) {
      accessToken = refreshed.accessToken;
      user =
        (refreshed.user as User | null | undefined) ??
        (await getSessionUser(refreshed.accessToken));
    }
  }

  return {
    user,
    accessToken: user ? accessToken : null,
  };
}
