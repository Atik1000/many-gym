/**
 * Dark mode. The saved preference lives on the server (`UserSetting.dark_mode`); a copy is kept in
 * localStorage so the theme can be applied on load before the settings request returns.
 *
 * The theme itself is a token override in app/globals.css, switched by `data-theme` on <html>.
 */
const KEY = "manygym.theme";

export function applyTheme(dark: boolean) {
  if (typeof document === "undefined") return;
  if (dark) document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(KEY, dark ? "dark" : "light");
  } catch {
    /* storage unavailable — the attribute is still set for this page */
  }
}

/** The locally remembered choice, or null when this browser has never been told. */
export function rememberedTheme(): boolean | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : v === "dark";
  } catch {
    return null;
  }
}
