"use client";

/**
 * Display preferences — `GET/PATCH /users/settings/` (`language`, `video_autoplay`, `dark_mode`).
 * Each control saves on change.
 */
import { LuMonitor } from "react-icons/lu";
import { Select } from "@/components/ui/parts";
import { applyTheme } from "@/lib/theme";
import { card, hint, label } from "@/lib/ui";
import Switch from "./Switch";
import { useUserSettings } from "./useUserSettings";

/** The API stores any code up to 20 characters; these are the ones offered. */
const LANGUAGES: [string, string][] = [["en", "English"], ["bn", "বাংলা (Bangla)"]];

export default function DisplaySettings() {
  const { settings, loading, put } = useUserSettings();

  if (loading) return <section className={`${card} h-[260px] animate-pulse`} />;
  if (!settings) {
    return (
      <section className={`${card} p-6`}>
        <h2 className="text-lg font-bold">Display</h2>
        <p className="mt-1 text-muted">Couldn&apos;t load your display settings.</p>
      </section>
    );
  }

  const language = settings.language || "en";
  const setDark = async (dark: boolean) => {
    applyTheme(dark); // show it straight away
    const saved = await put({ dark_mode: dark }, "Dark mode");
    if (!saved) applyTheme(!dark); // the server refused — put the theme back with the switch
  };

  return (
    <section className={`${card} p-6`}>
      <h2 className="flex items-center gap-2 text-lg font-bold"><LuMonitor size={18} />Display</h2>
      <p className={hint}>How manygym looks and behaves for you. Changes save as you make them.</p>

      <div className="mt-4 max-w-[320px]">
        <label htmlFor="language" className={label}>Language</label>
        <Select id="language" value={language} onChange={(e) => void put({ language: e.target.value }, "Language")}>
          {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          {/* A code saved from another app that isn't in the list above still has to be shown as selected. */}
          {!LANGUAGES.some(([code]) => code === language) && <option value={language}>{language}</option>}
        </Select>
        <p className={hint}>Saved to your account. This admin panel is English-only for now, so it doesn&apos;t change the text here.</p>
      </div>

      <div className="mt-4 divide-y divide-line border-t border-line">
        <Switch id="video_autoplay" title="Video autoplay" hint="Play videos in the feed automatically."
          checked={!!settings.video_autoplay} onChange={(v) => void put({ video_autoplay: v }, "Video autoplay")} />
        <Switch id="dark_mode" title="Dark mode" hint="Use a dark theme on this and your other devices."
          checked={!!settings.dark_mode} onChange={(v) => void setDark(v)} />
      </div>
    </section>
  );
}
