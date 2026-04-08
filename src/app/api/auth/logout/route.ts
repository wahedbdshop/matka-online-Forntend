import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  [
    "accessToken",
    "auth_token",
    "refreshToken",
    "refresh_token",
    "betterAuthSession",
    "token",
    "auth_flag",
  ].forEach((name) => {
    cookieStore.delete(name);
  });

  return Response.json({
    success: true,
    message: "Logged out locally",
    data: null,
  });
}
