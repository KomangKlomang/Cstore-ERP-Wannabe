"use client";

import { useState } from "react";
import type { SeriesDatum, Fmt } from "./tokens";
import { VIZ, idFmt } from "./tokens";
import { barPathV, niceMax } from "./geometry";
import { ChartFrame, Tooltip } from "./chart-frame";

/* ------------------------------------------- 7. Grouped column (perbandingan) */

export function GroupedColumnChart({
  data,
  keys,
  title,
  subtitle,
  colors,
  format = idFmt,
  catatan,
  height = 260,
}: {
  data: SeriesDatum[];
  keys: string[];
  title: string;
  subtitle?: string;
  colors?: string[];
  format?: Fmt;
  catatan?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<{ i: number; k: string } | null>(null);
  const pal = colors ?? keys.map((_, i) => VIZ[i % VIZ.length]);
  const W = 720;
  const H = height;
  const padL = 48;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => keys.map((k) => d.values[k] ?? 0))));
  const slot = plotW / Math.max(1, data.length);
  /* jeda 2px antar batang bersebelahan */
  const barW = Math.max(6, Math.min(28, (slot - 22) / keys.length - 2));

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      legend={keys.map((k, i) => ({ label: k, color: pal[i] }))}
      table={{ head: ["Kelompok", ...keys], rows: data.map((d) => [d.label, ...keys.map((k) => format(d.values[k] ?? 0))]) }}
      catatan={catatan}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title}>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={padT + plotH * t} y2={padT + plotH * t} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={padL - 8} y={padT + plotH * t} textAnchor="end" dominantBaseline="central" fill="var(--viz-ink-muted)" fontSize={11} className="tnum">
                {format(max * (1 - t))}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const lebarGrup = keys.length * (barW + 2) - 2;
            const x0 = padL + i * slot + (slot - lebarGrup) / 2;
            return (
              <g key={d.label}>
                {keys.map((k, ki) => {
                  const v = d.values[k] ?? 0;
                  const h = (v / max) * plotH;
                  const x = x0 + ki * (barW + 2);
                  const dim = hover && !(hover.i === i && hover.k === k);
                  return (
                    <path
                      key={k}
                      d={barPathV(x, padT + plotH - h, barW, Math.max(h, 2))}
                      fill={pal[ki]}
                      opacity={dim ? 0.4 : 1}
                      onMouseEnter={() => setHover({ i, k })}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
                <text x={padL + i * slot + slot / 2} y={H - 9} textAnchor="middle" fill="var(--viz-ink-muted)" fontSize={11}>
                  {d.label}
                </text>
              </g>
            );
          })}
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--viz-axis)" strokeWidth={1} />
        </svg>

        {hover ? (
          <Tooltip x={((padL + hover.i * slot + slot / 2) / W) * 100} y={(padT / H) * 100 + 2}>
            <span className="font-medium">{data[hover.i].label}</span> · {hover.k}:{" "}
            <span className="tnum">{format(data[hover.i].values[hover.k] ?? 0)}</span>
          </Tooltip>
        ) : null}
      </div>
    </ChartFrame>
  );
}
