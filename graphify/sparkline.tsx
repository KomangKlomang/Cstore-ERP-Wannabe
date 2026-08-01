"use client";

import { VIZ } from "./tokens";

/* --------------------------------------------------------------- 6. Sparkline */

export function Sparkline({ values, color = VIZ[0] }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const W = 96;
  const H = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (values.length - 1)) * W},${H - ((v - min) / span) * (H - 4) - 2}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-24" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
