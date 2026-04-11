import { cookies } from "next/headers";
import { clearSessionCookies } from "@/lib/server-auth";

export async function POST() {
  const cookieStore = await cookies();
  clearSessionCookies(cookieStore);

  return Response.json({
    success: true,
    message: "Logged out locally",
    data: null,
  });
}
