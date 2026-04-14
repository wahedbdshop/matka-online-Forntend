import { NextResponse } from "next/server";
import moment from "moment-timezone";

const BANGLADESH_TIME_ZONE = "Asia/Dhaka";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const bangladeshNow = moment(now).tz(BANGLADESH_TIME_ZONE);

  return NextResponse.json(
    {
      nowIso: now.toISOString(),
      nowUnixMs: now.getTime(),
      timezone: BANGLADESH_TIME_ZONE,
      bangladeshDate: bangladeshNow.format("YYYY-MM-DD"),
      bangladeshTime: bangladeshNow.format("HH:mm:ss"),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
