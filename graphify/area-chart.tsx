"use client";

import { useId, useState } from "react";
import type { SeriesDatum, Fmt } from "./tokens";
import { VIZ_SOLO, idFmt } from "./tokens";
import { niceMax } from "./geometry";
import { ChartFrame, Tooltip } from "./chart-frame";

/* ------------------------------------------------------ 8. Area chart (tren) */

export function AreaChart({
  data,
  seriesKey,
  title,
  subtitle,
  color = VIZ_SOLO,
  format = idFmt,
  catatan,
  height = 220,
}: {
  data: SeriesDatum[];
  seriesKey: string;
  title: string;
  subtitle?: string;
  color?: string;
  format?: Fmt;
  catatan?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const W = 720;
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 14;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = niceMax(Math.max(1, ...data.map((d) => d.values[seriesKey] ?? 0)));
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const px = (i: number) => padL + i * stepX;
  const py = (v: number) => padT + plotH - (v / max) * plotH;

  const garis = data.map((d, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(d.values[seriesKey] ?? 0)}`).join(" ");
  const area = `${garis} L${px(data.length - 1)},${padT + plotH} L${px(0)},${padT + plotH} Z`;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      table={{ head: ["Periode", seriesKey], rows: data.map((d) => [d.label, format(d.values[seriesKey] ?? 0)]) }}
      catatan={catatan}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={padT + plotH * t} y2={padT + plotH * t} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={padL - 8} y={padT + plotH * t} textAnchor="end" dominantBaseline="central" fill="var(--viz-ink-muted)" fontSize={11} className="tnum">
                {format(max * (1 - t))}
              </text>
            </g>
          ))}

          <path d={area} fill={`url(#area-${uid})`} />
          <path d={garis} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {hover !== null ? (
            <>
              <line x1={px(hover)} x2={px(hover)} y1={padT} y2={padT + plotH} stroke="var(--viz-axis)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={px(hover)} cy={py(data[hover].values[seriesKey] ?? 0)} r={4.5} fill={color} stroke="var(--color-surface)" strokeWidth={2} />
            </>
          ) : null}

          {data.map((d, i) => (
            <g key={d.label}>
              <rect x={px(i) - stepX / 2} y={padT} width={Math.max(stepX, 24)} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
              <text x={px(i)} y={H - 9} textAnchor="middle" fill="var(--viz-ink-muted)" fontSize={11}>
                {d.label}
              </text>
            </g>
          ))}
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--viz-axis)" strokeWidth={1} />
        </svg>

        {hover !== null ? (
          <Tooltip x={(px(hover) / W) * 100} y={(padT / H) * 100 + 2}>
            <span className="font-medium">{data[hover].label}</span>:{" "}
            <span className="tnum">{format(data[hover].values[seriesKey] ?? 0)}</span>
          </Tooltip>
        ) : null}
      </div>
    </ChartFrame>
  );
}
