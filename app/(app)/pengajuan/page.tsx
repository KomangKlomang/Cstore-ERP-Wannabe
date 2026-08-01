"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import { ClipboardPaste, FileText, ShieldCheck } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { SheetGrid, type SheetGroup, type SheetRow } from "@/components/sheet-grid";
import { Callout, PageHeader } from "@/components/ui";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { cariTaksonomi, label } from "@/lib/seed/categories";
import type { CategoryRow, PengajuanProduk } from "@/lib/types";

export default function PengajuanPage() {
  return (
    <Guard modul="pengajuan">
      <PengajuanView />
    </Guard>
  );
}

/** Empat band kolom, warnanya mengikuti pembagian pada form kerja tim. */
const GROUPS: SheetGroup[] = [
  {
    label: "Identitas Produk",
    bg: "var(--band-identitas)",
    columns: [
      { key: "name", label: "Name", required: true, width: 190, placeholder: "Nama produk" },
      { key: "barcode", label: "Barcode", width: 150 },
      { key: "brand", label: "Brand", width: 140 },
      { key: "series", label: "Series", width: 130 },
      { key: "brandSeries", label: "Brand/Series", width: 150 },
      { key: "principle", label: "Principle", width: 150 },
      { key: "minor", label: "Minor", width: 110 },
      { key: "mpkm", label: "MPKM", width: 110 },
    ],
  },
  {
    label: "Klasifikasi",
    bg: "var(--band-klasifikasi)",
    columns: [
      { key: "tag", label: "Tag", width: 90, placeholder: "B/D/G/N/S" },
      { key: "segment", label: "Segment", width: 180 },
      { key: "dept", label: "Dept", width: 170, auto: true },
      { key: "subDept", label: "Sub Dept", width: 170 },
      { key: "category", label: "Category", width: 210 },
      { key: "subCategory", label: "Sub Category", width: 230 },
    ],
  },
  {
    label: "Spesifikasi Teknis",
    bg: "var(--band-teknis)",
    columns: [
      { key: "volume", label: "Volume", width: 100 },
      { key: "nic", label: "Nic", width: 90 },
      { key: "length", label: "Length", width: 95 },
      { key: "width", label: "Width", width: 95 },
      { key: "height", label: "Height", width: 95 },
      { key: "resOhm", label: "Res.Ohm", width: 105 },
      { key: "battery", label: "Battery", width: 100 },
      { key: "maxWatt", label: "MaxWatt", width: 105 },
    ],
  },
  {
    label: "Konversi BBM (Qty)",
    bg: "var(--band-konversi)",
    columns: [
      { key: "c1", label: "C1", width: 85 },
      { key: "c2", label: "C2", width: 85 },
      { key: "c3", label: "C3", width: 85 },
      { key: "c4", label: "C4", width: 85 },
      { key: "c5", label: "C5", width: 85 },
    ],
  },
];

const KOLOM = GROUPS.flatMap((g) => g.columns).map((c) => c.key);
const barisKosong = (): SheetRow => Object.fromEntries(KOLOM.map((k) => [k, ""]));

function tiketBaru() {
  return `PRD-${Math.floor(100000 + Math.random() * 899999)}`;
}

function PengajuanView() {
  const categories = useApp((s) => s.categories);
  const submitPengajuan = useApp((s) => s.submitPengajuan);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const bolehApprove = can(user, "approver");

  const [rows, setRows] = useState<SheetRow[]>(() => [barisKosong(), barisKosong(), barisKosong()]);
  const [pesan, setPesan] = useState("");

  /**
   * Dept diisi otomatis dari baris taksonomi yang cocok — user cukup mengisi
   * Sub Category (atau Category / Sub Dept) dan sisanya menyusul.
   */
  const autoFill = useMemo(
    () => (row: SheetRow): SheetRow => {
      const sumber = row.subCategory || row.category || row.subDept;
      const kat: CategoryRow | undefined = sumber ? cariTaksonomi(categories, sumber) : undefined;
      if (!kat) return { ...row, dept: "" };
      /* Kode polos yang persis cocok dinormalisasi jadi label lengkap "N _ NAMA". */
      const rapikan = (nilai: string, kode: string, nama: string) =>
        nilai.trim().toUpperCase() === kode ? label(kode, nama) : nilai;

      return {
        ...row,
        dept: label(kat.deptCode, kat.dept),
        segment: row.segment || label(kat.segmentCode, kat.segment),
        subDept: rapikan(row.subDept || label(kat.subDeptCode, kat.subDept), kat.subDeptCode, kat.subDept),
        category: rapikan(row.category || label(kat.categoryCode, kat.category), kat.categoryCode, kat.category),
        subCategory: rapikan(
          row.subCategory || label(kat.subCategoryCode, kat.subCategory),
          kat.subCategoryCode,
          kat.subCategory,
        ),
      };
    },
    [categories],
  );

  const siap = rows.filter((r) => (r.name ?? "").trim().length > 0);

  function ajukan() {
    if (!siap.length) return;
    const now = new Date().toISOString().slice(0, 10);
    const data: PengajuanProduk[] = siap.map((r) => ({
      id: newId("pgj"),
      tiket: tiketBaru(),
      tglAjuan: now,
      name: r.name.trim(),
      barcode: r.barcode || undefined,
      brand: r.brand || undefined,
      series: r.series || undefined,
      brandSeries: r.brandSeries || undefined,
      principle: r.principle || undefined,
      minor: r.minor || undefined,
      mpkm: r.mpkm || undefined,
      tag: r.tag || undefined,
      segment: r.segment || undefined,
      dept: r.dept || undefined,
      subDept: r.subDept || undefined,
      category: r.category || undefined,
      subCategory: r.subCategory || undefined,
      volume: r.volume || undefined,
      nic: r.nic || undefined,
      length: r.length || undefined,
      width: r.width || undefined,
      height: r.height || undefined,
      resOhm: r.resOhm || undefined,
      battery: r.battery || undefined,
      maxWatt: r.maxWatt || undefined,
      c1: r.c1 || undefined,
      c2: r.c2 || undefined,
      c3: r.c3 || undefined,
      c4: r.c4 || undefined,
      c5: r.c5 || undefined,
      status: "MENUNGGU",
      pengajuId: user?.id ?? "",
      history: [],
    }));

    submitPengajuan(data);
    setRows([barisKosong(), barisKosong(), barisKosong()]);
    setPesan(`${data.length} produk masuk antrian review approver.`);
  }

  return (
    <>
      <PageHeader
        judul="Form Pengajuan Produk"
        modul="Product MDM · FR-INT-01"
        deskripsi="Ajukan beberapa SKU sekaligus. Data bisa ditempel langsung dari Excel — kolom mengikuti urutan pada form kerja tim."
        aksi={
          bolehApprove ? (
            <Link href="/pengajuan/approver">
              <Button variant="secondary">
                <ShieldCheck className="size-4" /> Dashboard Approver
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
        <ClipboardPaste className="mt-0.5 size-4 shrink-0" />
        <p className="leading-relaxed">
          <b>Paste dari Excel:</b> klik sel →{" "}
          <kbd className="rounded border border-current/30 px-1 text-xs">Ctrl+V</kbd>.{" "}
          <b>Blok sel:</b> klik + drag, atau klik nomor baris / nama kolom.{" "}
          <b>Hapus:</b> blok sel lalu <kbd className="rounded border border-current/30 px-1 text-xs">Delete</kbd>, atau
          gunakan tombol yang muncul.
        </p>
      </div>

      <SheetGrid groups={GROUPS} rows={rows} onChange={setRows} emptyRow={barisKosong} autoFill={autoFill} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-warning">
          <span aria-hidden>*</span> Kolom Name wajib diisi
        </p>
        {pesan ? (
          <Chip size="sm" variant="soft" color="success">
            {pesan}
          </Chip>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            onPress={() => {
              setRows([barisKosong(), barisKosong(), barisKosong()]);
              setPesan("");
            }}
          >
            Reset
          </Button>
          <Button variant="primary" isDisabled={siap.length === 0} onPress={ajukan}>
            <FileText className="size-4" /> Ajukan {siap.length} Produk
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <Callout tone="info" judul="Yang terjadi setelah diajukan">
          Setiap baris jadi satu tiket berstatus <b>Menunggu</b> di Dashboard Approver. Approver mengisi{" "}
          <b>Kode Produk</b> lalu menyetujui — SKU otomatis terbentuk di Master Product beserta penandaan slot kode PLU
          pada seri kategorinya. Kolom Dept terisi otomatis dari taksonomi MASTER_CAT.
        </Callout>
      </div>
    </>
  );
}
