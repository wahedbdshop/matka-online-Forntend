import { parseSpbossHomepage } from "@/lib/spboss-parser";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch("https://spboss.mobi/", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          message: "Failed to fetch external result source.",
          data: { results: [] },
        },
        { status: 502 },
      );
    }

    const html = await response.text();
    const parsed = parseSpbossHomepage(html);

    return Response.json({
      success: true,
      message: "ok",
      data: {
        source: "SPBoss public website",
        lastUpdated: parsed.resultDate,
        results: parsed.results,
      },
    });
  } catch {
    return Response.json(
      {
        success: false,
        message: "External result source is unavailable.",
        data: { results: [] },
      },
      { status: 502 },
    );
  }
}
