/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Trophy, RotateCcw } from "lucide-react";
import { AdminService } from "@/services/admin.service";

// ─── Helpers ──────────────────────────────────────────────────
const calcTotal = (digits: string): string => {
  const sum = digits.split("").reduce((s, d) => s + Number(d), 0);
  const str = String(sum);
  return str.length > 1 ? str[str.length - 1] : str;
};

const getPermutations = (str: string): string[] => {
  if (str.length <= 1) return [str];
  const result = new Set<string>();
  for (let i = 0; i < str.length; i++) {
    const rest = str.slice(0, i) + str.slice(i + 1);
    for (const perm of getPermutations(rest)) result.add(str[i] + perm);
  }
  return [...result];
};

const deriveResults = (threeUp: string, down: string) => {
  const valid3 = /^\d{3}$/.test(threeUp);
  const valid2 = /^\d{2}$/.test(down);
  return {
    rumble: valid3 ? getPermutations(threeUp) : [],
    single3: valid3 ? [...new Set(threeUp.split(""))].join(", ") : "",
    total3: valid3 ? calcTotal(threeUp) : "",
    twoUp: valid3 ? threeUp.slice(1) : "",
    singleDown: valid2 ? [...new Set(down.split(""))].join(", ") : "",
    totalDown: valid2 ? calcTotal(down) : "",
  };
};

function InputForm({
  onSubmit,
  isPending,
  submitLabel,
  submitColor,
  isEdit = false,
  threeUp,
  setThreeUp,
  downDirect,
  setDownDirect,
  publishPublic,
  setPublishPublic,
  editNote,
  setEditNote,
  derived,
  canSubmit,
}: {
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
  submitColor: string;
  isEdit?: boolean;
  threeUp: string;
  setThreeUp: (v: string) => void;
  downDirect: string;
  setDownDirect: (v: string) => void;
  publishPublic: boolean;
  setPublishPublic: (v: boolean) => void;
  editNote: string;
  setEditNote: (v: string) => void;
  derived: ReturnType<typeof deriveResults>;
  canSubmit: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            3Up Direct <span className="text-slate-500">(3 digit)</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={threeUp}
            onChange={(e) =>
              setThreeUp(e.target.value.replace(/\D/g, "").slice(0, 3))
            }
            placeholder="e.g. 456"
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-center text-lg font-bold tracking-widest text-[#d6b4ff] outline-none placeholder:text-slate-600 focus:border-purple-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            Down Direct <span className="text-slate-500">(2 digit)</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={downDirect}
            onChange={(e) =>
              setDownDirect(e.target.value.replace(/\D/g, "").slice(0, 2))
            }
            placeholder="e.g. 78"
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2.5 text-center text-lg font-bold tracking-widest text-[#ffb020] outline-none placeholder:text-slate-600 focus:border-yellow-500"
          />
        </div>
      </div>

      {(threeUp.length === 3 || downDirect.length === 2) && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">
            Auto Calculated
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <PreviewItem
              label="2Up Direct"
              value={derived.twoUp || "-"}
              color="text-[#71a6ff]"
            />
            <PreviewItem
              label="3Up Total"
              value={derived.total3 || "-"}
              color="text-white"
            />
            <PreviewItem
              label="Down Total"
              value={derived.totalDown || "-"}
              color="text-white"
            />
            <PreviewItem
              label="3Up Single"
              value={derived.single3 || "-"}
              color="text-white"
              small
            />
            <PreviewItem
              label="Down Single"
              value={derived.singleDown || "-"}
              color="text-white"
              small
            />
          </div>
          {derived.rumble.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] uppercase text-slate-500 mb-1.5">
                3Up Rumble
              </p>
              <div className="flex flex-wrap gap-1.5">
                {derived.rumble.map((r) => (
                  <span
                    key={r}
                    className="rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Toggle
        value={publishPublic}
        onChange={setPublishPublic}
        label="Publish Public Result"
      />

      {isEdit && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">
            Note (optional)
          </label>
          <input
            type="text"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Why is this being edited..."
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
          />
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isPending}
        className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${submitColor}`}
      >
        {isPending ? "Processing..." : submitLabel}
      </button>
    </div>
  );
}

function PreviewItem({
  label,
  value,
  color,
  small = false,
}: {
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-center">
      <p className="text-[9px] uppercase text-slate-500">{label}</p>
      <p
        className={`mt-1 font-bold tracking-widest ${small ? "text-sm" : "text-lg"} ${color}`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────
function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-blue-500" : "bg-slate-600"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function ThaiRoundResultPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [threeUp, setThreeUp] = useState("");
  const [downDirect, setDownDirect] = useState("");
  const [publishPublic, setPublishPublic] = useState(false);
  const [editNote, setEditNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["agent-thai-round", id],
    queryFn: () => AdminService.getThaiRoundById(id),
  });

  const round = data?.data;
  const derived = deriveResults(threeUp, downDirect);
  const canSubmit = /^\d{3}$/.test(threeUp) && /^\d{2}$/.test(downDirect);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["agent-thai-round", id] });
    queryClient.invalidateQueries({ queryKey: ["agent-thai-rounds"] });
  };

  const { mutate: setResult, isPending: settingResult } = useMutation({
    mutationFn: () =>
      AdminService.setThaiResult(id, {
        resultThreeUpDirect: threeUp,
        resultTwoUpDirect: derived.twoUp,
        resultDownDirect: downDirect,
        publishPublicResult: publishPublic,
      }),
    onSuccess: () => {
      toast.success("Result set — bets being settled");
      invalidate();
      setThreeUp("");
      setDownDirect("");
      router.push(`/agent/thai-lottery/rounds/${id}/bets?status=WON`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const { mutate: editResult, isPending: editingResult } = useMutation({
    mutationFn: () =>
      AdminService.editThaiResult(id, {
        resultThreeUpDirect: threeUp,
        resultTwoUpDirect: derived.twoUp,
        resultDownDirect: downDirect,
        publishPublicResult: publishPublic,
        note: editNote || undefined,
      }),
    onSuccess: () => {
      toast.success("Result updated");
      invalidate();
      setThreeUp("");
      setDownDirect("");
      setEditNote("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  if (isLoading)
    return (
      <div className="space-y-4 max-w-lg animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-700" />
        <div className="h-64 rounded-xl bg-slate-800" />
      </div>
    );

  if (!round) return <p className="text-slate-400">Round not found</p>;

  const isClosed = round.status === "CLOSED";
  const isResulted = round.status === "RESULTED";
  const isOpen = round.status === "OPEN";
  const editRemaining = 4 - (round.editCount ?? 0);

  // Not eligible
  if (isOpen) {
    return (
      <div className="space-y-5 max-w-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/agent/thai-lottery/rounds/${id}`)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Set Result</h1>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6 text-center space-y-2">
          <p className="text-slate-400">
            Round is still <strong className="text-green-400">OPEN</strong>.
          </p>
          <p className="text-xs text-slate-500">
            Close the round first before setting result.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/agent/thai-lottery/rounds/${id}`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">
            {isResulted ? "Edit Result" : "Set Result"}
          </h1>
          <p className="text-xs text-slate-400">Round #{round.issueNumber}</p>
        </div>
        {isResulted && (
          <span className="ml-auto rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-400">
            {editRemaining} edits left
          </span>
        )}
      </div>

      {/* Current result (if resulted) */}
      {isResulted && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "3Up Direct",
              value: round.resultThreeUpDirect,
              color: "text-[#d6b4ff]",
            },
            {
              label: "2Up Direct",
              value: round.resultTwoUpDirect,
              color: "text-[#71a6ff]",
            },
            {
              label: "Down",
              value: round.resultDownDirect,
              color: "text-[#ffb020]",
            },
          ].map((r) => (
            <div
              key={r.label}
              className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center"
            >
              <p className="text-[10px] uppercase text-slate-500">{r.label}</p>
              <p
                className={`text-2xl font-bold tracking-widest mt-1 ${r.color}`}
              >
                {r.value ?? "-"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Set Result form */}
      {isClosed && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">Set Result</h2>
          </div>
          <p className="text-xs text-slate-400">
            Submitting the result will automatically settle all bets.
          </p>
          <InputForm
            onSubmit={() => setResult()}
            isPending={settingResult}
            submitLabel="Confirm & Settle Bets"
            submitColor="bg-green-600 hover:bg-green-700"
            threeUp={threeUp}
            setThreeUp={setThreeUp}
            downDirect={downDirect}
            setDownDirect={setDownDirect}
            publishPublic={publishPublic}
            setPublishPublic={setPublishPublic}
            editNote={editNote}
            setEditNote={setEditNote}
            derived={derived}
            canSubmit={canSubmit}
          />
        </div>
      )}

      {/* Edit Result form */}
      {isResulted && editRemaining > 0 && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-white">Edit Result</h2>
          </div>
          <p className="text-xs text-slate-400">
            Previous winners will be adjusted and new winners will be paid.
          </p>
          <InputForm
            onSubmit={() => editResult()}
            isPending={editingResult}
            submitLabel="Update Result"
            submitColor="bg-orange-600 hover:bg-orange-700"
            isEdit
            threeUp={threeUp}
            setThreeUp={setThreeUp}
            downDirect={downDirect}
            setDownDirect={setDownDirect}
            publishPublic={publishPublic}
            setPublishPublic={setPublishPublic}
            editNote={editNote}
            setEditNote={setEditNote}
            derived={derived}
            canSubmit={canSubmit}
          />
        </div>
      )}

      {isResulted && editRemaining <= 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 text-center">
          <p className="text-slate-400 text-sm">
            Edit limit (4) reached. No more edits allowed.
          </p>
        </div>
      )}
    </div>
  );
}
