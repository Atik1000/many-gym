"use client";

import { useEffect } from "react";
import { getTokens } from "@/lib/api/http";
import { getUserSettings } from "@/lib/api/user-settings";
import { applyTheme, rememberedTheme } from "@/lib/theme";

/**
 * Applies the saved dark-mode preference on load: the locally remembered choice straight away, then the
 * server's (`GET /users/settings/`) once it answers, so a new browser picks the preference up too.
 * Renders nothing.
 */
export default function ThemeSync() {
  useEffect(() => {
    const local = rememberedTheme();
    if (local !== null) applyTheme(local);
    if (!getTokens()) return;
    let live = true;
    getUserSettings()
      .then((s) => live && applyTheme(!!s.dark_mode))
      .catch(() => { /* keep whatever is applied; the settings page reports load failures */ });
    return () => { live = false; };
  }, []);
  return null;
}
