import type { GraphEdge, GraphNode } from "@/graphify";
import type { Collections } from "@/lib/store";

/**
 * Knowledge graph master data.
 *
 * Mengubah isi basis data menjadi kumpulan simpul + tautan berlabel, supaya
 * relasi antar entitas terlihat sebagai satu peta — dan bisa diekspor dalam
 * bentuk yang gampang dicerna mesin (JSON / Graphviz DOT / ringkasan Markdown).
 */

export const JENIS_SIMPUL = [
  "PRINCIPAL",
  "PRODUK",
  "KATEGORI",
  "TOKO",
  "KONTRAK",
  "ASET",
  "PROMOSI",
] as const;
export type JenisSimpul = (typeof JENIS_SIMPUL)[number];

export interface Graf {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface OpsiGraf {
  /** Jenis simpul yang ikut dipetakan. */
  jenis?: JenisSimpul[];
  /** Batas jumlah produk & aset agar peta tetap terbaca. */
  batasProduk?: number;
  batasAset?: number;
}

export function bangunGraf(db: Collections, opsi: OpsiGraf = {}): Graf {
  const aktif = new Set<JenisSimpul>(opsi.jenis ?? [...JENIS_SIMPUL]);
  const batasProduk = opsi.batasProduk ?? 60;
  const batasAset = opsi.batasAset ?? 40;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const ada = new Set<string>();

  const tambah = (n: GraphNode) => {
    if (ada.has(n.id)) return;
    ada.add(n.id);
    nodes.push(n);
  };
  const sambung = (source: string, target: string, kind: string) => {
    if (!ada.has(source) || !ada.has(target)) return;
    edges.push({ source, target, kind });
  };

  /* ------------------------------------------------------------- simpul */

  if (aktif.has("PRINCIPAL"))
    db.principals.forEach((p) =>
      tambah({ id: `prn:${p.id}`, label: p.nama.replace(/^PT\s+/, ""), group: "PRINCIPAL", hint: p.kode }),
    );

  if (aktif.has("KATEGORI"))
    db.categories.forEach((c) =>
      tambah({
        id: `kat:${c.id}`,
        label: c.subCategory,
        group: "KATEGORI",
        hint: `${c.subCategoryCode} · ${c.dept}`,
      }),
    );

  const produk = db.products.slice(0, batasProduk);
  if (aktif.has("PRODUK"))
    produk.forEach((p) =>
      tambah({ id: `prd:${p.id}`, label: p.namaProduct, group: "PRODUK", hint: p.kodeProduct }),
    );

  if (aktif.has("TOKO"))
    db.stores.forEach((s) =>
      tambah({
        id: `tok:${s.storeCode}`,
        label: s.storeName.replace(/^C-Store\s+/, ""),
        group: "TOKO",
        hint: `${s.storeCode} · ${s.region}`,
      }),
    );

  if (aktif.has("KONTRAK"))
    db.kontrak.forEach((k) =>
      tambah({ id: `ktr:${k.id}`, label: k.judul, group: "KONTRAK", hint: `${k.nomorSurat} · ${k.jenis}` }),
    );

  const aset = db.aset.slice(0, batasAset);
  if (aktif.has("ASET"))
    aset.forEach((a) => tambah({ id: `ast:${a.id}`, label: a.kodeAset, group: "ASET", hint: a.jenis }));

  if (aktif.has("PROMOSI"))
    db.promosi.forEach((p) =>
      tambah({ id: `pro:${p.id}`, label: p.nama, group: "PROMOSI", hint: p.kodePromo }),
    );

  /* ------------------------------------------------------------- tautan */

  produk.forEach((p) => {
    sambung(`prd:${p.id}`, `prn:${p.principalId}`, "dipasok oleh");
    sambung(`prd:${p.id}`, `kat:${p.categoryId}`, "berkategori");
  });

  db.kontrak.forEach((k) => {
    sambung(`ktr:${k.id}`, `prn:${k.principalId}`, "dengan principal");
    k.storeCodes.forEach((code) => sambung(`ktr:${k.id}`, `tok:${code}`, "mencakup toko"));
  });

  aset.forEach((a) => {
    sambung(`ast:${a.id}`, `tok:${a.storeCode}`, "terpasang di");
    sambung(`ast:${a.id}`, `prn:${a.principalId}`, "milik principal");
    if (a.kontrakId) sambung(`ast:${a.id}`, `ktr:${a.kontrakId}`, "dari kontrak");
  });

  db.promosi.forEach((p) => {
    sambung(`pro:${p.id}`, `prn:${p.principalId}`, "dengan principal");
    p.pluIds.forEach((id) => sambung(`pro:${p.id}`, `prd:${id}`, "berisi PLU"));
  });

  /* Simpul tanpa tautan hanya menambah keramaian — buang. */
  const terpakai = new Set(edges.flatMap((e) => [e.source, e.target]));
  return { nodes: nodes.filter((n) => terpakai.has(n.id)), edges };
}

/* ------------------------------------------------------------- ekspor */

/** Node/edge list — format paling umum untuk dibaca program & model bahasa. */
export function keJSON(g: Graf): string {
  return JSON.stringify(
    {
      format: "node-link",
      dibuat: new Date().toISOString(),
      jumlah: { simpul: g.nodes.length, tautan: g.edges.length },
      nodes: g.nodes.map((n) => ({ id: n.id, label: n.label, type: n.group, note: n.hint })),
      edges: g.edges.map((e) => ({ source: e.source, target: e.target, relation: e.kind })),
    },
    null,
    2,
  );
}

/** Graphviz DOT — bisa langsung dirender Graphviz/Mermaid-like tooling. */
export function keDOT(g: Graf): string {
  const aman = (s: string) => s.replace(/"/g, '\\"');
  const baris = [
    "digraph MasterData {",
    "  graph [overlap=false, splines=true, bgcolor=transparent];",
    '  node  [shape=ellipse, fontname="Segoe UI", fontsize=10];',
    '  edge  [fontname="Segoe UI", fontsize=8, color="#888888"];',
    "",
  ];
  g.nodes.forEach((n) => baris.push(`  "${aman(n.id)}" [label="${aman(n.label)}", group="${aman(n.group)}"];`));
  baris.push("");
  g.edges.forEach((e) =>
    baris.push(`  "${aman(e.source)}" -> "${aman(e.target)}" [label="${aman(e.kind ?? "")}"];`),
  );
  baris.push("}");
  return baris.join("\n");
}

/**
 * Ringkasan Markdown — bentuk paling enak dibaca model bahasa: skema relasi
 * beserta hitungannya, bukan ribuan baris data mentah.
 */
export function keRingkasan(g: Graf): string {
  const perJenis = new Map<string, number>();
  g.nodes.forEach((n) => perJenis.set(n.group, (perJenis.get(n.group) ?? 0) + 1));

  const perRelasi = new Map<string, { n: number; dari: string; ke: string }>();
  const tipe = new Map(g.nodes.map((n) => [n.id, n.group]));
  g.edges.forEach((e) => {
    const kunci = e.kind ?? "terhubung";
    const cur = perRelasi.get(kunci) ?? { n: 0, dari: tipe.get(e.source) ?? "?", ke: tipe.get(e.target) ?? "?" };
    cur.n += 1;
    perRelasi.set(kunci, cur);
  });

  const derajat = new Map<string, number>();
  g.edges.forEach((e) => {
    derajat.set(e.source, (derajat.get(e.source) ?? 0) + 1);
    derajat.set(e.target, (derajat.get(e.target) ?? 0) + 1);
  });
  const pusat = [...g.nodes]
    .map((n) => ({ n, d: derajat.get(n.id) ?? 0 }))
    .sort((a, b) => b.d - a.d)
    .slice(0, 10);

  return [
    "# Peta relasi master data — ERP Wanna Be",
    "",
    `Total ${g.nodes.length} simpul dan ${g.edges.length} tautan.`,
    "",
    "## Jenis entitas",
    "",
    "| Entitas | Jumlah |",
    "|---|---|",
    ...[...perJenis.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Jenis relasi",
    "",
    "| Relasi | Dari | Ke | Jumlah |",
    "|---|---|---|---|",
    ...[...perRelasi.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .map(([k, v]) => `| ${k} | ${v.dari} | ${v.ke} | ${v.n} |`),
    "",
    "## Simpul paling terhubung",
    "",
    "| Simpul | Entitas | Tautan |",
    "|---|---|---|",
    ...pusat.map((p) => `| ${p.n.label} | ${p.n.group} | ${p.d} |`),
    "",
  ].join("\n");
}

/**
 * Unduh penjelajah graf berisi data saat ini sebagai satu berkas .html.
 *
 * Kerangkanya diambil dari `/graph.html` — berkas yang dirakit
 * `npm run graphify:graph` dan sudah memuat seluruh mesin grafnya secara
 * inline. Di sini isinya cukup ditukar pada blok bertanda GRAPHIFY:DATA,
 * sehingga hasil unduhannya tetap satu berkas mandiri: bisa dikirim ke siapa
 * pun, dibuka dengan klik dua kali, tanpa server dan tanpa internet.
 */
export async function unduhPenjelajah(g: Graf, judul = "Peta relasi master data") {
  const res = await fetch("/graph.html");
  if (!res.ok) throw new Error(`Kerangka graph.html tidak ditemukan (${res.status}).`);
  const kerangka = await res.text();

  const data = JSON.stringify({
    judul,
    nodes: g.nodes.map((n) => ({ id: n.id, label: n.label, group: n.group, hint: n.hint })),
    edges: g.edges.map((e) => ({ source: e.source, target: e.target, kind: e.kind })),
    hyperedges: [],
  });

  const penanda = /\/\* <GRAPHIFY:DATA> \*\/[\s\S]*?\/\* <\/GRAPHIFY:DATA> \*\//;
  if (!penanda.test(kerangka)) throw new Error("Penanda data tidak ditemukan di graph.html.");

  /* Pengganti berupa fungsi, bukan string: data bisa memuat `$&` atau `$1`
     yang akan ditafsirkan sebagai rujukan tangkapan kalau dioper langsung. */
  const isi = kerangka.replace(
    penanda,
    () => `/* <GRAPHIFY:DATA> */\nconst DATA = ${data};\n/* </GRAPHIFY:DATA> */`,
  );

  unduhTeks(isi, "peta-relasi.html", "text/html");
}

/** Unduh teks sebagai berkas — dipakai tombol ekspor di halaman peta relasi. */
export function unduhTeks(isi: string, namaBerkas: string, mime = "text/plain") {
  const blob = new Blob([isi], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaBerkas;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
