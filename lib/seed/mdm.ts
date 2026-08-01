import type { FreeGift, PengajuanProduk, PluAllocation, SeriPlu } from "@/lib/types";
import { seedCategories, label } from "@/lib/seed/categories";
import { seedProducts, shiftDate, SEED_TODAY } from "@/lib/seed/transaksi";
import { seriDariSubDept } from "@/lib/plu";

const STAMP = "2026-07-01T08:00:00.000Z";

/* ------------------------------------------------------- Alokasi kode PLU */

/**
 * Slot PLU yang sudah terpakai oleh SKU aktif. Pool penuh 8.889 nomor tidak
 * ikut disimpan — hanya slot terpakai, sisanya dihitung saat dibutuhkan.
 */
export const seedPlu: PluAllocation[] = (() => {
  const katById = new Map(seedCategories.map((c) => [c.id, c]));
  const counter = new Map<SeriPlu, number>();
  const byNo = new Map<number, PluAllocation>();

  seedProducts.forEach((p) => {
    const kat = katById.get(p.categoryId);
    if (!kat) return;
    const seri = seriDariSubDept(kat.subDeptCode);
    const next = (counter.get(seri) ?? 0) + 1;
    counter.set(seri, next);

    const row = byNo.get(next) ?? { id: `plu-${next}`, no: next, terpakai: {} };
    row.terpakai[seri] = p.kodeProduct;
    byNo.set(next, row);
  });

  return [...byNo.values()].sort((a, b) => a.no - b.no);
})();

/* -------------------------------------------------------------- Free Gift */

const indukFG = seedProducts.slice(0, 11);

export const seedFreeGift: FreeGift[] = indukFG.map((p, i) => ({
  id: `fg-${i + 1}`,
  kodeProduct: `FG${p.kodeProduct.replace(/\D/g, "")}`,
  kodeProductInduk: p.kodeProduct,
  deskripsi: `[FG] ${p.namaProduct}`,
  updatedAt: STAMP,
  updatedBy: "seed",
}));

/* ------------------------------------------------- Pengajuan produk baru */

const kat = (kode: string) => seedCategories.find((c) => c.subCategoryCode === kode)!;

function klasifikasi(subCatCode: string) {
  const c = kat(subCatCode);
  return {
    segment: label(c.segmentCode, c.segment),
    dept: label(c.deptCode, c.dept),
    subDept: label(c.subDeptCode, c.subDept),
    category: label(c.categoryCode, c.category),
    subCategory: label(c.subCategoryCode, c.subCategory),
  };
}

export const seedPengajuan: PengajuanProduk[] = [
  {
    id: "pgj-001",
    tiket: "PRD-841203",
    tglAjuan: shiftDate(SEED_TODAY, -36),
    name: "RELX Pod Infinity Tropical Punch",
    brand: "RELX",
    series: "Infinity",
    brandSeries: "RELX Infinity",
    principle: "PT RELX Indonesia",
    tag: "B",
    ...klasifikasi("122A"),
    volume: "2",
    nic: "18",
    c1: "1",
    c2: "3",
    c3: "10",
    status: "MENUNGGU",
    pengajuId: "u-cat1",
    history: [
      { status: "SUBMITTED", aktor: "Rina Puspita", aktorRole: "CATEGORY_OFFICER", at: shiftDate(SEED_TODAY, -36) },
    ],
  },
  {
    id: "pgj-002",
    tiket: "PRD-739124",
    tglAjuan: shiftDate(SEED_TODAY, -37),
    name: "Coil Vandy Vape Mesh 0.3 Ohm",
    barcode: "8997123456001",
    brand: "Vandy Vape",
    series: "Mesh V2",
    brandSeries: "Vandy Vape Mesh V2",
    principle: "PT Vandy Nusantara",
    tag: "D",
    ...klasifikasi("151A"),
    resOhm: "0.3",
    maxWatt: "60",
    c1: "1",
    c2: "5",
    status: "DISETUJUI",
    kodeProduk: "ECP-13200-001",
    pengajuId: "u-buy1",
    history: [
      { status: "SUBMITTED", aktor: "Hendra Wijaya", aktorRole: "BUYER", at: shiftDate(SEED_TODAY, -37) },
      { status: "APPROVED", aktor: "Komang Legoas", aktorRole: "MDM", at: shiftDate(SEED_TODAY, -34) },
    ],
  },
  {
    id: "pgj-003",
    tiket: "PRD-612045",
    tglAjuan: shiftDate(SEED_TODAY, -38),
    name: "Liquid Freebase XXX 60ml 3mg",
    brand: "XXX",
    brandSeries: "XXX Series",
    principle: "PT Liquid Nusantara Kreasi",
    tag: "N",
    ...klasifikasi("132A"),
    volume: "60",
    nic: "3",
    c1: "1",
    c2: "12",
    status: "DITOLAK",
    pengajuId: "u-cat2",
    catatanApprover: "Brand belum terdaftar sebagai principal resmi dan dokumen NPPBKC belum dilampirkan.",
    history: [
      { status: "SUBMITTED", aktor: "Bagas Prakoso", aktorRole: "CATEGORY_OFFICER", at: shiftDate(SEED_TODAY, -38) },
      {
        status: "DECLINED",
        aktor: "Komang Legoas",
        aktorRole: "MDM",
        at: shiftDate(SEED_TODAY, -35),
        alasan: "Brand belum terdaftar sebagai principal resmi.",
      },
    ],
  },
];
