"use client";

import type { Datum, Fmt } from "./tokens";
import { VIZ, idFmt } from "./tokens";
import { ChartFrame } from "./chart-frame";

/* ------------------------------------------------------------ 5. Donut chart */

export function DonutChart({
  data,
  title,
  subtitle,
  heroLabel,
  format = idFmt,
  colors,
  catatan,
}: {
  data: Datum[];
  title: string;
  subtitle?: string;
  heroLabel?: string;
  format?: Fmt;
  colors?: string[];
  catatan?: string;
}) {
  const pal = colors ?? data.map((_, i) => VIZ[i % VIZ.length]);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = 200;
  const c = size / 2;
  const r = 78;
  const stroke = 22;
  const circ = 2 * Math.PI * r;
  let acc = 0;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      legend={data.map((d, i) => ({ label: d.label, color: pal[i] }))}
      table={{
        head: ["Kelompok", "Jumlah", "%"],
        rows: data.map((d) => [d.label, format(d.value), `${((d.value / total) * 100).toFixed(1)}%`]),
      }}
      catatan={catatan}
    >
      <div className="flex flex-wrap items-center gap-6">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-44 w-44 shrink-0" role="img" aria-label={title}>
          <g transform={`rotate(-90 ${c} ${c})`}>
            {data.map((d, i) => {
              const frac = d.value / total;
              const len = Math.max(frac * circ - 2, 0); /* jeda 2px antar segmen */
              const el = (
                <circle
                  key={d.label}
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke={pal[i]}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-acc * circ}
                  strokeLinecap="butt"
                />
              );
              acc += frac;
              return el;
            })}
          </g>
          <text x={c} y={c - 6} textAnchor="middle" className="fill-current text-foreground tnum" fontSize={26} fontWeight={600}>
            {format(total)}
          </text>
          <text x={c} y={c + 16} textAnchor="middle" fill="var(--viz-ink-muted)" fontSize={11}>
            {heroLabel ?? "total"}
          </text>
        </svg>

        <ul className="min-w-[180px] flex-1 space-y-1.5">
          {data.map((d, i) => (
            <li key={d.label} className="flex items-center gap-2 text-xs">
              <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-[3px]" style={{ background: pal[i] }} />
              <span className="truncate text-foreground">{d.label}</span>
              <span className="ml-auto tnum text-muted">
                {format(d.value)} Â· {((d.value / total) * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
