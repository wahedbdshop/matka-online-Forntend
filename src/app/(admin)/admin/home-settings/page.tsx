/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Plus, Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";

const TABS = [
  "Banners",
  "Marquee",
  "Categories",
  "Fav Slides",
  "Popular Games",
  "Popup",
];

const stripDraftFlags = (item: any) => {
  const nextItem = { ...item };
  delete nextItem.isNew;
  delete nextItem.isDirty;
  return nextItem;
};

export default function HomeSettingsPage() {
  const [activeTab, setActiveTab] = useState("Banners");
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Home Settings</h1>
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === t
                ? "border-blue-500 bg-blue-500/20 text-blue-400"
                : "border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {activeTab === "Banners" && <BannersTab />}
      {activeTab === "Marquee" && <MarqueeTab />}
      {activeTab === "Categories" && <CategoriesTab />}
      {activeTab === "Fav Slides" && <FavSlidesTab />}
      {activeTab === "Popular Games" && <PopularGamesTab />}
      {activeTab === "Popup" && <PopupTab />}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────
function SaveBtn({
  onSave,
  isPending,
}: {
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <button
      onClick={onSave}
      disabled={isPending}
      className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" /> Save All
        </>
      )}
    </button>
  );
}

function Skeleton() {
  return <div className="h-32 rounded-xl bg-slate-700/40 animate-pulse" />;
}

function ImageListEditor({
  title,
  items,
  setItems,
  extraFields,
}: {
  title: string;
  items: any[];
  setItems: (v: any[]) => void;
  extraFields?: { key: string; label: string }[];
}) {
  const add = () =>
    setItems([
      ...items,
      {
        imageUrl: "",
        linkUrl: "",
        sortOrder: items.length,
        isNew: true,
        ...Object.fromEntries((extraFields ?? []).map((f) => [f.key, ""])),
      },
    ]);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const update = (i: number, key: string, val: string) =>
    setItems(
      items.map((item, idx) =>
        idx === i ? { ...item, [key]: val, isDirty: true } : item,
      ),
    );

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={item.id ?? i}
          className={cn(
            "rounded-xl border bg-slate-800/50 p-3 space-y-2",
            item.isNew
              ? "border-blue-500/40"
              : item.isDirty
                ? "border-yellow-500/40"
                : "border-slate-700",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400">#{i + 1}</p>
              {item.isNew && (
                <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
                  New
                </span>
              )}
              {item.isDirty && !item.isNew && (
                <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5">
                  Edited
                </span>
              )}
            </div>
            <button
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {[
            ["imageUrl", "Image URL"],
            ["linkUrl", "Link URL (optional)"],
          ].map(([k, p]) => (
            <input
              key={k}
              value={item[k] ?? ""}
              onChange={(e) => update(i, k, e.target.value)}
              placeholder={p}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
          ))}
          {extraFields?.map((f) => (
            <input
              key={f.key}
              value={item[f.key] ?? ""}
              onChange={(e) => update(i, f.key, e.target.value)}
              placeholder={f.label}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
          ))}
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt=""
              className="h-16 rounded-lg object-cover border border-slate-700"
            />
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-2.5 text-xs text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors w-full justify-center"
      >
        <Plus className="h-3.5 w-3.5" /> Add {title}
      </button>
    </div>
  );
}

// ─── Banners ──────────────────────────────────────────────────
function BannersTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-home-banners"],
    queryFn: () => api.get("/home").then((r) => r.data?.data?.banners ?? []),
  });
  if (isLoading) return <Skeleton />;
  return (
    <BannersForm
      key={JSON.stringify(data)}
      initial={data ?? []}
      onSaved={refetch}
    />
  );
}

function BannersForm({
  initial,
  onSaved,
}: {
  initial: any[];
  onSaved: () => void;
}) {
  const [items, setItems] = useState<any[]>(initial);
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post("/home/banners", items.map(stripDraftFlags)),
    onSuccess: () => {
      toast.success("Banners saved");
      onSaved();
    },
    onError: () => toast.error("Failed"),
  });
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{items.length} banner(s)</p>
      <ImageListEditor title="Banner" items={items} setItems={setItems} />
      <SaveBtn onSave={() => mutate()} isPending={isPending} />
    </div>
  );
}

// ─── Marquee ──────────────────────────────────────────────────
function MarqueeTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-home-marquee"],
    queryFn: () =>
      api.get("/home").then((r) => r.data?.data?.marquees?.[0]?.text ?? ""),
  });
  if (isLoading) return <Skeleton />;
  return <MarqueeForm key={data} initial={data ?? ""} onSaved={refetch} />;
}

function MarqueeForm({
  initial,
  onSaved,
}: {
  initial: string;
  onSaved: () => void;
}) {
  const [text, setText] = useState(initial);
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post("/home/marquee", { text }),
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: () => toast.error("Failed"),
  });
  return (
    <div className="space-y-4 max-w-lg">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Marquee scrolling text..."
        className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500 resize-none"
      />
      {text && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <p className="text-xs text-yellow-300/80 truncate">Preview: {text}</p>
        </div>
      )}
      <SaveBtn onSave={() => mutate()} isPending={isPending} />
    </div>
  );
}

// ─── Categories ───────────────────────────────────────────────
function CategoriesTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-home-categories"],
    queryFn: () => api.get("/home").then((r) => r.data?.data?.categories ?? []),
  });
  if (isLoading) return <Skeleton />;
  return (
    <CategoriesForm
      key={JSON.stringify(data)}
      initial={data ?? []}
      onSaved={refetch}
    />
  );
}

function CategoriesForm({
  initial,
  onSaved,
}: {
  initial: any[];
  onSaved: () => void;
}) {
  const [items, setItems] = useState<any[]>(initial);
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post("/home/categories", items.map(stripDraftFlags)),
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: () => toast.error("Failed"),
  });
  const add = () =>
    setItems([
      ...items,
      {
        name: "",
        slug: "",
        icon: "",
        href: "",
        sortOrder: items.length,
        isNew: true,
      },
    ]);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const update = (i: number, k: string, v: string) =>
    setItems(
      items.map((item, idx) =>
        idx === i ? { ...item, [k]: v, isDirty: true } : item,
      ),
    );

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{items.length} category(s)</p>
      {items.map((item, i) => (
        <div
          key={item.id ?? i}
          className={cn(
            "rounded-xl border bg-slate-800/50 p-3 space-y-2",
            item.isNew
              ? "border-blue-500/40"
              : item.isDirty
                ? "border-yellow-500/40"
                : "border-slate-700",
          )}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400">Category #{i + 1}</p>
              {item.isNew && (
                <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
                  New
                </span>
              )}
              {item.isDirty && !item.isNew && (
                <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5">
                  Edited
                </span>
              )}
            </div>
            <button
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["name", "Name"],
                ["slug", "Slug"],
                ["icon", "Icon (emoji)"],
                ["href", "Link URL"],
              ] as [string, string][]
            ).map(([k, label]) => (
              <input
                key={k}
                value={item[k] ?? ""}
                onChange={(e) => update(i, k, e.target.value)}
                placeholder={label}
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            ))}
          </div>
          {(item.icon || item.name) && (
            <div className="flex items-center gap-2 pt-1">
              <div className="w-10 h-10 rounded-xl border border-slate-600 bg-slate-700 flex items-center justify-center text-xl">
                {item.icon?.startsWith("http") ? (
                  <img
                    src={item.icon}
                    alt=""
                    className="w-7 h-7 object-contain"
                  />
                ) : (
                  item.icon
                )}
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                {item.name}
              </p>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-2 rounded-xl border border-dashed border-slate-600 px-4 py-2.5 text-xs text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors w-full justify-center"
      >
        <Plus className="h-3.5 w-3.5" /> Add Category
      </button>
      <SaveBtn onSave={() => mutate()} isPending={isPending} />
    </div>
  );
}

// ─── Fav Slides ───────────────────────────────────────────────
function FavSlidesTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-home-fav-slides"],
    queryFn: () =>
      api.get("/home").then((r) => r.data?.data?.favouriteSlides ?? []),
  });
  if (isLoading) return <Skeleton />;
  return (
    <FavSlidesForm
      key={JSON.stringify(data)}
      initial={data ?? []}
      onSaved={refetch}
    />
  );
}

function FavSlidesForm({
  initial,
  onSaved,
}: {
  initial: any[];
  onSaved: () => void;
}) {
  const [items, setItems] = useState<any[]>(initial);
  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post("/home/fav-slides", items.map(stripDraftFlags)),
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: () => toast.error("Failed"),
  });
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{items.length} slide(s)</p>
      <ImageListEditor title="Slide" items={items} setItems={setItems} />
      <SaveBtn onSave={() => mutate()} isPending={isPending} />
    </div>
  );
}

// ─── Popular Games ────────────────────────────────────────────
function PopularGamesTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-home-popular-games"],
    queryFn: () =>
      api.get("/home").then((r) => r.data?.data?.popularGames ?? []),
  });
  if (isLoading) return <Skeleton />;
  return (
    <PopularGamesForm
      key={JSON.stringify(data)}
      initial={data ?? []}
      onSaved={refetch}
    />
  );
}

function PopularGamesForm({
  initial,
  onSaved,
}: {
  initial: any[];
  onSaved: () => void;
}) {
  const [items, setItems] = useState<any[]>(initial);
  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.post("/home/popular-games", items.map(stripDraftFlags)),
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: () => toast.error("Failed"),
  });
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{items.length} game(s)</p>
      <ImageListEditor
        title="Game"
        items={items}
        setItems={setItems}
        extraFields={[
          { key: "name", label: "Game Name" },
          { key: "href", label: "Game URL" },
        ]}
      />
      <SaveBtn onSave={() => mutate()} isPending={isPending} />
    </div>
  );
}

// ─── Popup ────────────────────────────────────────────────────
function PopupTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-home-popup"],
    queryFn: () => api.get("/home").then((r) => r.data?.data?.popup ?? null),
  });
  if (isLoading) return <Skeleton />;
  return (
    <PopupForm key={data?.id ?? "no-popup"} initial={data} onSaved={refetch} />
  );
}

function PopupForm({
  initial,
  onSaved,
}: {
  initial: any;
  onSaved: () => void;
}) {
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? "");

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () =>
      api.post("/home/popup", { imageUrl, linkUrl: linkUrl || null }),
    onSuccess: () => {
      toast.success("Popup saved");
      onSaved();
    },
    onError: () => toast.error("Failed"),
  });

  const { mutate: remove, isPending: isRemoving } = useMutation({
    mutationFn: () => api.post("/home/popup", null),
    onSuccess: () => {
      toast.success("Popup removed");
      onSaved();
    },
    onError: () => toast.error("Failed"),
  });

  return (
    <div className="space-y-4 max-w-md">
      {initial && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-green-400">✓ Popup is active</p>
          <button
            onClick={() => remove()}
            disabled={isRemoving}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      )}
      <div>
        <label className="text-[11px] text-slate-400 mb-1.5 block">
          Popup Image URL *
        </label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500"
        />
      </div>
      <div>
        <label className="text-[11px] text-slate-400 mb-1.5 block">
          Click Link (Optional)
        </label>
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-500"
        />
      </div>
      {imageUrl && (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <p className="text-[10px] text-slate-500 px-3 py-1.5 border-b border-slate-700">
            Preview
          </p>
          <img
            src={imageUrl}
            alt=""
            className="w-full max-h-48 object-contain bg-slate-900 p-2"
          />
        </div>
      )}
      <SaveBtn onSave={() => save()} isPending={isSaving} />
    </div>
  );
}
