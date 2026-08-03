/**
 * Parser CSV untuk data hasil export Google Sheets / Excel.
 *
 * Parser lama membuang semua tanda kutip lalu split per delimiter, sehingga
 * nilai seperti `"Rokok Mild, 16 Batang"` pecah jadi dua kolom dan seluruh
 * baris bergeser. Versi ini mengikuti RFC 4180: kutip dihormati, `""` di dalam
 * kutip berarti satu karakter `"`.
 */

export type CsvRow = Record<string, string | null>;

export interface CsvResult {
  headers: string[];
  rows: CsvRow[];
}

const CANDIDATE_DELIMITERS = [",", ";", "\t", "|"] as const;

/** Delimiter ditentukan dari baris header saja, bukan dari posisi `;` pertama di seluruh file. */
export function detectDelimiter(text: string): string {
  const headerLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";

  let best = ",";
  let bestCount = 0;
  for (const delim of CANDIDATE_DELIMITERS) {
    let count = 0;
    let inQuotes = false;
    for (const char of headerLine) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === delim && !inQuotes) count++;
    }
    if (count > bestCount) {
      best = delim;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(text: string, delimiter?: string): CsvResult {
  const input = text.replace(/^﻿/, "");
  const delim = delimiter ?? detectDelimiter(input);

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delim) {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  record.push(field);
  records.push(record);

  const headerRecord = records.shift() ?? [];
  const headers = headerRecord.map((h) => h.trim());

  const rows: CsvRow[] = [];
  for (const rec of records) {
    if (rec.every((v) => v.trim() === "")) continue;
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      const value = (rec[idx] ?? "").trim();
      row[h] = value === "" ? null : value;
    });
    rows.push(row);
  }

  return { headers, rows };
}

/** "Harga Beli" / "harga-beli" / "HARGA_BELI" semuanya jadi "harga_beli". */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Angka gaya Indonesia: titik ribuan, koma desimal ("Rp 1.500,50" → 1500.5).
 * Versi lama membuang semua non-digit selain titik, jadi "1.500,50" menjadi
 * "1.500.50" → NaN → 0, dan harga produk diam-diam ter-import sebagai nol.
 */
export function parseNumber(raw: string | null): number | null {
  if (raw === null) return null;

  const cleaned = raw.replace(/[^0-9.,-]/g, "").trim();
  if (!cleaned || cleaned === "-") return null;

  const negative = cleaned.startsWith("-");
  const digits = cleaned.replace(/-/g, "");

  const lastDot = digits.lastIndexOf(".");
  const lastComma = digits.lastIndexOf(",");

  let normalized: string;
  if (lastDot !== -1 && lastComma !== -1) {
    // Dua-duanya ada: yang paling belakang adalah pemisah desimal.
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    normalized = digits.split(thousandSep).join("").replace(decimalSep, ".");
  } else {
    const sep = lastDot !== -1 ? "." : lastComma !== -1 ? "," : null;
    if (sep === null) {
      normalized = digits;
    } else {
      const parts = digits.split(sep);
      const tail = parts[parts.length - 1];
      // Lebih dari satu pemisah, atau tepat 3 digit di belakang → pemisah ribuan.
      normalized = parts.length > 2 || tail.length === 3 ? parts.join("") : parts.join(".");
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/**
 * Tanggal dari Sheets biasanya "31/12/2024" (hari dulu). `new Date()` bawaan JS
 * membacanya sebagai bulan-31 → Invalid Date, jadi formatnya diurai eksplisit.
 */
export function parseDate(raw: string | null): Date | null {
  if (raw === null) return null;
  const value = raw.trim();
  if (!value) return null;

  const build = (y: number, m: number, d: number): Date | null => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    // Menolak tanggal yang "melimpah" seperti 31 Februari.
    if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date;
  };

  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value);
  if (iso) return build(+iso[1], +iso[2], +iso[3]);

  const idn = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(value);
  if (idn) return build(+idn[3], +idn[2], +idn[1]);

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function parseBoolean(raw: string | null): boolean | null {
  if (raw === null) return null;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "ya", "yes", "y", "aktif"].includes(v)) return true;
  if (["0", "false", "tidak", "no", "n", "nonaktif"].includes(v)) return false;
  return null;
}

export type FieldSpec = {
  /** Nama kolom CSV yang diterima, urut prioritas — yang pertama ketemu dipakai. */
  aliases: string[];
  type?: "string" | "number" | "boolean";
};

export type EntityMapping = Record<string, FieldSpec>;

/**
 * Memetakan satu baris CSV ke field Prisma.
 *
 * Mapping lama berbentuk alias→field (`{ kode_product: "kodeProduct", kode: "kodeProduct" }`).
 * Karena di-iterasi berurutan, alias kedua yang tidak ada di CSV menimpa nilai
 * alias pertama dengan null. Sekarang arahnya dibalik: satu field punya daftar
 * alias, dan alias pertama yang ada isinya yang menang.
 */
export function mapRow(row: CsvRow, mapping: EntityMapping): Record<string, string | number | boolean | null> {
  const normalized = new Map<string, string | null>();
  for (const [key, value] of Object.entries(row)) {
    normalized.set(normalizeHeader(key), value);
  }

  const out: Record<string, string | number | boolean | null> = {};
  for (const [field, spec] of Object.entries(mapping)) {
    let raw: string | null = null;
    for (const alias of spec.aliases) {
      const candidate = normalized.get(normalizeHeader(alias));
      if (candidate !== undefined && candidate !== null) {
        raw = candidate;
        break;
      }
    }

    switch (spec.type) {
      case "number":
        out[field] = parseNumber(raw);
        break;
      case "boolean":
        out[field] = parseBoolean(raw);
        break;
      default:
        out[field] = raw;
    }
  }
  return out;
}
