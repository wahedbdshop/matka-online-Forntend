/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import Link from "next/link";
import { consumePendingLoginPopup } from "@/lib/login-popup";

export function PopupBanner({ popup }: { popup: any }) {
  const [show, setShow] = useState<boolean>(() => {
    if (!popup) return false;
    if (typeof window === "undefined") return false;

    const shouldForceShow = consumePendingLoginPopup();
    const key = `popup_seen_${popup.id}`;
    if (sessionStorage.getItem(key) && !shouldForceShow) return false;

    sessionStorage.setItem(key, "1");
    return true;
  });

  if (!show || !popup) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
      onClick={() => setShow(false)}
    >
      <div
        className="relative max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {popup.linkUrl ? (
          <Link href={popup.linkUrl} onClick={() => setShow(false)}>
            <img
              src={popup.imageUrl}
              alt=""
              loading="eager"
              decoding="async"
              className="w-full rounded-xl"
            />
          </Link>
        ) : (
          <img
            src={popup.imageUrl}
            alt=""
            loading="eager"
            decoding="async"
            className="w-full rounded-xl"
          />
        )}
        <button
          onClick={() => setShow(false)}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
}
