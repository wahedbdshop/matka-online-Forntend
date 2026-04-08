/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminService } from "@/services/admin.service";

export function GlobalToggles() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["global-settings"],
    queryFn: () => AdminService.getSettings("global"),
  });

  const settings = data?.data ?? [];
  const getSetting = (key: string) =>
    settings.find((s: any) => s.key === key)?.value ?? "";

  const { mutate: toggle } = useMutation({
    mutationFn: ({ key, value }: { key: string; value: boolean }) =>
      AdminService.setGlobalToggle(key, value),
    onSuccess: () => {
      toast.success("Setting updated");
      queryClient.invalidateQueries({ queryKey: ["global-settings"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const items = [
    { key: "global_deposit", label: "All Deposits" },
    { key: "global_transfer", label: "All Transfers" },
    { key: "global_withdraw", label: "All Withdrawals" },
  ];

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">
          Global Restrictions
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Turn these controls on or off for all users at once
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const on = getSetting(item.key) !== "false";
          return (
            <div
              key={item.key}
              className={`rounded-lg border p-3 flex items-center justify-between transition-colors ${
                on
                  ? "border-slate-700 bg-slate-900"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <div>
                <p className="text-xs font-medium text-white">{item.label}</p>
                <p
                  className={`text-[10px] mt-0.5 ${on ? "text-green-400" : "text-red-400"}`}
                >
                  {on ? "Enabled" : "Disabled"}
                </p>
              </div>
              <button
                onClick={() => toggle({ key: item.key, value: !on })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  on ? "bg-green-500" : "bg-red-500/60"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    on ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
