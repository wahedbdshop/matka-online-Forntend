import { KalyanResultPageContent } from "../(user)/kalyan/result/page";

export default function PublicKalyanResultPage() {
  return (
    <main className="min-h-screen bg-[#020810] px-4 py-3 text-white">
      <div className="mx-auto w-full max-w-[480px]">
        <KalyanResultPageContent backHref="/" />
      </div>
    </main>
  );
}
