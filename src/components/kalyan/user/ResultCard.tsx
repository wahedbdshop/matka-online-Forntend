import { KalyanGroupedResult } from "@/types/kalyan";

interface ResultCardProps {
  result: KalyanGroupedResult;
}

const CARD_THEME = {
  shell:
    "bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.10),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#eef6ff_100%)] hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(14,165,233,0.16)] dark:bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.24),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_32%),linear-gradient(135deg,#1b1038_0%,#0c1738_52%,#101f4e_100%)] dark:hover:shadow-[0_18px_44px_rgba(56,189,248,0.24)]",
  border:
    "bg-[linear-gradient(90deg,rgba(255,95,109,0.96)_0%,rgba(217,70,239,0.92)_32%,rgba(96,165,250,0.96)_68%,rgba(34,211,238,0.96)_100%)]",
  glowLeft: "bg-pink-300/35 dark:bg-pink-500/45",
  glowRight: "bg-cyan-300/35 dark:bg-cyan-400/45",
  title: "text-slate-950 dark:text-white dark:drop-shadow-[0_0_14px_rgba(255,255,255,0.18)]",
  chip:
    "border border-white/15 bg-[linear-gradient(90deg,rgba(251,146,60,0.98)_0%,rgba(244,63,94,0.95)_45%,rgba(217,70,239,0.95)_100%)] !text-white shadow-[0_0_18px_rgba(244,114,182,0.24)] dark:shadow-[0_0_18px_rgba(244,114,182,0.35)]",
  date: "text-cyan-700 dark:text-cyan-300 dark:drop-shadow-[0_0_12px_rgba(34,211,238,0.24)]",
  resultShell:
    "border border-cyan-300/55 bg-[linear-gradient(90deg,rgba(236,254,255,0.92)_0%,rgba(248,250,252,0.96)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_22px_rgba(14,165,233,0.10)] dark:border-cyan-400/35 dark:bg-[linear-gradient(90deg,rgba(124,58,237,0.20)_0%,rgba(30,41,59,0.18)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_26px_rgba(59,130,246,0.12)]",
  done: "text-slate-950 dark:text-white dark:drop-shadow-[0_0_18px_rgba(255,255,255,0.26)]",
  partial: "text-amber-700 dark:text-amber-200 dark:drop-shadow-[0_0_16px_rgba(251,191,36,0.26)]",
  sideLeft:
    "border border-pink-300/70 bg-[linear-gradient(90deg,rgba(252,231,243,0.96)_0%,rgba(243,232,255,0.92)_100%)] text-slate-950 shadow-[0_0_18px_rgba(236,72,153,0.12)] dark:border-pink-400/45 dark:bg-[linear-gradient(90deg,rgba(236,72,153,0.9)_0%,rgba(192,38,211,0.68)_100%)] dark:text-white dark:shadow-[0_0_20px_rgba(236,72,153,0.28)]",
  sideRight:
    "border border-cyan-300/70 bg-[linear-gradient(90deg,rgba(224,231,255,0.96)_0%,rgba(207,250,254,0.92)_100%)] text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.12)] dark:border-cyan-400/40 dark:bg-[linear-gradient(90deg,rgba(67,56,202,0.9)_0%,rgba(14,165,233,0.58)_100%)] dark:text-white dark:shadow-[0_0_20px_rgba(34,211,238,0.22)]",
  divider: "bg-slate-300 dark:bg-white/14",
};

function formatCardDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB");
}

function hasOpenResult(result: KalyanGroupedResult) {
  return !!result.openPatti && result.openPatti !== "000";
}

function hasCloseResult(result: KalyanGroupedResult) {
  return !!result.closePatti && result.closePatti !== "000";
}

function getOpenDigit(result: KalyanGroupedResult) {
  if (result.openPatti && result.openPatti !== "000") {
    const sum = result.openPatti
      .split("")
      .reduce((total, digit) => total + Number(digit), 0);
    return String(sum % 10);
  }

  if (result.openTotal !== undefined && result.openTotal !== null) {
    return String(result.openTotal);
  }

  return result.finalResult?.[0] ?? "";
}

function getCloseDigit(result: KalyanGroupedResult) {
  if (result.closePatti && result.closePatti !== "000") {
    const sum = result.closePatti
      .split("")
      .reduce((total, digit) => total + Number(digit), 0);
    return String(sum % 10);
  }

  if (result.closeTotal !== undefined && result.closeTotal !== null) {
    return String(result.closeTotal);
  }

  return result.finalResult?.[1] ?? "";
}

function buildResultText(result: KalyanGroupedResult) {
  const openReady = hasOpenResult(result);
  const closeReady = hasCloseResult(result);

  const openDigit = getOpenDigit(result);
  const closeDigit = getCloseDigit(result);

  if (openReady && closeReady) {
    return `${result.openPatti}-${openDigit}${closeDigit}-${result.closePatti}`;
  }

  if (openReady) {
    return `${result.openPatti}-${openDigit || "X"}X-XXX`;
  }

  if (closeReady) {
    return `XXX-X${closeDigit || "X"}-${result.closePatti}`;
  }

  return "Loading...";
}

export function ResultCard({ result }: ResultCardProps) {
  const resultText = buildResultText(result);
  const isPending = resultText === "Loading...";
  const hasPartialResult = !isPending && (!hasOpenResult(result) || !hasCloseResult(result));
  const dateText = formatCardDate(result.resultDate);
  const theme = CARD_THEME;
  const statusText = isPending
    ? "Awaiting"
    : hasPartialResult
      ? "Live"
      : "Published";

  return (
    <div
      className={`group relative w-full max-w-md overflow-hidden rounded-[1.1rem] p-[1.5px] text-center transition-all duration-300 sm:max-w-lg sm:rounded-[1.25rem] ${theme.border}`}
    >
      <div className="pointer-events-none absolute -left-6 top-4 h-20 w-20 rounded-full blur-3xl sm:h-24 sm:w-24">
        <div className={`h-full w-full rounded-full ${theme.glowLeft}`} />
      </div>
      <div className="pointer-events-none absolute -right-6 bottom-4 h-20 w-20 rounded-full blur-3xl sm:h-24 sm:w-24">
        <div className={`h-full w-full rounded-full ${theme.glowRight}`} />
      </div>

      <div
        className={`relative overflow-hidden rounded-[calc(1.1rem-1.5px)] px-2.5 py-2.5 sm:rounded-[calc(1.25rem-1.5px)] sm:px-3 sm:py-3 ${theme.shell}`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] sm:text-[10px] ${theme.chip}`}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
            {statusText}
          </div>
          {dateText ? (
            <p className={`text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px] ${theme.date}`}>
              {dateText}
            </p>
          ) : null}
        </div>

        <p
          className={`px-2 text-center text-[0.78rem] font-black uppercase tracking-[0.04em] transition-colors duration-300 sm:text-[0.94rem] ${theme.title}`}
        >
          {result.title}
        </p>

        <div className="mt-2.5 sm:mt-3">
          <div className={`min-w-0 rounded-[0.95rem] px-2 py-2.5 sm:rounded-[1.05rem] sm:px-2.5 sm:py-3 ${theme.resultShell}`}>
            <p
              className={`font-black tracking-[0.03em] ${
                isPending
                  ? "text-[0.88rem] italic text-slate-500 group-hover:text-slate-700 dark:text-slate-300/70 dark:group-hover:text-slate-200 sm:text-[1rem]"
                  : hasPartialResult
                    ? `text-[1.02rem] sm:text-[1.16rem] ${theme.partial}`
                    : `text-[1.04rem] sm:text-[1.18rem] ${theme.done}`
              }`}
            >
              {resultText}
            </p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-[1fr_1px_1fr] items-center gap-2 sm:mt-3 sm:gap-3">
          <div
            className={`flex h-8 items-center justify-center rounded-full px-1 text-[8px] font-bold uppercase tracking-[0.08em] sm:h-9 sm:text-[9px] ${theme.sideLeft}`}
          >
            Jori
          </div>

          <div className={`h-10 w-px justify-self-center sm:h-11 ${theme.divider}`} />

          <div
            className={`flex h-8 items-center justify-center rounded-full px-1 text-[8px] font-bold uppercase tracking-[0.08em] sm:h-9 sm:text-[9px] ${theme.sideRight}`}
          >
            Patti
          </div>
        </div>
      </div>
    </div>
  );
}
