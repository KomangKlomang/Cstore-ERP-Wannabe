import { describe, expect, it } from "vitest";
import { AlokasiError, bagiPool, bagiPoolPerKelompok, ratePerUnit, type Peserta } from "@/lib/alokasi";

const total = (rows: { nominal: number }[]) => rows.reduce((s, r) => s + r.nominal, 0);
const nominal = (rows: { nama: string; nominal: number }[]) => Object.fromEntries(rows.map((r) => [r.nama, r.nominal]));

describe("bagiPool — jumlah selalu pas", () => {
  it("Benda Pamulang: memperbaiki kelebihan Rp1 dari rekap lama", () => {
    // Rekap lama membulatkan tiap baris sendiri-sendiri:
    //   41.667 + 41.667 + 875.000 + 41.667 = 1.000.001
    const hasil = bagiPool(1_000_000, [
      { nama: "ARY DWI", unit: 1 },
      { nama: "DENNY SETIAWAN", unit: 1 },
      { nama: "INDAH LESTARI", unit: 21 },
      { nama: "RAFLI MIFTAHUL", unit: 1 },
    ]);

    expect(total(hasil)).toBe(1_000_000);
    expect(nominal(hasil)).toEqual({
      "ARY DWI": 41_667,
      "DENNY SETIAWAN": 41_667,
      "INDAH LESTARI": 875_000,
      "RAFLI MIFTAHUL": 41_666,
    });
  });

  it("Taman Asri: hasilnya sama dengan rekap lama yang memang sudah pas", () => {
    const hasil = bagiPool(850_000, [
      { nama: "LINDA APRILIA", unit: 1 },
      { nama: "MARIO SAPUTRA", unit: 22 },
    ]);

    expect(total(hasil)).toBe(850_000);
    expect(nominal(hasil)).toEqual({ "LINDA APRILIA": 36_957, "MARIO SAPUTRA": 813_043 });
  });

  it("Taman Royal: pembagian bulat tidak menghasilkan sisa sama sekali", () => {
    const hasil = bagiPool(1_200_000, [
      { nama: "MAHENDRA PRATAMA", unit: 17 },
      { nama: "MUHAMMAD FADHLAN", unit: 7 },
    ]);

    expect(total(hasil)).toBe(1_200_000);
    expect(nominal(hasil)).toEqual({ "MAHENDRA PRATAMA": 850_000, "MUHAMMAD FADHLAN": 350_000 });
    expect(hasil.every((h) => !h.dapatSisa)).toBe(true);
  });

  it("tetap pas untuk pembagian yang paling sulit dibulatkan", () => {
    const kasus: [number, number[]][] = [
      [1_000_000, [1, 1, 1]],
      [100, [1, 1, 1, 1, 1, 1, 7]],
      [999_999, [7, 11, 13]],
      [1, [1, 1, 1, 1]],
      [850_000, [1, 22]],
      [12_345_678, [3, 3, 3, 3, 3, 3, 3]],
    ];

    for (const [pool, units] of kasus) {
      const peserta: Peserta[] = units.map((unit, i) => ({ nama: `P${i}`, unit }));
      expect(total(bagiPool(pool, peserta))).toBe(pool);
    }
  });

  it("selisih tiap baris terhadap nilai eksak tidak pernah lebih dari Rp1", () => {
    const hasil = bagiPool(1_000_000, [
      { nama: "A", unit: 1 },
      { nama: "B", unit: 1 },
      { nama: "C", unit: 21 },
      { nama: "D", unit: 1 },
    ]);

    for (const h of hasil) {
      expect(Math.abs(h.nominal - h.eksak)).toBeLessThan(1);
    }
  });
});

describe("bagiPool — pembagian proporsional", () => {
  it("unit lebih besar selalu dapat nominal lebih besar", () => {
    const hasil = bagiPool(1_000_000, [
      { nama: "kecil", unit: 1 },
      { nama: "besar", unit: 21 },
    ]);
    expect(hasil[1].nominal).toBeGreaterThan(hasil[0].nominal);
  });

  it("unit sama dapat nominal yang selisihnya paling banyak Rp1", () => {
    const hasil = bagiPool(1_000_000, [
      { nama: "A", unit: 5 },
      { nama: "B", unit: 5 },
      { nama: "C", unit: 5 },
    ]);
    const angka = hasil.map((h) => h.nominal);
    expect(Math.max(...angka) - Math.min(...angka)).toBeLessThanOrEqual(1);
  });

  it("peserta tanpa unit tidak kebagian", () => {
    const hasil = bagiPool(500_000, [
      { nama: "aktif", unit: 10 },
      { nama: "kosong", unit: 0 },
    ]);
    expect(nominal(hasil)).toEqual({ aktif: 500_000, kosong: 0 });
  });

  it("urutan input dipertahankan", () => {
    const hasil = bagiPool(100, [
      { nama: "Z", unit: 1 },
      { nama: "A", unit: 2 },
    ]);
    expect(hasil.map((h) => h.nama)).toEqual(["Z", "A"]);
  });

  it("hasilnya deterministik untuk input yang sama", () => {
    const peserta = [
      { nama: "A", unit: 1 },
      { nama: "B", unit: 1 },
      { nama: "C", unit: 1 },
    ];
    expect(bagiPool(100, peserta)).toEqual(bagiPool(100, peserta));
  });
});

describe("bagiPool — kasus tepi", () => {
  it("total unit nol menghasilkan nol semua, bukan bagi rata", () => {
    const hasil = bagiPool(1_000_000, [
      { nama: "A", unit: 0 },
      { nama: "B", unit: 0 },
    ]);
    expect(total(hasil)).toBe(0);
  });

  it("pool nol menghasilkan nol semua", () => {
    expect(total(bagiPool(0, [{ nama: "A", unit: 5 }]))).toBe(0);
  });

  it("daftar peserta kosong aman", () => {
    expect(bagiPool(1_000_000, [])).toEqual([]);
  });

  it("menolak pool negatif atau pecahan", () => {
    expect(() => bagiPool(-1, [{ nama: "A", unit: 1 }])).toThrow(AlokasiError);
    expect(() => bagiPool(100.5, [{ nama: "A", unit: 1 }])).toThrow(AlokasiError);
  });

  it("menolak unit negatif atau pecahan", () => {
    expect(() => bagiPool(100, [{ nama: "A", unit: -1 }])).toThrow(AlokasiError);
    expect(() => bagiPool(100, [{ nama: "A", unit: 1.5 }])).toThrow(AlokasiError);
  });
});

describe("bagiPoolPerKelompok", () => {
  it("tiap warehouse memakai poolnya sendiri", () => {
    const hasil = bagiPoolPerKelompok({
      "TAMAN ROYAL": {
        pool: 1_200_000,
        peserta: [
          { nama: "MAHENDRA PRATAMA", unit: 17 },
          { nama: "MUHAMMAD FADHLAN", unit: 7 },
        ],
      },
      "BENDA PAMULANG": {
        pool: 1_000_000,
        peserta: [
          { nama: "ARY DWI", unit: 1 },
          { nama: "DENNY SETIAWAN", unit: 1 },
          { nama: "INDAH LESTARI", unit: 21 },
          { nama: "RAFLI MIFTAHUL", unit: 1 },
        ],
      },
      "TAMAN ASRI": {
        pool: 850_000,
        peserta: [
          { nama: "LINDA APRILIA", unit: 1 },
          { nama: "MARIO SAPUTRA", unit: 22 },
        ],
      },
    });

    expect(total(hasil["TAMAN ROYAL"])).toBe(1_200_000);
    expect(total(hasil["BENDA PAMULANG"])).toBe(1_000_000);
    expect(total(hasil["TAMAN ASRI"])).toBe(850_000);

    const grandTotal = Object.values(hasil).reduce((s, rows) => s + total(rows), 0);
    expect(grandTotal).toBe(3_050_000);
  });
});

describe("ratePerUnit", () => {
  it("menghitung rate yang berbeda per warehouse", () => {
    expect(ratePerUnit(1_200_000, [{ nama: "x", unit: 24 }])).toBe(50_000);
    expect(ratePerUnit(1_000_000, [{ nama: "x", unit: 24 }])).toBeCloseTo(41_666.67, 2);
    expect(ratePerUnit(850_000, [{ nama: "x", unit: 23 }])).toBeCloseTo(36_956.52, 2);
  });

  it("aman ketika tidak ada unit", () => {
    expect(ratePerUnit(1_000_000, [])).toBe(0);
  });
});
