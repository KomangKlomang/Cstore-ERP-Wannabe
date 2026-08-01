"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import { Download } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { Callout, KosongRow, PageHeader, StatCard } from "@/components/ui";
import { ColumnChart, DonutChart, MeterBar, VIZ, VIZ_STATUS } from "@/graphify";
import { useApp } from "@/lib/store";
import { exportCSV } from "@/lib/export";
import { daysUntil, fmtNum, fmtTgl, pct } from "@/lib/format";
import type { Product } from "@/lib/types";

/** FR-INT-04 — ambang aging untuk pengajuan yang belum diputuskan. */
const AGING_HARI = 7;

export default function QualityPage() {
  return (
    <Guard modul="quality">
      <QualityView />
    </Guard>
  );
}

function QualityView() {
  const db = useApp((s) => s);

  const aktif = db.products.filter((p) => p.status === "AKTIF");
  const tanpaBarcode = db.products.filter((p) => !p.barcode?.trim());

  /** BR-02 — barcode wajib unik lintas SKU. */
  const duplikatBarcode = useMemo(() => {
    const peta = new Map<string, Product[]>();
    db.products
      .filter((p) => p.barcode?.trim())
      .forEach((p) => peta.set(p.barcode, [...(peta.get(p.barcode) ?? []), p]));
    return [...peta.entries()].filter(([, list]) => list.length > 1);
  }, [db.products]);

  /** BR-04 — varian penulisan brand yang menormalisasi ke nilai sama. */
  const brandBelumFix = useMemo(() => {
    const peta = new Map<string, Set<string>>();
    db.products.forEach((p) => {
      const raw = (p.brand ?? "").trim();
      if (!raw) return;
      const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
      peta.set(key, new Set([...(peta.get(key) ?? []), raw]));
    });
    return [...peta.entries()].filter(([, varian]) => varian.size > 1);
  }, [db.products]);

  const tanpaBrand = db.products.filter((p) => !p.brand?.trim());

  const perStatusPengajuan = [
    { label: "MENUNGGU", value: db.pengajuan.filter((p) => p.status === "MENUNGGU").length },
    { label: "DISETUJUI", value: db.pengajuan.filter((p) => p.status === "DISETUJUI").length },
    { label: "DITOLAK", value: db.pengajuan.filter((p) => p.status === "DITOLAK").length },
  ];

  const aging = db.pengajuan.filter(
    (p) => p.status === "MENUNGGU" && Math.abs(daysUntil(p.tglAjuan)) > AGING_HARI,
  );

  const kelengkapanBarcode = pct(db.products.length - tanpaBarcode.length, Math.max(db.products.length, 1));

  const kolomDup = [
    { key: "barcode", header: "Barcode", value: (r: [string, Product[]]) => r[0] },
    { key: "jumlah", header: "Jumlah SKU", value: (r: [string, Product[]]) => r[1].length },
    { key: "sku", header: "SKU", value: (r: [string, Product[]]) => r[1].map((p) => p.kodeProduct).join(", ") },
    { key: "nama", header: "Nama Produk", value: (r: [string, Product[]]) => r[1].map((p) => p.namaProduct).join(" | ") },
  ];

  return (
    <>
      <PageHeader
        judul="Data Quality"
        modul="Product MDM · FR-REP-01"
        deskripsi="Masalah data terlihat sebelum jadi insiden di kasir: barcode kosong, barcode dipakai ganda, varian penulisan brand, dan antrian pengajuan yang menua."
        aksi={
          duplikatBarcode.length ? (
            <Button variant="outline" onPress={() => exportCSV(duplikatBarcode, kolomDup, "barcode-duplikat")}>
              <Download className="size-4" /> Duplikat CSV
            </Button>
          ) : undefined
        }
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="SKU aktif" value={fmtNum(aktif.length)} hint={`${db.products.length} SKU terdaftar`} />
        <StatCard
          label="Kelengkapan barcode"
          value={`${kelengkapanBarcode}%`}
          tone={kelengkapanBarcode >= 100 ? "good" : kelengkapanBarcode >= 90 ? "warning" : "critical"}
          hint={`${tanpaBarcode.length} SKU belum punya barcode`}
        />
        <StatCard
          label="Barcode duplikat"
          value={fmtNum(duplikatBarcode.length)}
          tone={duplikatBarcode.length ? "critical" : "good"}
          hint="target 0 — blocker scan di kasir"
        />
        <StatCard
          label="Pengajuan menua"
          value={fmtNum(aging.length)}
          tone={aging.length ? "warning" : "good"}
          hint={`menunggu > ${AGING_HARI} hari tanpa keputusan`}
          href="/pengajuan/approver"
        />
      </section>

      <section className="mb-5 grid gap-4 xl:grid-cols-2">
        <DonutChart
          title="Kelengkapan barcode"
          subtitle="Proporsi SKU yang sudah punya barcode"
          data={[
            { label: "Ada barcode", value: db.products.length - tanpaBarcode.length },
            { label: "Belum ada", value: tanpaBarcode.length },
          ]}
          colors={[VIZ[2], VIZ_STATUS.critical]}
          heroLabel="SKU"
        />
        <ColumnChart
          title="Pengajuan produk per status"
          subtitle="Antrian intake dari tim & supplier"
          data={perStatusPengajuan}
          color={VIZ[0]}
          satuan="Jumlah pengajuan"
          format={(n) => String(Math.round(n))}
          height={220}
        />
      </section>

      <section className="mb-5 rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Target kualitas data</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <MeterBar label={`Barcode terisi (${kelengkapanBarcode}%)`} value={kelengkapanBarcode} target={100} color={VIZ[2]} />
          <MeterBar
            label={`Barcode unik (${duplikatBarcode.length} duplikat)`}
            value={duplikatBarcode.length === 0 ? 1 : 0}
            target={1}
            color={VIZ[5]}
          />
          <MeterBar
            label={`Brand ternormalisasi (${brandBelumFix.length} perlu di-fix)`}
            value={db.products.length - tanpaBrand.length}
            target={Math.max(db.products.length, 1)}
            color={VIZ[0]}
          />
        </div>
      </section>

      <section className="mb-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Barcode dipakai lebih dari satu SKU (BR-02)</h3>
        {duplikatBarcode.length === 0 ? (
          <Callout tone="info" judul="Tidak ada barcode duplikat">
            Constraint keras barcode unik aman untuk diaktifkan.
          </Callout>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-danger/40 bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-danger-soft text-left text-xs text-danger-soft-foreground">
                  <th className="px-3 py-2 font-medium">Barcode</th>
                  <th className="px-3 py-2 font-medium">SKU yang memakai</th>
                </tr>
              </thead>
              <tbody>
                {duplikatBarcode.map(([barcode, list]) => (
                  <tr key={barcode} className="border-b border-separator/60 last:border-0">
                    <td className="px-3 py-2 tnum font-medium text-foreground">{barcode}</td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {list.map((p) => `${p.kodeProduct} — ${p.namaProduct}`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Varian penulisan brand (BR-04)</h3>
        {brandBelumFix.length === 0 ? (
          <Callout tone="info" judul="Seluruh brand sudah konsisten">
            Tidak ditemukan dua penulisan berbeda yang merujuk brand sama.
          </Callout>
        ) : (
          <div className="flex flex-wrap gap-2">
            {brandBelumFix.map(([key, varian]) => (
              <span key={key} className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-1.5 text-xs text-warning-soft-foreground">
                {[...varian].join("  ·  ")}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Pengajuan menunggu lebih dari {AGING_HARI} hari (FR-INT-04)
        </h3>
        {aging.length === 0 ? (
          <KosongRow pesan="Tidak ada pengajuan yang tertahan." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Tiket</th>
                  <th className="px-3 py-2 font-medium">Nama</th>
                  <th className="px-3 py-2 font-medium">Diajukan</th>
                  <th className="px-3 py-2 text-right font-medium">Umur</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {aging.map((p) => (
                  <tr key={p.id} className="border-b border-separator/60 last:border-0">
                    <td className="px-3 py-2 tnum font-medium text-foreground">{p.tiket}</td>
                    <td className="px-3 py-2 text-foreground">{p.name}</td>
                    <td className="px-3 py-2 text-xs tnum text-muted">{fmtTgl(p.tglAjuan)}</td>
                    <td className="px-3 py-2 text-right">
                      <Chip size="sm" variant="soft" color="warning">
                        {Math.abs(daysUntil(p.tglAjuan))} hari
                      </Chip>
                    </td>
                    <td className="px-3 py-2">
                      <Link href="/pengajuan/approver" className="text-xs font-medium text-accent">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
