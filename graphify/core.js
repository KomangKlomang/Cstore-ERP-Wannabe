/**
 * Graphify — inti perhitungan & token warna.
 *
 * Ditulis sebagai JavaScript polos (bukan .ts) dan tanpa impor apa pun, supaya
 * satu berkas ini bisa dipakai oleh DUA sisi sekaligus:
 *
 *   1. Komponen React di aplikasi  → `geometry.ts` & `tokens.ts` me-re-export ini
 *   2. Renderer vanilla mandiri    → `standalone/renderer.js` mengimpornya langsung
 *
 * Dengan begitu skala sumbu, bentuk batang, dan palet warna tidak pernah
 * berbeda antara aplikasi dan halaman .html mandiri.
 */

/* ------------------------------------------------------------------ palet */

/**
 * Slot kategorikal tetap. Diberikan berurutan dan tidak pernah di-cycle:
 * warna mengikuti entitas, bukan peringkat.
 * @type {string[]}
 */
export const VIZ = [
  "var(--viz-1)",
  "var(--viz-2)",
  "var(--viz-3)",
  "var(--viz-4)",
  "var(--viz-5)",
  "var(--viz-6)",
  "var(--viz-7)",
  "var(--viz-8)",
];

/**
 * Warna keadaan. Tidak pernah dipakai sebagai "seri ke-4" dan selalu
 * didampingi ikon + label.
 * @type {{ good: string, warning: string, serious: string, critical: string }}
 */
export const VIZ_STATUS = {
  good: "var(--viz-good)",
  warning: "var(--viz-warning)",
  serious: "var(--viz-serious)",
  critical: "var(--viz-critical)",
};

/**
 * Warna baku chart satu seri. Sengaja bukan merah merek: di aplikasi ini merah
 * sudah berarti "kritis", jadi memakainya untuk data akan menabrak arti itu.
 * @type {string}
 */
export const VIZ_SOLO = "var(--viz-solo)";

/**
 * Format angka baku: ribuan gaya Indonesia, dibulatkan.
 * @param {number} n
 * @returns {string}
 */
export const idFmt = (n) => new Intl.NumberFormat("id-ID").format(Math.round(n));

/* --------------------------------------------------------------- geometri */

/**
 * Batang horizontal — sudut membulat hanya di ujung kanan (arah pertumbuhan),
 * sisi garis dasar tetap siku supaya batang terbaca menempel pada sumbu.
 * @param {number} x @param {number} y @param {number} w @param {number} h @param {number} [r]
 * @returns {string}
 */
export function barPathH(x, y, w, h, r = 4) {
  const rr = Math.max(0, Math.min(r, w, h / 2));
  if (w <= 0.5) return `M${x},${y} h0`;
  return `M${x},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr} V${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x} Z`;
}

/**
 * Batang vertikal — sudut membulat hanya di ujung atas.
 * @param {number} x @param {number} y @param {number} w @param {number} h @param {number} [r]
 * @returns {string}
 */
export function barPathV(x, y, w, h, r = 4) {
  const rr = Math.max(0, Math.min(r, h, w / 2));
  if (h <= 0.5) return `M${x},${y + h} h0`;
  return `M${x},${y + h} V${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr} V${y + h} Z`;
}

/* ------------------------------------------- tata letak grafik jaringan */

/**
 * Pembangkit acak berbenih — supaya tata letak selalu sama setiap kali dihitung.
 * Tanpa ini, hasil server dan browser akan berbeda dan React protes.
 * @param {number} a
 */
function berbenih(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tata letak force-directed (Fruchterman–Reingold) untuk node-link diagram.
 *
 * Simpul saling menolak, tautan menarik pasangannya, dan gravitasi lembut
 * menjaga komponen yang terputus tetap masuk bingkai. Dijalankan sekali sampai
 * "dingin", lalu digambar statis — jadi tidak ada animasi yang memakan CPU.
 *
 * @param {Array<{id: string, [k: string]: any}>} nodes
 * @param {Array<{source: string, target: string}>} edges
 * @param {{width?: number, height?: number, iterations?: number, seed?: number, spread?: number, gravity?: number}} [opts]
 * @returns {Array<{id: string, x: number, y: number, degree: number, [k: string]: any}>}
 */
export function forceLayout(nodes, edges, opts = {}) {
  const W = opts.width ?? 900;
  const H = opts.height ?? 620;
  const iterasi = opts.iterations ?? 420;
  const rnd = berbenih(opts.seed ?? 7);
  const n = nodes.length;
  if (!n) return [];

  const idx = new Map(nodes.map((d, i) => [d.id, i]));
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  const derajat = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    x[i] = W / 2 + Math.cos(a) * (W / 3) * (0.35 + rnd() * 0.65);
    y[i] = H / 2 + Math.sin(a) * (H / 3) * (0.35 + rnd() * 0.65);
  }

  /** @type {Array<[number, number]>} */
  const E = [];
  for (const e of edges) {
    const a = idx.get(e.source);
    const b = idx.get(e.target);
    if (a === undefined || b === undefined || a === b) continue;
    E.push([a, b]);
    derajat[a]++;
    derajat[b]++;
  }

  /**
   * `spread` menentukan jarak ideal antar simpul, `gravity` menahannya tetap di
   * tengah. Nilai bawaan disetel supaya simpul tidak terdorong menempel ke tepi
   * bingkai — gejala khas ketika tolakan menang atas gravitasi.
   */
  const k = Math.sqrt((W * H) / n) * (opts.spread ?? 0.55);
  const g = opts.gravity ?? 0.06;
  let suhu = W / 16;

  for (let s = 0; s < iterasi; s++) {
    dx.fill(0);
    dy.fill(0);

    /* tolakan antar seluruh pasangan simpul */
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let vx = x[i] - x[j];
        let vy = y[i] - y[j];
        let d2 = vx * vx + vy * vy;
        if (d2 < 0.01) {
          vx = (rnd() - 0.5) * 0.1;
          vy = (rnd() - 0.5) * 0.1;
          d2 = 0.01;
        }
        const f = (k * k) / d2;
        dx[i] += vx * f;
        dy[i] += vy * f;
        dx[j] -= vx * f;
        dy[j] -= vy * f;
      }
    }

    /* tarikan sepanjang tautan */
    for (const [a, b] of E) {
      const vx = x[a] - x[b];
      const vy = y[a] - y[b];
      const d = Math.sqrt(vx * vx + vy * vy) || 0.01;
      const f = d / k;
      dx[a] -= vx * f;
      dy[a] -= vy * f;
      dx[b] += vx * f;
      dy[b] += vy * f;
    }

    /* gravitasi ke pusat */
    for (let i = 0; i < n; i++) {
      dx[i] += (W / 2 - x[i]) * g;
      dy[i] += (H / 2 - y[i]) * g;
    }

    /* geser dengan batas suhu, lalu dinginkan */
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
      const lim = Math.min(d, suhu);
      x[i] = Math.max(14, Math.min(W - 14, x[i] + (dx[i] / d) * lim));
      y[i] = Math.max(14, Math.min(H - 14, y[i] + (dy[i] / d) * lim));
    }
    suhu = Math.max(suhu * 0.978, 0.4);
  }

  return nodes.map((d, i) => ({ ...d, x: x[i], y: y[i], degree: derajat[i] }));
}

/**
 * Batas atas sumbu yang "bulat" supaya label tick enak dibaca.
 * @param {number} v
 * @returns {number}
 */
export function niceMax(v) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * base;
}
