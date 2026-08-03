/**
 * Pembagian pool (klaim promo / insentif) ke beberapa peserta secara proporsional.
 *
 * Masalah yang diselesaikan: membulatkan tiap baris sendiri-sendiri tidak pernah
 * dijamin berjumlah sama dengan pool. Contoh nyata dari rekap Benda Pamulang —
 * pool Rp1.000.000 dibagi 24 unit:
 *
 *   41.667 + 41.667 + 875.000 + 41.667 = Rp1.000.001  ← lebih Rp1
 *
 * Selisih begini tidak boleh ikut ke klaim principal.
 *
 * Di sini dipakai metode sisa terbesar (largest remainder / kuota Hare):
 * tiap baris dibulatkan ke bawah dulu, lalu sisa rupiahnya dibagikan satu per
 * satu ke baris dengan pecahan terbesar. Hasilnya SELALU berjumlah persis pool.
 *
 * Semua hitungan pakai aritmetika bilangan bulat, jadi tidak ada galat floating
 * point seperti pada `pool * unit / totalUnit`.
 */

export interface Peserta {
  nama: string;
  /** Bobot pembagian — jumlah unit/order/qty. Harus >= 0. */
  unit: number;
}

export interface Alokasi extends Peserta {
  /** Nominal rupiah bulat. Jumlah seluruh baris dijamin sama dengan pool. */
  nominal: number;
  /** Nilai sebelum pembulatan, untuk audit/rekonsiliasi. */
  eksak: number;
  /** true bila baris ini kebagian +1 rupiah dari sisa pembulatan. */
  dapatSisa: boolean;
}

export class AlokasiError extends Error {}

/**
 * Membagi `pool` ke `peserta` sebanding dengan `unit` masing-masing.
 *
 * @param pool  Total rupiah yang dibagi (bilangan bulat, tidak negatif).
 * @returns Baris alokasi dengan urutan sama seperti input.
 */
export function bagiPool(pool: number, peserta: Peserta[]): Alokasi[] {
  if (!Number.isInteger(pool) || pool < 0) {
    throw new AlokasiError("Pool harus bilangan bulat dan tidak negatif");
  }
  if (peserta.some((p) => !Number.isFinite(p.unit) || p.unit < 0)) {
    throw new AlokasiError("Unit tiap peserta harus angka dan tidak negatif");
  }
  if (peserta.some((p) => !Number.isInteger(p.unit))) {
    throw new AlokasiError("Unit harus bilangan bulat — pecahan bikin sisa tidak bisa dibagi rapi");
  }

  const totalUnit = peserta.reduce((sum, p) => sum + p.unit, 0);

  // Tanpa unit sama sekali tidak ada dasar pembagian — jangan diam-diam bagi rata.
  if (totalUnit === 0) {
    return peserta.map((p) => ({ ...p, nominal: 0, eksak: 0, dapatSisa: false }));
  }

  const hasil: Alokasi[] = peserta.map((p) => {
    const pembilang = pool * p.unit;
    return {
      ...p,
      nominal: Math.floor(pembilang / totalUnit),
      eksak: pembilang / totalUnit,
      dapatSisa: false,
    };
  });

  let sisa = pool - hasil.reduce((sum, h) => sum + h.nominal, 0);

  /**
   * Sisa dibagikan ke pecahan terbesar dulu. Pecahan dihitung sebagai
   * `(pool * unit) % totalUnit` — bilangan bulat, jadi perbandingannya eksak.
   * Bila seri, unit lebih besar menang; bila masih seri, urutan input dipakai
   * supaya hasilnya deterministik (rekap yang sama selalu keluar angka sama).
   */
  const urutan = hasil
    .map((h, idx) => ({ idx, pecahan: (pool * h.unit) % totalUnit, unit: h.unit }))
    .sort((a, b) => b.pecahan - a.pecahan || b.unit - a.unit || a.idx - b.idx);

  for (const { idx } of urutan) {
    if (sisa <= 0) break;
    hasil[idx].nominal += 1;
    hasil[idx].dapatSisa = true;
    sisa -= 1;
  }

  return hasil;
}

/**
 * Membagi beberapa pool sekaligus, satu per warehouse/kelompok.
 * Tiap kelompok punya pool sendiri, jadi rate per unit-nya boleh berbeda.
 */
export function bagiPoolPerKelompok<K extends string>(
  kelompok: Record<K, { pool: number; peserta: Peserta[] }>,
): Record<K, Alokasi[]> {
  const keluar = {} as Record<K, Alokasi[]>;
  for (const [nama, { pool, peserta }] of Object.entries(kelompok) as [K, { pool: number; peserta: Peserta[] }][]) {
    keluar[nama] = bagiPool(pool, peserta);
  }
  return keluar;
}

/** Rate rupiah per unit untuk satu kelompok — berguna untuk kolom pemeriksaan. */
export function ratePerUnit(pool: number, peserta: Peserta[]): number {
  const totalUnit = peserta.reduce((sum, p) => sum + p.unit, 0);
  return totalUnit === 0 ? 0 : pool / totalUnit;
}
