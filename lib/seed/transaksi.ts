import type {
  Aset,
  ContentReport,
  Dokumen,
  Kontrak,
  Product,
  Promosi,
  Region,
  UsulanNPD,
  UsulanTag,
} from "@/lib/types";
import { REGIONS } from "@/lib/types";
import { seedStores } from "@/lib/seed/masters";

const STAMP = "2026-07-01T08:00:00.000Z";

/** Tanggal acuan seed. Semua tanggal relatif dihitung dari sini agar reminder
 *  kontrak (H-90/60/30/7) langsung terlihat saat aplikasi pertama dibuka. */
export const SEED_TODAY = "2026-07-31";

export function shiftDate(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Deterministik — hindari Math.random supaya SSR & client identik. */
function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function tagset(seed: number): Record<Region, string> {
  const pool = ["B", "B", "C", "A", "D", "F", "H", "K"];
  return REGIONS.reduce(
    (acc, r, i) => {
      acc[r] = pick(pool, seed * 7 + i * 3);
      return acc;
    },
    {} as Record<Region, string>,
  );
}

/* -------------------------------------------------------------- Master Product */

type P = [
  kode: string,
  barcode: string,
  nama: string,
  principalId: string,
  categoryId: string,
  brand: string,
  uom: string,
  isi: number,
  beli: number,
  jual: number,
  msrp: number,
];

const productRaw: P[] = [
  ["PRD-00001", "8991234500011", "OXVA XLIM PRO 2 POD KIT BLACK", "prn-004", "cat-111A", "OXVA", "PCS", 10, 285000, 349000, 359000],
  ["PRD-00002", "8991234500028", "OXVA XLIM SQ PRO POD KIT SILVER", "prn-004", "cat-111A", "OXVA", "PCS", 10, 245000, 299000, 309000],
  ["PRD-00003", "8991234500035", "VAPORESSO XROS 4 MINI POD KIT", "prn-005", "cat-111A", "VAPORESSO", "PCS", 10, 265000, 325000, 335000],
  ["PRD-00004", "8991234500042", "VAPORESSO ARMOUR MAX BOX MOD", "prn-005", "cat-111B", "VAPORESSO", "PCS", 6, 610000, 749000, 769000],
  ["PRD-00005", "8991234500059", "OXVA ORIGIN X AIO DEVICE", "prn-004", "cat-111B", "OXVA", "PCS", 6, 520000, 639000, 649000],
  ["PRD-00006", "8991234500066", "DISPOSABLE POD 6000 PUFF MANGO", "prn-006", "cat-113A", "FOOM", "PCS", 10, 78000, 99000, 105000],
  ["PRD-00007", "8991234500073", "DISPOSABLE POD 6000 PUFF MINT", "prn-006", "cat-113A", "FOOM", "PCS", 10, 78000, 99000, 105000],
  ["PRD-00008", "8991234500080", "FOOM LIQUID FREEBASE MANGO 60ML", "prn-006", "cat-132A", "FOOM", "BTL", 12, 96000, 125000, 130000],
  ["PRD-00009", "8991234500097", "FOOM LIQUID FREEBASE CREAMY 60ML", "prn-006", "cat-132A", "FOOM", "BTL", 12, 96000, 125000, 130000],
  ["PRD-00010", "8991234500103", "EMKAY TOBACCO GOLD 60ML", "prn-006", "cat-132B", "EMKAY", "BTL", 12, 105000, 135000, 139000],
  ["PRD-00011", "8991234500110", "NEXT LIQUID SALT LYCHEE 30ML", "prn-006", "cat-131B", "NEXT LIQUID", "BTL", 12, 72000, 95000, 99000],
  ["PRD-00012", "8991234500127", "NEXT LIQUID SALT MINT 30ML", "prn-006", "cat-131B", "NEXT LIQUID", "BTL", 12, 72000, 95000, 99000],
  ["PRD-00013", "8991234500134", "OXVA UNICOIL MESH 0.6 OHM (3PCS)", "prn-004", "cat-151A", "OXVA", "PACK", 10, 68000, 89000, 92000],
  ["PRD-00014", "8991234500141", "VAPORESSO XROS CARTRIDGE 0.8 (2PCS)", "prn-005", "cat-122A", "VAPORESSO", "PACK", 10, 55000, 72000, 75000],
  ["PRD-00015", "8991234500158", "BATTERY 18650 3000MAH 30A", "prn-005", "cat-152A", "VAPORESSO", "PCS", 10, 88000, 115000, 119000],
  ["PRD-00016", "8991234500165", "USB-C FAST CHARGER CABLE 1M", "prn-005", "cat-152B", "VAPORESSO", "PCS", 20, 25000, 39000, 42000],
  ["PRD-00017", "8991234500172", "RTA 24MM DUAL COIL", "prn-005", "cat-153A", "VAPORESSO", "PCS", 6, 310000, 389000, 399000],
  ["PRD-00018", "8991234500189", "RDA 22MM SINGLE COIL", "prn-005", "cat-153B", "VAPORESSO", "PCS", 6, 245000, 309000, 319000],
  ["PRD-00019", "8991234500196", "SILICONE CASE XLIM PRO BLACK", "prn-004", "cat-161A", "OXVA", "PCS", 20, 18000, 29000, 32000],
  ["PRD-00020", "8991234500202", "LANYARD POD UNIVERSAL", "prn-004", "cat-161B", "OXVA", "PCS", 20, 15000, 25000, 27000],
  ["PRD-00021", "8991234500219", "COTTON ORGANIC + KANTHAL WIRE SET", "prn-006", "cat-162A", "EMKAY", "PACK", 20, 22000, 35000, 37000],
  ["PRD-00022", "8991234500226", "VAPE TOOL KIT 12 IN 1", "prn-006", "cat-162B", "EMKAY", "SET", 10, 95000, 129000, 135000],
  ["PRD-00023", "8991234500233", "LIL SOLID 2.0 STARTER KIT BLUE", "prn-007", "cat-141A", "LIL SOLID", "PCS", 6, 445000, 549000, 559000],
  ["PRD-00024", "8991234500240", "LIL SOLID HOLDER REPLACEMENT", "prn-007", "cat-141A", "LIL SOLID", "PCS", 10, 185000, 239000, 245000],
  ["PRD-00025", "8991234500257", "HNB TOBACCO DEVICE STARTER KIT", "prn-007", "cat-141B", "LIL SOLID", "PCS", 6, 465000, 575000, 585000],
  ["PRD-00026", "8991234500264", "HNB TOBACCO HOLDER UNIT", "prn-007", "cat-141B", "LIL SOLID", "PCS", 10, 195000, 249000, 255000],
  ["PRD-00027", "8991234500271", "FIIT REGULAR STICK 20", "prn-007", "cat-142A", "FIIT", "PACK", 20, 22000, 28000, 30000],
  ["PRD-00028", "8991234500288", "FIIT MENTHOL STICK 20", "prn-007", "cat-142B", "FIIT", "PACK", 20, 22000, 28000, 30000],
  ["PRD-00029", "8991234500295", "HNB DEVICE CAP REPLACEMENT", "prn-007", "cat-154A", "LIL SOLID", "PCS", 20, 28000, 45000, 48000],
  ["PRD-00030", "8991234500301", "HNB CLEANING STICK (10PCS)", "prn-007", "cat-154A", "LIL SOLID", "PACK", 20, 18000, 32000, 35000],
  ["PRD-00031", "8991234500318", "MARLBORO RED 12", "prn-001", "cat-211A", "MARLBORO", "BKS", 12, 28500, 32000, 33000],
  ["PRD-00032", "8991234500325", "MARLBORO RED 16", "prn-001", "cat-211B", "MARLBORO", "BKS", 16, 37500, 42000, 43000],
  ["PRD-00033", "8991234500332", "GUDANG GARAM SURYA 12", "prn-002", "cat-211A", "SURYA", "BKS", 12, 26000, 29500, 30500],
  ["PRD-00034", "8991234500349", "GUDANG GARAM SURYA 16", "prn-002", "cat-211C", "SURYA", "BKS", 20, 42000, 47000, 48500],
  ["PRD-00035", "8991234500356", "SAMPOERNA A MILD 16", "prn-001", "cat-212A", "SAMPOERNA A", "BKS", 16, 34500, 38500, 39500],
  ["PRD-00036", "8991234500363", "MLD BLUE 20", "prn-003", "cat-212B", "MLD", "BKS", 20, 39000, 43500, 44500],
  ["PRD-00037", "8991234500370", "DJI SAM SOE KRETEK 12", "prn-001", "cat-213A", "DJI SAM SOE", "BKS", 12, 27500, 31000, 32000],
  ["PRD-00038", "8991234500387", "DJARUM SUPER 16", "prn-003", "cat-213B", "DJARUM SUPER", "BKS", 16, 33000, 37000, 38000],
  ["PRD-00039", "8991234500394", "ESSE CHANGE 12", "prn-007", "cat-214A", "ESSE", "BKS", 12, 30000, 34000, 35000],
  ["PRD-00040", "8991234500400", "ESSE LIGHTS 20", "prn-007", "cat-214B", "ESSE", "BKS", 20, 45000, 50000, 51500],
  ["PRD-00041", "8991234500417", "WHITE KING SIZE IMPORT 20", "prn-007", "cat-215A", "ESSE", "BKS", 20, 52000, 59000, 61000],
  ["PRD-00042", "8991234500424", "WHITE SLIM IMPORT 20", "prn-007", "cat-215B", "ESSE", "BKS", 20, 54000, 61000, 63000],
  ["PRD-00043", "8991234500431", "TOKAI DISPOSABLE LIGHTER", "prn-008", "cat-221A", "TOKAI", "PCS", 50, 3500, 6000, 6500],
  ["PRD-00044", "8991234500448", "CRICKET REFILLABLE LIGHTER", "prn-008", "cat-221B", "CRICKET", "PCS", 50, 8500, 14000, 15000],
  ["PRD-00045", "8991234500455", "USB PLASMA LIGHTER RECHARGEABLE", "prn-008", "cat-222A", "TOKAI", "PCS", 20, 42000, 65000, 69000],
  ["PRD-00046", "8991234500462", "MOUTH FRESHENER SPRAY MINT 12ML", "prn-009", "cat-311A", "SUTRA", "PCS", 24, 12000, 19000, 20000],
  ["PRD-00047", "8991234500479", "ORAL SPRAY FRESH BURST 15ML", "prn-009", "cat-311B", "SUTRA", "PCS", 24, 14000, 22000, 23000],
  ["PRD-00048", "8991234500486", "PERSONAL LUBRICANT 50ML", "prn-009", "cat-312A", "FIESTA", "PCS", 24, 21000, 33000, 35000],
  ["PRD-00049", "8991234500493", "CONDOM ULTRA THIN ISI 3", "prn-009", "cat-312B", "FIESTA", "PACK", 24, 11000, 18000, 19000],
  ["PRD-00050", "8991234500509", "SNACK PACK KACANG PEDAS 60G", "prn-010", "cat-491A", "HYDRO+", "PCS", 24, 6500, 11000, 12000],
  ["PRD-00051", "8991234500516", "RTD COFFEE LATTE 250ML", "prn-010", "cat-411A", "KOPI KENANGAN RTD", "BTL", 24, 12000, 19000, 20000],
  ["PRD-00052", "8991234500523", "ENERGY DRINK CAN 250ML", "prn-010", "cat-412A", "HYDRO+", "KLG", 24, 8000, 14000, 15000],
];

export const seedProducts: Product[] = productRaw.map(
  ([kodeProduct, barcode, namaProduct, principalId, categoryId, brand, uom, isiSatuPack, hargaBeli, hargaJual, msrp], i) => ({
    id: `prd-${String(i + 1).padStart(4, "0")}`,
    kodeProduct,
    barcode,
    namaProduct,
    principalId,
    categoryId,
    brand,
    uom,
    isiSatuPack,
    hargaBeli,
    hargaJual,
    msrp,
    c1: pick(["CLUSTER-1", "CLUSTER-2", "CLUSTER-3"], i),
    c2: pick(["URBAN", "SUBURB", "RURAL"], i + 1),
    c3: pick(["A", "B", "C"], i + 2),
    c4: pick(["REG", "NAT"], i),
    c5: pick(["Y", "N"], i + 1),
    tagPerRegion: tagset(i + 1),
    status: i >= 50 ? "DRAFT" : "AKTIF",
    fotoPack: [],
    tglAktif: shiftDate(SEED_TODAY, -((i % 24) + 1) * 21),
    updatedAt: STAMP,
    updatedBy: "seed",
  }),
);

/* -------------------------------------------------------------- M3 Kontrak */

type K = [
  nomor: string,
  judul: string,
  principalId: string,
  jenis: Kontrak["jenis"],
  mulaiOffset: number,
  akhirOffset: number,
  nilai: number,
  lingkup: string,
];

const kontrakRaw: K[] = [
  ["KTR/2025/HDR/012", "Kontrak Header Rak Marlboro", "prn-001", "HEADER", -358, 7, 240000000, "Header rak utama 24 toko region JBTK & BDG"],
  ["KTR/2025/LLP/031", "Kontrak Lolipop Gudang Garam", "prn-002", "LOLIPOP", -335, 30, 96000000, "Lolipop kasir 18 toko seluruh region"],
  ["KTR/2025/AKR/044", "Kontrak Akrilik Display Djarum", "prn-003", "AKRILIK", -305, 60, 132000000, "Akrilik display counter 21 toko"],
  ["KTR/2025/HDR/051", "Kontrak Header OXVA Pod Corner", "prn-004", "HEADER", -275, 90, 180000000, "Header pod corner 12 toko urban"],
  ["KTR/2026/AKR/002", "Kontrak Akrilik Vaporesso", "prn-005", "AKRILIK", -180, 185, 88000000, "Akrilik meja kasir 15 toko"],
  ["KTR/2026/PRG/004", "Program Trade Marketing FOOM Q3", "prn-006", "PROGRAM", -60, 30, 65000000, "Program bundling liquid + display 20 toko"],
  ["KTR/2026/HDR/007", "Kontrak Header KT&G Lil Solid", "prn-007", "HEADER", -120, 245, 210000000, "Header HNB corner 16 toko"],
  ["KTR/2026/LLP/009", "Kontrak Lolipop Tokai Lighter", "prn-008", "LOLIPOP", -90, 275, 42000000, "Lolipop gantung area kasir seluruh toko"],
  ["KTR/2026/SHC/011", "Kontrak Showcase Beverage Ritel", "prn-010", "SHOWCASE", -45, 320, 156000000, "Showcase pendingin 10 toko urban"],
  ["KTR/2025/PRM/018", "Kontrak Promosi Adult Care", "prn-009", "PROMOSI", -400, -35, 38000000, "Promosi rak khusus, sudah berakhir menunggu perpanjangan"],
  ["KTR/2026/AKR/013", "Kontrak Akrilik Sampoerna A", "prn-001", "AKRILIK", -30, 150, 74000000, "Akrilik display 14 toko region SBY & SMG"],
  ["KTR/2026/PRG/015", "Program Sampling KT&G FIIT", "prn-007", "PROGRAM", -15, 105, 52000000, "Sampling in-store 8 toko urban"],
];

const allStoreCodes = seedStores.map((s) => s.storeCode);

export const seedKontrak: Kontrak[] = kontrakRaw.map(
  ([nomorSurat, judul, principalId, jenis, mulaiOffset, akhirOffset, nilai, ruangLingkup], i) => ({
    id: `ktr-${String(i + 1).padStart(3, "0")}`,
    nomorSurat,
    judul,
    principalId,
    jenis,
    ruangLingkup,
    masaMulai: shiftDate(SEED_TODAY, mulaiOffset),
    masaBerakhir: shiftDate(SEED_TODAY, akhirOffset),
    nilai,
    pembuat: pick(["Hendra Wijaya", "Salsa Maharani"], i),
    penyetuju: "Komang Legoas",
    storeCodes: allStoreCodes.filter((_, idx) => idx % (2 + (i % 3)) === 0),
    status: akhirOffset < 0 ? "BERAKHIR" : "AKTIF",
    lampiran: [],
    updatedAt: STAMP,
    updatedBy: "seed",
  }),
);

/* ------------------------------------------------------------- M3 Dokumen */

export const seedDokumen: Dokumen[] = [
  { id: "dok-001", nomor: "DOC/2026/001", judul: "Surat Penawaran Header Marlboro 2026", jenis: "SURAT", principalId: "prn-001", kontrakId: "ktr-001", tanggal: shiftDate(SEED_TODAY, -370) },
  { id: "dok-002", nomor: "DOC/2026/002", judul: "Berita Acara Serah Terima Akrilik Djarum", jenis: "BERITA_ACARA", principalId: "prn-003", kontrakId: "ktr-003", tanggal: shiftDate(SEED_TODAY, -300) },
  { id: "dok-003", nomor: "DOC/2026/003", judul: "KV Promo Bundling FOOM Q3", jenis: "KV", principalId: "prn-006", tanggal: shiftDate(SEED_TODAY, -55) },
  { id: "dok-004", nomor: "DOC/2026/004", judul: "Planogram Standar Toko DTS 2026 Q3", jenis: "PLANOGRAM", tanggal: shiftDate(SEED_TODAY, -80) },
  { id: "dok-005", nomor: "DOC/2026/005", judul: "Kontrak Showcase Beverage Ritel (scan)", jenis: "KONTRAK", principalId: "prn-010", kontrakId: "ktr-009", tanggal: shiftDate(SEED_TODAY, -45) },
].map((d) => ({ ...d, file: [], updatedAt: STAMP, updatedBy: "seed" }) as Dokumen);

/* ---------------------------------------------------------------- M4 Aset */

const asetJenis = ["AKRILIK", "HEADER", "LOLIPOP", "SHOWCASE", "SIGNAGE"] as const;

export const seedAset: Aset[] = seedStores.flatMap((store, si) =>
  Array.from({ length: 3 }, (_, k) => {
    const idx = si * 3 + k;
    const jenis = pick(asetJenis, idx);
    const principalId = pick(["prn-001", "prn-002", "prn-003", "prn-004", "prn-007", "prn-010"], idx + 1);
    const kondisi = idx % 11 === 0 ? "REPLACE" : idx % 17 === 0 ? "HILANG" : "GOOD";
    return {
      id: `ast-${String(idx + 1).padStart(4, "0")}`,
      kodeAset: `AST-${store.storeCode}-${String(k + 1).padStart(2, "0")}`,
      nama: `${jenis} ${store.storeName}`,
      jenis,
      tangible: jenis !== "SIGNAGE" ? true : idx % 2 === 0,
      principalId,
      kontrakId: pick(["ktr-001", "ktr-002", "ktr-003", "ktr-004", "ktr-007", "ktr-009"], idx),
      storeCode: store.storeCode,
      qty: 1 + (idx % 3),
      kondisi,
      tglMasuk: shiftDate(SEED_TODAY, -(30 + (idx % 20) * 17)),
      pic: store.spvId === "u-spv-bdg" ? "Nadia Ramadhani" : store.spvId === "u-spv-sby" ? "Fajar Nugroho" : "Andri Setiawan",
      fotoTerpasang: [],
      updatedAt: STAMP,
      updatedBy: "seed",
    } satisfies Aset;
  }),
);

/* ------------------------------------------------------------- M5 Promosi */

export const seedPromosi: Promosi[] = [
  {
    id: "pro-001",
    kodePromo: "PRM-2026-07-001",
    nama: "Bundling FOOM Liquid + Pod Gratis Lanyard",
    principalId: "prn-006",
    mekanisme: "Beli 2 liquid FOOM 60ML + 1 disposable pod, gratis 1 lanyard universal. Berlaku di seluruh toko DTS.",
    tglMulai: shiftDate(SEED_TODAY, -20),
    tglSelesai: shiftDate(SEED_TODAY, 10),
    pluIds: ["prd-0006", "prd-0008", "prd-0009", "prd-0020"],
    storeCodes: allStoreCodes.filter((_, i) => i % 2 === 0),
    regions: ["JBTK", "BDG", "SBY"],
    kv: [],
    dokumen: [],
    status: "BERJALAN",
    budget: 45000000,
  },
  {
    id: "pro-002",
    kodePromo: "PRM-2026-07-002",
    nama: "Diskon 15% OXVA XLIM Series",
    principalId: "prn-004",
    mekanisme: "Potongan langsung 15% untuk seluruh device OXVA XLIM. Maksimal 2 unit per struk.",
    tglMulai: shiftDate(SEED_TODAY, -8),
    tglSelesai: shiftDate(SEED_TODAY, 22),
    pluIds: ["prd-0001", "prd-0002", "prd-0005"],
    storeCodes: allStoreCodes,
    regions: ["JBTK", "SRG", "BDG", "SMG", "SBY"],
    kv: [],
    dokumen: [],
    status: "BERJALAN",
    budget: 62000000,
  },
  {
    id: "pro-003",
    kodePromo: "PRM-2026-06-004",
    nama: "Tebus Murah HNB Stick KT&G",
    principalId: "prn-007",
    mekanisme: "Pembelian device LIL SOLID, tebus murah 2 pack FIIT seharga Rp 20.000.",
    tglMulai: shiftDate(SEED_TODAY, -55),
    tglSelesai: shiftDate(SEED_TODAY, -12),
    pluIds: ["prd-0023", "prd-0027", "prd-0028"],
    storeCodes: allStoreCodes.filter((_, i) => i % 3 === 0),
    regions: ["JBTK", "SBY"],
    kv: [],
    dokumen: [],
    status: "SELESAI",
    budget: 38000000,
  },
  {
    id: "pro-004",
    kodePromo: "PRM-2026-08-001",
    nama: "Paket Hemat Beverage + Snack",
    principalId: "prn-010",
    mekanisme: "Beli 1 RTD Coffee + 1 Snack Pack hanya Rp 25.000.",
    tglMulai: shiftDate(SEED_TODAY, 5),
    tglSelesai: shiftDate(SEED_TODAY, 35),
    pluIds: ["prd-0050", "prd-0051"],
    storeCodes: allStoreCodes.filter((_, i) => i % 4 === 0),
    regions: ["SMG", "SBY"],
    kv: [],
    dokumen: [],
    status: "DRAFT",
    budget: 21000000,
  },
].map((p) => ({ ...p, updatedAt: STAMP, updatedBy: "seed" }) as Promosi);

/* ------------------------------------------------------- M6 Content Report */

const kontenNama = [
  "Review OXVA XLIM Pro 2",
  "Unboxing LIL SOLID 2.0",
  "Tips Ganti Coil Anti Gosong",
  "Promo Bundling FOOM Minggu Ini",
  "Store Tour C-Store",
  "Rekomendasi Liquid Fruity",
  "Cara Bersihkan HNB Device",
  "Behind The Counter",
  "Flash Sale Weekend",
  "Q&A Pod Pemula",
];

export const seedContentReport: ContentReport[] = Array.from({ length: 64 }, (_, i) => {
  const store = seedStores[i % seedStores.length];
  const platform = pick(["INSTAGRAM", "TIKTOK", "FACEBOOK", "YOUTUBE"] as const, i);
  const jenis = pick(["REELS", "FEED", "STORY", "VIDEO", "INFOGRAFIS", "LIVE"] as const, i + 2);
  const base = 120 + ((i * 37) % 900);
  return {
    id: `cr-${String(i + 1).padStart(4, "0")}`,
    tanggal: shiftDate(SEED_TODAY, -(i * 3 + 1)),
    storeCode: store.storeCode,
    crewId: store.crewIds[0] ?? "u-crew1",
    namaKonten: `${pick(kontenNama, i)} — ${store.storeCode}`,
    platform,
    jenisKonten: jenis,
    promosiId: i % 4 === 0 ? "pro-001" : i % 5 === 0 ? "pro-002" : undefined,
    like: base,
    comment: Math.round(base * 0.08) + (i % 7),
    share: Math.round(base * 0.05) + (i % 5),
    repost: Math.round(base * 0.02) + (i % 3),
    watchTime: jenis === "REELS" || jenis === "VIDEO" || jenis === "LIVE" ? 15 + ((i * 11) % 180) : 0,
    screenshot: [],
    createdAt: STAMP,
  } satisfies ContentReport;
});

/* --------------------------------------------------------------- M2 Usulan */

export const seedUsulanNPD: UsulanNPD[] = [
  {
    id: "npd-001",
    nomor: "NPD/2026/07/001",
    sumber: "BUYER",
    pengusulId: "u-buy1",
    barcode: "8991234500530",
    namaProduct: "OXVA XLIM PRO 3 POD KIT GRAPHITE",
    principalId: "prn-004",
    categoryId: "cat-111A",
    brand: "OXVA",
    uom: "PCS",
    isiSatuPack: 10,
    hargaBeli: 305000,
    hargaJual: 375000,
    msrp: 385000,
    c1: "CLUSTER-1",
    c2: "URBAN",
    c3: "A",
    c4: "NAT",
    c5: "Y",
    tagUsulanPerRegion: { JBTK: "A", SRG: "K", BDG: "A", SMG: "K", SBY: "A" },
    fotoPack: [],
    keterangan: "Generasi terbaru XLIM, permintaan tinggi di toko urban.",
    status: "SUBMITTED",
    history: [
      { status: "DRAFT", aktor: "Hendra Wijaya", aktorRole: "BUYER", at: shiftDate(SEED_TODAY, -6) },
      { status: "SUBMITTED", aktor: "Hendra Wijaya", aktorRole: "BUYER", at: shiftDate(SEED_TODAY, -5) },
    ],
    createdAt: shiftDate(SEED_TODAY, -6),
  },
  {
    id: "npd-002",
    nomor: "NPD/2026/07/002",
    sumber: "CATEGORY",
    pengusulId: "u-cat1",
    barcode: "8991234500547",
    namaProduct: "EMKAY SALT NIC GRAPE ICE 30ML",
    principalId: "prn-006",
    categoryId: "cat-131B",
    brand: "EMKAY",
    uom: "BTL",
    isiSatuPack: 12,
    hargaBeli: 74000,
    hargaJual: 98000,
    msrp: 102000,
    c1: "CLUSTER-2",
    c2: "SUBURB",
    c3: "B",
    c4: "REG",
    c5: "N",
    tagUsulanPerRegion: { JBTK: "A", SRG: "A", BDG: "A", SMG: "A", SBY: "A" },
    fotoPack: [],
    keterangan: "Melengkapi varian salt nic, kompetitor sudah punya varian sejenis.",
    status: "ON_PROGRESS",
    history: [
      { status: "DRAFT", aktor: "Rina Puspita", aktorRole: "CATEGORY_OFFICER", at: shiftDate(SEED_TODAY, -12) },
      { status: "SUBMITTED", aktor: "Rina Puspita", aktorRole: "CATEGORY_OFFICER", at: shiftDate(SEED_TODAY, -11) },
      { status: "ON_PROGRESS", aktor: "Komang Legoas", aktorRole: "MDM", at: shiftDate(SEED_TODAY, -9), alasan: "Menunggu konfirmasi harga beli final dari principal." },
    ],
    createdAt: shiftDate(SEED_TODAY, -12),
  },
  {
    id: "npd-003",
    nomor: "NPD/2026/06/007",
    sumber: "BUYER",
    pengusulId: "u-buy2",
    barcode: "8991234500554",
    namaProduct: "TOKAI TURBO LIGHTER LIMITED",
    principalId: "prn-008",
    categoryId: "cat-221B",
    brand: "TOKAI",
    uom: "PCS",
    isiSatuPack: 50,
    hargaBeli: 9500,
    hargaJual: 16000,
    msrp: 17000,
    tagUsulanPerRegion: { JBTK: "A", SRG: "A", BDG: "A", SMG: "A", SBY: "A" },
    fotoPack: [],
    status: "DECLINED",
    history: [
      { status: "DRAFT", aktor: "Salsa Maharani", aktorRole: "BUYER", at: shiftDate(SEED_TODAY, -40) },
      { status: "SUBMITTED", aktor: "Salsa Maharani", aktorRole: "BUYER", at: shiftDate(SEED_TODAY, -38) },
      { status: "DECLINED", aktor: "Komang Legoas", aktorRole: "MDM", at: shiftDate(SEED_TODAY, -33), alasan: "Margin di bawah standar kategori lighter (min. 40%)." },
    ],
    createdAt: shiftDate(SEED_TODAY, -40),
  },
  {
    id: "npd-004",
    nomor: "NPD/2026/07/003",
    sumber: "CATEGORY",
    pengusulId: "u-cat2",
    barcode: "8991234500561",
    namaProduct: "HYDRO+ SPARKLING LEMON 330ML",
    principalId: "prn-010",
    categoryId: "cat-412A",
    brand: "HYDRO+",
    uom: "KLG",
    isiSatuPack: 24,
    hargaBeli: 9000,
    hargaJual: 15000,
    msrp: 16000,
    tagUsulanPerRegion: { JBTK: "A", SRG: "K", BDG: "K", SMG: "A", SBY: "A" },
    fotoPack: [],
    status: "DRAFT",
    history: [{ status: "DRAFT", aktor: "Bagas Prakoso", aktorRole: "CATEGORY_OFFICER", at: shiftDate(SEED_TODAY, -2) }],
    createdAt: shiftDate(SEED_TODAY, -2),
  },
];

export const seedUsulanTag: UsulanTag[] = [
  {
    id: "utg-001",
    nomor: "TAG/2026/07/001",
    sumber: "CATEGORY",
    pengusulId: "u-cat1",
    productId: "prd-0034",
    perubahan: [
      { region: "SMG", tagAsal: "D", tagTujuan: "H" },
      { region: "SBY", tagAsal: "D", tagTujuan: "H" },
    ],
    reason: "Sell-through di bawah 20% selama 3 bulan berturut-turut.",
    keterangan: "Stok existing masih 480 pack, dihabiskan dulu sebelum delisting.",
    status: "SUBMITTED",
    history: [
      { status: "DRAFT", aktor: "Rina Puspita", aktorRole: "CATEGORY_OFFICER", at: shiftDate(SEED_TODAY, -4) },
      { status: "SUBMITTED", aktor: "Rina Puspita", aktorRole: "CATEGORY_OFFICER", at: shiftDate(SEED_TODAY, -3) },
    ],
    createdAt: shiftDate(SEED_TODAY, -4),
  },
  {
    id: "utg-002",
    nomor: "TAG/2026/07/002",
    sumber: "BUYER",
    pengusulId: "u-buy1",
    productId: "prd-0006",
    perubahan: [{ region: "BDG", tagAsal: "K", tagTujuan: "A" }],
    reason: "Pembukaan 2 toko baru di Bandung, principal siap supply.",
    status: "APPROVED",
    history: [
      { status: "DRAFT", aktor: "Hendra Wijaya", aktorRole: "BUYER", at: shiftDate(SEED_TODAY, -25) },
      { status: "SUBMITTED", aktor: "Hendra Wijaya", aktorRole: "BUYER", at: shiftDate(SEED_TODAY, -24) },
      { status: "APPROVED", aktor: "Komang Legoas", aktorRole: "MDM", at: shiftDate(SEED_TODAY, -20) },
    ],
    createdAt: shiftDate(SEED_TODAY, -25),
  },
  {
    id: "utg-003",
    nomor: "TAG/2026/07/003",
    sumber: "CATEGORY",
    pengusulId: "u-cat2",
    productId: "prd-0043",
    perubahan: [
      { region: "SRG", tagAsal: "B", tagTujuan: "C" },
      { region: "SMG", tagAsal: "B", tagTujuan: "C" },
    ],
    reason: "Masuk 10 besar SKU fast moving 2 bulan terakhir.",
    status: "ON_PROGRESS",
    history: [
      { status: "DRAFT", aktor: "Bagas Prakoso", aktorRole: "CATEGORY_OFFICER", at: shiftDate(SEED_TODAY, -9) },
      { status: "SUBMITTED", aktor: "Bagas Prakoso", aktorRole: "CATEGORY_OFFICER", at: shiftDate(SEED_TODAY, -8) },
      { status: "ON_PROGRESS", aktor: "Komang Legoas", aktorRole: "MDM", at: shiftDate(SEED_TODAY, -6) },
    ],
    createdAt: shiftDate(SEED_TODAY, -9),
  },
];
