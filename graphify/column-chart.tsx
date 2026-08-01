"use client";

import { useState } from "react";
import type { Datum, Fmt } from "./tokens";
import { VIZ_SOLO, idFmt } from "./tokens";
import { barPathV, niceMax } from "./geometry";
import { ChartFrame } from "./chart-frame";

/* --------------------------------------------------- 2. Kolom vertikal + garis */

export function ColumnChart({
  data,
  title,
  subtitle,
  format = idFmt,
  color = VIZ_SOLO,
  satuan = "",
  catatan,
  height = 240,
}: {
  data: Datum[];
  title: string;
  subtitle?: string;
  format?: Fmt;
  color?: string;
  satuan?: string;
  catatan?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const padL = 44;
  const padR = 12;
  const padT = 18;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(46, slot - 12);

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      table={{ head: ["Periode", satuan || "Nilai"], rows: data.map((d) => [d.label, format(d.value)]) }}
      catatan={catatan}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title}>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={padT + plotH * t}
                y2={padT + plotH * t}
                stroke="var(--viz-grid)"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={padT + plotH * t}
                textAnchor="end"
                dominantBaseline="central"
                fill="var(--viz-ink-muted)"
                fontSize={11}
                className="tnum"
              >
                {format(max * (1 - t))}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const h = (d.value / max) * plotH;
            const x = padL + i * slot + (slot - barW) / 2;
            const y = padT + plotH - h;
            return (
              <g key={d.key ?? d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
                <path d={barPathV(x, y, barW, Math.max(h, 2))} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-current text-foreground tnum"
                  fontSize={11}
                >
                  {d.value ? format(d.value) : ""}
                </text>
                <text
                  x={x + barW / 2}
                  y={H - 9}
                  textAnchor="middle"
                  fill="var(--viz-ink-muted)"
                  fontSize={11}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--viz-axis)" strokeWidth={1} />
        </svg>
      </div>
    </ChartFrame>
  );
}
