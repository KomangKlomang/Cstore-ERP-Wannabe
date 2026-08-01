"use client";

import { useState } from "react";

interface FrameProps {
  title: string;
  subtitle?: string;
  legend?: Array<{ label: string; color: string }>;
  table: { head: string[]; rows: Array<Array<string | number>> };
  children: React.ReactNode;
  aksi?: React.ReactNode;
  catatan?: string;
}

export function ChartFrame({ title, subtitle, legend, table, children, aksi, catatan }: FrameProps) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-surface">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 no-print">
          {aksi}
          <button
            type="button"
            className="graphify-toggle"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
          >
            {showTable ? "Grafik" : "Tabel"}
          </button>
        </div>
      </header>

      {legend && legend.length > 1 ? (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5 text-xs text-foreground">
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-[3px]"
                style={{ background: l.color }}
              />
              {l.label}
            </li>
          ))}
        </ul>
      ) : null}

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs tnum">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                {table.head.map((h) => (
                  <th key={h} className="py-1.5 pr-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-separator/60 last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className={`py-1.5 pr-3 ${j === 0 ? "text-foreground" : "text-muted"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}

      {catatan ? <p className="mt-3 text-[11px] leading-snug text-muted">{catatan}</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ tooltip */

export function Tooltip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-overlay px-2 py-1.5 text-[11px] leading-tight text-overlay-foreground shadow-overlay"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </div>
  );
}
