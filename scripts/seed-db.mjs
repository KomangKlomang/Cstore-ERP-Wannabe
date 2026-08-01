#!/usr/bin/env node
/**
 * Seed database PostgreSQL dengan data awal dari seed files yang sudah ada.
 * Menerjemahkan seed data client-side (lib/seed/*) ke Prisma inserts.
 *
 * Cara pakai:
 *   1. Pastikan DATABASE_URL sudah diset di .env
 *   2. npx prisma migrate deploy  (atau prisma db push untuk dev)
 *   3. node scripts/seed-db.mjs
 *
 * Script ini IDEMPOTENT — menjalankan ulang akan skip data yang sudah ada
 * (upsert berdasarkan unique field).
 */

import "dotenv/config";

console.log(`
╔═══════════════════════════════════════════╗
║   MMS Database Seeder                     ║
║   Migrasi data dari Google Sheets → PG    ║
╚═══════════════════════════════════════════╝
`);

console.log("Database:", process.env.DATABASE_URL?.replace(/\/\/.*:.*@/, "//*****@") || "NOT SET");
console.log("");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL belum diset. Copy .env.example → .env lalu isi.");
  process.exit(1);
}

// Dynamic import prisma client setelah generate
const { PrismaClient } = await import("../lib/generated/prisma/index.js");
const prisma = new PrismaClient();

const bcrypt = await import("bcryptjs");
const DEMO_HASH = await bcrypt.hash("mms2026", 12);

try {
  // ── 1. Users
  console.log("👤 Seeding users...");
  const users = [
    { nama: "Komang Legoas", email: "mdm@cstore.id", role: "MDM", regions: [] },
    { nama: "Rina Handayani", email: "rina@cstore.id", role: "MDM", regions: [] },
    { nama: "Budi Santoso", email: "budi@cstore.id", role: "CATEGORY_OFFICER", regions: [] },
    { nama: "Sari Dewi", email: "sari@cstore.id", role: "BUYER", regions: [] },
    { nama: "Andi Pratama", email: "andi@cstore.id", role: "MARKETING_OFFICER", regions: [] },
    { nama: "Dian Lestari", email: "dian@cstore.id", role: "SPV_AREA", regions: ["JBTK", "SRG"] },
    { nama: "Rudi Hermawan", email: "rudi@cstore.id", role: "SPV_AREA", regions: ["BDG"] },
    { nama: "Nina Susanti", email: "nina@cstore.id", role: "SPV_AREA", regions: ["SMG", "SBY"] },
    { nama: "Eko Prasetyo", email: "eko@cstore.id", role: "CREW", regions: ["JBTK"], storeCode: "JKT-001" },
    { nama: "Fitri Rahayu", email: "fitri@cstore.id", role: "CREW", regions: ["JBTK"], storeCode: "JKT-002" },
    { nama: "Galih Ramadan", email: "galih@cstore.id", role: "CREW", regions: ["BDG"], storeCode: "BDG-001" },
    { nama: "Hana Wijaya", email: "hana@cstore.id", role: "ADMIN_IT", regions: [] },
    { nama: "Ivan Setiawan", email: "ivan@cstore.id", role: "CATEGORY_OFFICER", regions: [] },
    { nama: "Joko Widodo", email: "joko@cstore.id", role: "BUYER", regions: [] },
  ];

  for (const u of users) {
    const { regions, ...data } = u;
    await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        ...data,
        passwordHash: DEMO_HASH,
        aktif: true,
        mfaAktif: false,
        regions: { create: regions.map((r) => ({ region: r })) },
      },
    });
  }
  console.log(`   ✅ ${users.length} users`);

  // ── 2. Tags
  console.log("🏷️  Seeding tags...");
  const tags = [
    { kode: "A", nama: "Tag A — Reguler aktif", jual: true, po: true, perlakuan: "Jual & PO aktif", warna: "success" },
    {
      kode: "B",
      nama: "Tag B — PO only",
      jual: false,
      po: true,
      perlakuan: "Hanya PO, tidak dijual",
      warna: "warning",
    },
    { kode: "C", nama: "Tag C — Jual only", jual: true, po: false, perlakuan: "Dijual tanpa PO baru", warna: "accent" },
    {
      kode: "D",
      nama: "Tag D — Delisting",
      jual: false,
      po: false,
      perlakuan: "Habis stok lalu delisting",
      warna: "danger",
    },
    {
      kode: "E",
      nama: "Tag E — Return to vendor",
      jual: false,
      po: false,
      perlakuan: "RTV ke principal",
      warna: "danger",
    },
    {
      kode: "F",
      nama: "Tag F — Free goods",
      jual: false,
      po: false,
      perlakuan: "Barang hadiah/gratis",
      warna: "default",
    },
    {
      kode: "G",
      nama: "Tag G — Regional exclusive",
      jual: true,
      po: true,
      perlakuan: "Jual di region tertentu",
      warna: "accent",
    },
    { kode: "H", nama: "Tag H — Seasonal", jual: true, po: true, perlakuan: "Musiman/event", warna: "warning" },
    { kode: "I", nama: "Tag I — Consignment", jual: true, po: false, perlakuan: "Titip jual", warna: "default" },
    {
      kode: "J",
      nama: "Tag J — New launch",
      jual: true,
      po: true,
      perlakuan: "Produk baru dalam masa evaluasi",
      warna: "success",
    },
    {
      kode: "K",
      nama: "Tag K — Dormant",
      jual: false,
      po: false,
      perlakuan: "Frozen, tidak aktif sementara",
      warna: "default",
    },
  ];

  for (const t of tags) {
    await prisma.tag.upsert({
      where: { kode: t.kode },
      update: {},
      create: { ...t, status: "AKTIF", updatedBy: "system" },
    });
  }
  console.log(`   ✅ ${tags.length} tags`);

  console.log("\n🎉 Seed selesai! Database siap dipakai.\n");
  console.log("Langkah selanjutnya:");
  console.log("  1. Import data dari CSV: node scripts/import-csv.mjs --entity products --file data/products.csv");
  console.log("  2. Jalankan app: npm run dev");
  console.log("  3. Login: email apa saja dari daftar user di atas, password: mms2026\n");
} catch (err) {
  console.error("❌ Seed gagal:", err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
