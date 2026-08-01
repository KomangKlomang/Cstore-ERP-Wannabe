"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Ban, CheckCircle2, Clock, Download, PackagePlus, RotateCcw, Search, Sparkles } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { FormModal, KosongRow, PageHeader, TextAreaInput } from "@/components/ui";
import { useApp } from "@/lib/store";
import { exportCSV } from "@/lib/export";
import { kodePlu, nomorBerikutnya, seriDariSubDept } from "@/lib/plu";
import { fmtTgl } from "@/lib/format";
import type { PengajuanProduk, StatusPengajuan } from "@/lib/types";

export default function ApproverPage() {
  return (
    <Guard modul="approver">
      <ApproverView />
    </Guard>
  );
}

const FILTER: Array<{ id: "" | StatusPengajuan; label: string }> = [
  { id: "", label: "Semua" },
  { id: "MENUNGGU", label: "Menunggu" },
  { id: "DISETUJUI", label: "Disetujui" },
  { id: "DITOLAK", label: "Ditolak" },
];

function ApproverView() {
  const db = useApp((s) => s);
  const putusan = useApp((s) => s.putusanPengajuan);
  const resetPengajuan = useApp((s) => s.resetPengajuan);

  const [filter, setFilter] = useState<"" | StatusPengajuan>("");
  const [q, setQ] = useState("");
  const [kode, setKode] = useState<Record<string, string>>({});
  const [tolakId, setTolakId] = useState<string | null>(null);
  const [alasan, setAlasan] = useState("");
  const tolakState = useOverlayState();

  const total = db.pengajuan.length;
  const menunggu = db.pengajuan.filter((p) => p.status === "MENUNGGU").length;
  const disetujui = db.pengajuan.filter((p) => p.status === "DISETUJUI").length;
  const ditolak = db.pengajuan.filter((p) => p.status === "DITOLAK").length;

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.pengajuan.filter((p) => {
      if (filter && p.status !== filter) return false;
      if (!term) return true;
      return [p.name, p.tiket, p.brand ?? "", p.barcode ?? ""].join(" ").toLowerCase().includes(term);
    });
  }, [db.pengajuan, filter, q]);

  /** Saran kode PLU dari seri kategori pengajuan (FR-PLU-01). */
  function saranKode(p: PengajuanProduk): string {
    const kodeSub = (p.subCategory ?? "").split("_")[0].trim();
    const kat = db.categories.find((c) => c.subCategoryCode === kodeSub);
    if (!kat) return "";
    const seri = seriDariSubDept(kat.subDeptCode);
    const no = nomorBerikutnya(db.pluAllocations, seri);
    return no > 0 ? kodePlu(seri, no) : "";
  }

  function isiOtomatis() {
    const next = { ...kode };
    terfilter
      .filter((p) => p.status === "MENUNGGU" && !next[p.id])
      .forEach((p) => {
        const s = saranKode(p);
        if (s) next[p.id] = s;
      });
    setKode(next);
  }

  const kolom = [
    { key: "tiket", header: "Tiket", value: (p: PengajuanProduk) => p.tiket },
    { key: "tgl", header: "Tgl Ajuan", value: (p: PengajuanProduk) => p.tglAjuan },
    { key: "name", header: "Name", value: (p: PengajuanProduk) => p.name },
    { key: "brand", header: "Brand", value: (p: PengajuanProduk) => p.brand ?? "" },
    { key: "barcode", header: "Barcode", value: (p: PengajuanProduk) => p.barcode ?? "" },
    { key: "segment", header: "Segment", value: (p: PengajuanProduk) => p.segment ?? "" },
    { key: "dept", header: "Dept", value: (p: PengajuanProduk) => p.dept ?? "" },
    { key: "subDept", header: "Sub Dept", value: (p: PengajuanProduk) => p.subDept ?? "" },
    { key: "category", header: "Category", value: (p: PengajuanProduk) => p.category ?? "" },
    { key: "subCategory", header: "Sub Category", value: (p: PengajuanProduk) => p.subCategory ?? "" },
    { key: "kode", header: "Kode Produk", value: (p: PengajuanProduk) => p.kodeProduk ?? "" },
    { key: "status", header: "Status", value: (p: PengajuanProduk) => p.status },
    { key: "catatan", header: "Catatan Approver", value: (p: PengajuanProduk) => p.catatanApprover ?? "" },
  ];

  return (
    <>
      <PageHeader
        judul="Dashboard Approver"
        modul="Product MDM · FR-INT-03"
        deskripsi="Review pengajuan produk baru, isi Kode Produk, lalu setujui atau tolak. Persetujuan langsung membentuk SKU di Master Product."
        aksi={
          <>
            <Link href="/pengajuan">
              <Button variant="secondary">
                <PackagePlus className="size-4" /> Form Pengajuan
              </Button>
            </Link>
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "pengajuan-produk")}>
              <Download className="size-4" /> CSV
            </Button>
          </>
        }
      />

      {/* ---------------------------------------------------------- statistik */}
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kartu label="Total Pengajuan" nilai={total} />
        <Kartu label="Menunggu Review" nilai={menunggu} tone="warning" />
        <Kartu label="Disetujui" nilai={disetujui} tone="success" />
        <Kartu label="Ditolak" nilai={ditolak} tone="danger" />
      </section>

      {/* ------------------------------------------------------------ filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTER.map((f) => {
          const aktif = filter === f.id;
          const jumlah =
            f.id === "" ? undefined : f.id === "MENUNGGU" ? menunggu : f.id === "DISETUJUI" ? disetujui : ditolak;
          return (
            <button
              key={f.id || "all"}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                aktif
                  ? "bg-accent font-medium text-accent-foreground"
                  : "border border-border bg-surface text-foreground hover:bg-surface-hover"
              }`}
            >
              {f.label}
              {jumlah !== undefined ? <span className="tnum opacity-70">{jumlah}</span> : null}
            </button>
          );
        })}

        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / tiket / brand…"
            aria-label="Cari pengajuan"
            className="w-64 rounded-lg border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- tabel */}
      {terfilter.length === 0 ? (
        <KosongRow pesan="Tidak ada pengajuan pada filter ini." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[1320px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Tiket</th>
                <th className="px-3 py-2 font-medium">Tgl Ajuan</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Brand</th>
                <th className="px-3 py-2 font-medium">Barcode</th>
                <th className="px-3 py-2 font-medium">Segment</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Sub Category</th>
                <th className="px-3 py-2 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Kode Produk
                    <button
                      type="button"
                      onClick={isiOtomatis}
                      title="Isi otomatis dari alokasi PLU"
                      className="text-accent hover:opacity-80"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                  </span>
                </th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {terfilter.map((p, i) => {
                const pending = p.status === "MENUNGGU";
                const nilaiKode = kode[p.id] ?? p.kodeProduk ?? "";
                return (
                  <tr key={p.id} className="border-b border-separator/60 align-top last:border-0">
                    <td className="px-3 py-3 text-xs tnum text-muted">{i + 1}</td>
                    <td className="px-3 py-3 tnum font-medium text-foreground">{p.tiket}</td>
                    <td className="px-3 py-3 text-xs tnum text-muted">{fmtTgl(p.tglAjuan)}</td>
                    <td className="max-w-[190px] px-3 py-3 text-foreground">{p.name}</td>
                    <td className="px-3 py-3 text-xs text-muted">{p.brand ?? "–"}</td>
                    <td className="px-3 py-3 text-xs tnum text-muted">{p.barcode ?? "–"}</td>
                    <td className="px-3 py-3 text-xs text-foreground">{p.segment ?? "–"}</td>
                    <td className="px-3 py-3 text-xs text-accent">{p.category ?? "–"}</td>
                    <td className="px-3 py-3 text-xs text-accent">{p.subCategory ?? "–"}</td>
                    <td className="px-3 py-3">
                      <input
                        value={nilaiKode}
                        readOnly={!pending}
                        onChange={(e) => setKode({ ...kode, [p.id]: e.target.value })}
                        placeholder={pending ? "Isi kode produk." : "–"}
                        aria-label={`Kode produk ${p.tiket}`}
                        className={`w-40 rounded-lg border px-2 py-1.5 text-sm outline-none ${
                          pending
                            ? "border-border bg-surface text-foreground focus:border-accent"
                            : "border-border/60 bg-surface-secondary text-muted"
                        }`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <StatusPengajuanChip status={p.status} />
                      {p.catatanApprover ? (
                        <span className="mt-1 block max-w-[180px] text-[11px] leading-snug text-muted">
                          {p.catatanApprover}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {pending ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="primary"
                            isDisabled={!nilaiKode.trim()}
                            onPress={() => putusan(p.id, "DISETUJUI", nilaiKode.trim())}
                          >
                            <CheckCircle2 className="size-3.5" /> Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onPress={() => {
                              setTolakId(p.id);
                              setAlasan("");
                              tolakState.open();
                            }}
                          >
                            <Ban className="size-3.5" /> Tolak
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onPress={() => resetPengajuan(p.id)}>
                          <RotateCcw className="size-3.5" /> Reset
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Ikon <Sparkles className="inline size-3" /> pada kolom Kode Produk mengisi seluruh baris menunggu dengan kode
        PLU berikutnya yang belum terpakai pada seri kategorinya. Kode tetap bisa ditimpa manual.
      </p>

      <FormModal
        state={tolakState}
        judul="Tolak pengajuan"
        deskripsi="Alasan penolakan wajib diisi dan tercatat di jejak approval."
        simpanLabel="Tolak pengajuan"
        bisaSimpan={alasan.trim().length > 0}
        onSimpan={() => {
          if (!tolakId || !alasan.trim()) return false;
          putusan(tolakId, "DITOLAK", undefined, alasan.trim());
          setTolakId(null);
          setAlasan("");
        }}
      >
        <TextAreaInput label="Alasan penolakan" value={alasan} onChange={setAlasan} rows={3} />
      </FormModal>
    </>
  );
}

function Kartu({
  label,
  nilai,
  tone = "default",
}: {
  label: string;
  nilai: number;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const map = {
    default: "border-border bg-surface-secondary text-foreground",
    warning: "border-warning/40 bg-warning-soft text-warning-soft-foreground",
    success: "border-success/40 bg-success-soft text-success-soft-foreground",
    danger: "border-danger/40 bg-danger-soft text-danger-soft-foreground",
  } as const;
  return (
    <div className={`rounded-xl border px-4 py-4 ${map[tone]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-semibold tnum">{nilai}</p>
    </div>
  );
}

export function StatusPengajuanChip({ status }: { status: StatusPengajuan }) {
  if (status === "MENUNGGU")
    return (
      <Chip size="sm" variant="soft" color="warning">
        <Clock className="mr-1 inline size-3" />
        Menunggu
      </Chip>
    );
  if (status === "DISETUJUI")
    return (
      <Chip size="sm" variant="soft" color="success">
        <CheckCircle2 className="mr-1 inline size-3" />
        Disetujui
      </Chip>
    );
  return (
    <Chip size="sm" variant="soft" color="danger">
      <Ban className="mr-1 inline size-3" />
      Ditolak
    </Chip>
  );
}
