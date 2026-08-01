"use client";

import { VIZ_SOLO } from "./tokens";

/* -------------------------------------------- 9. Gauge (capaian vs target) */

export function GaugeArc({
  value,
  target,
  label,
  satuan = "",
  color = VIZ_SOLO,
  size = 168,
}: {
  value: number;
  target: number;
  label: string;
  satuan?: string;
  color?: string;
  size?: number;
}) {
  const rasio = Math.max(0, Math.min(1, value / (target || 1)));
  const r = 62;
  const cx = 90;
  const cy = 84;
  /* setengah lingkaran, dari kiri ke kanan */
  const busur = Math.PI * r;
  const tercapai = busur * rasio;

  return (
    <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-4 shadow-surface">
      <svg viewBox="0 0 180 108" width={size} height={size * 0.6} role="img" aria-label={`${label}: ${value} dari target ${target}`}>
        <path
          d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke="var(--color-default)"
          strokeWidth={13}
          strokeLinecap="round"
        />
        <path
          d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={13}
          strokeLinecap="round"
          strokeDasharray={`${tercapai} ${busur}`}
        />
        <text x={cx} y={cy - 12} textAnchor="middle" className="fill-current text-foreground tnum" fontSize={26} fontWeight={600}>
          {Math.round(rasio * 100)}%
        </text>
        <text x={cx} y={cy + 6} textAnchor="middle" fill="var(--viz-ink-muted)" fontSize={10}>
          {satuan}
        </text>
      </svg>
      <p className="mt-1 text-center text-xs text-muted">{label}</p>
    </div>
  );
}
