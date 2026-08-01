import type { PluAllocation, SeriPlu } from "@/lib/types";
import { SERI_PLU } from "@/lib/types";

/**
 * Alokasi kode PLU (SRS §3.3 / BR-05).
 * Pola: prefix 2 digit tetap per seri kategori + nomor urut bersama.
 * Prefix di bawah mengikuti pola yang teramati pada file sumber (Device 11,
 * Cartridge 12, dst.) dan masih menunggu konfirmasi resmi — lihat OQ 9.3.
 */
export const PREFIX_PLU: Record<SeriPlu, string> = {
  DEVICE: "11",
  CARTRIDGE: "12",
  LIQUID: "13",
  "TOBACCO STICK": "14",
  PARTS: "15",
  ACCESSORIES: "16",
  CIGARETTE: "17",
  LIGHTER: "18",
  "NEW ITEM EXTERNAL": "19",
};

/** Kapasitas pool nomor urut dasar pada sheet MASTERAN PLU. */
export const KAPASITAS_PLU = 8889;

export const kodePlu = (seri: SeriPlu, no: number) => `${PREFIX_PLU[seri]}${String(no).padStart(4, "0")}`;

/** Pemetaan Sub Dept taksonomi → seri PLU. */
export function seriDariSubDept(subDeptCode: string): SeriPlu {
  switch (subDeptCode) {
    case "11":
      return "DEVICE";
    case "12":
      return "CARTRIDGE";
    case "13":
      return "LIQUID";
    case "14":
      return "TOBACCO STICK";
    case "15":
      return "PARTS";
    case "16":
      return "ACCESSORIES";
    case "21":
      return "CIGARETTE";
    case "22":
      return "LIGHTER";
    default:
      return "NEW ITEM EXTERNAL";
  }
}

/** Nomor urut terkecil yang belum dipakai pada seri tersebut. */
export function nomorBerikutnya(alokasi: PluAllocation[], seri: SeriPlu): number {
  const dipakai = new Set(alokasi.filter((a) => a.terpakai[seri]).map((a) => a.no));
  for (let n = 1; n <= KAPASITAS_PLU; n++) if (!dipakai.has(n)) return n;
  return -1;
}

/** FR-PLU-02 — cegah dua SKU aktif memakai kode PLU sama pada satu seri. */
export function pemakaiSlot(alokasi: PluAllocation[], seri: SeriPlu, no: number): string | undefined {
  return alokasi.find((a) => a.no === no)?.terpakai[seri];
}

export function ringkasanPlu(alokasi: PluAllocation[]) {
  return SERI_PLU.map((seri) => {
    const terpakai = alokasi.filter((a) => a.terpakai[seri]).length;
    return {
      seri,
      prefix: PREFIX_PLU[seri],
      terpakai,
      tersedia: KAPASITAS_PLU - terpakai,
      persen: Math.round((terpakai / KAPASITAS_PLU) * 10000) / 100,
    };
  });
}

/** Deteksi kode PLU yang dipakai lebih dari satu SKU pada seri yang sama. */
export function tabrakanPlu(alokasi: PluAllocation[]) {
  const out: Array<{ seri: SeriPlu; no: number; pemakai: string[] }> = [];
  const peta = new Map<string, string[]>();
  alokasi.forEach((a) =>
    SERI_PLU.forEach((seri) => {
      const sku = a.terpakai[seri];
      if (!sku) return;
      const key = `${seri}|${a.no}`;
      peta.set(key, [...(peta.get(key) ?? []), sku]);
    }),
  );
  peta.forEach((pemakai, key) => {
    if (pemakai.length > 1) {
      const [seri, no] = key.split("|");
      out.push({ seri: seri as SeriPlu, no: Number(no), pemakai });
    }
  });
  return out;
}
