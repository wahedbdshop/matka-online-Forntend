// src/components/shared/auth-popup.tsx
"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const AuthPopupContext = createContext<{ open: () => void }>({
  open: () => {},
});

export function useAuthPopup() {
  return useContext(AuthPopupContext);
}

export function AuthPopupProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <AuthPopupContext.Provider value={{ open: () => setShow(true) }}>
      {children}
      {show && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShow(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-[24px] border border-slate-700 bg-[#0d1526] p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShow(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Logo */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-lg shadow-purple-500/30">
                M
              </div>
              <p className="text-white font-black text-lg">Matka Online 24</p>
              <p className="text-slate-400 text-xs">
                Log in or create a new account
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-2.5">
              <Link href="/login" onClick={() => setShow(false)}>
                <button className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all hover:scale-[1.01]">
                  Log In
                </button>
              </Link>
              <Link href="/register" onClick={() => setShow(false)}>
                <button className="w-full rounded-xl border border-slate-600 bg-slate-800/60 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-all">
                  Create New Account
                </button>
              </Link>
            </div>

            {/* Bonus info */}
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-center">
              <p className="text-green-400 text-xs font-semibold">
                Register To Get
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                5% referral bonus on every deposit for a lifetime
              </p>
            </div>
          </div>
        </div>
      )}
    </AuthPopupContext.Provider>
  );
}
