/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
const METHOD_EMOJI: Record<string, string> = {
  bkash: "📱",
  nagad: "💳",
  rocket: "🚀",
  whatsapp: "💬",
  usdt: "💰",
  bank: "🏦",
};

export function PaymentMethodsRow({ methods }: { methods: any[] }) {
  if (!methods.length) return null;
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Payment Methods
      </p>
      <div className="flex flex-wrap gap-2">
        {methods.map((m: any) => (
          <div
            key={m.id}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-700/40 px-3 py-1.5"
          >
            {m.logo ? (
              <img
                src={m.logo}
                alt={m.name}
                className="w-5 h-5 object-contain"
              />
            ) : (
              <span className="text-base">
                {METHOD_EMOJI[m.name?.toLowerCase()] ?? "💳"}
              </span>
            )}
            <span className="text-xs text-slate-300 capitalize">{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
