/**
 * Merangkai graph.html — penjelajah knowledge graph mandiri.
 *
 * Sama seperti build.mjs, seluruh kode di-inline ke dalam satu berkas karena
 * peramban memblokir `import` antar berkas saat dibuka lewat file://. Bedanya,
 * berkas ini menghasilkan satu halaman penuh layar untuk MENJELAJAH graf,
 * bukan galeri contoh grafik.
 *
 * Blok datanya diapit penanda <GRAPHIFY:DATA> supaya aplikasi bisa menukar
 * isinya dengan data langsung dari basis data — lihat tombol "Unduh graph.html"
 * di halaman Peta Relasi.
 *
 * Jalankan: npm run graphify:graph
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bangunDataContoh } from "./graph-data.mjs";

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

const runtime = telanjangi(fs.readFileSync(path.join(ROOT, "graphify/explorer/runtime.js"), "utf8"));
const data = bangunDataContoh();

const css = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  background: #0f0f1a;
  color: #e0e0e8;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
  display: flex;
  overflow: hidden;
}

#gx-panggung { flex: 1; position: relative; min-width: 0; }
#gx-canvas { display: block; width: 100%; height: 100%; cursor: grab; }
#gx-canvas:active { cursor: grabbing; }

#gx-tip {
  position: absolute; display: none; pointer-events: none;
  background: rgba(26,26,46,0.96); border: 1px solid #34344e;
  border-radius: 6px; padding: 6px 9px; font-size: 12px; line-height: 1.5;
  max-width: 260px; box-shadow: 0 4px 16px rgba(0,0,0,0.45); z-index: 5;
}

#gx-atas {
  position: absolute; top: 12px; left: 14px; right: 14px;
  display: flex; align-items: center; gap: 10px; pointer-events: none;
}
#gx-judul { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
#gx-alat { margin-left: auto; display: flex; gap: 6px; pointer-events: auto; }
.gx-btn {
  background: rgba(26,26,46,0.9); border: 1px solid #34344e; color: #d6d6e2;
  border-radius: 7px; padding: 5px 11px; font-size: 12px; cursor: pointer;
}
.gx-btn:hover { border-color: #4E79A7; color: #fff; }
.gx-btn-aktif { background: #6366f1; border-color: #6366f1; color: #fff; }

#gx-sidebar {
  width: 300px; flex-shrink: 0; background: #1a1a2e; border-left: 1px solid #2a2a4e;
  display: flex; flex-direction: column; overflow: hidden;
}
.gx-bagian { border-bottom: 1px solid #2a2a4e; padding: 12px; }
.gx-tajuk {
  font-size: 11px; color: #8f8fa6; text-transform: uppercase;
  letter-spacing: 0.06em; margin-bottom: 8px; font-weight: 600;
}

#gx-cari {
  width: 100%; background: #0f0f1a; border: 1px solid #3a3a5e; color: #e0e0e8;
  padding: 7px 10px; border-radius: 6px; font-size: 13px; outline: none;
}
#gx-cari:focus { border-color: #4E79A7; }
#gx-hasil { display: none; max-height: 190px; overflow-y: auto; margin-top: 6px; }
.gx-hasil-item {
  padding: 5px 8px; cursor: pointer; border-radius: 4px; font-size: 12px;
  border-left: 3px solid #333; display: flex; justify-content: space-between; gap: 8px;
}
.gx-hasil-item:hover { background: #2a2a4e; }
.gx-hasil-item em, .gx-tetangga em { font-style: normal; color: #7d7d94; font-size: 11px; flex-shrink: 0; }

#gx-info { font-size: 13px; min-height: 90px; }
.gx-kosong { color: #5c5c72; font-style: italic; }
.gx-judul-simpul { font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 7px; line-height: 1.35; }
.gx-titik { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.gx-baris { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; font-size: 12px; }
.gx-baris span { color: #8f8fa6; }
.gx-baris b { font-weight: 500; text-align: right; word-break: break-word; }
.gx-sub { margin: 10px 0 4px; font-size: 11px; color: #8f8fa6; text-transform: uppercase; letter-spacing: 0.05em; }
.gx-daftar { max-height: 180px; overflow-y: auto; }
.gx-tetangga {
  display: flex; justify-content: space-between; gap: 8px; align-items: center;
  padding: 3px 7px; margin: 2px 0; border-radius: 4px; cursor: pointer;
  font-size: 12px; border-left: 3px solid #333;
}
.gx-tetangga:hover { background: #2a2a4e; }

#gx-legenda-bagian { flex: 1; overflow-y: auto; padding: 12px; }
.gx-legenda-item {
  display: flex; align-items: center; gap: 8px; padding: 4px 0;
  cursor: pointer; font-size: 12px; border-radius: 4px;
}
.gx-legenda-item:hover { background: #2a2a4e; }
.gx-redup { opacity: 0.4; }
.gx-legenda-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gx-legenda-n { color: #6c6c84; font-size: 11px; font-variant-numeric: tabular-nums; }

.gx-cb {
  appearance: none; -webkit-appearance: none; width: 14px; height: 14px;
  border: 1.5px solid #3a3a5e; border-radius: 3px; background: #0f0f1a;
  cursor: pointer; position: relative; flex-shrink: 0; margin: 0;
}
.gx-cb:checked { background: #4E79A7; border-color: #4E79A7; }
.gx-cb:checked::after {
  content: ''; position: absolute; left: 3.5px; top: 1px; width: 4px; height: 7px;
  border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg);
}
.gx-cb:indeterminate { background: #4E79A7; border-color: #4E79A7; }
.gx-cb:indeterminate::after {
  content: ''; position: absolute; left: 2px; top: 5px; width: 8px; height: 2px;
  background: #fff; border: none; transform: none;
}
.gx-semua-baris { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; color: #a8a8bd; cursor: pointer; }

#gx-stats { padding: 10px 12px; font-size: 11px; color: #5c5c72; border-top: 1px solid #2a2a4e; }
#gx-bantuan { padding: 0 12px 10px; font-size: 11px; color: #4e4e63; line-height: 1.6; }
`.trim();

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Graphify Explorer — peta relasi ERP Wanna Be</title>
<style>
${css}
</style>
</head>
<body>
<div id="gx-panggung">
  <canvas id="gx-canvas"></canvas>
  <div id="gx-tip"></div>
  <div id="gx-atas">
    <span id="gx-judul">Peta relasi</span>
    <div id="gx-alat">
      <button type="button" id="gx-modus" class="gx-btn">Warna: Komunitas</button>
      <button type="button" id="gx-hyper" class="gx-btn">Sorotan alur</button>
      <button type="button" id="gx-muat" class="gx-btn">Muat ke layar</button>
    </div>
  </div>
</div>

<aside id="gx-sidebar">
  <div class="gx-bagian">
    <input id="gx-cari" type="text" placeholder="Cari simpul…" autocomplete="off" />
    <div id="gx-hasil"></div>
  </div>

  <div class="gx-bagian">
    <div class="gx-tajuk">Info simpul</div>
    <div id="gx-info"></div>
  </div>

  <div id="gx-legenda-bagian">
    <div class="gx-tajuk" id="gx-legenda-judul">Komunitas</div>
    <label class="gx-semua-baris">
      <input type="checkbox" id="gx-semua" class="gx-cb" checked /> Pilih semua
    </label>
    <div id="gx-legenda"></div>
  </div>

  <div id="gx-stats"></div>
  <div id="gx-bantuan">
    Seret latar untuk menggeser · gulir untuk zoom · seret simpul untuk menatanya ulang.
  </div>
</aside>

<script>
${runtime}

/* <GRAPHIFY:DATA> */
const DATA = ${JSON.stringify(data)};
/* </GRAPHIFY:DATA> */

mulaiPenjelajah(DATA);
</script>
</body>
</html>
`;

const keluaran = path.join(DIR, "graph.html");
fs.writeFileSync(keluaran, html, "utf8");

/* Salinan di public/ supaya bisa dibuka dari aplikasi di /graph.html — dan
   dipakai sebagai kerangka saat aplikasi mengekspor data aslinya. */
const publik = path.join(ROOT, "public/graph.html");
fs.mkdirSync(path.dirname(publik), { recursive: true });
fs.writeFileSync(publik, html, "utf8");

const kb = (p) => `${(fs.statSync(p).size / 1024).toFixed(1)} KB`;
console.log(`graph.html     → ${path.relative(ROOT, keluaran)} (${kb(keluaran)})`);
console.log(`salinan publik → ${path.relative(ROOT, publik)} (${kb(publik)})`);
console.log(`isi            → ${data.nodes.length} simpul, ${data.edges.length} tautan, ${data.hyperedges.length} hyperedge`);
