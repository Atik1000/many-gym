"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import { getUserSettings, patchUserSettings, type UserSetting, type UserSettingPatch } from "@/lib/api/user-settings";

/**
 * The signed-in person's settings record, with a save-on-change `put`.
 *
 * Every control is its own small PATCH: the change shows immediately, and is rolled back (with the server's
 * message) if the call fails — so a switch never stays in a state the server refused.
 */
export function useUserSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState<UserSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const current = useRef<UserSetting | null>(null);

  useEffect(() => {
    let live = true;
    getUserSettings()
      .then((s) => { if (live) { current.current = s; setSettings(s); } })
      .catch(() => live && setSettings(null))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

  /** Returns the saved record, or null when the server refused (the optimistic change is already undone). */
  const put = useCallback(async (patch: UserSettingPatch, what: string): Promise<UserSetting | null> => {
    const before = current.current;
    if (!before) return null;
    const optimistic = { ...before, ...patch };
    current.current = optimistic;
    setSettings(optimistic);
    try {
      const next = await patchUserSettings(patch);
      current.current = next;
      setSettings(next);
      toast(`${what} updated`);
      return next;
    } catch (e) {
      current.current = before;
      setSettings(before);
      toast(e instanceof ApiError ? e.message : `Couldn't update ${what.toLowerCase()}`);
      return null;
    }
  }, [toast]);

  return { settings, loading, put };
}
