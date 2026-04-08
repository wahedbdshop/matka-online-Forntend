import { KalyanGameRatePageContent } from "@/app/(user)/kalyan/game-rate/page";

export default function PublicKalyanGameRatePage() {
  return (
    <main className="min-h-screen bg-[#020810] px-4 py-3 text-white">
      <div className="mx-auto w-full max-w-[480px]">
        <KalyanGameRatePageContent backHref="/" />
      </div>
    </main>
  );
}
