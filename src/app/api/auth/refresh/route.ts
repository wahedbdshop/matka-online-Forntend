import { cookies } from "next/headers";
import {
  applySessionCookies,
  clearSessionCookies,
  refreshBackendSession,
} from "@/lib/server-auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken =
    cookieStore.get("refreshToken")?.value ??
    cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    clearSessionCookies(cookieStore);

    return Response.json(
      {
        success: false,
        message: "Refresh token is missing",
        data: null,
      },
      { status: 401 },
    );
  }

  const refreshed = await refreshBackendSession({
    cookieHeader: request.headers.get("cookie"),
    refreshToken,
  });

  if (!refreshed?.accessToken) {
    clearSessionCookies(cookieStore);

    return Response.json(
      {
        success: false,
        message: "Session refresh failed",
        data: null,
      },
      { status: 401 },
    );
  }

  applySessionCookies(cookieStore, refreshed);

  return Response.json({
    success: true,
    message: "Session refreshed",
    data: refreshed,
  });
}
