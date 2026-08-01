/**
 * Isi halaman demo Graphify mandiri.
 * Datanya contoh statis — tujuannya membuktikan pustaka ini berjalan sendiri,
 * tanpa React, tanpa server, dan tanpa koneksi internet.
 */

import {
  aktifkanToggle,
  areaChart,
  barChart,
  columnChart,
  donutChart,
  gaugeArc,
  groupedColumnChart,
  lineChart,
  meterBar,
  networkGraph,
  sparkline,
  stackedColumnChart,
} from "./renderer.js";
import { VIZ, VIZ_STATUS } from "../core.js";

const rp = (n) => (n >= 1_000_000 ? `Rp ${Math.round(n / 1_000_000)} jt` : `Rp ${new Intl.NumberFormat("id-ID").format(n)}`);
const bulat = (n) => String(Math.round(n));

const html = [
  barChart({
    title: "Nilai kontrak per principal",
    subtitle: "Enam principal dengan komitmen terbesar",
    satuan: "Nilai kontrak",
    format: rp,
    data: [
      { label: "Sampoerna Niaga Utama", value: 314_000_000 },
      { label: "KT&G Indonesia", value: 262_000_000 },
      { label: "OXVA Indonesia", value: 180_000_000 },
      { label: "Beverage Ritel Indonesia", value: 156_000_000 },
      { label: "Djarum Trade Partner", value: 132_000_000 },
      { label: "Gudang Garam Distribusi", value: 96_000_000 },
    ],
  }),

  columnChart({
    title: "Kontrak jatuh tempo — 6 bulan ke depan",
    subtitle: "Dasar reminder bertingkat H-90 / H-60 / H-30 / H-7",
    satuan: "Jumlah kontrak",
    color: VIZ_STATUS.serious,
    format: bulat,
    data: [
      { label: "Jul 26", value: 3 },
      { label: "Agu 26", value: 1 },
      { label: "Sep 26", value: 1 },
      { label: "Okt 26", value: 1 },
      { label: "Nov 26", value: 1 },
      { label: "Des 26", value: 2 },
    ],
  }),

  groupedColumnChart({
    title: "Ketersediaan SKU per region",
    subtitle: "Berdasarkan perlakuan jual pada tag masing-masing region",
    keys: ["Boleh dijual", "Tidak dijual"],
    colors: [VIZ[0], VIZ[3]],
    format: bulat,
    data: [
      { label: "JBTK", values: { "Boleh dijual": 48, "Tidak dijual": 4 } },
      { label: "SRG", values: { "Boleh dijual": 41, "Tidak dijual": 11 } },
      { label: "BDG", values: { "Boleh dijual": 45, "Tidak dijual": 7 } },
      { label: "SMG", values: { "Boleh dijual": 39, "Tidak dijual": 13 } },
      { label: "SBY", values: { "Boleh dijual": 47, "Tidak dijual": 5 } },
    ],
  }),

  stackedColumnChart({
    title: "Kondisi aset per region",
    subtitle: "Prioritas penggantian aset principal di toko",
    keys: ["GOOD", "REPLACE", "HILANG"],
    colors: ["var(--viz-6)", VIZ_STATUS.warning, VIZ_STATUS.critical],
    format: bulat,
    data: [
      { label: "JBTK", values: { GOOD: 16, REPLACE: 2, HILANG: 0 } },
      { label: "SRG", values: { GOOD: 8, REPLACE: 1, HILANG: 0 } },
      { label: "BDG", values: { GOOD: 10, REPLACE: 1, HILANG: 1 } },
      { label: "SMG", values: { GOOD: 11, REPLACE: 1, HILANG: 0 } },
      { label: "SBY", values: { GOOD: 13, REPLACE: 2, HILANG: 0 } },
    ],
  }),

  lineChart({
    title: "Engagement konten per bulan",
    subtitle: "Like + comment + share + repost per platform",
    keys: ["INSTAGRAM", "TIKTOK", "FACEBOOK", "YOUTUBE"],
    data: [
      { label: "Feb 26", values: { INSTAGRAM: 1180, TIKTOK: 920, FACEBOOK: 340, YOUTUBE: 210 } },
      { label: "Mar 26", values: { INSTAGRAM: 1420, TIKTOK: 1180, FACEBOOK: 420, YOUTUBE: 260 } },
      { label: "Apr 26", values: { INSTAGRAM: 1320, TIKTOK: 1460, FACEBOOK: 380, YOUTUBE: 310 } },
      { label: "Mei 26", values: { INSTAGRAM: 1810, TIKTOK: 1720, FACEBOOK: 460, YOUTUBE: 380 } },
      { label: "Jun 26", values: { INSTAGRAM: 2140, TIKTOK: 2010, FACEBOOK: 510, YOUTUBE: 410 } },
      { label: "Jul 26", values: { INSTAGRAM: 2380, TIKTOK: 2460, FACEBOOK: 470, YOUTUBE: 520 } },
    ],
  }),

  areaChart({
    title: "Total engagement seluruh platform",
    subtitle: "Gabungan empat platform — melihat arah tren tanpa terganggu rincian",
    seriesKey: "Total",
    data: [
      { label: "Feb 26", values: { Total: 2650 } },
      { label: "Mar 26", values: { Total: 3280 } },
      { label: "Apr 26", values: { Total: 3470 } },
      { label: "Mei 26", values: { Total: 4370 } },
      { label: "Jun 26", values: { Total: 5070 } },
      { label: "Jul 26", values: { Total: 5830 } },
    ],
  }),

  donutChart({
    title: "Portofolio SKU per segment",
    subtitle: "Komposisi katalog berdasarkan taksonomi",
    heroLabel: "SKU",
    data: [
      { label: "OPEN SYSTEM", value: 18 },
      { label: "SIGARET", value: 12 },
      { label: "PARTS", value: 9 },
      { label: "CLOSE SYSTEM", value: 6 },
      { label: "HNB", value: 5 },
      { label: "LAINNYA", value: 3 },
    ],
  }),
].join("\n");

document.getElementById("gf-grid").innerHTML = html;

/* --------------------------------- grafik jaringan (knowledge graph) contoh */

const KELOMPOK = ["PRINCIPAL", "PRODUK", "KATEGORI", "TOKO", "KONTRAK"];
const simpul = [];
const tautan = [];

const principal = ["Sampoerna", "KT&G", "OXVA", "Vaporesso", "Djarum", "Tokai"];
const kategori = ["Pod System", "Liquid", "Coil", "SKM", "Lighter", "Cartridge"];
const toko = ["Kemang", "Tebet", "Gading", "BSD", "Dago", "Gubeng", "Darmo", "Solo"];

principal.forEach((p) => simpul.push({ id: `prn:${p}`, label: p, group: "PRINCIPAL" }));
kategori.forEach((k) => simpul.push({ id: `kat:${k}`, label: k, group: "KATEGORI" }));
toko.forEach((t) => simpul.push({ id: `tok:${t}`, label: t, group: "TOKO" }));

/* produk menghubungkan principal dengan kategori */
for (let i = 0; i < 42; i++) {
  const id = `prd:${i}`;
  const p = principal[i % principal.length];
  const k = kategori[(i * 3) % kategori.length];
  simpul.push({ id, label: `SKU ${1001 + i}`, group: "PRODUK" });
  tautan.push({ source: id, target: `prn:${p}`, kind: "dipasok oleh" });
  tautan.push({ source: id, target: `kat:${k}`, kind: "berkategori" });
}

/* kontrak menghubungkan principal dengan sekumpulan toko */
for (let i = 0; i < 8; i++) {
  const id = `ktr:${i}`;
  simpul.push({ id, label: `Kontrak ${i + 1}`, group: "KONTRAK" });
  tautan.push({ source: id, target: `prn:${principal[i % principal.length]}`, kind: "dengan principal" });
  toko.filter((_, j) => (j + i) % 3 === 0).forEach((t) => tautan.push({ source: id, target: `tok:${t}`, kind: "mencakup toko" }));
}

document.getElementById("gf-network").innerHTML = networkGraph({
  title: "Peta relasi master data",
  subtitle: "Node-link diagram — produk menautkan principal ke kategori, kontrak menautkan principal ke toko",
  nodes: simpul,
  edges: tautan,
  groups: KELOMPOK,
  colors: [VIZ[0], VIZ[1], VIZ[2], VIZ[3], VIZ[4]],
  catatan: "Ukuran simpul mengikuti jumlah tautannya. Tata letak force-directed dihitung dari core.js yang sama dengan versi React.",
});

document.getElementById("gf-gauges").innerHTML = [
  gaugeArc({ label: "G1 · Kelengkapan atribut SKU", value: 98.1, target: 98, satuan: "98,1% lengkap", color: VIZ[2] }),
  gaugeArc({ label: "G2 · Kontrak tidak lewat tempo", value: 1, target: 1, satuan: "0 kontrak lewat", color: VIZ[5] }),
  gaugeArc({ label: "G4 · Usulan dengan jejak approval", value: 7, target: 7, satuan: "7 usulan", color: VIZ[0] }),
].join("");

document.getElementById("gf-mini").innerHTML = `
  <div class="gf-card">
    <h3>Sparkline &amp; MeterBar</h3>
    <p class="gf-muted gf-sub">Dipakai di dalam sel tabel dan kartu ringkas.</p>
    <div class="gf-minirow">
      <span class="gf-muted">Tren 12 minggu</span>
      ${sparkline({ values: [4, 6, 5, 9, 8, 12, 11, 15, 14, 18, 21, 24] })}
    </div>
    ${meterBar({ label: "Barcode terisi", value: 98, target: 100, color: VIZ[2] })}
    ${meterBar({ label: "Brand ternormalisasi", value: 177, target: 199, color: VIZ[0] })}
  </div>`;

aktifkanToggle(document);

/* Pengalih tema — membuktikan token warna bekerja di terang maupun gelap. */
const tombolTema = document.getElementById("gf-theme");
tombolTema.addEventListener("click", () => {
  const gelap = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = gelap ? "light" : "dark";
  tombolTema.textContent = gelap ? "Mode gelap" : "Mode terang";
});
