/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

// ── Inline SVG logos for static international methods ─────────────────────

function VisaLogo() {
  return (
    <svg viewBox="0 0 80 26" className="h-8 w-auto" aria-label="Visa">
      <text x="2" y="22" fill="#1A1F71" fontSize="26" fontWeight="900"
        fontFamily="Arial" fontStyle="italic" letterSpacing="-1">
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 54 34" className="h-8 w-auto" aria-label="Mastercard">
      <circle cx="20" cy="17" r="14" fill="#EB001B" />
      <circle cx="34" cy="17" r="14" fill="#F79E1B" />
      <path d="M27 6.8a14 14 0 0 1 0 20.4A14 14 0 0 1 27 6.8z" fill="#FF5F00" />
    </svg>
  );
}

function PaypalLogo() {
  return (
    <svg viewBox="0 0 90 28" className="h-8 w-auto" aria-label="PayPal">
      <text x="2" y="21" fontSize="14" fontWeight="bold" fontFamily="Arial">
        <tspan fill="#003087">Pay</tspan><tspan fill="#009CDE">Pal</tspan>
      </text>
      <circle cx="62" cy="11" r="9" fill="#009CDE" opacity="0.25" />
      <circle cx="68" cy="11" r="9" fill="#003087" opacity="0.25" />
    </svg>
  );
}

function AmexLogo() {
  return (
    <svg viewBox="0 0 96 36" className="h-8 w-auto" aria-label="American Express">
      <text x="48" y="14" fill="#2E77BC" fontSize="9" fontWeight="900"
        textAnchor="middle" fontFamily="Arial" letterSpacing="2.5">
        AMERICAN
      </text>
      <text x="48" y="28" fill="#2E77BC" fontSize="9" fontWeight="900"
        textAnchor="middle" fontFamily="Arial" letterSpacing="2.5">
        EXPRESS
      </text>
      {/* thin blue underline */}
      <rect x="8" y="31" width="80" height="1.5" rx="1" fill="#2E77BC" opacity="0.4" />
    </svg>
  );
}

function UpiLogo() {
  return (
    <svg viewBox="0 0 70 30" className="h-8 w-auto" aria-label="UPI">
      {/* Multi-color UPI official style */}
      <text x="2" y="24" fontSize="26" fontWeight="900" fontFamily="Arial" letterSpacing="-0.5">
        <tspan fill="#097939">U</tspan>
        <tspan fill="#ED1C24">P</tspan>
        <tspan fill="#F7941D">I</tspan>
      </text>
    </svg>
  );
}

function PhonePeLogo() {
  return (
    <svg viewBox="0 0 92 30" className="h-8 w-auto" aria-label="PhonePe">
      {/* Purple dot + text */}
      <circle cx="13" cy="15" r="12" fill="#5f259f" />
      <text x="13" y="20" fill="white" fontSize="13" fontWeight="900"
        textAnchor="middle" fontFamily="Arial">
        P
      </text>
      <text x="52" y="21" fill="#5f259f" fontSize="15" fontWeight="800"
        textAnchor="middle" fontFamily="Arial">
        PhonePe
      </text>
    </svg>
  );
}

function GPayLogo() {
  return (
    <svg viewBox="0 0 90 28" className="h-8 w-auto" aria-label="Google Pay">
      <text x="0" y="21" fontSize="15" fontWeight="bold" fontFamily="Arial">
        <tspan fill="#4285F4">G</tspan>
        <tspan fill="#EA4335">o</tspan>
        <tspan fill="#FBBC04">o</tspan>
        <tspan fill="#4285F4">g</tspan>
        <tspan fill="#34A853">l</tspan>
        <tspan fill="#EA4335">e </tspan>
        <tspan fill="#5F6368" fontSize="15">Pay</tspan>
      </text>
    </svg>
  );
}

function PaytmLogo() {
  return (
    <svg viewBox="0 0 72 30" className="h-8 w-auto" aria-label="Paytm">
      {/* Paytm: dark blue "Pay" + light blue "tm" */}
      <text x="2" y="23" fontSize="22" fontWeight="900" fontFamily="Arial">
        <tspan fill="#002970">Pay</tspan>
        <tspan fill="#00BAF2">tm</tspan>
      </text>
    </svg>
  );
}

function NetBankingLogo() {
  return (
    <svg viewBox="0 0 100 34" className="h-8 w-auto" aria-label="Net Banking">
      {/* Bank building icon + text */}
      <rect x="38" y="14" width="24" height="14" rx="1" fill="#1565C0" />
      <polygon points="50,6 36,14 64,14" fill="#1565C0" />
      <rect x="41" y="17" width="4" height="8" rx="1" fill="white" />
      <rect x="48" y="17" width="4" height="8" rx="1" fill="white" />
      <rect x="55" y="17" width="4" height="8" rx="1" fill="white" />
      <text x="50" y="32" fill="#1565C0" fontSize="8" fontWeight="800"
        textAnchor="middle" fontFamily="Arial" letterSpacing="1">
        NET BANKING
      </text>
    </svg>
  );
}

function ImpsLogo() {
  return (
    <svg viewBox="0 0 72 30" className="h-8 w-auto" aria-label="IMPS">
      {/* Orange bold text logo style */}
      <text x="36" y="24" fill="#E65100" fontSize="22" fontWeight="900"
        textAnchor="middle" fontFamily="Arial" letterSpacing="1">
        IMPS
      </text>
      {/* underline accent */}
      <rect x="4" y="27" width="64" height="2" rx="1" fill="#E65100" opacity="0.4" />
    </svg>
  );
}

function UsdtLogo() {
  return (
    <svg viewBox="0 0 72 30" className="h-8 w-auto" aria-label="USDT">
      {/* Tether green style */}
      <text x="36" y="22" fill="#26A17B" fontSize="20" fontWeight="900"
        textAnchor="middle" fontFamily="Arial" letterSpacing="1">
        USDT
      </text>
      {/* Tether ₮ style underline */}
      <rect x="4" y="25" width="64" height="2" rx="1" fill="#26A17B" opacity="0.5" />
    </svg>
  );
}

const STATIC_METHODS = [
  { id: "visa",       logo: <VisaLogo /> },
  { id: "mastercard", logo: <MastercardLogo /> },
  { id: "paypal",     logo: <PaypalLogo /> },
  { id: "amex",       logo: <AmexLogo /> },
  { id: "upi",        logo: <UpiLogo /> },
  { id: "phonepe",    logo: <PhonePeLogo /> },
  { id: "gpay",       logo: <GPayLogo /> },
  { id: "paytm",      logo: <PaytmLogo /> },
  { id: "netbanking", logo: <NetBankingLogo /> },
  { id: "imps",       logo: <ImpsLogo /> },
  { id: "usdt",       logo: <UsdtLogo /> },
];

// Local public logos override (takes priority over API logo)
const V = "?v=2";
const LOCAL_LOGOS: Record<string, string> = {
  bkash:        `/bkash.jpg${V}`,
  nagad:        `/nagad.png${V}`,
  rocket:       `/rocket.png${V}`,
  bank:         `/Bank.jpeg${V}`,
  "local bank": `/Bank.jpeg${V}`,
  localbank:    `/Bank.jpeg${V}`,
};

// ── API method card (logo from server) ────────────────────────────────────
function ApiLogoCard({ name, logo }: { name: string; logo?: string }) {
  const [failed, setFailed] = useState(false);

  const NAME_BRAND: Record<string, { bg: string; text: string }> = {
    bkash:        { bg: "#E2136E", text: "#fff" },
    nagad:        { bg: "#F4821F", text: "#fff" },
    rocket:       { bg: "#8B1782", text: "#fff" },
    bank:         { bg: "#1565C0", text: "#fff" },
    "local bank": { bg: "#1565C0", text: "#fff" },
    localbank:    { bg: "#1565C0", text: "#fff" },
    whatsapp:     { bg: "#25D366", text: "#fff" },
    usdt:         { bg: "#26A17B", text: "#fff" },
  };

  const key = String(name ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const brand = NAME_BRAND[key];
  const label = name ?? "Pay";

  // Use local public image if available (overrides API logo)
  const src = LOCAL_LOGOS[key] ?? (failed ? undefined : logo);

  if (src) {
    const isBkash = key === "bkash";
    return (
      <img
        src={src}
        alt={name}
        className="w-auto object-contain"
        style={{
          height: "34px",
          maxWidth: "110px",
          filter: isBkash ? "drop-shadow(0 0 0px transparent) contrast(0.88) saturate(0.85)" : undefined,
        }}
        onError={() => setFailed(true)}
      />
    );
  }

  const bg = brand?.bg ?? "#334155";
  const color = brand?.text ?? "#fff";
  const w = Math.max(72, label.length * 9 + 20);

  return (
    <svg viewBox={`0 0 ${w} 36`} className="h-8 w-auto" aria-label={label}>
      <rect width={w} height="36" rx="5" fill={bg} />
      <text x={w / 2} y="24" fill={color} fontSize="14" fontWeight="bold"
        textAnchor="middle" fontFamily="Arial">
        {label}
      </text>
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function PaymentMethodsRow({ methods }: { methods: any[] }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const staticIds = new Set(STATIC_METHODS.map((m) => m.id));
  const apiMethods = methods.filter(
    (m: any) => !staticIds.has(String(m.name ?? "").toLowerCase().replace(/\s+/g, "")),
  );

  const handleClick = () => {
    router.push(isAuthenticated ? "/deposit" : "/login");
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Accepted Payment Methods
      </p>

      <div className="grid grid-cols-3 gap-2">
        {/* API methods — clickable */}
        {apiMethods.map((m: any) => (
          <button
            key={m.id}
            type="button"
            onClick={handleClick}
            className="flex items-center justify-center rounded-lg bg-white px-3 py-2.5 min-h-13 cursor-pointer select-none transition-all duration-150 active:scale-95 active:brightness-90 hover:shadow-md hover:shadow-black/30"
          >
            <ApiLogoCard name={m.name} logo={m.logo} />
          </button>
        ))}

        {/* Static international methods */}
        {STATIC_METHODS.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-center rounded-lg bg-white px-3 py-2.5 min-h-13"
          >
            {m.logo}
          </div>
        ))}
      </div>
    </div>
  );
}
