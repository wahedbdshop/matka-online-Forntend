/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Edit, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_LUDO_DISABLED_MESSAGE,
  DEFAULT_LUDO_STAKES,
  getLudoConfig,
} from "@/lib/ludo-settings";
import { AdminService } from "@/services/admin.service";

const settingGroups = [
  "general",
  "financial",
  "game_control",
  "referral",
  "social",
];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [activeGroup, setActiveGroup] = useState("general");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [ludoMessage, setLudoMessage] = useState(DEFAULT_LUDO_DISABLED_MESSAGE);
  const [ludoStakeInput, setLudoStakeInput] = useState(
    DEFAULT_LUDO_STAKES.join(","),
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings", activeGroup],
    queryFn: () => AdminService.getSettings(activeGroup),
  });

  const { mutate: updateSetting, isPending } = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      AdminService.updateSetting(key, value),
    onSuccess: () => {
      toast.success("Setting updated");
      setEditingKey(null);
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to update"),
  });

  const settings = useMemo(() => data?.data ?? [], [data?.data]);
  const ludoConfig = useMemo(() => getLudoConfig(settings), [settings]);
  const ludoStakeValue = useMemo(
    () => ludoConfig.stakes.join(","),
    [ludoConfig.stakes],
  );

  const { mutate: saveLudoSettings, isPending: isSavingLudo } = useMutation({
    mutationFn: async () => {
      const normalizedStakeInput = ludoStakeInput
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((amount) => Number.isFinite(amount) && amount > 0);

      const uniqueStakeValues = Array.from(new Set(normalizedStakeInput)).sort(
        (a, b) => a - b,
      );

      if (uniqueStakeValues.length === 0) {
        throw new Error("Enter at least one valid Ludo amount.");
      }

      await Promise.all([
        AdminService.updateSetting(
          "ludo_stake_options",
          uniqueStakeValues.join(","),
        ),
        AdminService.updateSetting(
          "global_ludo_message",
          ludoMessage.trim() || DEFAULT_LUDO_DISABLED_MESSAGE,
        ),
      ]);
    },
    onSuccess: () => {
      toast.success("Ludo controls updated");
      setLudoMessage((current) => current.trim() || DEFAULT_LUDO_DISABLED_MESSAGE);
      setLudoStakeInput((current) =>
        Array.from(
          new Set(
            current
              .split(",")
              .map((item) => Number(item.trim()))
              .filter((amount) => Number.isFinite(amount) && amount > 0),
          ),
        )
          .sort((a, b) => a - b)
          .join(","),
      );
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update Ludo controls");
    },
  });

  const { mutate: toggleLudo, isPending: isTogglingLudo } = useMutation({
    mutationFn: (nextValue: boolean) =>
      AdminService.setGlobalToggle("global_ludo", nextValue),
    onSuccess: () => {
      toast.success("Ludo status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update Ludo status",
      );
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Site Settings</h1>

      {/* ── Site Settings Tabs ── */}
      <Tabs
        value={activeGroup}
        onValueChange={(value) => {
          setActiveGroup(value);
          if (value === "game_control") {
            setLudoMessage(ludoConfig.message);
            setLudoStakeInput(ludoStakeValue);
          }
        }}
      >
        <TabsList className="bg-slate-800 flex-wrap h-auto gap-1 p-1">
          {settingGroups.map((g) => (
            <TabsTrigger key={g} value={g} className="text-xs capitalize">
              {g.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>

        {settingGroups.map((group) => (
          <TabsContent key={group} value={group}>
            <div className="space-y-4">
              {group === "game_control" ? (
                <Card className="border-slate-700 bg-slate-800/50">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-white">
                          Ludo Control
                        </h2>
                        <p className="text-sm text-slate-400">
                          Admin can turn Ludo on or off and update the visible
                          stake amounts from here.
                        </p>
                      </div>
                      <Button
                        type="button"
                        disabled={isTogglingLudo}
                        onClick={() => toggleLudo(!ludoConfig.enabled)}
                        className={
                          ludoConfig.enabled
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-red-600 hover:bg-red-700"
                        }
                      >
                        {isTogglingLudo ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {ludoConfig.enabled ? "Ludo ON" : "Ludo OFF"}
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                          Stake Amounts
                        </label>
                        <Input
                          value={ludoStakeInput}
                          onChange={(e) => setLudoStakeInput(e.target.value)}
                          placeholder="250,500,1000,2000"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <p className="text-xs text-slate-500">
                          Use comma-separated values like `250,500,1000,2000`
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                          Off Message
                        </label>
                        <Input
                          value={ludoMessage}
                          onChange={(e) => setLudoMessage(e.target.value)}
                          placeholder={DEFAULT_LUDO_DISABLED_MESSAGE}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <p className="text-xs text-slate-500">
                          Users will see this text when Ludo is disabled.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-slate-700 text-slate-300">
                        Status: {ludoConfig.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Badge className="bg-slate-700 text-slate-300">
                        Live amounts: {ludoConfig.stakes.join(", ")}
                      </Badge>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => saveLudoSettings()}
                        disabled={isSavingLudo}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isSavingLudo ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Ludo Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 bg-slate-700" />
                      ))}
                    </div>
                  ) : settings.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">
                      No settings found
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-700">
                      {settings.map((setting: any) => (
                        <div
                          key={setting.key}
                          className="flex items-center justify-between p-4"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="text-white text-sm font-medium">
                              {setting.label || setting.key}
                            </p>
                            <p className="text-slate-500 text-xs font-mono">
                              {setting.key}
                            </p>
                          </div>

                          {editingKey === setting.key ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-40 h-8 bg-slate-700 border-slate-600 text-white text-sm"
                              />
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateSetting({
                                    key: setting.key,
                                    value: editValue,
                                  })
                                }
                                disabled={isPending}
                                className="h-8 bg-green-600 hover:bg-green-700"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingKey(null)}
                                className="h-8 text-slate-400"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-slate-700 text-slate-300 font-mono text-xs">
                                {setting.value}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingKey(setting.key);
                                  setEditValue(setting.value);
                                }}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
