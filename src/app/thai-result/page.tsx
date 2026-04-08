import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import ThaiLotteryResultsPage from "../(user)/thai-lottery/results/page";

export default function PublicThaiResultPage() {
  return (
    <main className="min-h-screen bg-[#020810] px-4 py-4 text-white">
      <div className="mx-auto w-full max-w-[480px] space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>

        <ThaiLotteryResultsPage publicView />
      </div>
    </main>
  );
}
