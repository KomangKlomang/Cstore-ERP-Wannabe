#!/usr/bin/env tsx
/**
 * Import CSV hasil export Google Sheets ke PostgreSQL.
 *
 * Preview (default, tidak menyentuh database):
 *   npm run import:csv -- --entity products --file data/products.csv
 *
 * Tulis ke database (idempotent, upsert berdasarkan kode unik):
 *   npm run import:csv -- --entity products --file data/products.csv --commit
 *
 * Urutan import yang benar: categories & principals dulu, baru products —
 * karena products merujuk keduanya lewat foreign key.
 */

import "dotenv/config";
import fs from "node:fs";
import { mapRow, parseCsv, parseDate, type EntityMapping } from "../lib/csv";
import { prisma } from "../lib/db";
import { ProductStatus, Region, StatusAktif, StoreStatus, StoreType } from "../lib/generated/prisma/enums";

/**
 * Nilai enum di CSV divalidasi di sini, bukan dilempar mentah ke Prisma —
 * supaya salah ketik region berhenti dengan pesan jelas, bukan error constraint.
 */
function toEnum<T extends Record<string, string>>(enumObj: T, raw: string, label: string): T[keyof T] {
  const key = raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (key in enumObj) return enumObj[key] as T[keyof T];
  throw new Error(`${label} "${raw}" tidak valid. Pilihan: ${Object.keys(enumObj).join(", ")}`);
}

function requireDate(raw: string, label: string): Date {
  const date = parseDate(raw);
  if (!date) throw new Error(`${label} "${raw}" bukan tanggal yang valid (pakai DD/MM/YYYY atau YYYY-MM-DD)`);
  return date;
}

type Entity = "products" | "stores" | "categories" | "principals" | "tags";

const MAPPINGS: Record<Entity, EntityMapping> = {
  products: {
    kodeProduct: { aliases: ["kode_product", "kode", "plu"] },
    barcode: { aliases: ["barcode", "ean"] },
    namaProduct: { aliases: ["nama_product", "nama", "deskripsi"] },
    principalKode: { aliases: ["principal_kode", "principal", "kode_principal", "supplier"] },
    subCategoryCode: { aliases: ["sub_category_code", "kode_sub_category", "subcategory"] },
    brand: { aliases: ["brand", "merk"] },
    uom: { aliases: ["uom", "satuan"] },
    isiSatuPack: { aliases: ["isi_satu_pack", "isi_pack", "isi"], type: "number" },
    hargaBeli: { aliases: ["harga_beli", "hpp", "cost"], type: "number" },
    hargaJual: { aliases: ["harga_jual", "price"], type: "number" },
    msrp: { aliases: ["msrp", "harga_normal"], type: "number" },
    c1: { aliases: ["c1"] },
    c2: { aliases: ["c2"] },
    c3: { aliases: ["c3"] },
    c4: { aliases: ["c4"] },
    c5: { aliases: ["c5"] },
    status: { aliases: ["status"] },
  },
  stores: {
    storeCode: { aliases: ["store_code", "kode_toko", "kode"] },
    storeName: { aliases: ["store_name", "nama_toko", "nama"] },
    storeType: { aliases: ["store_type", "tipe_toko", "tipe"] },
    region: { aliases: ["region", "wilayah"] },
    area: { aliases: ["area"] },
    alamat: { aliases: ["alamat"] },
    kota: { aliases: ["kota"] },
    latitude: { aliases: ["latitude", "lat"], type: "number" },
    longitude: { aliases: ["longitude", "long", "lng"], type: "number" },
    tglBuka: { aliases: ["tgl_buka", "tanggal_buka"] },
    status: { aliases: ["status"] },
    noTelp: { aliases: ["no_telp", "telp", "telepon"] },
    luasM2: { aliases: ["luas_m2", "luas"], type: "number" },
    jumlahRak: { aliases: ["jumlah_rak", "rak"], type: "number" },
  },
  categories: {
    segmentCode: { aliases: ["segment_code", "kode_segment"] },
    segment: { aliases: ["segment"] },
    deptCode: { aliases: ["dept_code", "kode_dept"] },
    dept: { aliases: ["dept", "departemen"] },
    subDeptCode: { aliases: ["sub_dept_code", "kode_sub_dept"] },
    subDept: { aliases: ["sub_dept"] },
    categoryCode: { aliases: ["category_code", "kode_category"] },
    category: { aliases: ["category", "kategori"] },
    subCategoryCode: { aliases: ["sub_category_code", "kode_sub_category"] },
    subCategory: { aliases: ["sub_category", "sub_kategori"] },
    kdHashmicro: { aliases: ["kd_hashmicro", "hashmicro"] },
    kdCompLtw: { aliases: ["kd_comp_ltw", "comp_ltw"] },
    status: { aliases: ["status"] },
  },
  principals: {
    kode: { aliases: ["kode", "kode_principal"] },
    nama: { aliases: ["nama", "nama_principal"] },
    pic: { aliases: ["pic", "contact_person"] },
    telp: { aliases: ["telp", "telepon", "no_telp"] },
    email: { aliases: ["email"] },
    alamat: { aliases: ["alamat"] },
    npwp: { aliases: ["npwp"] },
    isiSatuPack: { aliases: ["isi_satu_pack", "isi_pack"], type: "number" },
    status: { aliases: ["status"] },
  },
  tags: {
    kode: { aliases: ["kode"] },
    nama: { aliases: ["nama"] },
    jual: { aliases: ["jual"], type: "boolean" },
    po: { aliases: ["po"], type: "boolean" },
    perlakuan: { aliases: ["perlakuan", "keterangan"] },
    warna: { aliases: ["warna"] },
    status: { aliases: ["status"] },
  },
};

const REQUIRED: Record<Entity, string[]> = {
  products: ["kodeProduct", "barcode", "namaProduct", "principalKode", "subCategoryCode", "brand"],
  stores: ["storeCode", "storeName", "storeType", "region", "area", "alamat", "kota", "tglBuka"],
  categories: [
    "segmentCode",
    "segment",
    "deptCode",
    "dept",
    "subDeptCode",
    "subDept",
    "categoryCode",
    "category",
    "subCategoryCode",
    "subCategory",
  ],
  principals: ["kode", "nama"],
  tags: ["kode", "nama", "perlakuan"],
};

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

const entity = arg("entity") as Entity | undefined;
const file = arg("file");
const commit = process.argv.includes("--commit");

if (!entity || !file) {
  console.log("Usage: npm run import:csv -- --entity <name> --file <path.csv> [--commit]");
  console.log(`\nEntities: ${Object.keys(MAPPINGS).join(", ")}`);
  process.exit(1);
}
if (!MAPPINGS[entity]) {
  console.error(`Entity "${entity}" tidak dikenal. Pilihan: ${Object.keys(MAPPINGS).join(", ")}`);
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`File tidak ditemukan: ${file}`);
  process.exit(1);
}

const { headers, rows } = parseCsv(fs.readFileSync(file, "utf-8"));
const mapped = rows.map((row) => mapRow(row, MAPPINGS[entity]));

console.log(`\n📋 Entity : ${entity}`);
console.log(`📁 File   : ${file}`);
console.log(`📊 ${rows.length} baris, ${headers.length} kolom`);
console.log(`   Header : ${headers.join(", ")}\n`);

const valid: typeof mapped = [];
const invalid: { line: number; missing: string[] }[] = [];

mapped.forEach((row, i) => {
  const missing = REQUIRED[entity].filter((f) => row[f] === null || row[f] === undefined || row[f] === "");
  if (missing.length) invalid.push({ line: i + 2, missing });
  else valid.push(row);
});

console.log("Preview 3 baris pertama:");
mapped.slice(0, 3).forEach((r, i) => console.log(`  ${i + 1}.`, JSON.stringify(r)));

if (invalid.length) {
  console.log(`\n⚠️  ${invalid.length} baris dilewati karena field wajib kosong:`);
  invalid.slice(0, 10).forEach((r) => console.log(`   baris ${r.line}: ${r.missing.join(", ")}`));
  if (invalid.length > 10) console.log(`   ... dan ${invalid.length - 10} lainnya`);
}

console.log(`\n✅ ${valid.length} baris siap di-import.`);

if (!commit) {
  console.log("\n(Preview saja — tambahkan --commit untuk menulis ke database.)\n");
  process.exit(0);
}

const ACTOR = "import-csv";

async function run() {
  let created = 0;
  let updated = 0;

  for (const row of valid) {
    const before = await countExisting(row);
    await upsert(row);
    if (before) updated++;
    else created++;
  }

  console.log(`\n🎉 Selesai — ${created} baru, ${updated} diperbarui.\n`);
}

async function countExisting(row: Record<string, unknown>): Promise<boolean> {
  switch (entity) {
    case "products":
      return !!(await prisma.product.findUnique({ where: { kodeProduct: String(row.kodeProduct) } }));
    case "stores":
      return !!(await prisma.store.findUnique({ where: { storeCode: String(row.storeCode) } }));
    case "categories":
      return !!(await prisma.category.findUnique({ where: { subCategoryCode: String(row.subCategoryCode) } }));
    case "principals":
      return !!(await prisma.principal.findUnique({ where: { kode: String(row.kode) } }));
    case "tags":
      return !!(await prisma.tag.findUnique({ where: { kode: String(row.kode) } }));
    default:
      return false;
  }
}

async function upsert(row: Record<string, unknown>) {
  const s = (key: string, fallback = "") => (row[key] === null || row[key] === undefined ? fallback : String(row[key]));
  const n = (key: string, fallback = 0) => (typeof row[key] === "number" ? (row[key] as number) : fallback);

  switch (entity) {
    case "categories": {
      const data = {
        segmentCode: s("segmentCode"),
        segment: s("segment"),
        deptCode: s("deptCode"),
        dept: s("dept"),
        subDeptCode: s("subDeptCode"),
        subDept: s("subDept"),
        categoryCode: s("categoryCode"),
        category: s("category"),
        subCategoryCode: s("subCategoryCode"),
        subCategory: s("subCategory"),
        kdHashmicro: row.kdHashmicro ? s("kdHashmicro") : null,
        kdCompLtw: row.kdCompLtw ? s("kdCompLtw") : null,
        status: toEnum(StatusAktif, s("status", "AKTIF"), "status"),
        updatedBy: ACTOR,
      };
      await prisma.category.upsert({ where: { subCategoryCode: data.subCategoryCode }, update: data, create: data });
      return;
    }

    case "principals": {
      const data = {
        kode: s("kode"),
        nama: s("nama"),
        pic: s("pic"),
        telp: s("telp"),
        email: s("email"),
        alamat: s("alamat"),
        npwp: s("npwp"),
        isiSatuPack: n("isiSatuPack", 1),
        status: toEnum(StatusAktif, s("status", "AKTIF"), "status"),
        updatedBy: ACTOR,
      };
      await prisma.principal.upsert({ where: { kode: data.kode }, update: data, create: data });
      return;
    }

    case "tags": {
      const data = {
        kode: s("kode"),
        nama: s("nama"),
        jual: row.jual === true,
        po: row.po === true,
        perlakuan: s("perlakuan"),
        warna: s("warna", "default"),
        status: toEnum(StatusAktif, s("status", "AKTIF"), "status"),
        updatedBy: ACTOR,
      };
      await prisma.tag.upsert({ where: { kode: data.kode }, update: data, create: data });
      return;
    }

    case "stores": {
      const data = {
        storeCode: s("storeCode"),
        storeName: s("storeName"),
        storeType: toEnum(StoreType, s("storeType"), "store_type"),
        region: toEnum(Region, s("region"), "region"),
        area: s("area"),
        alamat: s("alamat"),
        kota: s("kota"),
        latitude: n("latitude"),
        longitude: n("longitude"),
        tglBuka: requireDate(s("tglBuka"), "tgl_buka"),
        status: toEnum(StoreStatus, s("status", "AKTIF"), "status"),
        noTelp: s("noTelp"),
        luasM2: n("luasM2"),
        jumlahRak: n("jumlahRak"),
        updatedBy: ACTOR,
      };
      await prisma.store.upsert({ where: { storeCode: data.storeCode }, update: data, create: data });
      return;
    }

    case "products": {
      const principal = await prisma.principal.findUnique({ where: { kode: s("principalKode") } });
      if (!principal) throw new Error(`Principal "${s("principalKode")}" belum ada — import principals dulu.`);

      const category = await prisma.category.findUnique({ where: { subCategoryCode: s("subCategoryCode") } });
      if (!category) throw new Error(`Sub-category "${s("subCategoryCode")}" belum ada — import categories dulu.`);

      const data = {
        kodeProduct: s("kodeProduct"),
        barcode: s("barcode"),
        namaProduct: s("namaProduct"),
        principalId: principal.id,
        categoryId: category.id,
        brand: s("brand"),
        uom: s("uom", "PCS"),
        isiSatuPack: n("isiSatuPack", 1),
        hargaBeli: n("hargaBeli"),
        hargaJual: n("hargaJual"),
        msrp: n("msrp"),
        c1: row.c1 ? s("c1") : null,
        c2: row.c2 ? s("c2") : null,
        c3: row.c3 ? s("c3") : null,
        c4: row.c4 ? s("c4") : null,
        c5: row.c5 ? s("c5") : null,
        status: toEnum(ProductStatus, s("status", "DRAFT"), "status"),
        updatedBy: ACTOR,
      };
      await prisma.product.upsert({ where: { kodeProduct: data.kodeProduct }, update: data, create: data });
      return;
    }
  }
}

run()
  .catch((err) => {
    console.error("\n❌ Import gagal:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.DATABASE_URL) await prisma.$disconnect();
  });
