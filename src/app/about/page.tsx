import Link from "next/link";
import { ArrowLeft, Shield, Trophy, Users } from "lucide-react";

const highlights = [
  {
    title: "Trusted Experience",
    description:
      "Matka Online 24 is built to keep gameplay simple, fast, and easy to follow for every user.",
    icon: Shield,
  },
  {
    title: "Live Results",
    description:
      "Thai and Kalyan result sections are organized for quick access so users can check updates without confusion.",
    icon: Trophy,
  },
  {
    title: "User First",
    description:
      "We focus on a clear interface, responsive support, and reliable information across the platform.",
    icon: Users,
  },
];

export default function AboutPage() {
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
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-sky-300">
            About Us
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">Matka Online 24</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Matka Online 24 provides a clean and modern experience for users who
            want to follow Thai Lottery and Kalyan updates in one place. Our goal
            is to keep the platform simple, reliable, and easy to use on both
            mobile and desktop.
          </p>
        </section>

        <section className="grid gap-3">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[24px] border border-slate-700/70 bg-slate-900/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10">
                    <Icon className="h-5 w-5 text-sky-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-[24px] border border-slate-700/70 bg-slate-900/60 p-5">
          <h2 className="text-lg font-bold text-white">What We Focus On</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            <p>Clear result pages for Thai Lottery and Kalyan users.</p>
            <p>Fast navigation with mobile-friendly design.</p>
            <p>Consistent updates and a more polished overall experience.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
