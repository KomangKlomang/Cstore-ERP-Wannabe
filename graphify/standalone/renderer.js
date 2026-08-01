/**
 * Graphify — renderer vanilla.
 *
 * Menghasilkan markup SVG sebagai string, tanpa React dan tanpa dependensi apa
 * pun. Dipakai oleh halaman .html mandiri; perhitungan skala, bentuk batang, dan
 * paletnya diambil dari `../core.js` yang sama dengan komponen React.
 *
 * Setiap fungsi mengembalikan satu kartu chart lengkap (judul, grafik, tabel).
 * Mode tabel diaktifkan lewat tombol di sudut kartu — memenuhi aturan relief
 * untuk tiga warna yang kontrasnya di bawah 3:1 pada mode terang.
 */

import { VIZ, VIZ_SOLO, barPathH, barPathV, forceLayout, idFmt, niceMax } from "../core.js";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Kartu pembungkus: judul, aksi tabel, isi grafik, tabel data, catatan. */
function frame({ title, subtitle, legend = [], body, table, catatan }) {
  const id = `gf${Math.random().toString(36).slice(2, 9)}`;
  const legendHtml = legend.length > 1
    ? `<ul class="gf-legend">${legend
        .map((l) => `<li><span class="gf-swatch" style="background:${l.color}"></span>${esc(l.label)}</li>`)
        .join("")}</ul>`
    : "";

  const tabelHtml = `<table class="gf-table"><thead><tr>${table.head
    .map((h) => `<th>${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>${table.rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;

  return `<section class="gf-card" data-gf="${id}">
  <header class="gf-head">
    <div>
      <h3>${esc(title)}</h3>
      ${subtitle ? `<p>${esc(subtitle)}</p>` : ""}
    </div>
    <button type="button" class="gf-toggle" data-target="${id}" aria-pressed="false">Tabel</button>
  </header>
  ${legendHtml}
  <div class="gf-body" data-body="${id}">${body}</div>
  <div class="gf-tablewrap" data-table="${id}" hidden>${tabelHtml}</div>
  ${catatan ? `<p class="gf-note">${esc(catatan)}</p>` : ""}
</section>`;
}

const tick = (x1, x2, y, label, anchorX) =>
  `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="var(--viz-grid)" stroke-width="1"/>
   <text x="${anchorX}" y="${y}" text-anchor="end" dominant-baseline="central" fill="var(--viz-ink-muted)" font-size="11">${esc(label)}</text>`;

/* --------------------------------------------------------- 1. Bar (ranking) */

export function barChart({ data, title, subtitle, format = idFmt, color = VIZ_SOLO, satuan = "", catatan }) {
  const W = 720, rowH = 30, padL = 168, padR = 92, padT = 6;
  const H = padT + data.length * rowH + 6;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const plotW = W - padL - padR;

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => `<line x1="${padL + plotW * t}" x2="${padL + plotW * t}" y1="${padT}" y2="${H - 6}" stroke="var(--viz-grid)" stroke-width="1"/>`)
    .join("");

  const bars = data
    .map((d, i) => {
      const w = (d.value / max) * plotW;
      const y = padT + i * rowH + 6;
      const h = rowH - 12;
      const nama = d.label.length > 26 ? `${d.label.slice(0, 25)}…` : d.label;
      return `<text x="${padL - 10}" y="${y + h / 2}" text-anchor="end" dominant-baseline="central" fill="var(--gf-fg)" font-size="12">${esc(nama)}</text>
      <path d="${barPathH(padL, y, Math.max(w, 2), h)}" fill="${color}"/>
      <text x="${padL + Math.max(w, 2) + 8}" y="${y + h / 2}" dominant-baseline="central" fill="var(--gf-fg)" font-size="12">${esc(format(d.value))}</text>`;
    })
    .join("");

  return frame({
    title,
    subtitle,
    catatan,
    body: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${grid}${bars}</svg>`,
    table: { head: ["Item", satuan || "Nilai"], rows: data.map((d) => [d.label, format(d.value)]) },
  });
}

/* ------------------------------------------------------ 2. Kolom (deret waktu) */

export function columnChart({ data, title, subtitle, format = idFmt, color = VIZ_SOLO, satuan = "", catatan, height = 240 }) {
  const W = 720, H = height, padL = 44, padR = 12, padT = 18, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.min(46, slot - 12);

  const grid = [0, 0.5, 1].map((t) => tick(padL, W - padR, padT + plotH * t, format(max * (1 - t)), padL - 8)).join("");

  const bars = data
    .map((d, i) => {
      const h = (d.value / max) * plotH;
      const x = padL + i * slot + (slot - barW) / 2;
      const y = padT + plotH - h;
      return `<path d="${barPathV(x, y, barW, Math.max(h, 2))}" fill="${color}"/>
      <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" fill="var(--gf-fg)" font-size="11">${d.value ? esc(format(d.value)) : ""}</text>
      <text x="${x + barW / 2}" y="${H - 9}" text-anchor="middle" fill="var(--viz-ink-muted)" font-size="11">${esc(d.label)}</text>`;
    })
    .join("");

  return frame({
    title,
    subtitle,
    catatan,
    body: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${grid}${bars}<line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" stroke="var(--viz-axis)" stroke-width="1"/></svg>`,
    table: { head: ["Periode", satuan || "Nilai"], rows: data.map((d) => [d.label, format(d.value)]) },
  });
}

/* ------------------------------------------------- 3. Kolom bertumpuk & berdampingan */

function kolomSeri({ data, keys, title, subtitle, colors, format = idFmt, catatan, height = 260, mode }) {
  const pal = colors ?? keys.map((_, i) => VIZ[i % VIZ.length]);
  const W = 720, H = height, padL = 48, padR = 12, padT = 16, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const totals = data.map((d) => keys.reduce((s, k) => s + (d.values[k] ?? 0), 0));
  const max = niceMax(
    mode === "stacked"
      ? Math.max(1, ...totals)
      : Math.max(1, ...data.flatMap((d) => keys.map((k) => d.values[k] ?? 0))),
  );
  const slot = plotW / Math.max(1, data.length);

  const grid = [0, 0.5, 1].map((t) => tick(padL, W - padR, padT + plotH * t, format(max * (1 - t)), padL - 8)).join("");

  const body = data
    .map((d, i) => {
      if (mode === "stacked") {
        const barW = Math.min(56, slot - 18);
        const x = padL + i * slot + (slot - barW) / 2;
        let acc = 0;
        const seg = keys
          .map((k, ki) => {
            const h = ((d.values[k] ?? 0) / max) * plotH;
            const y = padT + plotH - acc - h;
            acc += h;
            /* jeda 2px antar segmen tumpuk */
            return `<path d="${barPathV(x, y + 1, barW, Math.max(h - 2, 0), ki === keys.length - 1 ? 4 : 0)}" fill="${pal[ki]}"/>`;
          })
          .join("");
        return `${seg}<text x="${x + barW / 2}" y="${padT + plotH - acc - 6}" text-anchor="middle" fill="var(--gf-fg)" font-size="11">${totals[i] ? esc(format(totals[i])) : ""}</text>
        <text x="${x + barW / 2}" y="${H - 9}" text-anchor="middle" fill="var(--viz-ink-muted)" font-size="11">${esc(d.label)}</text>`;
      }

      const barW = Math.max(6, Math.min(28, (slot - 22) / keys.length - 2));
      const lebarGrup = keys.length * (barW + 2) - 2;
      const x0 = padL + i * slot + (slot - lebarGrup) / 2;
      const seg = keys
        .map((k, ki) => {
          const h = ((d.values[k] ?? 0) / max) * plotH;
          return `<path d="${barPathV(x0 + ki * (barW + 2), padT + plotH - h, barW, Math.max(h, 2))}" fill="${pal[ki]}"/>`;
        })
        .join("");
      return `${seg}<text x="${padL + i * slot + slot / 2}" y="${H - 9}" text-anchor="middle" fill="var(--viz-ink-muted)" font-size="11">${esc(d.label)}</text>`;
    })
    .join("");

  return frame({
    title,
    subtitle,
    catatan,
    legend: keys.map((k, i) => ({ label: k, color: pal[i] })),
    body: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${grid}${body}<line x1="${padL}" x2="${W - padR}" y1="${padT + plotH}" y2="${padT + plotH}" stroke="var(--viz-axis)" stroke-width="1"/></svg>`,
    table: {
      head: ["Kelompok", ...keys, ...(mode === "stacked" ? ["Total"] : [])],
      rows: data.map((d, i) => [
        d.label,
        ...keys.map((k) => format(d.values[k] ?? 0)),
        ...(mode === "stacked" ? [format(totals[i])] : []),
      ]),
    },
  });
}

export const stackedColumnChart = (opt) => kolomSeri({ ...opt, mode: "stacked" });
export const groupedColumnChart = (opt) => kolomSeri({ ...opt, mode: "grouped" });

/* ------------------------------------------------------- 4. Garis & area (tren) */

function trenPath(data, keys, { W, H, padL, padR, padT, padB, max }) {
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const px = (i) => padL + i * stepX;
  const py = (v) => padT + plotH - (v / max) * plotH;
  const garis = keys.map((k) => data.map((d, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(d.values[k] ?? 0)}`).join(" "));
  return { px, py, garis, plotH, plotW };
}

export function lineChart({ data, keys, title, subtitle, colors, format = idFmt, catatan, height = 260 }) {
  const pal = colors ?? keys.map((_, i) => VIZ[i % VIZ.length]);
  const dim = { W: 720, H: height, padL: 52, padR: 16, padT: 14, padB: 28 };
  const max = niceMax(Math.max(1, ...data.flatMap((d) => keys.map((k) => d.values[k] ?? 0))));
  const { px, garis, plotH } = trenPath(data, keys, { ...dim, max });

  const grid = [0, 0.5, 1].map((t) => tick(dim.padL, dim.W - dim.padR, dim.padT + plotH * t, format(max * (1 - t)), dim.padL - 8)).join("");
  const jalur = garis.map((d, i) => `<path d="${d}" fill="none" stroke="${pal[i]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
  const label = data.map((d, i) => `<text x="${px(i)}" y="${dim.H - 9}" text-anchor="middle" fill="var(--viz-ink-muted)" font-size="11">${esc(d.label)}</text>`).join("");

  return frame({
    title,
    subtitle,
    catatan,
    legend: keys.map((k, i) => ({ label: k, color: pal[i] })),
    body: `<svg viewBox="0 0 ${dim.W} ${dim.H}" role="img" aria-label="${esc(title)}">${grid}${jalur}${label}<line x1="${dim.padL}" x2="${dim.W - dim.padR}" y1="${dim.padT + plotH}" y2="${dim.padT + plotH}" stroke="var(--viz-axis)" stroke-width="1"/></svg>`,
    table: { head: ["Periode", ...keys], rows: data.map((d) => [d.label, ...keys.map((k) => format(d.values[k] ?? 0))]) },
  });
}

export function areaChart({ data, seriesKey, title, subtitle, color = VIZ_SOLO, format = idFmt, catatan, height = 220 }) {
  const dim = { W: 720, H: height, padL: 52, padR: 16, padT: 14, padB: 28 };
  const max = niceMax(Math.max(1, ...data.map((d) => d.values[seriesKey] ?? 0)));
  const { px, garis, plotH } = trenPath(data, [seriesKey], { ...dim, max });
  const gid = `gfa${Math.random().toString(36).slice(2, 8)}`;
  const area = `${garis[0]} L${px(data.length - 1)},${dim.padT + plotH} L${px(0)},${dim.padT + plotH} Z`;

  const grid = [0, 0.5, 1].map((t) => tick(dim.padL, dim.W - dim.padR, dim.padT + plotH * t, format(max * (1 - t)), dim.padL - 8)).join("");
  const label = data.map((d, i) => `<text x="${px(i)}" y="${dim.H - 9}" text-anchor="middle" fill="var(--viz-ink-muted)" font-size="11">${esc(d.label)}</text>`).join("");

  return frame({
    title,
    subtitle,
    catatan,
    body: `<svg viewBox="0 0 ${dim.W} ${dim.H}" role="img" aria-label="${esc(title)}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/><stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
      </linearGradient></defs>
      ${grid}<path d="${area}" fill="url(#${gid})"/><path d="${garis[0]}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${label}
      <line x1="${dim.padL}" x2="${dim.W - dim.padR}" y1="${dim.padT + plotH}" y2="${dim.padT + plotH}" stroke="var(--viz-axis)" stroke-width="1"/></svg>`,
    table: { head: ["Periode", seriesKey], rows: data.map((d) => [d.label, format(d.values[seriesKey] ?? 0)]) },
  });
}

/* ------------------------------------------------------------- 5. Donut */

export function donutChart({ data, title, subtitle, heroLabel = "total", format = idFmt, colors, catatan }) {
  const pal = colors ?? data.map((_, i) => VIZ[i % VIZ.length]);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = 200, c = size / 2, r = 78, stroke = 22, circ = 2 * Math.PI * r;
  let acc = 0;

  const arc = data
    .map((d, i) => {
      const frac = d.value / total;
      const len = Math.max(frac * circ - 2, 0); /* jeda 2px antar segmen */
      const el = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${pal[i]}" stroke-width="${stroke}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-acc * circ}"/>`;
      acc += frac;
      return el;
    })
    .join("");

  const daftar = data
    .map((d, i) => `<li><span class="gf-swatch" style="background:${pal[i]}"></span><span>${esc(d.label)}</span><span class="gf-muted">${esc(format(d.value))} · ${((d.value / total) * 100).toFixed(0)}%</span></li>`)
    .join("");

  return frame({
    title,
    subtitle,
    catatan,
    body: `<div class="gf-donut">
      <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(title)}">
        <g transform="rotate(-90 ${c} ${c})">${arc}</g>
        <text x="${c}" y="${c - 6}" text-anchor="middle" fill="var(--gf-fg)" font-size="26" font-weight="600">${esc(format(total))}</text>
        <text x="${c}" y="${c + 16}" text-anchor="middle" fill="var(--viz-ink-muted)" font-size="11">${esc(heroLabel)}</text>
      </svg>
      <ul class="gf-list">${daftar}</ul>
    </div>`,
    table: {
      head: ["Kelompok", "Jumlah", "%"],
      rows: data.map((d) => [d.label, format(d.value), `${((d.value / total) * 100).toFixed(1)}%`]),
    },
  });
}

/* ------------------------------------------- 6. Grafik jaringan (node-link) */

export function networkGraph({ nodes, edges, title, subtitle, groups, colors, height = 560, catatan }) {
  const W = 900, H = height;
  const pal = colors ?? groups.map((_, i) => VIZ[i % VIZ.length]);
  const warna = (g) => pal[Math.max(0, groups.indexOf(g)) % pal.length];

  const ditata = forceLayout(nodes, edges, { width: W, height: H, seed: 7 });
  const pos = new Map(ditata.map((d) => [d.id, d]));
  const jariJari = (d) => 3.2 + Math.min(Math.sqrt(d.degree) * 1.9, 9);

  const garis = edges
    .map((e) => {
      const a = pos.get(e.source), b = pos.get(e.target);
      if (!a || !b) return "";
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${warna(a.group)}" stroke-width="0.7" opacity="0.28"/>`;
    })
    .join("");

  const titik = ditata
    .map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${jariJari(d)}" fill="${warna(d.group)}" stroke="var(--gf-card)" stroke-width="1"><title>${esc(d.label)} · ${esc(d.group)} · ${d.degree} tautan</title></circle>`)
    .join("");

  const hub = [...ditata].sort((a, b) => b.degree - a.degree).slice(0, 10);
  const label = hub
    .map((d) => `<text x="${d.x}" y="${d.y - jariJari(d) - 6}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--gf-fg)" stroke="var(--gf-card)" stroke-width="3" paint-order="stroke">${esc(d.label.length > 20 ? d.label.slice(0, 19) + "…" : d.label)}</text>`)
    .join("");

  return frame({
    title,
    subtitle,
    catatan,
    legend: groups.map((g) => ({ label: g, color: warna(g) })),
    body: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}: ${nodes.length} simpul, ${edges.length} tautan">${garis}${titik}${label}</svg>
      <p class="gf-muted" style="margin:8px 0 0;font-size:11px">${nodes.length} simpul · ${edges.length} tautan</p>`,
    table: {
      head: ["Simpul", "Kelompok", "Tautan"],
      rows: hub.map((d) => [d.label, d.group, String(d.degree)]),
    },
  });
}

/* -------------------------------------------------- 7. Gauge, sparkline, meter */

export function gaugeArc({ value, target, label, satuan = "", color = VIZ_SOLO }) {
  const rasio = Math.max(0, Math.min(1, value / (target || 1)));
  const r = 62, cx = 90, cy = 84, busur = Math.PI * r;
  const d = `M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`;

  return `<div class="gf-card gf-gauge">
    <svg viewBox="0 0 180 108" role="img" aria-label="${esc(label)}: ${value} dari target ${target}">
      <path d="${d}" fill="none" stroke="var(--gf-track)" stroke-width="13" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round" stroke-dasharray="${busur * rasio} ${busur}"/>
      <text x="${cx}" y="${cy - 12}" text-anchor="middle" fill="var(--gf-fg)" font-size="26" font-weight="600">${Math.round(rasio * 100)}%</text>
      <text x="${cx}" y="${cy + 6}" text-anchor="middle" fill="var(--viz-ink-muted)" font-size="10">${esc(satuan)}</text>
    </svg>
    <p class="gf-gauge-label">${esc(label)}</p>
  </div>`;
}

export function sparkline({ values, color = VIZ[0] }) {
  if (values.length < 2) return "";
  const W = 96, H = 28;
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (values.length - 1)) * W},${H - ((v - min) / span) * (H - 4) - 2}`)
    .join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" class="gf-spark" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function meterBar({ value, target, label, color = VIZ_SOLO }) {
  const p = Math.min(100, Math.round((value / (target || 1)) * 100));
  return `<div class="gf-meter">
    <div class="gf-meter-head"><span class="gf-muted">${esc(label)}</span><span>${p}%</span></div>
    <div class="gf-meter-track"><div class="gf-meter-fill" style="width:${p}%;background:${color}"></div></div>
  </div>`;
}

/* ------------------------------------------------------------------ perilaku */

/** Mengaktifkan tombol "Tabel" pada seluruh kartu dalam sebuah wadah. */
export function aktifkanToggle(root = document) {
  root.querySelectorAll(".gf-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.target;
      const body = root.querySelector(`[data-body="${id}"]`);
      const tabel = root.querySelector(`[data-table="${id}"]`);
      const tampilTabel = body.hidden;
      body.hidden = !tampilTabel;
      tabel.hidden = tampilTabel;
      btn.textContent = tampilTabel ? "Tabel" : "Grafik";
      btn.setAttribute("aria-pressed", String(!tampilTabel));
    });
  });
}
