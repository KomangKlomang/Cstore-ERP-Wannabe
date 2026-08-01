import type { CategoryRow } from "@/lib/types";

/**
 * MASTER_CAT — taksonomi 4 level + label Segment.
 * Struktur & format mengikuti SRS Product MDM §3.2: 4 Dept, 10 Sub Dept,
 * 28 Category, 53 kombinasi Sub Category, label siap-pakai format "N _ NAMA".
 *
 * Dual-code mapping: sisi ERP HASHMICRO dan sisi kedua (dilabeli "COMP. LTW"
 * pada file sumber) disimpan berdampingan — makna sisi kedua masih open question
 * dan ditandai di UI. Flag `untukCoa` menandai relevansi ke Chart of Accounts.
 */

type SubDef = { kode: string; nama: string; segmen: string; coa?: boolean };
type CatDef = { kode: string; nama: string; subs: SubDef[] };
type SubDeptDef = { kode: string; nama: string; cats: CatDef[] };
type DeptDef = { kode: string; nama: string; subDepts: SubDeptDef[] };

/** Segment adalah pengelompokan komersial, turunan dari Sub Category. */
export const SEGMENTS: Array<{ kode: string; nama: string }> = [
  { kode: "1", nama: "OPEN SYSTEM" },
  { kode: "2", nama: "CLOSE SYSTEM" },
  { kode: "3", nama: "DISPOSABLE" },
  { kode: "4", nama: "HNB" },
  { kode: "5", nama: "SIGARET" },
  { kode: "6", nama: "PARTS" },
  { kode: "7", nama: "ACCESSORIES" },
  { kode: "8", nama: "LIGHTER" },
  { kode: "9", nama: "PERSONAL CARE" },
  { kode: "10", nama: "BEVERAGES" },
  { kode: "11", nama: "OTHERS" },
];

const TAXONOMY: DeptDef[] = [
  {
    kode: "1",
    nama: "E-CIGARETTE",
    subDepts: [
      {
        kode: "11",
        nama: "DEVICE",
        cats: [
          {
            kode: "111",
            nama: "DEVICE OPEN SYSTEM",
            subs: [
              { kode: "111A", nama: "DEVICE OPEN SYSTEM", segmen: "1" },
              { kode: "111B", nama: "DEVICE MOD & AIO", segmen: "1" },
              { kode: "111C", nama: "DEVICE STARTER KIT", segmen: "1" },
            ],
          },
          {
            kode: "112",
            nama: "DEVICE CLOSE SYSTEM",
            subs: [{ kode: "112A", nama: "DEVICE CLOSE SYSTEM", segmen: "2" }],
          },
          {
            kode: "113",
            nama: "DEVICE DISPOSABLE",
            subs: [
              { kode: "113A", nama: "DISPOSABLE 0-6000 PUFF", segmen: "3" },
              { kode: "113B", nama: "DISPOSABLE > 6000 PUFF", segmen: "3" },
            ],
          },
        ],
      },
      {
        kode: "12",
        nama: "CARTRIDGE",
        cats: [
          {
            kode: "121",
            nama: "CARTRIDGE OPEN SYSTEM",
            subs: [{ kode: "121A", nama: "CARTRIDGE OPEN SYSTEM", segmen: "1" }],
          },
          {
            kode: "122",
            nama: "CARTRIDGE CLOSE SYSTEM",
            subs: [{ kode: "122A", nama: "CARTRIDGE CLOSE SYSTEM", segmen: "2" }],
          },
        ],
      },
      {
        kode: "13",
        nama: "LIQUID",
        cats: [
          {
            kode: "131",
            nama: "LIQUID SALTNIC",
            subs: [
              { kode: "131A", nama: "LIQUID SALTNIC 0-3 MG", segmen: "1" },
              { kode: "131B", nama: "LIQUID SALTNIC 4-30 MG", segmen: "1" },
            ],
          },
          {
            kode: "132",
            nama: "LIQUID FREEBASE",
            subs: [
              { kode: "132A", nama: "LIQUID FREEBASE 0-3 MG", segmen: "1" },
              { kode: "132B", nama: "LIQUID FREEBASE 4-12 MG", segmen: "1" },
            ],
          },
          {
            kode: "133",
            nama: "LIQUID PODSALT",
            subs: [{ kode: "133A", nama: "LIQUID PODSALT", segmen: "2" }],
          },
        ],
      },
      {
        kode: "14",
        nama: "HNB",
        cats: [
          {
            kode: "141",
            nama: "HNB DEVICE",
            subs: [
              { kode: "141A", nama: "HNB FILTER DEVICE", segmen: "4" },
              { kode: "141B", nama: "HNB TOBACCO DEVICE", segmen: "4" },
            ],
          },
          {
            kode: "142",
            nama: "HNB STICK",
            subs: [
              { kode: "142A", nama: "HNB STICK REGULER", segmen: "4" },
              { kode: "142B", nama: "HNB STICK MENTHOL", segmen: "4" },
            ],
          },
        ],
      },
      {
        kode: "15",
        nama: "PARTS",
        cats: [
          {
            kode: "151",
            nama: "COIL",
            subs: [
              { kode: "151A", nama: "COIL", segmen: "6" },
              { kode: "151B", nama: "CARTRIDGE COIL", segmen: "6" },
            ],
          },
          {
            kode: "152",
            nama: "BATTERY",
            subs: [
              { kode: "152A", nama: "BATTERY", segmen: "6" },
              { kode: "152B", nama: "CHARGER", segmen: "6" },
            ],
          },
          {
            kode: "153",
            nama: "ATOMIZER",
            subs: [
              { kode: "153A", nama: "RTA", segmen: "6" },
              { kode: "153B", nama: "RDA", segmen: "6" },
              { kode: "153C", nama: "RDTA", segmen: "6" },
            ],
          },
          {
            kode: "154",
            nama: "SPAREPART",
            subs: [
              { kode: "154A", nama: "SPAREPART DEVICE", segmen: "6" },
              { kode: "154B", nama: "SPAREPART TANK", segmen: "6" },
              { kode: "154C", nama: "SPAREPART CHARGER", segmen: "6" },
            ],
          },
        ],
      },
      {
        kode: "16",
        nama: "ACCESSORIES",
        cats: [
          {
            kode: "161",
            nama: "CASE & STRAP",
            subs: [
              { kode: "161A", nama: "SILICONE CASE", segmen: "7" },
              { kode: "161B", nama: "LANYARD & STRAP", segmen: "7" },
            ],
          },
          {
            kode: "162",
            nama: "TOOLS & MAINTENANCE",
            subs: [
              { kode: "162A", nama: "COTTON & WIRE", segmen: "7" },
              { kode: "162B", nama: "TOOL KIT", segmen: "7" },
            ],
          },
        ],
      },
    ],
  },
  {
    kode: "2",
    nama: "CIGARETTE",
    subDepts: [
      {
        kode: "21",
        nama: "SIGARET",
        cats: [
          {
            kode: "211",
            nama: "SKM FULL FLAVOR",
            subs: [
              { kode: "211A", nama: "SKM FF 12", segmen: "5" },
              { kode: "211B", nama: "SKM FF 16", segmen: "5" },
              { kode: "211C", nama: "SKM FF 20", segmen: "5" },
            ],
          },
          {
            kode: "212",
            nama: "SKM LTLN",
            subs: [
              { kode: "212A", nama: "SKM LTLN 16", segmen: "5" },
              { kode: "212B", nama: "SKM LTLN 20", segmen: "5" },
            ],
          },
          {
            kode: "213",
            nama: "SKT",
            subs: [
              { kode: "213A", nama: "SKT 12", segmen: "5" },
              { kode: "213B", nama: "SKT 16", segmen: "5" },
            ],
          },
          {
            kode: "214",
            nama: "SPM",
            subs: [
              { kode: "214A", nama: "SPM 12", segmen: "5" },
              { kode: "214B", nama: "SPM 20", segmen: "5" },
            ],
          },
          {
            kode: "215",
            nama: "CIGARETTE IMPORT",
            subs: [
              { kode: "215A", nama: "WHITE KING SIZE", segmen: "5" },
              { kode: "215B", nama: "WHITE SLIM", segmen: "5" },
            ],
          },
        ],
      },
      {
        kode: "22",
        nama: "LIGHTER",
        cats: [
          {
            kode: "221",
            nama: "GAS LIGHTER",
            subs: [
              { kode: "221A", nama: "DISPOSABLE LIGHTER", segmen: "8" },
              { kode: "221B", nama: "REFILLABLE LIGHTER", segmen: "8" },
            ],
          },
          {
            kode: "222",
            nama: "ELECTRIC LIGHTER",
            subs: [{ kode: "222A", nama: "USB PLASMA LIGHTER", segmen: "8" }],
          },
        ],
      },
    ],
  },
  {
    kode: "3",
    nama: "PERSONAL CARE - ADULT",
    subDepts: [
      {
        kode: "31",
        nama: "PERSONAL CARE",
        cats: [
          {
            kode: "311",
            nama: "ORAL CARE",
            subs: [
              { kode: "311A", nama: "MOUTH FRESHENER", segmen: "9" },
              { kode: "311B", nama: "ORAL SPRAY", segmen: "9" },
            ],
          },
          {
            kode: "312",
            nama: "ADULT CARE",
            subs: [
              { kode: "312A", nama: "PERSONAL LUBRICANT", segmen: "9" },
              { kode: "312B", nama: "CONDOM", segmen: "9" },
            ],
          },
        ],
      },
    ],
  },
  {
    kode: "4",
    nama: "BEVERAGES",
    subDepts: [
      {
        kode: "41",
        nama: "BEVERAGES",
        cats: [
          {
            kode: "411",
            nama: "RTD BEVERAGE",
            subs: [
              { kode: "411A", nama: "RTD COFFEE", segmen: "10" },
              { kode: "411B", nama: "RTD TEA", segmen: "10" },
            ],
          },
          {
            kode: "412",
            nama: "ENERGY DRINK",
            subs: [{ kode: "412A", nama: "ENERGY DRINK", segmen: "10" }],
          },
        ],
      },
      {
        kode: "49",
        nama: "OTHERS",
        cats: [
          {
            kode: "491",
            nama: "OTHERS",
            subs: [{ kode: "491A", nama: "OTHERS", segmen: "11", coa: false }],
          },
        ],
      },
    ],
  },
];

const STAMP = "2026-07-01T08:00:00.000Z";

/** Label siap-pakai "N _ NAMA" seperti pada file sumber. */
export const label = (kode: string, nama: string) => `${kode} _ ${nama}`;

const segmenNama = (kode: string) => SEGMENTS.find((s) => s.kode === kode)?.nama ?? "OTHERS";

export const seedCategories: CategoryRow[] = TAXONOMY.flatMap((dept) =>
  dept.subDepts.flatMap((sd) =>
    sd.cats.flatMap((cat) =>
      cat.subs.map<CategoryRow>((sub) => ({
        id: `cat-${sub.kode}`,
        segmentCode: sub.segmen,
        segment: segmenNama(sub.segmen),
        deptCode: dept.kode,
        dept: dept.nama,
        subDeptCode: sd.kode,
        subDept: sd.nama,
        categoryCode: cat.kode,
        category: cat.nama,
        subCategoryCode: sub.kode,
        subCategory: sub.nama,
        /* Dual-code mapping (SRS §3.2). Sisi kedua "COMP. LTW" masih OQ. */
        kdHashmicro: `${dept.kode}.${sd.kode}.${cat.kode}.${sub.kode}`,
        kdCompLtw: `LTW-${sd.kode}${cat.kode.slice(-1)}${sub.kode.slice(-1)}`,
        untukCoa: sub.coa ?? true,
        status: "AKTIF",
        updatedAt: STAMP,
        updatedBy: "seed",
      })),
    ),
  ),
);

/** Opsi unik per level — dipakai cascading select & validasi kode. */
export function levelOptions(rows: CategoryRow[]) {
  const uniq = <T,>(arr: T[], key: (t: T) => string) => {
    const m = new Map<string, T>();
    arr.forEach((a) => m.set(key(a), a));
    return [...m.values()];
  };
  return {
    segments: uniq(
      rows.map((r) => ({ kode: r.segmentCode, nama: r.segment })),
      (r) => r.kode,
    ),
    depts: uniq(
      rows.map((r) => ({ kode: r.deptCode, nama: r.dept, parent: "" })),
      (r) => r.kode,
    ),
    subDepts: uniq(
      rows.map((r) => ({ kode: r.subDeptCode, nama: r.subDept, parent: r.deptCode })),
      (r) => r.kode,
    ),
    categories: uniq(
      rows.map((r) => ({ kode: r.categoryCode, nama: r.category, parent: r.subDeptCode })),
      (r) => r.kode,
    ),
  };
}

/** Cari baris taksonomi dari salah satu label/kode yang diisi user. */
export function cariTaksonomi(rows: CategoryRow[], teks: string): CategoryRow | undefined {
  const t = teks.trim().toUpperCase();
  if (!t) return undefined;
  const kode = t.includes("_") ? t.split("_")[0].trim() : t;
  return (
    rows.find((r) => r.subCategoryCode === kode) ??
    rows.find((r) => r.subCategory.toUpperCase() === t) ??
    rows.find((r) => label(r.subCategoryCode, r.subCategory).toUpperCase() === t) ??
    rows.find((r) => r.categoryCode === kode) ??
    rows.find((r) => label(r.categoryCode, r.category).toUpperCase() === t)
  );
}
