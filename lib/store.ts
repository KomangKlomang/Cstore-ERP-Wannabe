"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type {
  Aset,
  AkunPlatform,
  AuditAction,
  AuditEntry,
  CategoryRow,
  ContentReport,
  Dokumen,
  FreeGift,
  Kontrak,
  PengajuanProduk,
  PluAllocation,
  Principal,
  Product,
  Promosi,
  Region,
  StatusPengajuan,
  Store,
  TagRow,
  User,
  UsulanNPD,
  UsulanStatus,
  UsulanTag,
} from "@/lib/types";
import { REGIONS } from "@/lib/types";
import { seedCategories } from "@/lib/seed/categories";
import { seedAkunPlatform, seedPrincipals, seedStores, seedTags, seedUsers } from "@/lib/seed/masters";
import {
  seedAset,
  seedContentReport,
  seedDokumen,
  seedKontrak,
  seedProducts,
  seedPromosi,
  seedUsulanNPD,
  seedUsulanTag,
} from "@/lib/seed/transaksi";
import { seedFreeGift, seedPengajuan, seedPlu } from "@/lib/seed/mdm";
import { seriDariSubDept } from "@/lib/plu";

export const DEMO_PASSWORD = "mms2026";
/** Naikkan versi bila bentuk seed berubah, supaya data lama tidak bentrok. */
const STORAGE_KEY = "erp-db-v3";

/* -------------------------------------------------------------- Collections */

export interface Collections {
  categories: CategoryRow[];
  tags: TagRow[];
  stores: Store[];
  principals: Principal[];
  products: Product[];
  kontrak: Kontrak[];
  dokumen: Dokumen[];
  aset: Aset[];
  promosi: Promosi[];
  akunPlatform: AkunPlatform[];
  contentReports: ContentReport[];
  usulanNPD: UsulanNPD[];
  usulanTag: UsulanTag[];
  users: User[];
  pengajuan: PengajuanProduk[];
  pluAllocations: PluAllocation[];
  freeGift: FreeGift[];
}

export type CollectionKey = keyof Collections;

export const ENTITY_LABEL: Record<CollectionKey, string> = {
  categories: "Master Category",
  tags: "Master Tag",
  stores: "Master Store",
  principals: "Master Principal",
  products: "Master Product",
  kontrak: "Kontrak",
  dokumen: "Dokumen",
  aset: "Aset Marketing",
  promosi: "Promosi",
  akunPlatform: "Akun Platform",
  contentReports: "Content Report",
  usulanNPD: "Usulan NPD",
  usulanTag: "Usulan Tag",
  users: "User",
  pengajuan: "Pengajuan Produk",
  pluAllocations: "Alokasi PLU",
  freeGift: "Free Gift",
};

function seedData(): Collections {
  return {
    categories: seedCategories,
    tags: seedTags,
    stores: seedStores,
    principals: seedPrincipals,
    products: seedProducts,
    kontrak: seedKontrak,
    dokumen: seedDokumen,
    aset: seedAset,
    promosi: seedPromosi,
    akunPlatform: seedAkunPlatform,
    contentReports: seedContentReport,
    usulanNPD: seedUsulanNPD,
    usulanTag: seedUsulanTag,
    users: seedUsers,
    pengajuan: seedPengajuan,
    pluAllocations: seedPlu,
    freeGift: seedFreeGift,
  };
}

/* ------------------------------------------------------------------- Helpers */

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

const IGNORED_AUDIT_FIELDS = new Set(["updatedAt", "updatedBy", "history"]);

function diffFields(before: unknown, after: unknown): Array<{ field: string; before: string; after: string }> {
  if (!before || typeof before !== "object" || typeof after !== "object" || !after) return [];
  const a = before as Record<string, unknown>;
  const b = after as Record<string, unknown>;
  const out: Array<{ field: string; before: string; after: string }> = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (IGNORED_AUDIT_FIELDS.has(k)) continue;
    const av = JSON.stringify(a[k] ?? null);
    const bv = JSON.stringify(b[k] ?? null);
    if (av !== bv) out.push({ field: k, before: av, after: bv });
  }
  return out;
}

function labelOf(row: Record<string, unknown>): string {
  return String(
    row.nama ?? row.namaProduct ?? row.storeName ?? row.judul ?? row.nomor ?? row.nomorSurat ?? row.subCategory ?? row.kode ?? row.id ?? "",
  );
}

/* --------------------------------------------------------------------- Store */

interface AppState extends Collections {
  audit: AuditEntry[];
  currentUserId: string | null;
  hydrated: boolean;

  /* auth */
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  currentUser: () => User | null;

  /* generic CRUD + audit */
  saveRow: <K extends CollectionKey>(key: K, row: Collections[K][number]) => void;
  saveRows: <K extends CollectionKey>(key: K, rows: Collections[K][number][]) => void;
  removeRow: (key: CollectionKey, id: string) => void;

  /* workflow M2 */
  transitionNPD: (id: string, status: UsulanStatus, alasan?: string) => void;
  transitionUsulanTag: (id: string, status: UsulanStatus, alasan?: string) => void;

  /* Product MDM — pengajuan produk baru */
  submitPengajuan: (rows: PengajuanProduk[]) => void;
  putusanPengajuan: (id: string, status: StatusPengajuan, kodeProduk?: string, catatan?: string) => void;
  resetPengajuan: (id: string) => void;

  /* util */
  logAudit: (entry: Omit<AuditEntry, "id" | "at" | "aktor" | "aktorRole">) => void;
  resetData: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...seedData(),
      audit: [],
      currentUserId: null,
      hydrated: false,

      currentUser: () => {
        const { currentUserId, users } = get();
        return users.find((u) => u.id === currentUserId) ?? null;
      },

      login: (email, password) => {
        const user = get().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user) return { ok: false, error: "Email tidak terdaftar." };
        if (!user.aktif) return { ok: false, error: "User dinonaktifkan. Hubungi Admin/IT." };
        if (password !== DEMO_PASSWORD) return { ok: false, error: "Password salah." };
        const at = new Date().toISOString();
        set((s) => ({
          currentUserId: user.id,
          users: s.users.map((u) => (u.id === user.id ? { ...u, lastLogin: at } : u)),
          audit: [
            {
              id: newId("aud"),
              entity: "users",
              entityId: user.id,
              entityLabel: user.nama,
              action: "LOGIN" as AuditAction,
              aktor: user.nama,
              aktorRole: user.role,
              at,
            },
            ...s.audit,
          ].slice(0, 800),
        }));
        return { ok: true };
      },

      logout: () => set({ currentUserId: null }),

      logAudit: (entry) => {
        const actor = get().currentUser();
        set((s) => ({
          audit: [
            {
              ...entry,
              id: newId("aud"),
              at: new Date().toISOString(),
              aktor: actor?.nama ?? "system",
              aktorRole: actor?.role ?? "ADMIN_IT",
            },
            ...s.audit,
          ].slice(0, 800),
        }));
      },

      saveRow: (key, row) => get().saveRows(key, [row]),

      saveRows: (key, rows) => {
        const actor = get().currentUser();
        const at = new Date().toISOString();
        const entries: AuditEntry[] = [];

        set((s) => {
          const list = [...(s[key] as Array<{ id: string }>)];

          for (const raw of rows) {
            const row = { ...(raw as unknown as Record<string, unknown>) };
            if ("updatedAt" in row) row.updatedAt = at;
            if ("updatedBy" in row) row.updatedBy = actor?.nama ?? "system";

            const idx = list.findIndex((r) => r.id === (row.id as string));
            const isNew = idx === -1;
            const before = isNew ? null : (list[idx] as Record<string, unknown>);

            if (isNew) list.push(row as { id: string });
            else list[idx] = row as { id: string };

            const changes = isNew ? [] : diffFields(before, row);
            if (isNew) {
              entries.push({
                id: newId("aud"),
                entity: key,
                entityId: String(row.id),
                entityLabel: labelOf(row),
                action: "CREATE",
                aktor: actor?.nama ?? "system",
                aktorRole: actor?.role ?? "ADMIN_IT",
                at,
              });
            } else {
              for (const c of changes) {
                entries.push({
                  id: newId("aud"),
                  entity: key,
                  entityId: String(row.id),
                  entityLabel: labelOf(row),
                  action: "UPDATE",
                  field: c.field,
                  before: c.before,
                  after: c.after,
                  aktor: actor?.nama ?? "system",
                  aktorRole: actor?.role ?? "ADMIN_IT",
                  at,
                });
              }
            }
          }

          return {
            [key]: list,
            audit: [...entries, ...s.audit].slice(0, 800),
          } as unknown as Partial<AppState>;
        });
      },

      removeRow: (key, id) => {
        const actor = get().currentUser();
        set((s) => {
          const list = s[key] as Array<{ id: string }>;
          const target = list.find((r) => r.id === id);
          if (!target) return {} as Partial<AppState>;
          return {
            [key]: list.filter((r) => r.id !== id),
            audit: [
              {
                id: newId("aud"),
                entity: key,
                entityId: id,
                entityLabel: labelOf(target as unknown as Record<string, unknown>),
                action: "DELETE" as AuditAction,
                aktor: actor?.nama ?? "system",
                aktorRole: actor?.role ?? "ADMIN_IT",
                at: new Date().toISOString(),
              },
              ...s.audit,
            ].slice(0, 800),
          } as unknown as Partial<AppState>;
        });
      },

      /** US-2.1 / US-2.3 — transisi status + auto-create Master Product saat approved. */
      transitionNPD: (id, status, alasan) => {
        const actor = get().currentUser();
        const at = new Date().toISOString();

        set((s) => {
          const usulan = s.usulanNPD.find((u) => u.id === id);
          if (!usulan) return {} as Partial<AppState>;

          let products = s.products;
          let produkId = usulan.produkId;

          if (status === "APPROVED" && !usulan.produkId) {
            const nextNo = s.products.length + 1;
            const kodeProduct = `PRD-${String(nextNo).padStart(5, "0")}`;
            produkId = newId("prd");
            const baru: Product = {
              id: produkId,
              kodeProduct,
              barcode: usulan.barcode,
              namaProduct: usulan.namaProduct,
              principalId: usulan.principalId,
              categoryId: usulan.categoryId,
              brand: usulan.brand,
              uom: usulan.uom,
              isiSatuPack: usulan.isiSatuPack,
              hargaBeli: usulan.hargaBeli,
              hargaJual: usulan.hargaJual,
              msrp: usulan.msrp,
              c1: usulan.c1,
              c2: usulan.c2,
              c3: usulan.c3,
              c4: usulan.c4,
              c5: usulan.c5,
              tagPerRegion: { ...usulan.tagUsulanPerRegion },
              status: "AKTIF",
              fotoPack: usulan.fotoPack,
              tglAktif: at.slice(0, 10),
              dariUsulanId: usulan.id,
              updatedAt: at,
              updatedBy: actor?.nama ?? "system",
            };
            products = [...s.products, baru];
          }

          const step = {
            status,
            aktor: actor?.nama ?? "system",
            aktorRole: actor?.role ?? "MDM",
            at,
            alasan,
          };

          return {
            products,
            usulanNPD: s.usulanNPD.map((u) =>
              u.id === id ? { ...u, status, produkId, history: [...u.history, step] } : u,
            ),
            audit: [
              {
                id: newId("aud"),
                entity: "usulanNPD",
                entityId: id,
                entityLabel: usulan.nomor,
                action: (status === "APPROVED" ? "APPROVE" : status === "DECLINED" ? "DECLINE" : "UPDATE") as AuditAction,
                field: "status",
                before: usulan.status,
                after: status,
                aktor: actor?.nama ?? "system",
                aktorRole: actor?.role ?? "MDM",
                at,
              },
              ...s.audit,
            ].slice(0, 800),
          } as unknown as Partial<AppState>;
        });
      },

      /** US-2.2 — approve usulan tag → tag Master Product ter-update per region. */
      transitionUsulanTag: (id, status, alasan) => {
        const actor = get().currentUser();
        const at = new Date().toISOString();

        set((s) => {
          const usulan = s.usulanTag.find((u) => u.id === id);
          if (!usulan) return {} as Partial<AppState>;

          let products = s.products;
          if (status === "APPROVED") {
            products = s.products.map((p) => {
              if (p.id !== usulan.productId) return p;
              const tagPerRegion = { ...p.tagPerRegion };
              usulan.perubahan.forEach((c) => {
                tagPerRegion[c.region] = c.tagTujuan;
              });
              return { ...p, tagPerRegion, updatedAt: at, updatedBy: actor?.nama ?? "system" };
            });
          }

          const step = {
            status,
            aktor: actor?.nama ?? "system",
            aktorRole: actor?.role ?? "MDM",
            at,
            alasan,
          };

          return {
            products,
            usulanTag: s.usulanTag.map((u) => (u.id === id ? { ...u, status, history: [...u.history, step] } : u)),
            audit: [
              {
                id: newId("aud"),
                entity: "usulanTag",
                entityId: id,
                entityLabel: usulan.nomor,
                action: (status === "APPROVED" ? "APPROVE" : status === "DECLINED" ? "DECLINE" : "UPDATE") as AuditAction,
                field: "status",
                before: usulan.status,
                after: status,
                aktor: actor?.nama ?? "system",
                aktorRole: actor?.role ?? "MDM",
                at,
              },
              ...s.audit,
            ].slice(0, 800),
          } as unknown as Partial<AppState>;
        });
      },

      /** FR-INT-01 — submission masuk antrian dengan status awal Menunggu. */
      submitPengajuan: (rows) => {
        const actor = get().currentUser();
        const at = new Date().toISOString();

        set((s) => ({
          pengajuan: [
            ...rows.map((r) => ({
              ...r,
              status: "MENUNGGU" as StatusPengajuan,
              pengajuId: actor?.id ?? "",
              history: [
                {
                  status: "SUBMITTED" as UsulanStatus,
                  aktor: actor?.nama ?? "system",
                  aktorRole: actor?.role ?? ("CATEGORY_OFFICER" as const),
                  at,
                },
              ],
            })),
            ...s.pengajuan,
          ],
          audit: [
            ...rows.map((r) => ({
              id: newId("aud"),
              entity: "pengajuan",
              entityId: r.id,
              entityLabel: `${r.tiket} — ${r.name}`,
              action: "CREATE" as AuditAction,
              aktor: actor?.nama ?? "system",
              aktorRole: actor?.role ?? ("CATEGORY_OFFICER" as const),
              at,
            })),
            ...s.audit,
          ].slice(0, 800),
        }));
      },

      /**
       * FR-INT-03 — Approve memicu pembuatan SKU baru di Product Master beserta
       * penandaan slot PLU (FR-PLU-01/02). Reject hanya mencatat alasan.
       */
      putusanPengajuan: (id, status, kodeProduk, catatan) => {
        const actor = get().currentUser();
        const at = new Date().toISOString();

        set((s) => {
          const p = s.pengajuan.find((x) => x.id === id);
          if (!p) return {} as Partial<AppState>;

          let products = s.products;
          let pluAllocations = s.pluAllocations;
          let produkId = p.produkId;

          if (status === "DISETUJUI" && !p.produkId) {
            const kodeSub = (p.subCategory ?? "").split("_")[0].trim();
            const kat = s.categories.find((c) => c.subCategoryCode === kodeSub);
            produkId = newId("prd");

            products = [
              ...s.products,
              {
                id: produkId,
                kodeProduct: kodeProduk ?? `PRD-${String(s.products.length + 1).padStart(5, "0")}`,
                barcode: p.barcode ?? "",
                namaProduct: p.name.toUpperCase(),
                principalId: s.principals.find((x) => x.nama === p.principle)?.id ?? "",
                categoryId: kat?.id ?? "",
                brand: (p.brand ?? "").toUpperCase(),
                uom: "PCS",
                isiSatuPack: Number(p.c1 ?? 1) || 1,
                hargaBeli: 0,
                hargaJual: 0,
                msrp: 0,
                c1: p.c1,
                c2: p.c2,
                c3: p.c3,
                c4: p.c4,
                c5: p.c5,
                tagPerRegion: emptyTagMap("A"),
                status: "DRAFT",
                fotoPack: [],
                tglAktif: at.slice(0, 10),
                updatedAt: at,
                updatedBy: actor?.nama ?? "system",
              },
            ];

            /* Tandai slot PLU pada seri kategori terkait. */
            if (kat) {
              const seri = seriDariSubDept(kat.subDeptCode);
              const dipakai = new Set(pluAllocations.filter((a) => a.terpakai[seri]).map((a) => a.no));
              let no = 1;
              while (dipakai.has(no)) no += 1;
              const existing = pluAllocations.find((a) => a.no === no);
              pluAllocations = existing
                ? pluAllocations.map((a) =>
                    a.no === no ? { ...a, terpakai: { ...a.terpakai, [seri]: kodeProduk ?? "" } } : a,
                  )
                : [...pluAllocations, { id: newId("plu"), no, terpakai: { [seri]: kodeProduk ?? "" } }].sort(
                    (a, b) => a.no - b.no,
                  );
            }
          }

          const step = {
            status: (status === "DISETUJUI" ? "APPROVED" : "DECLINED") as UsulanStatus,
            aktor: actor?.nama ?? "system",
            aktorRole: actor?.role ?? ("MDM" as const),
            at,
            alasan: catatan,
          };

          return {
            products,
            pluAllocations,
            pengajuan: s.pengajuan.map((x) =>
              x.id === id
                ? { ...x, status, kodeProduk: kodeProduk ?? x.kodeProduk, catatanApprover: catatan, produkId, history: [...x.history, step] }
                : x,
            ),
            audit: [
              {
                id: newId("aud"),
                entity: "pengajuan",
                entityId: id,
                entityLabel: `${p.tiket} — ${p.name}`,
                action: (status === "DISETUJUI" ? "APPROVE" : "DECLINE") as AuditAction,
                field: "status",
                before: p.status,
                after: status,
                aktor: actor?.nama ?? "system",
                aktorRole: actor?.role ?? "MDM",
                at,
              },
              ...s.audit,
            ].slice(0, 800),
          } as unknown as Partial<AppState>;
        });
      },

      /** Kembalikan pengajuan ke antrian review (batalkan keputusan). */
      resetPengajuan: (id) => {
        const actor = get().currentUser();
        const at = new Date().toISOString();
        set((s) => {
          const p = s.pengajuan.find((x) => x.id === id);
          if (!p) return {} as Partial<AppState>;
          return {
            products: p.produkId ? s.products.filter((x) => x.id !== p.produkId) : s.products,
            pengajuan: s.pengajuan.map((x) =>
              x.id === id ? { ...x, status: "MENUNGGU" as StatusPengajuan, produkId: undefined, catatanApprover: undefined } : x,
            ),
            audit: [
              {
                id: newId("aud"),
                entity: "pengajuan",
                entityId: id,
                entityLabel: `${p.tiket} — ${p.name}`,
                action: "UPDATE" as AuditAction,
                field: "status",
                before: p.status,
                after: "MENUNGGU",
                aktor: actor?.nama ?? "system",
                aktorRole: actor?.role ?? "MDM",
                at,
              },
              ...s.audit,
            ].slice(0, 800),
          } as unknown as Partial<AppState>;
        });
      },

      resetData: () => set({ ...seedData(), audit: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      /** Kolom turunan/aksi tidak ikut disimpan. */
      partialize: (s) => {
        const { hydrated: _h, ...rest } = s;
        void _h;
        return rest as unknown as AppState;
      },
      onRehydrateStorage: () => () => {
        useApp.setState({ hydrated: true });
      },
    },
  ),
);

/** Dipanggil AppProvider bila rehydrate sudah selesai sebelum listener terpasang. */
export function markHydrated() {
  useApp.setState({ hydrated: true });
}

/* ------------------------------------------------------------ Selector utils */

export function tagByKode(tags: TagRow[], kode: string): TagRow | undefined {
  return tags.find((t) => t.kode === kode);
}

export function emptyTagMap(fallback = "B"): Record<Region, string> {
  return REGIONS.reduce((acc, r) => ({ ...acc, [r]: fallback }), {} as Record<Region, string>);
}
