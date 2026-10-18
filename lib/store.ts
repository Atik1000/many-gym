"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export { uid } from "./id";

/**
 * Browser-only state, kept in localStorage. Used for things that belong to *this browser session* rather than the
 * server — e.g. which person the demo is "viewing as". Server data goes through `lib/api.ts` instead.
 */
let instanceCounter = 0;

export function useLocal<T>(key: string, initial: () => T): [T, (v: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const latest = useRef(value);
  const me = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) { latest.current = JSON.parse(raw); setValue(latest.current); }
    } catch {}
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!me.current) me.current = ++instanceCounter;
    const onSync = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; value: T; from: number }>).detail;
      if (d.key === key && d.from !== me.current) { latest.current = d.value; setValue(d.value); }
    };
    window.addEventListener("manygym:local", onSync);
    return () => window.removeEventListener("manygym:local", onSync);
  }, [key]);

  const set = useCallback((v: T | ((prev: T) => T)) => {
    const next = typeof v === "function" ? (v as (p: T) => T)(latest.current) : v;
    latest.current = next;
    setValue(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new CustomEvent("manygym:local", { detail: { key, value: next, from: me.current } }));
  }, [key]);

  return [value, set, ready];
}
