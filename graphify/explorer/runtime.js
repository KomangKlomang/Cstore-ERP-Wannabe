/**
 * Graphify Explorer — penjelajah knowledge graph interaktif.
 *
 * JavaScript polos tanpa impor apa pun, sama seperti `core.js`, supaya bisa
 * di-inline ke dalam satu berkas .html yang jalan lewat file:// tanpa server
 * dan tanpa internet.
 *
 * Yang membedakannya dari `network-graph.tsx` (versi React): berkas ini dibuat
 * untuk MENJELAJAH graf besar — pan, zoom, seret simpul, cari, sorot tetangga,
 * sembunyikan komunitas — sementara versi React dibuat untuk MEMBACA sekilas
 * di dalam halaman aplikasi.
 *
 * Digambar ke <canvas>, bukan SVG: pada 1.000+ simpul, satu elemen DOM per
 * simpul membuat peramban tersendat saat di-pan.
 */

/* ------------------------------------------------------------------ palet */

/**
 * Palet komunitas. Tableau 10 — dipilih karena antar-warnanya berjarak cukup
 * jauh sehingga tetap terbedakan meski simpulnya kecil-kecil.
 * @type {string[]}
 */
export const PALET_KOMUNITAS = [
  "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F",
  "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC",
];

/** Pembangkit acak berbenih — hasil deteksi & tata letak harus selalu sama. */
function acakBerbenih(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------- deteksi komunitas */

/**
 * Satu tingkat Louvain: pindahkan simpul ke komunitas tetangga selama
 * modularitas naik, sampai tidak ada perpindahan yang menguntungkan.
 *
 * @param {number} n jumlah simpul
 * @param {Array<[number, number, number]>} E daftar [a, b, bobot]
 * @returns {{com: Int32Array, jumlah: number}}
 */
function satuTingkatLouvain(n, E) {
  const adj = Array.from({ length: n }, () => []);
  const k = new Float64Array(n); // bobot tersambung per simpul
  let m2 = 0; // 2m — dua kali total bobot graf

  for (const [a, b, w] of E) {
    if (a === b) {
      adj[a].push([a, w]);
      k[a] += 2 * w;
      m2 += 2 * w;
    } else {
      adj[a].push([b, w]);
      adj[b].push([a, w]);
      k[a] += w;
      k[b] += w;
      m2 += 2 * w;
    }
  }
  if (m2 === 0) return { com: Int32Array.from({ length: n }, (_, i) => i), jumlah: n };

  const com = Int32Array.from({ length: n }, (_, i) => i);
  const total = Float64Array.from(k); // Σ_tot bobot tiap komunitas

  for (let pass = 0; pass < 24; pass++) {
    let berubah = 0;

    /* Urutan kunjungan tetap 0..n-1 — Louvain peka urutan, dan hasil yang
       reproducible lebih berharga di sini ketimbang modularitas terakhir. */
    for (let i = 0; i < n; i++) {
      const ci = com[i];
      const keKom = new Map();
      for (const [j, w] of adj[i]) {
        if (j === i) continue;
        keKom.set(com[j], (keKom.get(com[j]) ?? 0) + w);
      }

      /* keluarkan i dari komunitasnya dulu, baru timbang semua pilihan */
      total[ci] -= k[i];

      let terbaik = ci;
      let gainTerbaik = (keKom.get(ci) ?? 0) - (total[ci] * k[i]) / m2;

      for (const [c, w] of keKom) {
        const gain = w - (total[c] * k[i]) / m2;
        /* seri dimenangkan indeks terkecil, sekali lagi demi determinisme */
        if (gain > gainTerbaik + 1e-12 || (Math.abs(gain - gainTerbaik) <= 1e-12 && c < terbaik)) {
          gainTerbaik = gain;
          terbaik = c;
        }
      }

      total[terbaik] += k[i];
      if (terbaik !== ci) {
        com[i] = terbaik;
        berubah++;
      }
    }

    if (!berubah) break;
  }

  const peta = new Map();
  for (let i = 0; i < n; i++) if (!peta.has(com[i])) peta.set(com[i], peta.size);
  for (let i = 0; i < n; i++) com[i] = peta.get(com[i]);
  return { com, jumlah: peta.size };
}

/**
 * Deteksi komunitas dengan Louvain (optimasi modularitas berjenjang).
 *
 * Label propagation sempat dicoba dan gagal pada data ini: graf master data
 * didominasi hub — delapan principal menempel ke puluhan produk — sehingga
 * satu label menyapu hampir seluruh graf dan menyisakan dua komunitas saja.
 * Louvain menimbang untung-rugi tiap perpindahan terhadap modularitas, jadi
 * hub tidak otomatis menelan tetangganya.
 *
 * @param {Array<{id: string}>} nodes
 * @param {Array<{source: string, target: string}>} edges
 * @returns {number[]} indeks komunitas per simpul, 0 = komunitas terbesar
 */
export function deteksiKomunitas(nodes, edges) {
  const n = nodes.length;
  if (!n) return [];

  const idx = new Map(nodes.map((d, i) => [d.id, i]));

  /* Tautan ganda digabung jadi satu dengan bobot — Louvain menghitung bobot,
     dan ini juga memangkas kerja tiap tingkat. */
  const bobot = new Map();
  for (const e of edges) {
    const a = idx.get(e.source);
    const b = idx.get(e.target);
    if (a === undefined || b === undefined || a === b) continue;
    const kunci = a < b ? `${a}|${b}` : `${b}|${a}`;
    bobot.set(kunci, (bobot.get(kunci) ?? 0) + 1);
  }
  let E = [...bobot.entries()].map(([kunci, w]) => {
    const [a, b] = kunci.split("|");
    return [Number(a), Number(b), w];
  });

  let milik = Int32Array.from({ length: n }, (_, i) => i); // simpul → supernode
  let jumlahSimpul = n;

  for (let tingkat = 0; tingkat < 10; tingkat++) {
    const { com, jumlah } = satuTingkatLouvain(jumlahSimpul, E);
    for (let i = 0; i < n; i++) milik[i] = com[milik[i]];
    if (jumlah === jumlahSimpul) break; // sudah tidak bisa dipadatkan lagi

    /* Padatkan: tiap komunitas jadi satu simpul, bobot tautan dijumlahkan. */
    const gabung = new Map();
    for (const [a, b, w] of E) {
      const ca = com[a];
      const cb = com[b];
      const kunci = ca < cb ? `${ca}|${cb}` : `${cb}|${ca}`;
      gabung.set(kunci, (gabung.get(kunci) ?? 0) + w);
    }
    E = [...gabung.entries()].map(([kunci, w]) => {
      const [a, b] = kunci.split("|");
      return [Number(a), Number(b), w];
    });
    jumlahSimpul = jumlah;
  }

  /* Nomori ulang: komunitas terbesar jadi 0, supaya warna paling menonjol
     kebagian gugusan paling penting. */
  const ukuran = new Map();
  for (const l of milik) ukuran.set(l, (ukuran.get(l) ?? 0) + 1);
  const peta = new Map(
    [...ukuran.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([l], i) => [l, i]),
  );
  return [...milik].map((l) => peta.get(l));
}

/* ------------------------------------------------------------- lambung cembung */

/** Andrew monotone chain — pembungkus terluar sekumpulan titik. */
function lambungCembung(titik) {
  if (titik.length < 3) return titik;
  const p = [...titik].sort((a, b) => a.x - b.x || a.y - b.y);
  const silang = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const bawah = [];
  for (const t of p) {
    while (bawah.length >= 2 && silang(bawah[bawah.length - 2], bawah[bawah.length - 1], t) <= 0) bawah.pop();
    bawah.push(t);
  }
  const atas = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const t = p[i];
    while (atas.length >= 2 && silang(atas[atas.length - 2], atas[atas.length - 1], t) <= 0) atas.pop();
    atas.push(t);
  }
  bawah.pop();
  atas.pop();
  return bawah.concat(atas);
}

/* ----------------------------------------------------------------- utilitas */

/** Lolos-kan teks sebelum masuk innerHTML — label simpul berasal dari data. */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const angka = (n) => new Intl.NumberFormat("id-ID").format(Math.round(n));

/* ==================================================================== inti */

/**
 * Menyalakan penjelajah pada kerangka HTML yang sudah disiapkan build script.
 *
 * @param {{
 *   nodes: Array<{id: string, label: string, group: string, hint?: string}>,
 *   edges: Array<{source: string, target: string, kind?: string}>,
 *   hyperedges?: Array<{id: string, label: string, nodes: string[]}>,
 *   judul?: string,
 * }} DATA
 */
export function mulaiPenjelajah(DATA) {
  const nodes = DATA.nodes ?? [];
  const edges = DATA.edges ?? [];
  const hyper = DATA.hyperedges ?? [];

  const el = (id) => document.getElementById(id);
  const kanvas = el("gx-canvas");
  const ctx = kanvas.getContext("2d");

  if (!nodes.length) {
    el("gx-stats").textContent = "Graf kosong — tidak ada simpul untuk digambar.";
    return;
  }

  /* ------------------------------------------------------- siapkan struktur */

  const idx = new Map(nodes.map((d, i) => [d.id, i]));
  const komunitas = deteksiKomunitas(nodes, edges);

  /* Hanya tautan yang kedua ujungnya dikenal — data ekspor bisa saja terpotong. */
  const tautan = edges.filter((e) => idx.has(e.source) && idx.has(e.target));

  const derajat = new Int32Array(nodes.length);
  const tetanggaSet = nodes.map(() => new Set());
  for (const e of tautan) {
    const a = idx.get(e.source);
    const b = idx.get(e.target);
    derajat[a]++;
    derajat[b]++;
    tetanggaSet[a].add(b);
    tetanggaSet[b].add(a);
  }

  const kelompok = [...new Set(nodes.map((d) => d.group))];
  const jumlahKomunitas = new Set(komunitas).size;

  /* Warna: dua modus. Komunitas menjawab "mana gugusan yang rapat",
     entitas menjawab "apa jenis benda ini". Keduanya berguna. */
  let modusWarna = "komunitas";
  const warnaSimpul = (i) =>
    modusWarna === "komunitas"
      ? PALET_KOMUNITAS[komunitas[i] % PALET_KOMUNITAS.length]
      : PALET_KOMUNITAS[kelompok.indexOf(nodes[i].group) % PALET_KOMUNITAS.length];

  const kunciSimpul = (i) => (modusWarna === "komunitas" ? komunitas[i] : kelompok.indexOf(nodes[i].group));

  /* ------------------------------------------------------------ tata letak */

  const W = 2400;
  const H = 1600;
  const posX = new Float64Array(nodes.length);
  const posY = new Float64Array(nodes.length);

  hitungTataLetak();

  /**
   * Force-directed (Fruchterman–Reingold) dengan aproksimasi grid.
   *
   * Tolakan penuh antar semua pasangan simpul adalah O(n²) per iterasi — pada
   * 1.000 simpul itu sejuta perhitungan per putaran. Karena itu ruang dibagi
   * menjadi sel; simpul hanya menolak tetangga dalam radius sel terdekat, dan
   * gugusan jauh diwakili pusat massanya.
   */
  function hitungTataLetak() {
    const n = nodes.length;
    const rnd = acakBerbenih(7);
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      posX[i] = W / 2 + Math.cos(a) * (W / 3) * (0.35 + rnd() * 0.65);
      posY[i] = H / 2 + Math.sin(a) * (H / 3) * (0.35 + rnd() * 0.65);
    }

    const E = tautan.map((e) => [idx.get(e.source), idx.get(e.target)]);
    const k = Math.sqrt((W * H) / n) * 0.42;
    const iterasi = Math.max(140, Math.min(420, Math.round(70000 / n)));
    let suhu = W / 14;

    const sel = k * 2.2;
    const kolom = Math.max(1, Math.ceil(W / sel));
    const baris = Math.max(1, Math.ceil(H / sel));

    for (let s = 0; s < iterasi; s++) {
      dx.fill(0);
      dy.fill(0);

      /* Bagi simpul ke dalam sel, lalu hitung pusat massa tiap sel. */
      const isi = new Map();
      for (let i = 0; i < n; i++) {
        const cx = Math.min(kolom - 1, Math.max(0, Math.floor(posX[i] / sel)));
        const cy = Math.min(baris - 1, Math.max(0, Math.floor(posY[i] / sel)));
        const kunci = cy * kolom + cx;
        let d = isi.get(kunci);
        if (!d) isi.set(kunci, (d = { n: 0, x: 0, y: 0, anggota: [] }));
        d.n++;
        d.x += posX[i];
        d.y += posY[i];
        d.anggota.push(i);
      }
      for (const d of isi.values()) {
        d.x /= d.n;
        d.y /= d.n;
      }

      for (let i = 0; i < n; i++) {
        const cx = Math.min(kolom - 1, Math.max(0, Math.floor(posX[i] / sel)));
        const cy = Math.min(baris - 1, Math.max(0, Math.floor(posY[i] / sel)));

        for (const [kunci, d] of isi) {
          const gx = kunci % kolom;
          const gy = (kunci - gx) / kolom;
          const dekat = Math.abs(gx - cx) <= 1 && Math.abs(gy - cy) <= 1;

          if (dekat) {
            /* sel bertetangga: tolakan dihitung per simpul, presisi penuh */
            for (const j of d.anggota) {
              if (j === i) continue;
              let vx = posX[i] - posX[j];
              let vy = posY[i] - posY[j];
              let d2 = vx * vx + vy * vy;
              if (d2 < 0.01) {
                vx = (rnd() - 0.5) * 0.1;
                vy = (rnd() - 0.5) * 0.1;
                d2 = 0.01;
              }
              const f = (k * k) / d2;
              dx[i] += vx * f;
              dy[i] += vy * f;
            }
          } else {
            /* sel jauh: cukup diwakili pusat massanya, dikali jumlah anggota */
            let vx = posX[i] - d.x;
            let vy = posY[i] - d.y;
            let d2 = vx * vx + vy * vy;
            if (d2 < 1) d2 = 1;
            const f = ((k * k) / d2) * d.n;
            dx[i] += vx * f;
            dy[i] += vy * f;
          }
        }
      }

      for (const [a, b] of E) {
        const vx = posX[a] - posX[b];
        const vy = posY[a] - posY[b];
        const d = Math.sqrt(vx * vx + vy * vy) || 0.01;
        const f = d / k;
        dx[a] -= vx * f;
        dy[a] -= vy * f;
        dx[b] += vx * f;
        dy[b] += vy * f;
      }

      for (let i = 0; i < n; i++) {
        dx[i] += (W / 2 - posX[i]) * 0.05;
        dy[i] += (H / 2 - posY[i]) * 0.05;
      }

      for (let i = 0; i < n; i++) {
        const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
        const lim = Math.min(d, suhu);
        posX[i] = Math.max(20, Math.min(W - 20, posX[i] + (dx[i] / d) * lim));
        posY[i] = Math.max(20, Math.min(H - 20, posY[i] + (dy[i] / d) * lim));
      }
      suhu = Math.max(suhu * 0.975, 0.5);
    }
  }

  const jariJari = (i) => 4 + Math.min(Math.sqrt(derajat[i]) * 2.1, 14);

  /* --------------------------------------------------------------- keadaan */

  let skala = 1;
  let geserX = 0;
  let geserY = 0;
  let sorot = null; // simpul di bawah kursor
  let pilih = null; // simpul yang diklik
  const tersembunyi = new Set(); // kunci warna yang dimatikan
  let seret = null;
  let perluGambar = true;
  let tampilHyper = false;

  const terlihat = (i) => !tersembunyi.has(kunciSimpul(i));

  /* Sepuluh simpul paling terhubung diberi label permanen; sisanya hanya saat
     disorot. Kalau semua diberi label, teksnya saling menimpa dan tak terbaca. */
  const peringkat = [...nodes.keys()].sort((a, b) => derajat[b] - derajat[a]);
  const berlabel = new Set(peringkat.slice(0, 14));

  /* --------------------------------------------------------------- gambar */

  function ukuranUlang() {
    const dpr = window.devicePixelRatio || 1;
    const r = kanvas.getBoundingClientRect();
    kanvas.width = Math.round(r.width * dpr);
    kanvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    perluGambar = true;
  }

  function muatkan() {
    const r = kanvas.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (posX[i] < minX) minX = posX[i];
      if (posX[i] > maxX) maxX = posX[i];
      if (posY[i] < minY) minY = posY[i];
      if (posY[i] > maxY) maxY = posY[i];
    }
    const lebar = Math.max(maxX - minX, 1);
    const tinggi = Math.max(maxY - minY, 1);
    skala = Math.min(r.width / (lebar + 120), r.height / (tinggi + 120));
    geserX = r.width / 2 - ((minX + maxX) / 2) * skala;
    geserY = r.height / 2 - ((minY + maxY) / 2) * skala;
    perluGambar = true;
  }

  const keLayarX = (x) => x * skala + geserX;
  const keLayarY = (y) => y * skala + geserY;

  function gambar() {
    const r = kanvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);

    const tetanggaSorot = sorot !== null ? tetanggaSet[sorot] : null;
    const fokus = sorot ?? pilih;
    const setFokus = fokus !== null ? tetanggaSet[fokus] : null;
    const aktif = (i) => !setFokus || i === fokus || setFokus.has(i);

    /* --- wilayah hyperedge, digambar paling bawah sebagai latar ---
       Dimatikan secara baku: anggotanya tersebar, jadi lambungnya melebar
       menutupi hampir seluruh graf dan justru menyulitkan pembacaan. */
    if (tampilHyper) for (const h of hyper) {
      const titik = h.nodes
        .map((id) => idx.get(id))
        .filter((i) => i !== undefined && terlihat(i))
        .map((i) => ({ x: keLayarX(posX[i]), y: keLayarY(posY[i]) }));
      if (titik.length < 3) continue;

      const cx = titik.reduce((s, p) => s + p.x, 0) / titik.length;
      const cy = titik.reduce((s, p) => s + p.y, 0) / titik.length;
      const hull = lambungCembung(titik).map((p) => ({
        x: cx + (p.x - cx) * 1.18,
        y: cy + (p.y - cy) * 1.18,
      }));

      ctx.beginPath();
      ctx.moveTo(hull[0].x, hull[0].y);
      for (const p of hull.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fillStyle = "rgba(99,102,241,0.10)";
      ctx.fill();
      ctx.strokeStyle = "rgba(99,102,241,0.38)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(165,180,252,0.85)";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(h.label, cx, cy - 6);
    }

    /* --- tautan --- */
    ctx.lineWidth = 1;
    for (const e of tautan) {
      const a = idx.get(e.source);
      const b = idx.get(e.target);
      if (!terlihat(a) || !terlihat(b)) continue;

      const terang = !setFokus || (aktif(a) && aktif(b));
      ctx.strokeStyle = terang
        ? setFokus
          ? "rgba(200,205,225,0.55)"
          : "rgba(120,125,150,0.20)"
        : "rgba(120,125,150,0.05)";
      ctx.lineWidth = terang && setFokus ? 1.6 : 0.8;
      ctx.beginPath();
      ctx.moveTo(keLayarX(posX[a]), keLayarY(posY[a]));
      ctx.lineTo(keLayarX(posX[b]), keLayarY(posY[b]));
      ctx.stroke();
    }

    /* --- simpul --- */
    for (let i = 0; i < nodes.length; i++) {
      if (!terlihat(i)) continue;
      const on = aktif(i);
      const x = keLayarX(posX[i]);
      const y = keLayarY(posY[i]);
      const rad = jariJari(i) * Math.min(Math.max(skala, 0.55), 1.9);

      ctx.globalAlpha = on ? 1 : 0.16;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fillStyle = i === pilih ? "#ffffff" : warnaSimpul(i);
      ctx.fill();
      ctx.lineWidth = i === pilih ? 2.5 : 1;
      ctx.strokeStyle = i === pilih ? warnaSimpul(i) : "rgba(15,15,26,0.9)";
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* --- label ---
       Label yang bertumpuk lebih buruk daripada tidak ada label sama sekali,
       jadi tiap teks dicek dulu terhadap kotak yang sudah tergambar. Simpul
       paling terhubung didahulukan supaya yang penting yang menang. */
    ctx.textAlign = "center";
    ctx.font = "600 11px system-ui, sans-serif";

    const kotak = [];
    const bentrok = (a) =>
      kotak.some((b) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2));

    const kandidat = [];
    for (let i = 0; i < nodes.length; i++) {
      if (!terlihat(i)) continue;
      const wajib = i === sorot || i === pilih;
      const diminta = berlabel.has(i) || (tetanggaSorot && tetanggaSorot.has(i));
      if (wajib || diminta) kandidat.push({ i, wajib });
    }
    kandidat.sort((a, b) => Number(b.wajib) - Number(a.wajib) || derajat[b.i] - derajat[a.i]);

    for (const { i, wajib } of kandidat) {
      const t = nodes[i].label.length > 26 ? `${nodes[i].label.slice(0, 25)}…` : nodes[i].label;
      const lebar = ctx.measureText(t).width;
      const x = keLayarX(posX[i]);
      const y = keLayarY(posY[i]) - jariJari(i) * Math.min(Math.max(skala, 0.55), 1.9) - 7;
      const k = { x1: x - lebar / 2 - 3, x2: x + lebar / 2 + 3, y1: y - 11, y2: y + 3 };

      /* simpul yang sedang disorot/dipilih selalu berlabel — itu jawaban atas
         tindakan pengguna barusan, tidak boleh dikalahkan label lain */
      if (!wajib && bentrok(k)) continue;
      kotak.push(k);

      ctx.globalAlpha = aktif(i) ? 1 : 0.15;
      /* garis tebal sewarna latar dulu, baru teksnya — supaya tetap terbaca
         walau melintas di atas tautan yang padat */
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "#0f0f1a";
      ctx.strokeText(t, x, y);
      ctx.fillStyle = "#e8e8f0";
      ctx.fillText(t, x, y);
      ctx.globalAlpha = 1;
    }
  }

  function putar() {
    if (perluGambar) {
      gambar();
      perluGambar = false;
    }
    requestAnimationFrame(putar);
  }

  /* ------------------------------------------------------------ interaksi */

  function simpulDi(sx, sy) {
    let terdekat = null;
    let jarakTerbaik = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (!terlihat(i)) continue;
      const dx = keLayarX(posX[i]) - sx;
      const dy = keLayarY(posY[i]) - sy;
      const d2 = dx * dx + dy * dy;
      const r = jariJari(i) * Math.min(Math.max(skala, 0.55), 1.9) + 4;
      if (d2 <= r * r && d2 < jarakTerbaik) {
        jarakTerbaik = d2;
        terdekat = i;
      }
    }
    return terdekat;
  }

  kanvas.addEventListener("mousedown", (ev) => {
    const r = kanvas.getBoundingClientRect();
    const sx = ev.clientX - r.left;
    const sy = ev.clientY - r.top;
    const i = simpulDi(sx, sy);
    seret = i !== null
      ? { jenis: "simpul", i, sx, sy, geser: false }
      : { jenis: "panggung", sx, sy, x0: geserX, y0: geserY, geser: false };
  });

  window.addEventListener("mousemove", (ev) => {
    const r = kanvas.getBoundingClientRect();
    const sx = ev.clientX - r.left;
    const sy = ev.clientY - r.top;

    if (seret) {
      if (Math.abs(sx - seret.sx) + Math.abs(sy - seret.sy) > 3) seret.geser = true;
      if (seret.jenis === "simpul") {
        posX[seret.i] = (sx - geserX) / skala;
        posY[seret.i] = (sy - geserY) / skala;
      } else {
        geserX = seret.x0 + (sx - seret.sx);
        geserY = seret.y0 + (sy - seret.sy);
      }
      perluGambar = true;
      return;
    }

    if (sx < 0 || sy < 0 || sx > r.width || sy > r.height) return;
    const i = simpulDi(sx, sy);
    if (i !== sorot) {
      sorot = i;
      kanvas.style.cursor = i === null ? "grab" : "pointer";
      perluGambar = true;
    }
    tampilkanTooltip(i, sx, sy);
  });

  window.addEventListener("mouseup", () => {
    if (seret && !seret.geser && seret.jenis === "simpul") pilihSimpul(seret.i);
    if (seret && !seret.geser && seret.jenis === "panggung") pilihSimpul(null);
    seret = null;
  });

  kanvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const r = kanvas.getBoundingClientRect();
    const sx = ev.clientX - r.left;
    const sy = ev.clientY - r.top;
    const faktor = Math.exp(-ev.deltaY * 0.0016);
    const baru = Math.max(0.08, Math.min(6, skala * faktor));
    /* jangkar zoom di posisi kursor, bukan di tengah kanvas */
    geserX = sx - ((sx - geserX) / skala) * baru;
    geserY = sy - ((sy - geserY) / skala) * baru;
    skala = baru;
    perluGambar = true;
  }, { passive: false });

  const tooltip = el("gx-tip");
  function tampilkanTooltip(i, sx, sy) {
    if (i === null) {
      tooltip.style.display = "none";
      return;
    }
    tooltip.style.display = "block";
    tooltip.style.left = `${sx + 14}px`;
    tooltip.style.top = `${sy + 14}px`;
    tooltip.innerHTML =
      `<b>${esc(nodes[i].label)}</b><br>${esc(nodes[i].group)} · ${derajat[i]} tautan`;
  }

  /* --------------------------------------------------------- panel & kontrol */

  function pilihSimpul(i) {
    pilih = i;
    perluGambar = true;
    const isi = el("gx-info");

    if (i === null) {
      isi.innerHTML = '<span class="gx-kosong">Klik sebuah simpul untuk memeriksanya</span>';
      return;
    }

    const d = nodes[i];
    const daftar = [...tetanggaSet[i]]
      .sort((a, b) => derajat[b] - derajat[a])
      .map((j) => {
        const rel = tautan.find(
          (e) =>
            (idx.get(e.source) === i && idx.get(e.target) === j) ||
            (idx.get(e.target) === i && idx.get(e.source) === j),
        );
        return `<span class="gx-tetangga" style="border-left-color:${warnaSimpul(j)}" data-i="${j}">
          ${esc(nodes[j].label)}<em>${esc(rel?.kind ?? "terhubung")}</em></span>`;
      })
      .join("");

    isi.innerHTML = `
      <div class="gx-judul-simpul">
        <span class="gx-titik" style="background:${warnaSimpul(i)}"></span>${esc(d.label)}
      </div>
      <div class="gx-baris"><span>Entitas</span><b>${esc(d.group)}</b></div>
      <div class="gx-baris"><span>Komunitas</span><b>#${komunitas[i]}</b></div>
      <div class="gx-baris"><span>Tautan</span><b>${derajat[i]}</b></div>
      ${d.hint ? `<div class="gx-baris"><span>Catatan</span><b>${esc(d.hint)}</b></div>` : ""}
      ${daftar ? `<div class="gx-sub">Tetangga (${tetanggaSet[i].size})</div><div class="gx-daftar">${daftar}</div>` : ""}
    `;

    isi.querySelectorAll(".gx-tetangga").forEach((n) =>
      n.addEventListener("click", () => sorotiSimpul(Number(n.dataset.i))),
    );
  }

  /** Meluncur halus ke satu simpul — lompatan mendadak bikin kehilangan konteks. */
  function sorotiSimpul(i) {
    const r = kanvas.getBoundingClientRect();
    const skalaTujuan = Math.max(skala, 1.1);
    const xTujuan = r.width / 2 - posX[i] * skalaTujuan;
    const yTujuan = r.height / 2 - posY[i] * skalaTujuan;
    const s0 = skala, x0 = geserX, y0 = geserY;
    const mulai = performance.now();

    (function langkah(t) {
      const p = Math.min((t - mulai) / 420, 1);
      const e = 1 - Math.pow(1 - p, 3);
      skala = s0 + (skalaTujuan - s0) * e;
      geserX = x0 + (xTujuan - x0) * e;
      geserY = y0 + (yTujuan - y0) * e;
      perluGambar = true;
      if (p < 1) requestAnimationFrame(langkah);
    })(mulai);

    pilihSimpul(i);
  }

  /* ------------------------------------------------------------- pencarian */

  const cari = el("gx-cari");
  const hasil = el("gx-hasil");

  cari.addEventListener("input", () => {
    const q = cari.value.trim().toLowerCase();
    hasil.innerHTML = "";
    if (!q) {
      hasil.style.display = "none";
      return;
    }
    const cocok = nodes
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.label.toLowerCase().includes(q))
      .sort((a, b) => derajat[b.i] - derajat[a.i])
      .slice(0, 24);

    if (!cocok.length) {
      hasil.style.display = "block";
      hasil.innerHTML = '<div class="gx-kosong" style="padding:6px">Tidak ada yang cocok</div>';
      return;
    }
    hasil.style.display = "block";
    hasil.innerHTML = cocok
      .map(
        ({ d, i }) =>
          `<div class="gx-hasil-item" style="border-left-color:${warnaSimpul(i)}" data-i="${i}">
             ${esc(d.label)}<em>${esc(d.group)}</em></div>`,
      )
      .join("");
    hasil.querySelectorAll(".gx-hasil-item").forEach((n) =>
      n.addEventListener("click", () => {
        sorotiSimpul(Number(n.dataset.i));
        hasil.style.display = "none";
        cari.value = "";
      }),
    );
  });

  document.addEventListener("click", (ev) => {
    if (!hasil.contains(ev.target) && ev.target !== cari) hasil.style.display = "none";
  });

  /* --------------------------------------------------------------- legenda */

  const legenda = el("gx-legenda");
  const semua = el("gx-semua");

  function daftarKunci() {
    const m = new Map();
    for (let i = 0; i < nodes.length; i++) {
      const k = kunciSimpul(i);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  }

  function gambarLegenda() {
    legenda.innerHTML = "";
    for (const [k, n] of daftarKunci()) {
      const nama = modusWarna === "komunitas" ? `Komunitas ${k}` : kelompok[k];
      const baris = document.createElement("label");
      baris.className = `gx-legenda-item${tersembunyi.has(k) ? " gx-redup" : ""}`;
      baris.innerHTML = `
        <input type="checkbox" class="gx-cb" ${tersembunyi.has(k) ? "" : "checked"}>
        <span class="gx-titik" style="background:${PALET_KOMUNITAS[k % PALET_KOMUNITAS.length]}"></span>
        <span class="gx-legenda-label">${esc(nama)}</span>
        <span class="gx-legenda-n">${angka(n)}</span>`;
      baris.querySelector("input").addEventListener("change", (ev) => {
        if (ev.target.checked) {
          tersembunyi.delete(k);
          baris.classList.remove("gx-redup");
        } else {
          tersembunyi.add(k);
          baris.classList.add("gx-redup");
        }
        perbaruiSemua();
        perluGambar = true;
      });
      legenda.appendChild(baris);
    }
    perbaruiSemua();
  }

  function perbaruiSemua() {
    const total = daftarKunci().length;
    semua.checked = tersembunyi.size === 0;
    semua.indeterminate = tersembunyi.size > 0 && tersembunyi.size < total;
  }

  semua.addEventListener("change", () => {
    const sembunyikan = !semua.checked;
    tersembunyi.clear();
    if (sembunyikan) for (const [k] of daftarKunci()) tersembunyi.add(k);
    gambarLegenda();
    perluGambar = true;
  });

  el("gx-modus").addEventListener("click", (ev) => {
    modusWarna = modusWarna === "komunitas" ? "entitas" : "komunitas";
    tersembunyi.clear();
    ev.currentTarget.textContent = modusWarna === "komunitas" ? "Warna: Komunitas" : "Warna: Entitas";
    el("gx-legenda-judul").textContent = modusWarna === "komunitas" ? "Komunitas" : "Entitas";
    gambarLegenda();
    if (pilih !== null) pilihSimpul(pilih);
    perluGambar = true;
  });

  el("gx-muat").addEventListener("click", muatkan);

  const tombolHyper = el("gx-hyper");
  if (!hyper.length) {
    tombolHyper.style.display = "none";
  } else {
    tombolHyper.textContent = `Sorotan alur (${hyper.length})`;
    tombolHyper.addEventListener("click", () => {
      tampilHyper = !tampilHyper;
      tombolHyper.classList.toggle("gx-btn-aktif", tampilHyper);
      perluGambar = true;
    });
  }

  /* ----------------------------------------------------------------- mulai */

  window.addEventListener("resize", () => {
    ukuranUlang();
  });

  el("gx-stats").textContent =
    `${angka(nodes.length)} simpul · ${angka(tautan.length)} tautan · ${jumlahKomunitas} komunitas`;
  if (DATA.judul) el("gx-judul").textContent = DATA.judul;

  gambarLegenda();
  pilihSimpul(null);
  ukuranUlang();
  muatkan();
  putar();
}
