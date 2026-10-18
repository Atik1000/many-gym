"use client";

import { useEffect } from "react";

/**
 * Copies each column header's text onto the cells below it (`data-label`), so the CSS in globals.css can show a
 * caption beside every value when a `.rt` table turns into cards on phones. Watches for rows added later.
 */
export default function TableLabels() {
  useEffect(() => {
    const label = () => {
      document.querySelectorAll<HTMLTableElement>("table.rt").forEach((t) => {
        const heads = [...t.querySelectorAll("thead th")].map((h) => (h.textContent?.trim() === "Actions" ? "" : h.textContent?.trim() ?? ""));
        t.querySelectorAll("tbody tr").forEach((tr) => {
          [...tr.children].forEach((td, i) => { if (td.getAttribute("data-label") !== (heads[i] ?? "")) td.setAttribute("data-label", heads[i] ?? ""); });
        });
      });
    };
    label();
    const obs = new MutationObserver(label);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return null;
}
