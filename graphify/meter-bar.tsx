"use client";

import { VIZ_SOLO } from "./tokens";

/* -------------------------------------------------- 10. Progress meter ringkas */

export function MeterBar({
  value,
  target,
  label,
  color = VIZ_SOLO,
}: {
  value: number;
  target: number;
  label?: string;
  color?: string;
}) {
  const pctVal = Math.min(100, Math.round((value / (target || 1)) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tnum font-medium text-foreground">{pctVal}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-default">
        <div className="h-full rounded-full" style={{ width: `${pctVal}%`, background: color }} />
      </div>
    </div>
  );
}
