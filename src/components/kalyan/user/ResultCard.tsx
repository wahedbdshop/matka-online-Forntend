import { KalyanGroupedResult } from "@/types/kalyan";

interface ResultCardProps {
  result: KalyanGroupedResult;
}

const CARD_THEME = {
  shell:
    "bg-[#231706] hover:border-amber-400/45 hover:shadow-[0_18px_38px_rgba(251,191,36,0.16)]",
  glow: "bg-amber-400/8",
  rim: "bg-amber-300/55",
  side: "bg-amber-400/10 group-hover:border-amber-300/45",
  title: "text-amber-100 group-hover:text-white",
  chip: "border-amber-300/22 bg-amber-400/10 text-amber-50",
  done: "text-amber-300 drop-shadow-[0_0_20px_rgba(252,211,77,0.28)]",
  partial: "text-orange-300 drop-shadow-[0_0_20px_rgba(253,186,116,0.22)]",
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
      className={`group relative w-full max-w-md overflow-hidden rounded-[1.1rem] border border-white/8 text-center shadow-[0_10px_22px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-0.5 sm:max-w-lg sm:rounded-[1.25rem] ${theme.shell}`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] ${theme.rim}`} />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-10 opacity-60 blur-xl ${theme.glow}`} />
      <div className="relative px-2.5 py-2.5 sm:px-3 sm:py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${theme.chip}`}>
            {statusText}
          </div>
          {dateText ? (
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300/90 sm:text-[10px]">
              {dateText}
            </p>
          ) : null}
        </div>

        <p
          className={`text-center text-[0.74rem] font-black uppercase italic tracking-[0.04em] transition-colors duration-300 sm:text-[0.82rem] ${theme.title}`}
        >
          {result.title}
        </p>

        <div className="mt-2.5 grid grid-cols-[46px_1fr_46px] items-center gap-1.5 sm:mt-3 sm:grid-cols-[56px_1fr_56px] sm:gap-2">
          <div
            className={`flex h-8 items-center justify-center rounded-lg border border-white/10 px-1 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-100/90 transition-all duration-300 sm:h-9 sm:rounded-xl sm:text-[9px] ${theme.side}`}
          >
            Jori
          </div>

          <div className="min-w-0 rounded-[0.95rem] border border-white/8 bg-black/12 px-2 py-1.5 sm:rounded-[1.05rem] sm:px-2.5 sm:py-2">
            <p
              className={`font-black tracking-[0.03em] ${
                isPending
                  ? "text-[0.88rem] italic text-slate-300/70 group-hover:text-slate-200 sm:text-[1rem]"
                  : hasPartialResult
                    ? `text-[1.02rem] sm:text-[1.16rem] ${theme.partial}`
                    : `text-[1.04rem] sm:text-[1.18rem] ${theme.done}`
              }`}
            >
              {resultText}
            </p>
          </div>

          <div
            className={`flex h-8 items-center justify-center rounded-lg border border-white/10 px-1 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-100/90 transition-all duration-300 sm:h-9 sm:rounded-xl sm:text-[9px] ${theme.side}`}
          >
            Patti
          </div>
        </div>
      </div>
    </div>
  );
}
