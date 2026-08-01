/**
 * Data contoh untuk graph.html mandiri.
 *
 * Bentuknya sengaja dibuat identik dengan keluaran `bangunGraf()` di
 * `lib/graph.ts` — `{ nodes: [{id,label,group,hint}], edges: [{source,target,kind}] }`
 * — supaya berkas .html ini bisa diisi ulang dengan data asli dari aplikasi
 * lewat tombol "Unduh graph.html" di halaman Peta Relasi tanpa mengubah kode
 * apa pun di sini.
 *
 * Angkanya karangan, tapi strukturnya nyata: principal memasok produk, produk
 * masuk kategori, kontrak mengikat principal ke sekumpulan toko, aset menempel
 * di toko dan tercatat milik principal.
 */

const principal = [
  ["SNU", "Sampoerna Niaga Utama"],
  ["KTG", "KT&G Indonesia"],
  ["OXV", "OXVA Indonesia"],
  ["VPR", "Vaporesso Nusantara"],
  ["DJR", "Djarum Trade Partner"],
  ["GGD", "Gudang Garam Distribusi"],
  ["TKI", "Tokai Lighter Indonesia"],
  ["BRI", "Beverage Ritel Indonesia"],
];

const kategori = [
  ["111A", "POD SYSTEM"],
  ["112A", "MOD KIT"],
  ["121A", "LIQUID FREEBASE"],
  ["122A", "CARTRIDGE CLOSE SYSTEM"],
  ["131A", "COIL & OCC"],
  ["132A", "BATERAI & CHARGER"],
  ["141A", "SIGARET KRETEK MESIN"],
  ["142A", "SIGARET PUTIH MESIN"],
  ["151A", "HEATED TOBACCO"],
  ["161A", "KOREK & AKSESORIS"],
  ["171A", "MINUMAN SIAP SAJI"],
  ["181A", "SNACK & CONFECTIONERY"],
];

const wilayah = [
  ["JBTK", ["Kemang", "Tebet", "Kelapa Gading", "BSD Serpong", "Bintaro", "Cibubur"]],
  ["BDG", ["Dago", "Riau", "Setiabudi", "Buah Batu"]],
  ["SMG", ["Pandanaran", "Tembalang", "Banyumanik"]],
  ["SBY", ["Gubeng", "Darmo", "Rungkut", "Manyar"]],
  ["SRG", ["Solo Slamet Riyadi", "Jogja Malioboro", "Jogja Seturan"]],
  ["BLI", ["Denpasar Renon", "Kuta", "Ubud", "Canggu"]],
];

const jenisAset = ["Chiller", "Akrilik Display", "Lollipop Sign", "Header Rak", "Lightbox", "Tester Stand"];
const jenisKontrak = ["Sewa Display", "Konsinyasi", "Branding Toko", "Program Promosi"];

/** Pembangkit acak berbenih — dataset harus sama persis tiap kali dibangun. */
function acak(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bangunDataContoh() {
  const rnd = acak(20260802);
  const ambil = (arr) => arr[Math.floor(rnd() * arr.length)];

  const nodes = [];
  const edges = [];
  const tambah = (n) => nodes.push(n);
  const sambung = (source, target, kind) => edges.push({ source, target, kind });

  principal.forEach(([kode, nama]) => tambah({ id: `prn:${kode}`, label: nama, group: "PRINCIPAL", hint: kode }));
  kategori.forEach(([kode, nama]) =>
    tambah({ id: `kat:${kode}`, label: nama, group: "KATEGORI", hint: `${kode} · MASTER CAT` }),
  );

  const toko = [];
  wilayah.forEach(([region, daftar]) =>
    daftar.forEach((nama, i) => {
      const kode = `${region}${String(i + 1).padStart(2, "0")}`;
      toko.push(kode);
      tambah({ id: `tok:${kode}`, label: nama, group: "TOKO", hint: `${kode} · ${region}` });
    }),
  );

  /* Produk menautkan principal ke kategori — inilah yang membentuk gugusan. */
  const produk = [];
  for (let i = 0; i < 90; i++) {
    const [pk] = principal[i % principal.length];
    /* pergeseran tak sejajar supaya principal tidak selalu jatuh ke kategori sama */
    const [kk, knama] = kategori[(i * 5 + Math.floor(i / principal.length)) % kategori.length];
    const id = `prd:${1001 + i}`;
    produk.push(id);
    tambah({
      id,
      label: `${knama.split(" ")[0]} ${String.fromCharCode(65 + (i % 26))}${100 + i}`,
      group: "PRODUK",
      hint: `PLU ${11}${String(2000 + i)}`,
    });
    sambung(id, `prn:${pk}`, "dipasok oleh");
    sambung(id, `kat:${kk}`, "berkategori");
  }

  /* Kontrak: satu principal, beberapa toko. */
  const kontrak = [];
  for (let i = 0; i < 14; i++) {
    const [pk, pnama] = principal[i % principal.length];
    const jenis = jenisKontrak[i % jenisKontrak.length];
    const id = `ktr:K${String(i + 1).padStart(3, "0")}`;
    kontrak.push(id);
    tambah({
      id,
      label: `${jenis} — ${pnama.split(" ")[0]}`,
      group: "KONTRAK",
      hint: `SPK/${2026}/${String(i + 1).padStart(3, "0")} · ${jenis}`,
    });
    sambung(id, `prn:${pk}`, "dengan principal");
    toko
      .filter((_, j) => (j + i * 3) % 5 === 0)
      .forEach((kode) => sambung(id, `tok:${kode}`, "mencakup toko"));
  }

  /* Aset menempel di toko, dimiliki principal, sebagian terikat kontrak. */
  for (let i = 0; i < 34; i++) {
    const [pk] = principal[i % principal.length];
    const kode = toko[(i * 7) % toko.length];
    const id = `ast:A${String(i + 1).padStart(3, "0")}`;
    const jenis = jenisAset[i % jenisAset.length];
    tambah({ id, label: `${jenis} #${i + 1}`, group: "ASET", hint: jenis });
    sambung(id, `tok:${kode}`, "terpasang di");
    sambung(id, `prn:${pk}`, "milik principal");
    if (i % 3 === 0) sambung(id, kontrak[i % kontrak.length], "dari kontrak");
  }

  /* Promosi mengikat principal dengan beberapa PLU produknya. */
  for (let i = 0; i < 9; i++) {
    const [pk, pnama] = principal[i % principal.length];
    const id = `pro:P${String(i + 1).padStart(3, "0")}`;
    tambah({
      id,
      label: `Promo ${["Beli 2 Gratis 1", "Diskon Bundling", "Cashback Member", "Free Gift"][i % 4]} ${pnama.split(" ")[0]}`,
      group: "PROMOSI",
      hint: `PRM-2026-${String(i + 1).padStart(3, "0")}`,
    });
    sambung(id, `prn:${pk}`, "dengan principal");
    produk
      .filter((_, j) => j % principal.length === i % principal.length && j % 4 === 0)
      .slice(0, 5)
      .forEach((p) => sambung(id, p, "berisi PLU"));
  }

  /* Buang simpul yatim — hanya menambah keramaian tanpa memberi informasi. */
  const terpakai = new Set(edges.flatMap((e) => [e.source, e.target]));

  /**
   * Hyperedge — relasi yang melibatkan LEBIH dari dua simpul sekaligus, jadi
   * tidak bisa digambar sebagai garis. Digambar sebagai wilayah berarsir.
   */
  const hyperedges = [
    {
      id: "alur-sku-baru",
      label: "Alur pengajuan SKU baru",
      nodes: ["prn:OXV", "kat:111A", "kat:131A", ...produk.filter((_, i) => i % 30 === 2).slice(0, 4)],
    },
    {
      id: "alur-kontrak-display",
      label: "Alur kontrak display",
      nodes: [kontrak[0], kontrak[4], "prn:SNU", ...toko.slice(0, 4).map((k) => `tok:${k}`)],
    },
  ];

  return {
    judul: "Peta relasi master data — contoh",
    nodes: nodes.filter((n) => terpakai.has(n.id)),
    edges,
    hyperedges: hyperedges.map((h) => ({ ...h, nodes: h.nodes.filter((id) => terpakai.has(id)) })),
  };
}
