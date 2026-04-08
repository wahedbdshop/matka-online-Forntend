import { cookies } from "next/headers";

type SessionPayload = {
  accessToken?: string | null;
  refreshToken?: string | null;
  sessionToken?: string | null;
};

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  path: "/",
};

const flagCookieOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: false,
  path: "/",
};

export async function POST(request: Request) {
  const body = (await request.json()) as SessionPayload;
  const cookieStore = await cookies();

  if (body.accessToken) {
    cookieStore.set("accessToken", body.accessToken, baseCookieOptions);
    cookieStore.set("auth_token", body.accessToken, baseCookieOptions);
  }

  if (body.refreshToken) {
    cookieStore.set("refreshToken", body.refreshToken, baseCookieOptions);
    cookieStore.set("refresh_token", body.refreshToken, baseCookieOptions);
  }

  if (body.sessionToken) {
    cookieStore.set("betterAuthSession", body.sessionToken, baseCookieOptions);
    cookieStore.set("token", body.sessionToken, baseCookieOptions);
  }

  // Non-httpOnly flag so client JS can detect authenticated state
  cookieStore.set("auth_flag", "1", flagCookieOptions);

  return Response.json({
    success: true,
    message: "Session synced",
    data: null,
  });
}
