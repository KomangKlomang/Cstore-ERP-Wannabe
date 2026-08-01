"use client";

import { useState } from "react";
import type { SeriesDatum, Fmt } from "./tokens";
import { VIZ, idFmt } from "./tokens";
import { barPathV, niceMax } from "./geometry";
import { ChartFrame, Tooltip } from "./chart-frame";

/* ------------------------------------------------------- 3. Stacked column */

export function StackedColumnChart({
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
  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const totals = data.map((d) => keys.reduce((s, k) => s + (d.values[k] ?? 0), 0));
  const max = niceMax(Math.max(1, ...totals));
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(56, slot - 18);

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      legend={keys.map((k, i) => ({ label: k, color: pal[i] }))}
      table={{
        head: ["Kelompok", ...keys, "Total"],
        rows: data.map((d, i) => [d.label, ...keys.map((k) => format(d.values[k] ?? 0)), format(totals[i])]),
      }}
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
            let acc = 0;
            const x = padL + i * slot + (slot - barW) / 2;
            return (
              <g key={d.label}>
                {keys.map((k, ki) => {
                  const v = d.values[k] ?? 0;
                  const h = (v / max) * plotH;
                  const y = padT + plotH - acc - h;
                  acc += h;
                  const dim = hover && hover.k !== k;
                  return (
                    <path
                      key={k}
                      /* jeda 2px antar segmen tumpuk */
                      d={barPathV(x, y + 1, barW, Math.max(h - 2, 0), ki === keys.length - 1 ? 4 : 0)}
                      fill={pal[ki]}
                      opacity={dim ? 0.35 : 1}
                      onMouseEnter={() => setHover({ i, k })}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
                <text x={x + barW / 2} y={padT + plotH - acc - 6} textAnchor="middle" className="fill-current text-foreground tnum" fontSize={11}>
                  {totals[i] ? format(totals[i]) : ""}
                </text>
                <text x={x + barW / 2} y={H - 9} textAnchor="middle" fill="var(--viz-ink-muted)" fontSize={11}>
                  {d.label}
                </text>
              </g>
            );
          })}
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--viz-axis)" strokeWidth={1} />
        </svg>

        {hover ? (
          <Tooltip
            x={((padL + hover.i * slot + slot / 2) / W) * 100}
            y={((padT + plotH - (data[hover.i].values[hover.k] ?? 0)) / H) * 100}
          >
            <span className="font-medium">{data[hover.i].label}</span> Â· {hover.k}:{" "}
            <span className="tnum">{format(data[hover.i].values[hover.k] ?? 0)}</span>
          </Tooltip>
        ) : null}
      </div>
    </ChartFrame>
  );
}
