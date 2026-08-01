#!/usr/bin/env node
/**
 * Import CSV dari Google Sheets export ke PostgreSQL via Prisma.
 *
 * Cara pakai:
 *   node scripts/import-csv.mjs --entity products --file data/products.csv
 *   node scripts/import-csv.mjs --entity stores --file data/stores.csv
 *   node scripts/import-csv.mjs --entity categories --file data/categories.csv
 *   node scripts/import-csv.mjs --entity principals --file data/principals.csv
 *
 * CSV harus punya header row. Delimiter: koma atau semicolon (auto-detect).
 * Field kosong di-import sebagai NULL.
 */

import fs from "fs";
import path from "path";

// ── Parse args
const args = process.argv.slice(2);
const entityIdx = args.indexOf("--entity");
const fileIdx = args.indexOf("--file");

if (entityIdx === -1 || fileIdx === -1) {
  console.log("Usage: node scripts/import-csv.mjs --entity <name> --file <path.csv>");
  console.log("\nEntities: products, stores, categories, principals, tags, kontrak, aset");
  process.exit(1);
}

const entity = args[entityIdx + 1];
const csvPath = args[fileIdx + 1];

if (!fs.existsSync(csvPath)) {
  console.error(`File tidak ditemukan: ${csvPath}`);
  process.exit(1);
}

// ── CSV parser (no dependency)
function parseCSV(text) {
  const delim = text.indexOf(";") < text.indexOf("\n") && text.includes(";") ? ";" : ",";
  const lines = [];
  let current = "";
  let inQuote = false;

  for (const char of text) {
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === "\n" && !inQuote) {
      lines.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current);

  const headers = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(delim).map((v) => {
      v = v.trim().replace(/^"|"$/g, "").replace(/\r/g, "");
      return v === "" ? null : v;
    });
    if (vals.every((v) => v === null)) continue;
    const row = {};
    headers.forEach((h, idx) => (row[h] = vals[idx] ?? null));
    rows.push(row);
  }

  return { headers, rows };
}

// ── Column mappings per entity (CSV header → Prisma field)
const MAPPINGS = {
  products: {
    kode_product: "kodeProduct",
    kode: "kodeProduct",
    barcode: "barcode",
    nama: "namaProduct",
    nama_product: "namaProduct",
    brand: "brand",
    uom: "uom",
    harga_beli: { field: "hargaBeli", type: "number" },
    harga_jual: { field: "hargaJual", type: "number" },
    msrp: { field: "msrp", type: "number" },
    isi_satu_pack: { field: "isiSatuPack", type: "number" },
    c1: "c1",
    c2: "c2",
    c3: "c3",
    c4: "c4",
    c5: "c5",
    status: "status",
  },
  stores: {
    store_code: "storeCode",
    kode: "storeCode",
    store_name: "storeName",
    nama: "storeName",
    store_type: "storeType",
    region: "region",
    area: "area",
    alamat: "alamat",
    kota: "kota",
    latitude: { field: "latitude", type: "number" },
    longitude: { field: "longitude", type: "number" },
    tgl_buka: "tglBuka",
    status: "status",
    no_telp: "noTelp",
    luas_m2: { field: "luasM2", type: "number" },
    jumlah_rak: { field: "jumlahRak", type: "number" },
  },
  categories: {
    segment_code: "segmentCode",
    segment: "segment",
    dept_code: "deptCode",
    dept: "dept",
    sub_dept_code: "subDeptCode",
    sub_dept: "subDept",
    category_code: "categoryCode",
    category: "category",
    sub_category_code: "subCategoryCode",
    sub_category: "subCategory",
    kd_hashmicro: "kdHashmicro",
    kd_comp_ltw: "kdCompLtw",
    status: "status",
  },
  principals: {
    kode: "kode",
    nama: "nama",
    pic: "pic",
    telp: "telp",
    email: "email",
    alamat: "alamat",
    npwp: "npwp",
    isi_satu_pack: { field: "isiSatuPack", type: "number" },
    status: "status",
  },
  tags: {
    kode: "kode",
    nama: "nama",
    jual: { field: "jual", type: "boolean" },
    po: { field: "po", type: "boolean" },
    perlakuan: "perlakuan",
    warna: "warna",
    status: "status",
  },
};

// ── Map CSV row to Prisma data
function mapRow(csvRow, mapping) {
  const data = {};
  for (const [csvCol, target] of Object.entries(mapping)) {
    const rawKey = Object.keys(csvRow).find((k) => k.toLowerCase().replace(/[\s_-]+/g, "_") === csvCol.toLowerCase());
    const rawVal = rawKey ? csvRow[rawKey] : null;

    if (typeof target === "string") {
      data[target] = rawVal;
    } else {
      if (rawVal === null) {
        data[target.field] = null;
      } else if (target.type === "number") {
        data[target.field] = Number(rawVal.replace(/[^0-9.-]/g, "")) || 0;
      } else if (target.type === "boolean") {
        data[target.field] = ["1", "true", "ya", "yes", "y"].includes(rawVal.toLowerCase());
      }
    }
  }
  return data;
}

// ── Main
const raw = fs.readFileSync(csvPath, "utf-8");
const { headers, rows } = parseCSV(raw);

console.log(`\n📋 Entity: ${entity}`);
console.log(`📁 File: ${csvPath}`);
console.log(`📊 ${rows.length} rows, ${headers.length} columns`);
console.log(`   Headers: ${headers.join(", ")}\n`);

const mapping = MAPPINGS[entity];
if (!mapping) {
  console.log(`⚠️  No mapping defined for "${entity}".`);
  console.log(`   Available: ${Object.keys(MAPPINGS).join(", ")}`);
  console.log(`\n   Outputting raw preview instead:\n`);
  rows.slice(0, 3).forEach((r, i) => console.log(`   Row ${i + 1}:`, JSON.stringify(r, null, 2)));
  process.exit(0);
}

// Preview mapped data
console.log("Preview (first 3 rows mapped):\n");
const mapped = rows.map((r) => mapRow(r, mapping));
mapped.slice(0, 3).forEach((r, i) => console.log(`  Row ${i + 1}:`, JSON.stringify(r)));

// Generate SQL for quick reference
console.log(`\n✅ ${mapped.length} rows ready to import.`);
console.log(`\nTo import, add Prisma client calls to this script or run:`);
console.log(`  npx prisma db seed`);
console.log(`\nOr use the generated JSON for manual import:`);

const outPath = csvPath.replace(/\.csv$/i, ".import.json");
fs.writeFileSync(outPath, JSON.stringify(mapped, null, 2));
console.log(`  💾 Saved to: ${outPath}\n`);
