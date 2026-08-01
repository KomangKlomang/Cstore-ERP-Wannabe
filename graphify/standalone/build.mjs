/**
 * Merangkai graphify.html mandiri.
 *
 * Menyatukan core.js + renderer.js + demo.js ke dalam SATU berkas .html.
 * Semuanya di-inline karena peramban memblokir `import` antar berkas saat
 * dibuka lewat file:// — dengan di-inline, berkas ini bisa diklik dua kali
 * langsung dari Explorer tanpa server dan tanpa internet.
 *
 * Jalankan: npm run graphify:html
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "../..");

/** Buang sintaks modul supaya potongan kode bisa digabung dalam satu <script>. */
function telanjangi(kode) {
  return kode
    .replace(/^\s*import\s[\s\S]*?from\s+["'][^"']+["'];\s*$/gm, "")
    .replace(/^\s*export\s+(const|function|let|class)\s/gm, "$1 ")
    .replace(/^\s*export\s+default\s/gm, "")
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, "")
    .trim();
}

const core = telanjangi(fs.readFileSync(path.join(ROOT, "graphify/core.js"), "utf8"));
const renderer = telanjangi(fs.readFileSync(path.join(DIR, "renderer.js"), "utf8"));
const demo = telanjangi(fs.readFileSync(path.join(DIR, "demo.js"), "utf8"));

const css = `
:root {
  color-scheme: light;
  --gf-page: #f6f6f4;
  --gf-card: #ffffff;
  --gf-fg: #111114;
  --gf-muted: #5c5c66;
  --gf-border: #e3e3e0;
  --gf-track: #e8e8e5;

  --viz-1: #2a78d6; --viz-2: #eb6834; --viz-3: #1baf7a; --viz-4: #eda100;
  --viz-5: #e87ba4; --viz-6: #008300; --viz-7: #4a3aa7; --viz-8: #e34948;
  --viz-solo: var(--viz-1);
  --viz-good: #0ca30c; --viz-warning: #fab219; --viz-serious: #ec835a; --viz-critical: #d03b3b;
  --viz-grid: #e1e0d9; --viz-axis: #c3c2b7; --viz-ink-muted: #898781;

  --brand-red: #d31d24;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --gf-page: #131316;
  --gf-card: #1c1c20;
  --gf-fg: #f4f4f5;
  --gf-muted: #a1a1aa;
  --gf-border: #2e2e35;
  --gf-track: #2e2e35;

  --viz-1: #3987e5; --viz-2: #d95926; --viz-3: #199e70; --viz-4: #c98500;
  --viz-5: #d55181; --viz-6: #008300; --viz-7: #9085e9; --viz-8: #e66767;
  --viz-grid: #2c2c2a; --viz-axis: #383835;

  --brand-red: #f0464c;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 24px 20px 56px;
  background: var(--gf-page);
  color: var(--gf-fg);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
}
.gf-wrap { max-width: 1160px; margin: 0 auto; }
.gf-topbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 6px; }
.gf-topbar h1 { margin: 0; font-size: 20px; letter-spacing: -0.01em; }
.gf-badge {
  border: 1px solid var(--brand-red); color: var(--brand-red);
  border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600;
}
.gf-lead { margin: 0 0 20px; color: var(--gf-muted); max-width: 70ch; line-height: 1.55; }
.gf-btn {
  margin-left: auto; border: 1px solid var(--gf-border); background: var(--gf-card);
  color: var(--gf-fg); border-radius: 8px; padding: 6px 12px; font-size: 13px; cursor: pointer;
}
.gf-btn:hover { border-color: var(--brand-red); }

.gf-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
@media (min-width: 900px) { .gf-grid { grid-template-columns: 1fr 1fr; } }
.gf-row { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 16px; }
.gf-full { margin-top: 16px; }

.gf-card {
  background: var(--gf-card); border: 1px solid var(--gf-border);
  border-radius: 12px; padding: 16px;
}
.gf-card h3 { margin: 0; font-size: 14px; font-weight: 600; }
.gf-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.gf-head p, .gf-sub { margin: 2px 0 0; font-size: 12px; color: var(--gf-muted); }
.gf-toggle {
  border: 1px solid var(--gf-border); background: transparent; color: var(--gf-fg);
  border-radius: 8px; padding: 3px 10px; font-size: 12px; cursor: pointer; flex-shrink: 0;
}
.gf-toggle:hover { border-color: var(--brand-red); }
.gf-body svg { display: block; width: 100%; height: auto; }

.gf-legend { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0 0 12px; padding: 0; list-style: none; font-size: 12px; }
.gf-legend li { display: flex; align-items: center; gap: 6px; }
.gf-swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex-shrink: 0; }

.gf-table { width: 100%; border-collapse: collapse; font-size: 12px; font-variant-numeric: tabular-nums; }
.gf-table th { text-align: left; color: var(--gf-muted); font-weight: 500; padding: 6px 12px 6px 0; border-bottom: 1px solid var(--gf-border); }
.gf-table td { padding: 6px 12px 6px 0; border-bottom: 1px solid var(--gf-border); }
.gf-table tr:last-child td { border-bottom: 0; }

.gf-donut { display: flex; flex-wrap: wrap; align-items: center; gap: 24px; }
.gf-donut svg { width: 176px; height: 176px; flex-shrink: 0; }
.gf-list { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 180px; font-size: 12px; }
.gf-list li { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.gf-list li span:nth-child(2) { flex: 1; }
.gf-muted { color: var(--gf-muted); font-variant-numeric: tabular-nums; }

.gf-gauge { display: flex; flex-direction: column; align-items: center; }
.gf-gauge svg { width: 168px; height: 101px; }
.gf-gauge-label { margin: 4px 0 0; font-size: 12px; color: var(--gf-muted); text-align: center; }

.gf-minirow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0; font-size: 12px; }
.gf-spark { width: 96px; height: 28px; }
.gf-meter { margin-top: 10px; }
.gf-meter-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
.gf-meter-track { height: 8px; border-radius: 999px; background: var(--gf-track); overflow: hidden; }
.gf-meter-fill { height: 100%; border-radius: 999px; }

.gf-foot { margin-top: 28px; font-size: 12px; color: var(--gf-muted); line-height: 1.6; }
.gf-foot code { background: var(--gf-card); border: 1px solid var(--gf-border); border-radius: 4px; padding: 1px 5px; }
`.trim();

const html = `<!doctype html>
<html lang="id" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Graphify — pustaka grafik ERP Wanna Be</title>
<style>
${css}
</style>
</head>
<body>
<div class="gf-wrap">
  <div class="gf-topbar">
    <h1>Graphify</h1>
    <span class="gf-badge">berjalan mandiri</span>
    <button type="button" id="gf-theme" class="gf-btn">Mode gelap</button>
  </div>
  <p class="gf-lead">
    Halaman ini merender seluruh bentuk grafik Graphify tanpa React, tanpa server, dan tanpa koneksi
    internet — seluruh kode sudah menyatu di dalam berkas .html ini. Perhitungan skala sumbu, bentuk
    batang, dan paletnya berasal dari <code>graphify/core.js</code> yang sama dengan komponen React
    di aplikasi, jadi tampilannya tidak akan menyimpang.
  </p>

  <div class="gf-grid" id="gf-grid"></div>
  <div class="gf-full" id="gf-network"></div>
  <div class="gf-row" id="gf-gauges"></div>
  <div class="gf-row" id="gf-mini"></div>

  <p class="gf-foot">
    Tekan tombol <b>Tabel</b> di sudut tiap kartu untuk membaca angka persisnya — aturan relief untuk
    tiga warna yang kontrasnya di bawah 3:1 pada mode terang. Dibangun ulang dengan
    <code>npm run graphify:html</code>.
  </p>
</div>

<script>
${core}

${renderer}

${demo}
</script>
</body>
</html>
`;

const keluaran = path.join(DIR, "graphify.html");
fs.writeFileSync(keluaran, html, "utf8");

/* Salin juga ke public/ supaya bisa dibuka dari aplikasi di /graphify.html */
const publik = path.join(ROOT, "public/graphify.html");
fs.mkdirSync(path.dirname(publik), { recursive: true });
fs.writeFileSync(publik, html, "utf8");

const kb = (p) => `${(fs.statSync(p).size / 1024).toFixed(1)} KB`;
console.log(`graphify.html  → ${path.relative(ROOT, keluaran)} (${kb(keluaran)})`);
console.log(`salinan publik → ${path.relative(ROOT, publik)} (${kb(publik)})`);
