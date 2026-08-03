import type { Region, Role, User } from "@/lib/types";

/** Modul aplikasi — dipakai untuk menu, guard route, dan matriks izin (FR-9.3). */
export const MODULES = [
  "dashboard",
  "analitik",
  "category",
  "product",
  "tag",
  "store",
  "principal",
  "npd",
  "usulantag",
  "kontrak",
  "dokumen",
  "aset",
  "promosi",
  "platform",
  "konten",
  "laporan",
  "users",
  "audit",
  /* Product MDM */
  "pengajuan",
  "approver",
  "plu",
  "freegift",
  "quality",
] as const;
export type ModuleKey = (typeof MODULES)[number];

export type Permission = "view" | "create" | "edit" | "delete" | "approve";

type Matrix = Record<Role, Partial<Record<ModuleKey, Permission[]>>>;

const ALL: Permission[] = ["view", "create", "edit", "delete", "approve"];
const CRUD: Permission[] = ["view", "create", "edit", "delete"];
const RW: Permission[] = ["view", "create", "edit"];
const RO: Permission[] = ["view"];

/**
 * Matriks izin SRS §3.6.
 * MDM full access; Officer & SPV dibatasi; Crew hanya Content Report (R4/FR-9.5).
 */
export const PERMISSION_MATRIX: Matrix = {
  MDM: MODULES.reduce((acc, m) => ({ ...acc, [m]: ALL }), {} as Partial<Record<ModuleKey, Permission[]>>),

  CATEGORY_OFFICER: {
    dashboard: RO,
    analitik: RO,
    category: CRUD,
    product: CRUD,
    tag: CRUD,
    store: RO,
    principal: RO,
    npd: RW,
    usulantag: RW,
    kontrak: RO,
    dokumen: RO,
    aset: RO,
    promosi: RO,
    konten: RO,
    laporan: RO,
    pengajuan: RW,
    plu: RO,
    freegift: CRUD,
    quality: RO,
  },

  BUYER: {
    dashboard: RO,
    analitik: RO,
    category: RO,
    product: RO,
    tag: RO,
    store: RO,
    principal: CRUD,
    npd: RW,
    usulantag: RW,
    kontrak: CRUD,
    dokumen: CRUD,
    aset: RO,
    promosi: RO,
    konten: RO,
    laporan: RO,
    pengajuan: RW,
    plu: RO,
    quality: RO,
  },

  MARKETING_OFFICER: {
    dashboard: RO,
    analitik: RO,
    category: RO,
    product: RO,
    tag: RO,
    store: RO,
    principal: RO,
    kontrak: RO,
    dokumen: CRUD,
    aset: CRUD,
    promosi: CRUD,
    platform: CRUD,
    konten: CRUD,
    laporan: RO,
    pengajuan: RO,
    freegift: RW,
    quality: RO,
  },

  SPV_AREA: {
    dashboard: RO,
    analitik: RO,
    product: RO,
    tag: RO,
    store: ["view", "edit"],
    principal: RO,
    kontrak: RO,
    aset: RW,
    promosi: RO,
    konten: RW,
    laporan: RO,
  },

  /** FR-9.5 — Crew hanya modul Content Report. */
  CREW: {
    konten: RW,
  },

  ADMIN_IT: {
    dashboard: RO,
    users: CRUD,
    audit: RO,
    platform: RO,
    laporan: RO,
    plu: RO,
    quality: RO,
  },
};

/** Hanya butuh role & aktif, supaya bisa dipakai juga oleh session di server. */
export function can(user: Pick<User, "role" | "aktif"> | null, modul: ModuleKey, perm: Permission = "view"): boolean {
  if (!user || !user.aktif) return false;
  return PERMISSION_MATRIX[user.role]?.[modul]?.includes(perm) ?? false;
}

/** FR-9.4 — scoping data per region untuk SPV & Crew. */
export function inScope(user: User | null, region?: Region): boolean {
  if (!user) return false;
  if (user.regions.length === 0) return true;
  if (!region) return true;
  return user.regions.includes(region);
}

export function scopeLabel(user: User | null): string {
  if (!user) return "-";
  if (user.storeCode) return `Toko ${user.storeCode}`;
  if (user.regions.length === 0) return "Semua region";
  return user.regions.join(", ");
}
