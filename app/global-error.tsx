"use client";

/**
 * Last resort: an error thrown by the root layout itself, where `app/error.tsx` cannot mount because it
 * lives inside that layout. This one replaces the whole document, so it carries its own html/body and
 * uses inline styles rather than the stylesheet the failed layout would have loaded.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", background: "#f6f7f9", color: "#111" }}>
        <div style={{ maxWidth: 420, padding: 28, borderRadius: 16, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.08)", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>manygym couldn&apos;t start</h1>
          <p style={{ color: "#666", marginTop: 8 }}>The page failed before it could load. Reloading usually clears it.</p>
          <p style={{ background: "#f6f7f9", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#666", textAlign: "left", wordBreak: "break-word" }}>
            {error.message || "Unknown error"}
          </p>
          <button type="button" onClick={reset} style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: 0, background: "#6d4aff", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
