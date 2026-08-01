"use client";

import { useMemo, useState } from "react";
import { VIZ, idFmt } from "./tokens";
import { forceLayout } from "./core.js";
import { ChartFrame } from "./chart-frame";

/**
 * Node-link diagram (grafik jaringan) dengan tata letak force-directed.
 *
 * Dipakai untuk memetakan relasi antar entitas — produk, principal, kategori,
 * toko, kontrak, aset — sehingga struktur sistem terlihat sekaligus bisa
 * diekspor dalam bentuk yang mudah dibaca mesin.
 */

export interface GraphNode {
  id: string;
  label: string;
  /** Kelompok entitas — menentukan warna simpul. */
  group: string;
  /** Keterangan tambahan yang muncul saat simpul disorot. */
  hint?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  /** Nama relasi, mis. "diproduksi oleh". */
  kind?: string;
}

interface Ditata extends GraphNode {
  x: number;
  y: number;
  degree: number;
}

export function NetworkGraph({
  nodes,
  edges,
  title,
  subtitle,
  groups,
  colors,
  height = 620,
  catatan,
  aksi,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  title: string;
  subtitle?: string;
  /** Urutan kelompok — menentukan slot warna dan urutan legenda. */
  groups: string[];
  colors?: string[];
  height?: number;
  catatan?: string;
  aksi?: React.ReactNode;
}) {
  const [sorot, setSorot] = useState<string | null>(null);

  const W = 900;
  const H = height;
  const pal = colors ?? groups.map((_, i) => VIZ[i % VIZ.length]);
  const warna = (g: string) => pal[Math.max(0, groups.indexOf(g)) % pal.length];

  const ditata = useMemo(
    () => forceLayout(nodes, edges, { width: W, height: H, seed: 7 }) as Ditata[],
    [nodes, edges, H],
  );

  const posisi = useMemo(() => new Map(ditata.map((d) => [d.id, d])), [ditata]);

  /** Tetangga langsung simpul yang sedang disorot. */
  const tetangga = useMemo(() => {
    if (!sorot) return null;
    const set = new Set<string>([sorot]);
    edges.forEach((e) => {
      if (e.source === sorot) set.add(e.target);
      if (e.target === sorot) set.add(e.source);
    });
    return set;
  }, [sorot, edges]);

  const aktif = (id: string) => !tetangga || tetangga.has(id);
  const jariJari = (d: Ditata) => 3.2 + Math.min(Math.sqrt(d.degree) * 1.9, 9);

  const terbesar = useMemo(
    () => [...ditata].sort((a, b) => b.degree - a.degree).slice(0, 12),
    [ditata],
  );

  /** Hanya sepuluh simpul paling terhubung yang diberi label, supaya tidak bertumpuk. */
  const berlabel = useMemo(() => new Set(terbesar.slice(0, 10).map((d) => d.id)), [terbesar]);

  const disorot = sorot ? posisi.get(sorot) : null;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      catatan={catatan}
      aksi={aksi}
      legend={groups.map((g) => ({ label: g, color: warna(g) }))}
      table={{
        head: ["Simpul", "Kelompok", "Tautan"],
        rows: terbesar.map((d) => [d.label, d.group, idFmt(d.degree)]),
      }}
    >
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full rounded-lg bg-background"
          role="img"
          aria-label={`${title}: ${nodes.length} simpul, ${edges.length} tautan`}
          onMouseLeave={() => setSorot(null)}
        >
          {/* tautan digambar lebih dulu supaya selalu di bawah simpul */}
          <g>
            {edges.map((e, i) => {
              const a = posisi.get(e.source);
              const b = posisi.get(e.target);
              if (!a || !b) return null;
              const terang = !tetangga || (tetangga.has(e.source) && tetangga.has(e.target));
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={terang ? warna(a.group) : "var(--viz-grid)"}
                  strokeWidth={terang && tetangga ? 1.4 : 0.7}
                  opacity={terang ? (tetangga ? 0.75 : 0.28) : 0.07}
                />
              );
            })}
          </g>

          <g>
            {ditata.map((d) => {
              const on = aktif(d.id);
              return (
                <circle
                  key={d.id}
                  cx={d.x}
                  cy={d.y}
                  r={jariJari(d)}
                  fill={warna(d.group)}
                  stroke="var(--color-background)"
                  strokeWidth={1}
                  opacity={on ? 1 : 0.18}
                  onMouseEnter={() => setSorot(d.id)}
                  style={{ cursor: "pointer" }}
                >
                  <title>{`${d.label} · ${d.group} · ${d.degree} tautan`}</title>
                </circle>
              );
            })}
          </g>

          {/* label hanya untuk simpul besar, supaya tidak saling tumpuk */}
          <g>
            {ditata
              .filter((d) => berlabel.has(d.id) || d.id === sorot)
              .map((d) => (
                <text
                  key={`t-${d.id}`}
                  x={d.x}
                  y={d.y - jariJari(d) - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  className="fill-current text-foreground"
                  stroke="var(--color-background)"
                  strokeWidth={3}
                  paintOrder="stroke"
                  opacity={aktif(d.id) ? 1 : 0.12}
                  style={{ pointerEvents: "none" }}
                >
                  {d.label.length > 20 ? `${d.label.slice(0, 19)}…` : d.label}
                </text>
              ))}
          </g>
        </svg>

        {disorot ? (
          <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-lg border border-border bg-overlay px-3 py-2 text-xs shadow-overlay">
            <p className="font-medium text-overlay-foreground">{disorot.label}</p>
            <p className="text-muted">
              {disorot.group} · {disorot.degree} tautan
            </p>
            {disorot.hint ? <p className="mt-0.5 text-muted">{disorot.hint}</p> : null}
          </div>
        ) : null}

        <p className="mt-2 text-[11px] text-muted">
          {nodes.length} simpul · {edges.length} tautan · arahkan kursor ke simpul untuk menyorot
          tetangganya
        </p>
      </div>
    </ChartFrame>
  );
}
