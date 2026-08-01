/**
 * MMS — model data.
 * Turunan langsung dari PRD §5 (modul M1–M11) dan SRS §3.
 * Semua istilah field mengikuti board FigJam; typo board diperbaiki per IMP-11
 * dan nilai kode lama tetap dipertahankan sebagai `alias`.
 */

export const REGIONS = ["JBTK", "SRG", "BDG", "SMG", "SBY"] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABEL: Record<Region, string> = {
  JBTK: "Jabodetabek",
  SRG: "Serang",
  BDG: "Bandung",
  SMG: "Semarang",
  SBY: "Surabaya",
};

export const STORE_TYPES = ["DTS", "EX. LWS"] as const;
export type StoreType = (typeof STORE_TYPES)[number];

/* ------------------------------------------------------------------ M9 RBAC */

export const ROLES = [
  "MDM",
  "CATEGORY_OFFICER",
  "BUYER",
  "MARKETING_OFFICER",
  "SPV_AREA",
  "CREW",
  "ADMIN_IT",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  MDM: "MDM (Merchandising Manager)",
  CATEGORY_OFFICER: "Category Officer",
  BUYER: "Buyer",
  MARKETING_OFFICER: "Marketing Officer",
  SPV_AREA: "SPV Area",
  CREW: "Crew Toko",
  ADMIN_IT: "Admin / IT",
};

export interface User {
  id: string;
  nama: string;
  email: string;
  role: Role;
  /** Scoping data (FR-9.4). Kosong = seluruh region. */
  regions: Region[];
  /** Crew di-assign ke satu toko. */
  storeCode?: string;
  aktif: boolean;
  mfaAktif: boolean;
  lastLogin?: string;
}

/* --------------------------------------------------------- M1 Master Category */

export type StatusAktif = "AKTIF" | "NONAKTIF";

/**
 * Satu baris = satu Sub Category (level terdalam), membawa seluruh 5 level.
 * FR-1.1: tabel 5 kolom; FR-1.2: inline add/edit row.
 * Pola kode (IMP-6): Segment(1) > Dept(2) > Sub Dept(3) > Category(3+huruf) >
 * Sub Category(Category+2 digit).
 */
export interface CategoryRow {
  id: string;
  segmentCode: string;
  segment: string;
  deptCode: string;
  dept: string;
  subDeptCode: string;
  subDept: string;
  categoryCode: string;
  category: string;
  subCategoryCode: string;
  subCategory: string;
  /** Dual-code mapping SRS §3.2 — sisi ERP HASHMICRO. */
  kdHashmicro?: string;
  /** Sisi kedua, dilabeli "COMP. LTW" pada file sumber (makna masih OQ). */
  kdCompLtw?: string;
  /** Flag relevansi ke Chart of Accounts (OQ ke tim Finance). */
  untukCoa?: boolean;
  status: StatusAktif;
  /** Nilai kode/ejaan lama dari board yang dipertahankan (IMP-11). */
  alias?: string;
  catatan?: string;
  updatedAt: string;
  updatedBy: string;
}

/* -------------------------------------------------------------- M1 Master Tag */

/** Perlakuan item terhadap Jual & PO (Lampiran A SRS). */
export interface TagRow {
  id: string;
  kode: string;
  nama: string;
  jual: boolean;
  po: boolean;
  perlakuan: string;
  /** Warna chip HeroUI. */
  warna: "default" | "accent" | "success" | "warning" | "danger";
  status: StatusAktif;
  updatedAt: string;
  updatedBy: string;
}

/* ------------------------------------------------------------ M1 Master Store */

export type StoreStatus = "AKTIF" | "TUTUP" | "RELOKASI" | "RENOVASI";

export interface Store {
  id: string;
  storeCode: string;
  storeName: string;
  /** Sumber sistem host existing (OQ-4). */
  storeIdHM: string;
  analyticalGroupHM: string;
  storeType: StoreType;
  region: Region;
  area: string;
  alamat: string;
  kota: string;
  latitude: number;
  longitude: number;
  tglBuka: string;
  tglTutup?: string;
  status: StoreStatus;
  /** Wajib merujuk storeCode valid bila status RELOKASI (US-1.3). */
  relocateFromStoreCode?: string;
  spvId?: string;
  crewIds: string[];
  noTelp: string;
  luasM2: number;
  jumlahRak: number;
  planogramAktif?: string;
  updatedAt: string;
  updatedBy: string;
}

/* -------------------------------------------------------- M1 Master Principal */

export interface Principal {
  id: string;
  kode: string;
  nama: string;
  brand: string[];
  pic: string;
  telp: string;
  email: string;
  alamat: string;
  npwp: string;
  /** OQ-5: dikonfirmasi = pack size default untuk SKU principal ini. */
  isiSatuPack: number;
  status: StatusAktif;
  updatedAt: string;
  updatedBy: string;
}

/* ---------------------------------------------------------- M1 Master Product */

export type ProductStatus = "DRAFT" | "AKTIF" | "NONAKTIF" | "DELISTING";

export interface Product {
  id: string;
  kodeProduct: string;
  barcode: string;
  namaProduct: string;
  principalId: string;
  categoryId: string;
  brand: string;
  uom: string;
  isiSatuPack: number;
  hargaBeli: number;
  hargaJual: number;
  msrp: number;
  /** OQ-2: definisi C1–C5 menunggu konfirmasi bisnis; disimpan apa adanya. */
  c1?: string;
  c2?: string;
  c3?: string;
  c4?: string;
  c5?: string;
  /** Tag berlaku per region (Flow B). */
  tagPerRegion: Record<Region, string>;
  status: ProductStatus;
  /** Foto pack produk (R3/R6) — data URL, tersimpan lokal. */
  fotoPack: MediaFile[];
  tglAktif?: string;
  /** Jejak "dari usulan #" (US-2.3). */
  dariUsulanId?: string;
  updatedAt: string;
  updatedBy: string;
}

/* ------------------------------------------------------------- M10 Media file */

export interface MediaFile {
  id: string;
  nama: string;
  tipe: string;
  ukuran: number;
  /** data URL — agar berjalan penuh offline tanpa object storage. */
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

/* ------------------------------------------------- M2 Usulan (state machine) */

export const USULAN_STATUS = [
  "DRAFT",
  "SUBMITTED",
  "ON_PROGRESS",
  "APPROVED",
  "DECLINED",
] as const;
export type UsulanStatus = (typeof USULAN_STATUS)[number];

export interface WorkflowStep {
  status: UsulanStatus;
  aktor: string;
  aktorRole: Role;
  at: string;
  alasan?: string;
}

export type SumberUsulan = "BUYER" | "CATEGORY";

export interface UsulanNPD {
  id: string;
  nomor: string;
  sumber: SumberUsulan;
  pengusulId: string;
  barcode: string;
  namaProduct: string;
  principalId: string;
  categoryId: string;
  brand: string;
  uom: string;
  isiSatuPack: number;
  hargaBeli: number;
  hargaJual: number;
  msrp: number;
  c1?: string;
  c2?: string;
  c3?: string;
  c4?: string;
  c5?: string;
  tagUsulanPerRegion: Record<Region, string>;
  fotoPack: MediaFile[];
  keterangan?: string;
  status: UsulanStatus;
  history: WorkflowStep[];
  /** Diisi saat approved → Master Product terbentuk. */
  produkId?: string;
  createdAt: string;
}

export interface UsulanTagPerubahan {
  region: Region;
  tagAsal: string;
  tagTujuan: string;
}

export interface UsulanTag {
  id: string;
  nomor: string;
  sumber: SumberUsulan;
  pengusulId: string;
  productId: string;
  perubahan: UsulanTagPerubahan[];
  reason: string;
  keterangan?: string;
  status: UsulanStatus;
  history: WorkflowStep[];
  createdAt: string;
}

/* ------------------------------------------------------ M3 Kontrak & Dokumen */

export const JENIS_KONTRAK = [
  "HEADER",
  "LOLIPOP",
  "AKRILIK",
  "SHOWCASE",
  "PROGRAM",
  "PROMOSI",
] as const;
export type JenisKontrak = (typeof JENIS_KONTRAK)[number];

export type KontrakStatus =
  | "DRAFT"
  | "AKTIF"
  | "AKAN_BERAKHIR"
  | "BERAKHIR"
  | "DIPERPANJANG"
  | "DIBATALKAN";

export interface Kontrak {
  id: string;
  nomorSurat: string;
  judul: string;
  principalId: string;
  jenis: JenisKontrak;
  ruangLingkup: string;
  masaMulai: string;
  masaBerakhir: string;
  nilai: number;
  pembuat: string;
  penyetuju: string;
  storeCodes: string[];
  status: KontrakStatus;
  lampiran: MediaFile[];
  catatan?: string;
  updatedAt: string;
  updatedBy: string;
}

export type JenisDokumen =
  | "SURAT"
  | "KONTRAK"
  | "BERITA_ACARA"
  | "KV"
  | "PLANOGRAM"
  | "LAINNYA";

export interface Dokumen {
  id: string;
  nomor: string;
  judul: string;
  jenis: JenisDokumen;
  principalId?: string;
  kontrakId?: string;
  tanggal: string;
  file: MediaFile[];
  keterangan?: string;
  updatedAt: string;
  updatedBy: string;
}

/* ------------------------------------------------------- M4 Aset Marketing */

export const JENIS_ASET = [
  "AKRILIK",
  "HEADER",
  "LOLIPOP",
  "SHOWCASE",
  "SIGNAGE",
  "DIGITAL",
] as const;
export type JenisAset = (typeof JENIS_ASET)[number];

export type KondisiAset = "GOOD" | "REPLACE" | "HILANG" | "RETUR";

export interface Aset {
  id: string;
  kodeAset: string;
  nama: string;
  jenis: JenisAset;
  /** Aset tangible wajib punya foto terpasang (US-4.1). */
  tangible: boolean;
  principalId: string;
  kontrakId?: string;
  storeCode: string;
  qty: number;
  kondisi: KondisiAset;
  tglMasuk: string;
  tglRetur?: string;
  pic: string;
  fotoTerpasang: MediaFile[];
  catatan?: string;
  updatedAt: string;
  updatedBy: string;
}

/* ------------------------------------------------------------- M5 Promosi */

export type PromoStatus = "DRAFT" | "BERJALAN" | "SELESAI" | "DIBATALKAN";

export interface Promosi {
  id: string;
  kodePromo: string;
  nama: string;
  principalId: string;
  mekanisme: string;
  tglMulai: string;
  tglSelesai: string;
  /** PLU harus SKU aktif (US-5.1). */
  pluIds: string[];
  storeCodes: string[];
  regions: Region[];
  kv: MediaFile[];
  dokumen: MediaFile[];
  status: PromoStatus;
  budget: number;
  updatedAt: string;
  updatedBy: string;
}

/* --------------------------------------------- M6 Platform & Content Report */

export const PLATFORMS = ["INSTAGRAM", "TIKTOK", "FACEBOOK", "YOUTUBE"] as const;
export type PlatformSosmed = (typeof PLATFORMS)[number];

export interface AkunPlatform {
  id: string;
  platform: PlatformSosmed;
  username: string;
  pic: string;
  region: Region | "PUSAT";
  followers: number;
  /**
   * IMP-4: password TIDAK disimpan di MMS. Field board `Password email` /
   * `Passoword sosmed` diganti referensi vault terenkripsi + log akses.
   */
  vaultRef: string;
  status: StatusAktif;
  updatedAt: string;
}

export const JENIS_KONTEN = [
  "REELS",
  "FEED",
  "STORY",
  "VIDEO",
  "INFOGRAFIS",
  "LIVE",
] as const;
export type JenisKonten = (typeof JENIS_KONTEN)[number];

export interface ContentReport {
  id: string;
  tanggal: string;
  storeCode: string;
  crewId: string;
  namaKonten: string;
  platform: PlatformSosmed;
  jenisKonten: JenisKonten;
  promosiId?: string;
  like: number;
  comment: number;
  share: number;
  repost: number;
  /** Detik. */
  watchTime: number;
  screenshot: MediaFile[];
  catatan?: string;
  createdAt: string;
}

/* ============================================================================
   Product MDM — pengajuan SKU baru, alokasi PLU, free gift
   (PRD/SRS Sistem Manajemen Master Data Produk v0.1)
   ========================================================================== */

/** Tag pada intake supplier. Arti B/D/G/N/S masih open question (SRS §9.2). */
export const TAG_INTAKE = ["B", "D", "G", "N", "S"] as const;
export type TagIntake = (typeof TAG_INTAKE)[number];

export type StatusPengajuan = "MENUNGGU" | "DISETUJUI" | "DITOLAK";

/**
 * Satu baris pengajuan produk baru — bentuk kolomnya mengikuti form Excel
 * yang dipakai tim: Identitas Produk, Klasifikasi, Spesifikasi Teknis,
 * dan Konversi BBM (Qty).
 */
export interface PengajuanProduk {
  id: string;
  tiket: string;
  tglAjuan: string;

  /* --- Identitas Produk --- */
  name: string;
  barcode?: string;
  brand?: string;
  series?: string;
  brandSeries?: string;
  principle?: string;
  minor?: string;
  mpkm?: string;

  /* --- Klasifikasi --- */
  tag?: string;
  segment?: string;
  /** Terisi otomatis dari taksonomi begitu Sub Dept/Category/Sub Category diisi. */
  dept?: string;
  subDept?: string;
  category?: string;
  subCategory?: string;

  /* --- Spesifikasi Teknis --- */
  volume?: string;
  nic?: string;
  length?: string;
  width?: string;
  height?: string;
  resOhm?: string;
  battery?: string;
  maxWatt?: string;

  /* --- Konversi BBM (Qty) --- */
  c1?: string;
  c2?: string;
  c3?: string;
  c4?: string;
  c5?: string;

  /* --- Workflow --- */
  status: StatusPengajuan;
  /** Diisi approver; wajib sebelum bisa disetujui. */
  kodeProduk?: string;
  pengajuId: string;
  catatanApprover?: string;
  /** Terisi setelah disetujui & dipublikasikan ke Product Master. */
  produkId?: string;
  history: WorkflowStep[];
}

/** Sembilan seri kategori pada sheet MASTERAN PLU. */
export const SERI_PLU = [
  "DEVICE",
  "CARTRIDGE",
  "LIQUID",
  "TOBACCO STICK",
  "PARTS",
  "ACCESSORIES",
  "CIGARETTE",
  "LIGHTER",
  "NEW ITEM EXTERNAL",
] as const;
export type SeriPlu = (typeof SERI_PLU)[number];

/**
 * Satu nomor urut dasar menghasilkan kode paralel di sembilan seri.
 * `terpakai` menandai seri mana yang slotnya sudah dipakai SKU aktif.
 */
export interface PluAllocation {
  id: string;
  no: number;
  terpakai: Partial<Record<SeriPlu, string>>;
}

export interface FreeGift {
  id: string;
  /** Format tetap "FG" + kode SKU induk. */
  kodeProduct: string;
  /** SKU induk — wajib ada di Product Master. */
  kodeProductInduk: string;
  /** Format tetap "[FG] " + deskripsi produk induk. */
  deskripsi: string;
  updatedAt: string;
  updatedBy: string;
}

/* -------------------------------------------------------- M11 Audit trail */

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "DECLINE" | "LOGIN";

export interface AuditEntry {
  id: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  action: AuditAction;
  field?: string;
  before?: string;
  after?: string;
  aktor: string;
  aktorRole: Role;
  at: string;
}

/* ------------------------------------------------------------ Notifikasi M7 */

export type NotifLevel = "info" | "warning" | "serious" | "critical";

export interface Notifikasi {
  id: string;
  judul: string;
  detail: string;
  level: NotifLevel;
  href: string;
  jumlah: number;
}
