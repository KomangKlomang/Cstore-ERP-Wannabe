"use client";

import { useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Braces, FileCode2, FileText, Network, Waypoints } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { Callout, PageHeader, StatCard, Toolbar } from "@/components/ui";
import { NetworkGraph, VIZ } from "@/graphify";
import { useApp } from "@/lib/store";
import {
  JENIS_SIMPUL,
  bangunGraf,
  keDOT,
  keJSON,
  keRingkasan,
  unduhPenjelajah,
  unduhTeks,
  type JenisSimpul,
} from "@/lib/graph";
import { fmtNum } from "@/lib/format";

export default function PetaRelasiPage() {
  return (
    <Guard modul="analitik">
      <PetaRelasiView />
    </Guard>
  );
}

/** Warna per jenis entitas — slot kategorikal tetap, tidak pernah di-cycle. */
const WARNA = [VIZ[0], VIZ[1], VIZ[2], VIZ[3], VIZ[4], VIZ[6], VIZ[7]];

function PetaRelasiView() {
  const db = useApp((s) => s);
  const [jenis, setJenis] = useState<JenisSimpul[]>([...JENIS_SIMPUL]);
  const [galat, setGalat] = useState<string | null>(null);

  const graf = useMemo(() => bangunGraf(db, { jenis }), [db, jenis]);

  const perJenis = useMemo(() => {
    const m = new Map<string, number>();
    graf.nodes.forEach((n) => m.set(n.group, (m.get(n.group) ?? 0) + 1));
    return m;
  }, [graf.nodes]);

  const relasi = useMemo(() => {
    const m = new Map<string, number>();
    graf.edges.forEach((e) => m.set(e.kind ?? "terhubung", (m.get(e.kind ?? "terhubung") ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [graf.edges]);

  function toggle(j: JenisSimpul) {
    setJenis((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));
  }

  return (
    <>
      <PageHeader
        judul="Peta Relasi"
        modul="Knowledge graph"
        deskripsi="Node-link diagram seluruh master data: produk, principal, kategori, toko, kontrak, aset, dan promosi beserta tautannya. Bisa diekspor dalam bentuk yang mudah dibaca mesin."
        aksi={
          <>
            <Button variant="outline" onPress={() => unduhTeks(keJSON(graf), "peta-relasi.json", "application/json")}>
              <Braces className="size-4" /> JSON
            </Button>
            <Button variant="outline" onPress={() => unduhTeks(keDOT(graf), "peta-relasi.dot")}>
              <FileCode2 className="size-4" /> Graphviz DOT
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                setGalat(null);
                unduhPenjelajah(graf).catch((e) => setGalat(e instanceof Error ? e.message : String(e)));
              }}
            >
              <Waypoints className="size-4" /> Penjelajah .html
            </Button>
            <Button variant="primary" onPress={() => unduhTeks(keRingkasan(graf), "peta-relasi.md", "text/markdown")}>
              <FileText className="size-4" /> Ringkasan untuk AI
            </Button>
          </>
        }
      />

      {galat ? (
        <Callout tone="danger" judul="Gagal menyiapkan penjelajah">
          {galat} Jalankan <code>npm run graphify:graph</code> lebih dulu untuk merakit kerangkanya.
        </Callout>
      ) : null}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Simpul" value={fmtNum(graf.nodes.length)} hint="entitas yang punya minimal satu tautan" icon={<Network className="size-4" />} />
        <StatCard label="Tautan" value={fmtNum(graf.edges.length)} hint={`${relasi.length} jenis relasi`} />
        <StatCard
          label="Kepadatan"
          value={`${((graf.edges.length / Math.max(graf.nodes.length, 1)) * 1).toFixed(1)}×`}
          hint="rata-rata tautan per simpul"
        />
        <StatCard label="Jenis entitas" value={String(perJenis.size)} hint={[...perJenis.keys()].join(", ")} />
      </section>

      <Toolbar>
        <span className="self-center text-xs font-medium text-foreground">Tampilkan entitas:</span>
        {JENIS_SIMPUL.map((j) => {
          const on = jenis.includes(j);
          return (
            <button
              key={j}
              type="button"
              onClick={() => toggle(j)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                on ? "bg-accent-soft font-medium text-accent-soft-foreground" : "border border-border text-muted hover:bg-surface-hover"
              }`}
            >
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-[3px]"
                style={{ background: WARNA[JENIS_SIMPUL.indexOf(j) % WARNA.length], opacity: on ? 1 : 0.35 }}
              />
              {j}
              {perJenis.get(j) ? <span className="tnum opacity-70">{perJenis.get(j)}</span> : null}
            </button>
          );
        })}
      </Toolbar>

      <NetworkGraph
        title="Jaringan master data"
        subtitle="Ukuran simpul mengikuti jumlah tautannya; arahkan kursor untuk menyorot tetangga langsung"
        nodes={graf.nodes}
        edges={graf.edges}
        groups={[...JENIS_SIMPUL]}
        colors={WARNA}
        catatan="Produk dan aset dibatasi agar peta tetap terbaca. Simpul tanpa tautan tidak ditampilkan."
      />

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Jenis relasi</h3>
          <ul className="space-y-1.5">
            {relasi.map(([nama, n]) => (
              <li key={nama} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{nama}</span>
                <Chip size="sm" variant="soft">
                  {fmtNum(n)}
                </Chip>
              </li>
            ))}
          </ul>
        </div>

        <Callout tone="info" judul="Kenapa ini memudahkan pembacaan oleh AI">
          Tiga tombol ekspor di atas menghasilkan bentuk yang berbeda tujuannya:
          <br />
          <b>JSON</b> — daftar simpul &amp; tautan node-link, format paling umum untuk diproses program.
          <br />
          <b>Graphviz DOT</b> — teks graf berlabel yang bisa langsung dirender ulang oleh perkakas graf.
          <br />
          <b>Ringkasan untuk AI</b> — Markdown berisi skema entitas, jenis relasi beserta arah dan
          jumlahnya, plus simpul paling terhubung. Bentuk ini yang paling hemat: model bahasa cukup
          membaca strukturnya, bukan ribuan baris data mentah.
        </Callout>
      </section>
    </>
  );
}
