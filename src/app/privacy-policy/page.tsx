import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";

const privacySections = [
  {
    title: "Information We Use",
    body:
      "We may use basic account, profile, and activity information only to operate the platform, improve the service, and support normal user flows.",
  },
  {
    title: "How Data Is Protected",
    body:
      "We aim to keep user information protected through controlled access, secure workflows, and regular platform maintenance.",
  },
  {
    title: "Platform Usage",
    body:
      "By using the site, users agree that information needed for account access, results, and feature delivery can be processed for normal operation.",
  },
  {
    title: "Policy Updates",
    body:
      "This privacy policy can be updated when features or operational requirements change. Updated terms will apply after publication on the site.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] px-4 py-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back Home</span>
        </Link>

        <section className="rounded-[28px] border border-slate-700/70 bg-[linear-gradient(180deg,#16213d_0%,#0d1526_100%)] p-6 shadow-[0_20px_45px_rgba(2,6,23,0.35)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-300">
                Privacy Policy
              </p>
              <h1 className="mt-1 text-3xl font-black text-white">Your Privacy Matters</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            This page explains the general way Matka Online 24 handles platform
            information, protects user data, and updates privacy-related terms.
          </p>
        </section>

        <section className="grid gap-3">
          {privacySections.map((section, index) => (
            <div
              key={section.title}
              className="rounded-[24px] border border-slate-700/70 bg-slate-900/60 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-sm font-black text-emerald-300">
                  0{index + 1}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{section.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {section.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[24px] border border-slate-700/70 bg-slate-900/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10">
              <Lock className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Contact and Questions</h2>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                If privacy terms are updated or you need clarification, please use
                the support options available on the platform.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
