"use client";

import { useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Download } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { Callout, KosongRow, PageHeader, SearchBox, SelectField, Toolbar } from "@/components/ui";
import { BarChart, VIZ } from "@/graphify";
import { useApp } from "@/lib/store";
import { exportCSV } from "@/lib/export";
import { KAPASITAS_PLU, PREFIX_PLU, kodePlu, nomorBerikutnya, ringkasanPlu, tabrakanPlu } from "@/lib/plu";
import { fmtNum } from "@/lib/format";
import { SERI_PLU, type SeriPlu } from "@/lib/types";

export default function PluPage() {
  return (
    <Guard modul="plu">
      <PluView />
    </Guard>
  );
}

function PluView() {
  const alokasi = useApp((s) => s.pluAllocations);
  const [seri, setSeri] = useState<string>("");
  const [q, setQ] = useState("");

  const ringkas = useMemo(() => ringkasanPlu(alokasi), [alokasi]);
  const tabrakan = useMemo(() => tabrakanPlu(alokasi), [alokasi]);

  const baris = useMemo(() => {
    const out: Array<{ seri: SeriPlu; no: number; kode: string; sku: string }> = [];
    alokasi.forEach((a) =>
      SERI_PLU.forEach((s) => {
        const sku = a.terpakai[s];
        if (!sku) return;
        if (seri && s !== seri) return;
        const kode = kodePlu(s, a.no);
        if (q && !`${kode} ${sku} ${s}`.toLowerCase().includes(q.toLowerCase())) return;
        out.push({ seri: s, no: a.no, kode, sku });
      }),
    );
    return out.sort((x, y) => x.seri.localeCompare(y.seri) || x.no - y.no);
  }, [alokasi, seri, q]);

  const kolom = [
    { key: "seri", header: "Seri Kategori", value: (r: (typeof baris)[number]) => r.seri },
    { key: "prefix", header: "Prefix", value: (r: (typeof baris)[number]) => PREFIX_PLU[r.seri] },
    { key: "no", header: "No Urut", value: (r: (typeof baris)[number]) => r.no },
    { key: "kode", header: "Kode PLU", value: (r: (typeof baris)[number]) => r.kode },
    { key: "sku", header: "Dipakai SKU", value: (r: (typeof baris)[number]) => r.sku },
  ];

  return (
    <>
      <PageHeader
        judul="Alokasi Kode PLU"
        modul="Product MDM · FR-PLU-01 / FR-PLU-02"
        deskripsi="Kode dibentuk dari prefix tetap per seri kategori ditambah nomor urut bersama. Sistem selalu mengambil nomor bebas berikutnya dan menolak tabrakan kode."
        aksi={
          <Button variant="outline" onPress={() => exportCSV(baris, kolom, "alokasi-plu")}>
            <Download className="size-4" /> CSV
          </Button>
        }
      />

      {tabrakan.length ? (
        <div className="mb-4">
          <Callout tone="danger" judul={`${tabrakan.length} kode PLU dipakai lebih dari satu SKU`}>
            {tabrakan.slice(0, 5).map((t) => (
              <span key={`${t.seri}-${t.no}`} className="mr-3 inline-block tnum">
                {kodePlu(t.seri, t.no)} → {t.pemakai.join(", ")}
              </span>
            ))}
          </Callout>
        </div>
      ) : (
        <div className="mb-4">
          <Callout tone="info" judul="Tidak ada tabrakan kode PLU">
            Setiap kode pada tiap seri kategori dipakai paling banyak satu SKU aktif.
          </Callout>
        </div>
      )}

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <BarChart
          title="Pemakaian slot per seri kategori"
          subtitle={`Kapasitas ${fmtNum(KAPASITAS_PLU)} nomor urut per seri`}
          data={ringkas.map((r) => ({ key: r.seri, label: `${r.prefix} · ${r.seri}`, value: r.terpakai }))}
          format={(n) => fmtNum(n)}
          color={VIZ[0]}
          satuan="Slot terpakai"
        />

        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Seri</th>
                <th className="px-3 py-2 font-medium">Prefix</th>
                <th className="px-3 py-2 text-right font-medium">Terpakai</th>
                <th className="px-3 py-2 font-medium">Kode berikutnya</th>
              </tr>
            </thead>
            <tbody>
              {ringkas.map((r) => {
                const next = nomorBerikutnya(alokasi, r.seri);
                return (
                  <tr key={r.seri} className="border-b border-separator/60 last:border-0">
                    <td className="px-3 py-2 text-foreground">{r.seri}</td>
                    <td className="px-3 py-2">
                      <Chip size="sm" variant="soft">
                        {r.prefix}
                      </Chip>
                    </td>
                    <td className="px-3 py-2 text-right tnum">{r.terpakai}</td>
                    <td className="px-3 py-2 tnum text-accent">{next > 0 ? kodePlu(r.seri, next) : "penuh"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Kode PLU / SKU…" />
        <SelectField
          label="Seri kategori"
          items={[{ id: "", label: "Semua seri" }, ...SERI_PLU.map((s) => ({ id: s, label: s }))]}
          value={seri}
          onChange={setSeri}
          className="w-56"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{baris.length} slot terpakai</span>
      </Toolbar>

      {baris.length === 0 ? (
        <KosongRow pesan="Tidak ada slot yang cocok." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Seri kategori</th>
                <th className="px-3 py-2 font-medium">No urut</th>
                <th className="px-3 py-2 font-medium">Kode PLU</th>
                <th className="px-3 py-2 font-medium">Dipakai SKU</th>
              </tr>
            </thead>
            <tbody>
              {baris.slice(0, 200).map((r) => (
                <tr key={`${r.seri}-${r.no}`} className="border-b border-separator/60 last:border-0">
                  <td className="px-3 py-2 text-xs text-muted">{r.seri}</td>
                  <td className="px-3 py-2 tnum text-muted">{r.no}</td>
                  <td className="px-3 py-2 tnum font-medium text-foreground">{r.kode}</td>
                  <td className="px-3 py-2 tnum text-foreground">{r.sku}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Prefix per seri masih menunggu konfirmasi resmi (OQ 9.3) — pola dua digit di atas diturunkan dari data sumber,
        dan kode yang sudah aktif di kasir tidak boleh berubah.
      </p>
    </>
  );
}
