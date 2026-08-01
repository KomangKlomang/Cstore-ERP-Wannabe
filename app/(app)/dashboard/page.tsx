"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import { AlertTriangle, ArrowRight, Boxes, FileWarning, Handshake, Store as StoreIcon } from "lucide-react";

import { Guard } from "@/components/app-shell";
import {
  BarChart,
  ColumnChart,
  DonutChart,
  GaugeArc,
  LineChart,
  StackedColumnChart,
  VIZ,
  VIZ_STATUS,
} from "@/graphify";
import { PageHeader, StatCard } from "@/components/ui";
import { useApp } from "@/lib/store";
import {
  buildNotifikasi,
  engagementPerBulan,
  jatuhTempoPerBulan,
  kontrakInfo,
  nilaiKontrakPerPrincipal,
  perluTindakan,
  skorKelengkapan,
  skuPerSegment,
  TAG_LAINNYA,
  tagPerRegion,
  tokoPerRegion,
} from "@/lib/derive";
import { fmtRp, fmtRpShort, fmtNum, fmtTgl } from "@/lib/format";

export default function DashboardPage() {
  return (
    <Guard modul="dashboard">
      <DashboardView />
    </Guard>
  );
}

/* Status selalu tampil sebagai ikon + label, tidak pernah warna saja. */
const LEVEL_LABEL = {
  critical: "Kritis",
  serious: "Prioritas",
  warning: "Perlu dicek",
  info: "Informasi",
} as const;

const LEVEL_TEXT = {
  critical: "text-danger",
  serious: "text-warning",
  warning: "text-warning",
  info: "text-muted",
} as const;

function DashboardView() {
  const db = useApp((s) => s);

  const notif = useMemo(() => buildNotifikasi(db), [db]);
  const kontrakPerluTindakan = useMemo(
    () =>
      db.kontrak
        .filter((k) => perluTindakan(k))
        .sort((a, b) => kontrakInfo(a).sisaHari - kontrakInfo(b).sisaHari),
    [db.kontrak],
  );

  const skuAktif = db.products.filter((p) => p.status === "AKTIF");
  const tokoAktif = db.stores.filter((s) => s.status === "AKTIF");
  const kontrakAktif = db.kontrak.filter((k) => k.status === "AKTIF");
  const nilaiAktif = kontrakAktif.reduce((s, k) => s + k.nilai, 0);
  const usulanMenunggu =
    db.usulanNPD.filter((u) => u.status === "SUBMITTED" || u.status === "ON_PROGRESS").length +
    db.usulanTag.filter((u) => u.status === "SUBMITTED" || u.status === "ON_PROGRESS").length;
  const kelengkapan = skorKelengkapan(db.products);
  const tagUtama = db.tags.slice(0, 6).map((t) => t.kode);

  const namaPrincipal = (id: string) => db.principals.find((p) => p.id === id)?.nama ?? id;

  return (
    <>
      <PageHeader
        judul="Dashboard"
        modul="M7"
        deskripsi="Notifikasi kontrak yang perlu di-update, progres usulan, dan kondisi aset — setiap kartu bisa diklik ke daftar terfilter (US-7.1)."
        aksi={
          <Button variant="outline" onPress={() => window.print()}>
            Cetak ringkasan
          </Button>
        }
      />

      {/* ---------------------------------------------------- kartu notifikasi */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Perlu tindakan</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {notif.map((n) => (
            <Link key={n.id} href={n.href} className="group block">
              <div
                className={`h-full rounded-xl border bg-surface p-4 shadow-surface transition-colors group-hover:bg-surface-hover ${
                  n.level === "critical"
                    ? "border-danger/50"
                    : n.level === "serious"
                      ? "border-warning/60"
                      : n.level === "warning"
                        ? "border-warning/40"
                        : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-muted">{n.judul}</span>
                  {n.level === "critical" ? (
                    <AlertTriangle className="size-4 text-danger" aria-label="kritis" />
                  ) : n.level === "serious" || n.level === "warning" ? (
                    <FileWarning className="size-4 text-warning" aria-label="peringatan" />
                  ) : null}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tnum text-foreground">{n.jumlah}</span>
                  <span className={`text-xs font-medium ${LEVEL_TEXT[n.level]}`}>{LEVEL_LABEL[n.level]}</span>
                </div>
                <p className="mt-1 text-xs leading-snug text-muted">{n.detail}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent">
                  Lihat daftar <ArrowRight className="size-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- KPI */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="SKU aktif"
          value={fmtNum(skuAktif.length)}
          hint={`${db.products.filter((p) => p.status === "DRAFT").length} SKU masih draft`}
          icon={<Boxes className="size-4" />}
          href="/master/product"
        />
        <StatCard
          label="Toko aktif"
          value={fmtNum(tokoAktif.length)}
          hint={`${db.stores.length} toko terdaftar di 5 region`}
          icon={<StoreIcon className="size-4" />}
          href="/master/store"
        />
        <StatCard
          label="Kontrak aktif"
          value={fmtNum(kontrakAktif.length)}
          hint={`Nilai ${fmtRpShort(nilaiAktif)}`}
          icon={<Handshake className="size-4" />}
          href="/kontrak"
        />
        <StatCard
          label="Usulan menunggu"
          value={fmtNum(usulanMenunggu)}
          tone={usulanMenunggu > 0 ? "serious" : "good"}
          hint="NPD + mutasi tag antar region"
          href="/usulan/npd"
        />
      </section>

      {/* --------------------------------------------------------- grafik */}
      <section className="mb-6 grid gap-4 xl:grid-cols-2">
        <ColumnChart
          title="Kontrak jatuh tempo — 6 bulan ke depan"
          subtitle="Dasar reminder bertingkat H-90 / H-60 / H-30 / H-7 (IMP-3)"
          data={jatuhTempoPerBulan(db.kontrak)}
          satuan="Jumlah kontrak"
          color={VIZ_STATUS.serious}
          format={(n) => String(Math.round(n))}
        />
        <BarChart
          title="Nilai kontrak per principal"
          subtitle="Top 6 principal berdasarkan total nilai kontrak"
          data={nilaiKontrakPerPrincipal(db.kontrak, db.principals)}
          format={fmtRpShort}
          satuan="Nilai kontrak"
        />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-2">
        <DonutChart
          title="Komposisi SKU per segment"
          subtitle="Seluruh SKU terdaftar pada taksonomi 5 level"
          data={skuPerSegment(db.products, db.categories)}
          heroLabel="SKU"
        />
        <StackedColumnChart
          title="Distribusi tag per region"
          subtitle="Perlakuan jual & PO per region — dasar validasi usulan tag"
          data={tagPerRegion(db.products, tagUtama)}
          keys={[...tagUtama, TAG_LAINNYA]}
          catatan="Enam tag pertama ditampilkan terpisah; sisanya digabung ke LAINNYA agar total tetap sama dengan jumlah SKU."
        />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-2">
        <LineChart
          title="Engagement konten per bulan"
          subtitle="Total like + comment + share + repost dari Content Report"
          data={engagementPerBulan(db.contentReports)}
          keys={["INSTAGRAM", "TIKTOK", "FACEBOOK", "YOUTUBE"]}
        />
        <StackedColumnChart
          title="Sebaran toko per region"
          subtitle="Tipe toko DTS dan EX. LWS"
          data={tokoPerRegion(db.stores)}
          keys={["DTS", "EX. LWS"]}
          colors={[VIZ[0], VIZ[1]]}
        />
      </section>

      {/* -------------------------------------------- kontrak butuh tindakan */}
      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-surface">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Kontrak masuk masa reminder</h3>
            <Link href="/kontrak" className="text-xs font-medium text-accent">
              Semua kontrak
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">Nomor / Judul</th>
                  <th className="py-2 pr-3 font-medium">Jenis</th>
                  <th className="py-2 pr-3 font-medium">Principal</th>
                  <th className="py-2 pr-3 font-medium">Berakhir</th>
                  <th className="py-2 font-medium">Reminder</th>
                </tr>
              </thead>
              <tbody>
                {kontrakPerluTindakan.slice(0, 8).map((k) => {
                  const info = kontrakInfo(k);
                  return (
                    <tr key={k.id} className="border-b border-separator/60 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="block font-medium text-foreground">{k.judul}</span>
                        <span className="block text-xs text-muted tnum">{k.nomorSurat}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <Chip size="sm" variant="soft">
                          {k.jenis}
                        </Chip>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted">{namaPrincipal(k.principalId)}</td>
                      <td className="py-2 pr-3 text-xs tnum text-muted">{fmtTgl(k.masaBerakhir)}</td>
                      <td className="py-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            info.level === "critical"
                              ? "bg-danger-soft text-danger-soft-foreground"
                              : info.level === "serious"
                                ? "bg-warning-soft text-warning-soft-foreground"
                                : "bg-default-soft text-default-soft-foreground"
                          }`}
                        >
                          {info.tier} · {info.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-surface">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Metrik keberhasilan (PRD §3)</h3>
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <GaugeArc
                label="G1 · Kelengkapan atribut SKU (target 98%)"
                value={kelengkapan}
                target={98}
                satuan={`${kelengkapan}% lengkap`}
                color={VIZ[2]}
                size={150}
              />
              <GaugeArc
                label="G2 · Kontrak tidak lewat tanpa notifikasi"
                value={db.kontrak.filter((k) => kontrakInfo(k).tier === "LEWAT").length === 0 ? 1 : 0}
                target={1}
                satuan={`${db.kontrak.filter((k) => kontrakInfo(k).tier === "LEWAT").length} kontrak lewat`}
                color={VIZ[5]}
                size={150}
              />
              <GaugeArc
                label="G4 · Usulan dengan jejak approval"
                value={[...db.usulanNPD, ...db.usulanTag].filter((u) => u.history.length > 0).length}
                target={Math.max(db.usulanNPD.length + db.usulanTag.length, 1)}
                satuan={`${db.usulanNPD.length + db.usulanTag.length} usulan`}
                color={VIZ[0]}
                size={150}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 shadow-surface">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Nilai kontrak aktif</h3>
            <p className="text-2xl font-semibold tnum text-foreground">{fmtRp(nilaiAktif)}</p>
            <p className="mt-1 text-xs text-muted">
              {kontrakAktif.length} kontrak berjalan dari {db.principals.filter((p) => p.status === "AKTIF").length}{" "}
              principal aktif.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
