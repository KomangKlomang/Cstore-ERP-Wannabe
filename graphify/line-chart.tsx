"use client";

import { useId, useState } from "react";
import type { SeriesDatum, Fmt } from "./tokens";
import { VIZ, idFmt } from "./tokens";
import { niceMax } from "./geometry";
import { ChartFrame, Tooltip } from "./chart-frame";

/* ------------------------------------------------------------- 4. Line chart */

export function LineChart({
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
  const [hover, setHover] = useState<number | null>(null);
  const pal = colors ?? keys.map((_, i) => VIZ[i % VIZ.length]);
  const W = 720;
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 14;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => keys.map((k) => d.values[k] ?? 0))));
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const px = (i: number) => padL + i * stepX;
  const py = (v: number) => padT + plotH - (v / max) * plotH;
  const uid = useId();

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      legend={keys.map((k, i) => ({ label: k, color: pal[i] }))}
      table={{ head: ["Periode", ...keys], rows: data.map((d) => [d.label, ...keys.map((k) => format(d.values[k] ?? 0))]) }}
      catatan={catatan}
    >
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={title}
          onMouseLeave={() => setHover(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={padT + plotH * t} y2={padT + plotH * t} stroke="var(--viz-grid)" strokeWidth={1} />
              {t % 0.5 === 0 ? (
                <text x={padL - 8} y={padT + plotH * t} textAnchor="end" dominantBaseline="central" fill="var(--viz-ink-muted)" fontSize={11} className="tnum">
                  {format(max * (1 - t))}
                </text>
              ) : null}
            </g>
          ))}

          {hover !== null ? (
            <line x1={px(hover)} x2={px(hover)} y1={padT} y2={padT + plotH} stroke="var(--viz-axis)" strokeWidth={1} strokeDasharray="3 3" />
          ) : null}

          {keys.map((k, ki) => {
            const d = data.map((row, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(row.values[k] ?? 0)}`).join(" ");
            return (
              <g key={`${uid}-${k}`}>
                <path d={d} fill="none" stroke={pal[ki]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {hover !== null ? (
                  <circle cx={px(hover)} cy={py(data[hover].values[k] ?? 0)} r={4.5} fill={pal[ki]} stroke="var(--color-surface)" strokeWidth={2} />
                ) : null}
              </g>
            );
          })}

          {data.map((row, i) => (
            <g key={row.label}>
              <rect
                x={px(i) - stepX / 2}
                y={padT}
                width={Math.max(stepX, 24)}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              <text x={px(i)} y={H - 9} textAnchor="middle" fill="var(--viz-ink-muted)" fontSize={11}>
                {row.label}
              </text>
            </g>
          ))}
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--viz-axis)" strokeWidth={1} />
        </svg>

        {hover !== null ? (
          <Tooltip x={(px(hover) / W) * 100} y={(padT / H) * 100 + 2}>
            <div className="mb-1 font-medium">{data[hover].label}</div>
            {keys.map((k, ki) => (
              <div key={k} className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block size-2 rounded-[2px]" style={{ background: pal[ki] }} />
                <span>{k}</span>
                <span className="ml-auto tnum">{format(data[hover].values[k] ?? 0)}</span>
              </div>
            ))}
          </Tooltip>
        ) : null}
      </div>
    </ChartFrame>
  );
}
