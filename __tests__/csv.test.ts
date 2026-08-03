import { describe, expect, it } from "vitest";
import { detectDelimiter, mapRow, normalizeHeader, parseCsv, parseDate, parseNumber } from "@/lib/csv";

describe("parseCsv — kutip", () => {
  it("tidak memecah field berkutip yang mengandung koma", () => {
    const csv = 'kode,nama,harga\nP001,"Rokok Mild, 16 Batang",25000';
    const { rows } = parseCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].nama).toBe("Rokok Mild, 16 Batang");
    expect(rows[0].harga).toBe("25000");
  });

  it("menerjemahkan kutip ganda di dalam kutip jadi satu kutip", () => {
    const csv = 'kode,nama\nP001,"Vape ""Pro"" Edition"';
    expect(parseCsv(csv).rows[0].nama).toBe('Vape "Pro" Edition');
  });

  it("mempertahankan newline di dalam field berkutip", () => {
    const csv = 'kode,alamat\nS001,"Jl. Merdeka 1\nJakarta"';
    const { rows } = parseCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].alamat).toBe("Jl. Merdeka 1\nJakarta");
  });

  it("menangani CRLF dan BOM dari export Excel", () => {
    const csv = "﻿kode,nama\r\nP001,Sampoerna\r\n";
    const { headers, rows } = parseCsv(csv);

    expect(headers).toEqual(["kode", "nama"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kode).toBe("P001");
  });

  it("melewati baris kosong di akhir file", () => {
    expect(parseCsv("kode,nama\nP001,A\n\n\n").rows).toHaveLength(1);
  });

  it("mengubah sel kosong jadi null", () => {
    expect(parseCsv("kode,nama\nP001,").rows[0].nama).toBeNull();
  });
});

describe("detectDelimiter", () => {
  it("mendeteksi semicolon dari baris header", () => {
    expect(detectDelimiter("kode;nama;harga\nP001;A;1")).toBe(";");
  });

  it("tetap memilih koma walau ada semicolon di dalam data", () => {
    expect(detectDelimiter('kode,nama\nP001,"A; B"')).toBe(",");
  });

  it("mendeteksi tab", () => {
    expect(detectDelimiter("kode\tnama\nP001\tA")).toBe("\t");
  });
});

describe("parseNumber — format Indonesia", () => {
  it("membaca titik ribuan dan koma desimal", () => {
    expect(parseNumber("1.500,50")).toBe(1500.5);
    expect(parseNumber("Rp 1.250.000,75")).toBe(1250000.75);
  });

  it("membaca format Inggris", () => {
    expect(parseNumber("1,500.50")).toBe(1500.5);
  });

  it("memperlakukan satu titik dengan 3 digit sebagai ribuan", () => {
    expect(parseNumber("1.500")).toBe(1500);
    expect(parseNumber("25.000")).toBe(25000);
  });

  it("memperlakukan pemisah dengan bukan-3-digit sebagai desimal", () => {
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber("15.75")).toBe(15.75);
  });

  it("membuang simbol mata uang dan spasi", () => {
    expect(parseNumber("Rp 25.000")).toBe(25000);
    expect(parseNumber("  12000  ")).toBe(12000);
  });

  it("mengembalikan null untuk nilai kosong, bukan 0", () => {
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("-")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });

  it("menangani angka negatif", () => {
    expect(parseNumber("-1.500,25")).toBe(-1500.25);
  });
});

describe("parseDate", () => {
  const iso = (d: Date | null) => d?.toISOString().slice(0, 10);

  it("membaca format Indonesia (hari dulu)", () => {
    // new Date("31/12/2024") bawaan JS menghasilkan Invalid Date.
    expect(iso(parseDate("31/12/2024"))).toBe("2024-12-31");
    expect(iso(parseDate("01-03-2024"))).toBe("2024-03-01");
    expect(iso(parseDate("5.6.2024"))).toBe("2024-06-05");
  });

  it("membaca format ISO", () => {
    expect(iso(parseDate("2024-12-31"))).toBe("2024-12-31");
    expect(iso(parseDate("2024/01/05"))).toBe("2024-01-05");
  });

  it("menolak tanggal yang tidak masuk akal", () => {
    expect(parseDate("31/02/2024")).toBeNull();
    expect(parseDate("00/01/2024")).toBeNull();
    expect(parseDate("bukan tanggal")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

describe("normalizeHeader", () => {
  it("menyamakan spasi, dash, dan kapitalisasi", () => {
    expect(normalizeHeader("Harga Beli")).toBe("harga_beli");
    expect(normalizeHeader("harga-beli")).toBe("harga_beli");
    expect(normalizeHeader("  HARGA_BELI ")).toBe("harga_beli");
  });
});

describe("mapRow — alias", () => {
  const mapping = {
    kodeProduct: { aliases: ["kode_product", "kode", "plu"] },
    hargaBeli: { aliases: ["harga_beli", "hpp"], type: "number" as const },
    jual: { aliases: ["jual"], type: "boolean" as const },
  };

  it("alias kedua tidak menimpa nilai alias pertama dengan null", () => {
    // Regresi: mapping lama beriterasi alias→field, jadi "kode" yang tidak ada
    // di CSV menimpa nilai yang sudah terbaca dari "kode_product".
    const row = { kode_product: "P001", harga_beli: "1.500" };
    expect(mapRow(row, mapping).kodeProduct).toBe("P001");
  });

  it("jatuh ke alias berikutnya kalau yang pertama tidak ada", () => {
    expect(mapRow({ plu: "P002" }, mapping).kodeProduct).toBe("P002");
  });

  it("memakai alias prioritas tertinggi saat keduanya ada", () => {
    const row = { kode_product: "UTAMA", kode: "CADANGAN" };
    expect(mapRow(row, mapping).kodeProduct).toBe("UTAMA");
  });

  it("cocok walau header CSV pakai spasi dan kapital", () => {
    expect(mapRow({ "Harga Beli": "2.000" }, mapping).hargaBeli).toBe(2000);
  });

  it("mengembalikan null untuk field yang tidak ada di CSV", () => {
    expect(mapRow({ kode: "P003" }, mapping).hargaBeli).toBeNull();
  });

  it("membaca boolean gaya Indonesia", () => {
    expect(mapRow({ jual: "Ya" }, mapping).jual).toBe(true);
    expect(mapRow({ jual: "tidak" }, mapping).jual).toBe(false);
  });
});

describe("integrasi — baris nyata dari Sheets", () => {
  it("mempertahankan kolom yang benar walau nama produk mengandung koma", () => {
    const csv = [
      "kode_product;nama_product;harga_beli;harga_jual;brand",
      'P001;"Sampoerna Mild, 16 Btg";18.500,00;25.000,00;Sampoerna',
      "P002;Gudang Garam Surya;20.000,00;27.500,00;Gudang Garam",
    ].join("\n");

    const mapping = {
      kodeProduct: { aliases: ["kode_product", "kode"] },
      namaProduct: { aliases: ["nama_product", "nama"] },
      hargaBeli: { aliases: ["harga_beli"], type: "number" as const },
      hargaJual: { aliases: ["harga_jual"], type: "number" as const },
      brand: { aliases: ["brand"] },
    };

    const rows = parseCsv(csv).rows.map((r) => mapRow(r, mapping));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      kodeProduct: "P001",
      namaProduct: "Sampoerna Mild, 16 Btg",
      hargaBeli: 18500,
      hargaJual: 25000,
      brand: "Sampoerna",
    });
    expect(rows[1].hargaBeli).toBe(20000);
  });
});
