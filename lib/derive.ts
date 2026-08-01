import type {
  Aset,
  CategoryRow,
  ContentReport,
  Kontrak,
  Notifikasi,
  Principal,
  Product,
  Region,
  Store,
} from "@/lib/types";
import { REGIONS } from "@/lib/types";
import type { Collections } from "@/lib/store";
import { daysUntil, fmtTgl } from "@/lib/format";

/* --------------------------------------------- IMP-3: reminder bertingkat */

export type ReminderTier = "LEWAT" | "H-7" | "H-30" | "H-60" | "H-90" | "AMAN";

export interface KontrakInfo {
  sisaHari: number;
  tier: ReminderTier;
  level: "critical" | "serious" | "warning" | "good";
  label: string;
}

export function kontrakInfo(k: Kontrak, today?: string): KontrakInfo {
  const sisa = daysUntil(k.masaBerakhir, today);
  if (sisa < 0) return { sisaHari: sisa, tier: "LEWAT", level: "critical", label: `Lewat ${Math.abs(sisa)} hari` };
  if (sisa <= 7) return { sisaHari: sisa, tier: "H-7", level: "critical", label: `Berakhir ${sisa} hari lagi` };
  if (sisa <= 30) return { sisaHari: sisa, tier: "H-30", level: "serious", label: `Berakhir ${sisa} hari lagi` };
  if (sisa <= 60) return { sisaHari: sisa, tier: "H-60", level: "warning", label: `Berakhir ${sisa} hari lagi` };
  if (sisa <= 90) return { sisaHari: sisa, tier: "H-90", level: "warning", label: `Berakhir ${sisa} hari lagi` };
  return { sisaHari: sisa, tier: "AMAN", level: "good", label: `Berakhir ${fmtTgl(k.masaBerakhir)}` };
}

export function perluTindakan(k: Kontrak, today?: string): boolean {
  const t = kontrakInfo(k, today).tier;
  return t !== "AMAN";
}

/* ------------------------------------------------------- M7: kartu notifikasi */

export function buildNotifikasi(db: Collections, today?: string): Notifikasi[] {
  const out: Notifikasi[] = [];

  // R1 — kontrak header / lolipop / akrilik yang perlu di-update.
  (["HEADER", "LOLIPOP", "AKRILIK"] as const).forEach((jenis) => {
    const list = db.kontrak.filter((k) => k.jenis === jenis && perluTindakan(k, today));
    const kritis = list.filter((k) => ["LEWAT", "H-7"].includes(kontrakInfo(k, today).tier));
    if (list.length) {
      out.push({
        id: `notif-kontrak-${jenis}`,
        judul: `Kontrak ${jenis.toLowerCase()}`,
        detail: kritis.length
          ? `${kritis.length} kontrak lewat / ≤ 7 hari lagi`
          : `${list.length} kontrak masuk masa reminder`,
        level: kritis.length ? "critical" : "warning",
        href: `/kontrak?jenis=${jenis}`,
        jumlah: list.length,
      });
    }
  });

  const menungguNPD = db.usulanNPD.filter((u) => u.status === "SUBMITTED" || u.status === "ON_PROGRESS");
  if (menungguNPD.length) {
    out.push({
      id: "notif-npd",
      judul: "Usulan NPD menunggu",
      detail: `${menungguNPD.length} usulan produk baru butuh review MDM`,
      level: "serious",
      href: "/usulan/npd",
      jumlah: menungguNPD.length,
    });
  }

  const menungguTag = db.usulanTag.filter((u) => u.status === "SUBMITTED" || u.status === "ON_PROGRESS");
  if (menungguTag.length) {
    out.push({
      id: "notif-tag",
      judul: "Usulan Tag menunggu",
      detail: `${menungguTag.length} usulan mutasi tag antar region`,
      level: "serious",
      href: "/usulan/tag",
      jumlah: menungguTag.length,
    });
  }

  const asetReplace = db.aset.filter((a) => a.kondisi === "REPLACE" || a.kondisi === "HILANG");
  if (asetReplace.length) {
    out.push({
      id: "notif-aset",
      judul: "Aset perlu diganti",
      detail: `${asetReplace.length} aset berstatus replace/hilang`,
      level: "warning",
      href: "/aset?kondisi=REPLACE",
      jumlah: asetReplace.length,
    });
  }

  const draftSKU = db.products.filter((p) => p.status === "DRAFT");
  if (draftSKU.length) {
    out.push({
      id: "notif-sku",
      judul: "SKU draft",
      detail: `${draftSKU.length} SKU belum lengkap atributnya`,
      level: "info",
      href: "/master/product?status=DRAFT",
      jumlah: draftSKU.length,
    });
  }

  const asetTanpaFoto = db.aset.filter((a) => a.tangible && a.fotoTerpasang.length === 0);
  if (asetTanpaFoto.length) {
    out.push({
      id: "notif-foto",
      judul: "Aset tanpa foto terpasang",
      detail: `${asetTanpaFoto.length} aset tangible belum ada dokumentasi foto`,
      level: "info",
      href: "/aset?foto=kosong",
      jumlah: asetTanpaFoto.length,
    });
  }

  return out;
}

/* ---------------------------------------------------------- G1: kelengkapan */

const WAJIB: Array<keyof Product> = [
  "kodeProduct",
  "barcode",
  "namaProduct",
  "principalId",
  "categoryId",
  "brand",
  "uom",
  "isiSatuPack",
  "hargaBeli",
  "hargaJual",
];

export function produkLengkap(p: Product): boolean {
  return WAJIB.every((k) => {
    const v = p[k];
    return v !== undefined && v !== null && v !== "" && v !== 0;
  });
}

/** G1 — % SKU aktif yang lengkap atributnya (target ≥ 98%). */
export function skorKelengkapan(products: Product[]): number {
  const aktif = products.filter((p) => p.status === "AKTIF");
  if (!aktif.length) return 100;
  return Math.round((aktif.filter(produkLengkap).length / aktif.length) * 1000) / 10;
}

/* ------------------------------------------------------------- Agregasi chart */

export interface Point {
  label: string;
  value: number;
  key?: string;
}

export interface SeriesPoint {
  label: string;
  values: Record<string, number>;
}

export function kontrakPerJenis(kontrak: Kontrak[]): Point[] {
  const m = new Map<string, number>();
  kontrak.forEach((k) => m.set(k.jenis, (m.get(k.jenis) ?? 0) + 1));
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function nilaiKontrakPerPrincipal(kontrak: Kontrak[], principals: Principal[], top = 6): Point[] {
  const m = new Map<string, number>();
  kontrak.forEach((k) => m.set(k.principalId, (m.get(k.principalId) ?? 0) + k.nilai));
  return [...m.entries()]
    .map(([id, value]) => ({
      key: id,
      label: principals.find((p) => p.id === id)?.nama.replace(/^PT\s+/, "") ?? id,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top);
}

export function skuPerSegment(products: Product[], categories: CategoryRow[]): Point[] {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const m = new Map<string, number>();
  products.forEach((p) => {
    const seg = catById.get(p.categoryId)?.segment ?? "TIDAK TERPETAKAN";
    m.set(seg, (m.get(seg) ?? 0) + 1);
  });
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export const TAG_LAINNYA = "LAINNYA";

/**
 * Distribusi tag per region — stacked bar (perlakuan Jual/PO).
 * Tag di luar `kelompok` dikumpulkan ke satu bucket "LAINNYA" supaya total
 * batang tetap sama dengan jumlah SKU (tidak ada data yang hilang diam-diam).
 */
export function tagPerRegion(products: Product[], kelompok: string[]): SeriesPoint[] {
  return REGIONS.map((r) => {
    const values: Record<string, number> = { [TAG_LAINNYA]: 0 };
    kelompok.forEach((k) => (values[k] = 0));
    products.forEach((p) => {
      const kode = p.tagPerRegion[r];
      if (kelompok.includes(kode)) values[kode] += 1;
      else values[TAG_LAINNYA] += 1;
    });
    return { label: r, values };
  });
}

export function tokoPerRegion(stores: Store[]): SeriesPoint[] {
  return REGIONS.map((r) => {
    const list = stores.filter((s) => s.region === r);
    return {
      label: r,
      values: {
        DTS: list.filter((s) => s.storeType === "DTS").length,
        "EX. LWS": list.filter((s) => s.storeType === "EX. LWS").length,
      },
    };
  });
}

export function asetPerRegion(aset: Aset[], stores: Store[]): SeriesPoint[] {
  const regionOf = new Map(stores.map((s) => [s.storeCode, s.region]));
  return REGIONS.map((r) => {
    const list = aset.filter((a) => regionOf.get(a.storeCode) === r);
    return {
      label: r,
      values: {
        GOOD: list.filter((a) => a.kondisi === "GOOD").length,
        REPLACE: list.filter((a) => a.kondisi === "REPLACE").length,
        HILANG: list.filter((a) => a.kondisi === "HILANG").length,
      },
    };
  });
}

/** Engagement konten per bulan, dipecah per platform (line chart multi-series). */
export function engagementPerBulan(reports: ContentReport[], bulan = 6): SeriesPoint[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = bulan - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  const label = (ym: string) => {
    const B = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${B[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;
  };

  return keys.map((ym) => {
    const values: Record<string, number> = { INSTAGRAM: 0, TIKTOK: 0, FACEBOOK: 0, YOUTUBE: 0 };
    reports
      .filter((r) => r.tanggal.slice(0, 7) === ym)
      .forEach((r) => {
        values[r.platform] += r.like + r.comment + r.share + r.repost;
      });
    return { label: label(ym), values };
  });
}

export function kontenPerJenis(reports: ContentReport[]): Point[] {
  const m = new Map<string, number>();
  reports.forEach((r) => m.set(r.jenisKonten, (m.get(r.jenisKonten) ?? 0) + r.like + r.comment + r.share));
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function topTokoKonten(reports: ContentReport[], stores: Store[], top = 8): Point[] {
  const m = new Map<string, number>();
  reports.forEach((r) => m.set(r.storeCode, (m.get(r.storeCode) ?? 0) + r.like + r.comment + r.share + r.repost));
  return [...m.entries()]
    .map(([code, value]) => ({
      key: code,
      label: stores.find((s) => s.storeCode === code)?.storeName.replace("C-Store ", "") ?? code,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top);
}

export function jatuhTempoPerBulan(kontrak: Kontrak[], bulan = 6): Point[] {
  const now = new Date();
  const out: Point[] = [];
  const B = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  for (let i = 0; i < bulan; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const ym = d.toISOString().slice(0, 7);
    out.push({
      key: ym,
      label: `${B[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
      value: kontrak.filter((k) => k.masaBerakhir.slice(0, 7) === ym).length,
    });
  }
  return out;
}

/* ---------------------------------------------------------- M8 global search */

export interface SearchHit {
  entity: string;
  id: string;
  judul: string;
  subjudul: string;
  href: string;
}

export function globalSearch(db: Collections, q: string, limit = 8): Record<string, SearchHit[]> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return {};
  const has = (...vals: Array<string | number | undefined>) =>
    vals.some((v) => String(v ?? "").toLowerCase().includes(term));

  const out: Record<string, SearchHit[]> = {};
  const push = (group: string, hit: SearchHit) => {
    out[group] = out[group] ?? [];
    if (out[group].length < limit) out[group].push(hit);
  };

  db.products.forEach((p) => {
    if (has(p.namaProduct, p.kodeProduct, p.barcode, p.brand))
      push("Produk", {
        entity: "product",
        id: p.id,
        judul: p.namaProduct,
        subjudul: `${p.kodeProduct} · ${p.barcode}`,
        href: `/master/product?q=${encodeURIComponent(p.kodeProduct)}`,
      });
  });

  db.stores.forEach((s) => {
    if (has(s.storeName, s.storeCode, s.storeIdHM, s.kota))
      push("Toko", {
        entity: "store",
        id: s.id,
        judul: s.storeName,
        subjudul: `${s.storeCode} · ${s.region} · ${s.kota}`,
        href: `/master/store/${s.storeCode}`,
      });
  });

  db.principals.forEach((p) => {
    if (has(p.nama, p.kode, ...p.brand))
      push("Principal", {
        entity: "principal",
        id: p.id,
        judul: p.nama,
        subjudul: `${p.kode} · ${p.brand.join(", ")}`,
        href: `/master/principal?q=${encodeURIComponent(p.kode)}`,
      });
  });

  db.categories.forEach((c) => {
    if (has(c.subCategory, c.category, c.subDept, c.subCategoryCode))
      push("Kategori", {
        entity: "category",
        id: c.id,
        judul: `${c.subCategoryCode} — ${c.subCategory}`,
        subjudul: `${c.segment} › ${c.subDept} › ${c.category}`,
        href: `/master/category?q=${encodeURIComponent(c.subCategoryCode)}`,
      });
  });

  db.kontrak.forEach((k) => {
    if (has(k.judul, k.nomorSurat))
      push("Kontrak", {
        entity: "kontrak",
        id: k.id,
        judul: k.judul,
        subjudul: `${k.nomorSurat} · ${k.jenis}`,
        href: `/kontrak?q=${encodeURIComponent(k.nomorSurat)}`,
      });
  });

  db.promosi.forEach((p) => {
    if (has(p.nama, p.kodePromo))
      push("Promosi", {
        entity: "promosi",
        id: p.id,
        judul: p.nama,
        subjudul: `${p.kodePromo} · ${p.status}`,
        href: `/promosi?q=${encodeURIComponent(p.kodePromo)}`,
      });
  });

  return out;
}

/* -------------------------------------------------------- Profil toko (US-7.2) */

export function profilToko(db: Collections, storeCode: string) {
  const store = db.stores.find((s) => s.storeCode === storeCode);
  if (!store) return null;

  const aset = db.aset.filter((a) => a.storeCode === storeCode);
  const kontrak = db.kontrak.filter((k) => k.storeCodes.includes(storeCode));
  const promosi = db.promosi.filter((p) => p.storeCodes.includes(storeCode));
  const konten = db.contentReports.filter((c) => c.storeCode === storeCode);

  const tagBoleh = new Set(db.tags.filter((t) => t.jual).map((t) => t.kode));
  const sku = db.products.filter((p) => p.status === "AKTIF" && tagBoleh.has(p.tagPerRegion[store.region as Region]));

  return { store, aset, kontrak, promosi, konten, sku };
}
