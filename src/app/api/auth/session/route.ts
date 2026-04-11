import { cookies } from "next/headers";
import { applySessionCookies, SessionTokens } from "@/lib/server-auth";

export async function POST(request: Request) {
  const body = (await request.json()) as SessionTokens;
  const cookieStore = await cookies();
  applySessionCookies(cookieStore, body);

  return Response.json({
    success: true,
    message: "Session synced",
    data: null,
  });
}
