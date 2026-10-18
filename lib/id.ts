// Plain (non-"use client") so both server seed code and client components can create ids.
export const uid = () => crypto.randomUUID();
