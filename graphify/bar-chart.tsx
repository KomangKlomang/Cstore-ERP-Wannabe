"use client";

import { useState } from "react";
import type { Datum, Fmt } from "./tokens";
import { VIZ_SOLO, idFmt } from "./tokens";
import { barPathH, niceMax } from "./geometry";
import { ChartFrame } from "./chart-frame";

/* ------------------------------------------------ 1. Bar horizontal (ranking) */

export function BarChart({
  data,
  title,
  subtitle,
  format = idFmt,
  color = VIZ_SOLO,
  satuan = "",
  catatan,
}: {
  data: Datum[];
  title: string;
  subtitle?: string;
  format?: Fmt;
  color?: string;
  satuan?: string;
  catatan?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const rowH = 30;
  const padL = 168;
  const padR = 92;
  const padT = 6;
  const H = padT + data.length * rowH + 6;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const plotW = W - padL - padR;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      table={{ head: ["Item", satuan || "Nilai"], rows: data.map((d) => [d.label, format(d.value)]) }}
      catatan={catatan}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padL + plotW * t}
              x2={padL + plotW * t}
              y1={padT}
              y2={H - 6}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
          ))}
          {data.map((d, i) => {
            const w = (d.value / max) * plotW;
            const y = padT + i * rowH + 6;
            const h = rowH - 12;
            return (
              <g
                key={d.key ?? d.label}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <rect x={0} y={padT + i * rowH} width={W} height={rowH} fill="transparent" />
                <text
                  x={padL - 10}
                  y={y + h / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="fill-current text-foreground"
                  fontSize={12}
                >
                  {d.label.length > 26 ? `${d.label.slice(0, 25)}â€¦` : d.label}
                </text>
                <path
                  d={barPathH(padL, y, Math.max(w, 2), h)}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
                <text
                  x={padL + Math.max(w, 2) + 8}
                  y={y + h / 2}
                  dominantBaseline="central"
                  className="fill-current text-foreground tnum"
                  fontSize={12}
                >
                  {format(d.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </ChartFrame>
  );
}
