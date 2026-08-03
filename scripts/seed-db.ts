#!/usr/bin/env tsx
/**
 * Seed data awal (user demo + master tag) ke PostgreSQL.
 *
 *   1. Isi DATABASE_URL di .env
 *   2. npm run db:push
 *   3. npm run db:seed
 *
 * Idempotent — dijalankan ulang tidak menggandakan data.
 *
 * Catatan: harus dijalankan lewat tsx, bukan `node`. Prisma 7 meng-generate
 * client dalam bentuk TypeScript, jadi script .mjs biasa tidak bisa mengimpornya.
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";

const DEMO_PASSWORD = process.env.SEED_PASSWORD || "mms2026";

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
] as const;

const tags = [
  { kode: "A", nama: "Tag A — Reguler aktif", jual: true, po: true, perlakuan: "Jual & PO aktif", warna: "success" },
  { kode: "B", nama: "Tag B — PO only", jual: false, po: true, perlakuan: "Hanya PO, tidak dijual", warna: "warning" },
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
] as const;

async function main() {
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║   MMS Database Seeder                     ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diset. Copy .env.example ke .env lalu isi.");
  }
  console.log("Database:", process.env.DATABASE_URL.replace(/\/\/[^@]*@/, "//*****@"));

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log("\n👤 Seeding users...");
  for (const u of users) {
    const { regions, ...data } = u;
    await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        ...data,
        email: data.email.toLowerCase(),
        role: data.role,
        passwordHash,
        aktif: true,
        mfaAktif: false,
        regions: { create: regions.map((region) => ({ region })) },
      },
    });
  }
  console.log(`   ✅ ${users.length} users`);

  console.log("🏷️  Seeding tags...");
  for (const t of tags) {
    await prisma.tag.upsert({
      where: { kode: t.kode },
      update: {},
      create: { ...t, status: "AKTIF", updatedBy: "system" },
    });
  }
  console.log(`   ✅ ${tags.length} tags`);

  console.log("\n🎉 Seed selesai.\n");
  console.log("Langkah selanjutnya:");
  console.log(
    "  1. Import master data : npm run import:csv -- --entity principals --file data/principals.csv --commit",
  );
  console.log("  2. Jalankan app       : npm run dev");
  console.log(`  3. Login              : mdm@cstore.id / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error("\n❌ Seed gagal:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // prisma dibuat lazy — kalau DATABASE_URL kosong, menyentuhnya di sini
    // justru melempar error kedua yang menutupi pesan aslinya.
    if (process.env.DATABASE_URL) await prisma.$disconnect();
  });
