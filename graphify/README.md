# Graphify

Pustaka grafik internal ERP Wanna Be. SVG murni, **tanpa dependensi eksternal**, jadi aplikasi
tetap jalan penuh offline dan bundelnya ringan.

```tsx
import { BarChart, VIZ, VIZ_STATUS } from "@/graphify";
```

## Berjalan mandiri (tanpa React)

```bash
npm run graphify:html
```

Menghasilkan **`graphify/standalone/graphify.html`** — satu berkas .html yang sudah berisi seluruh
kode dan gaya di dalamnya. Klik dua kali dari Explorer: semua bentuk grafik langsung tampil, tanpa
server, tanpa React, tanpa koneksi internet (0 referensi `src=`, `href=`, atau `http://`).
Salinannya juga ditulis ke `public/graphify.html` sehingga bisa dibuka dari aplikasi yang sedang
berjalan di `/graphify.html`.

Kuncinya ada pada **`core.js`** — JavaScript polos tanpa impor apa pun yang memuat palet, formatter,
dan seluruh perhitungan geometri. Dua sisi memakainya:

```
core.js ──┬── tokens.ts / geometry.ts ──→ komponen React (aplikasi)
          └── standalone/renderer.js ──→ graphify.html (mandiri)
```

Jadi skala sumbu, bentuk batang, dan warna tidak akan pernah menyimpang antara keduanya.

## Isi folder

| Berkas | Komponen | Dipakai untuk |
|---|---|---|
| `core.js` | palet, `idFmt`, `barPathH`, `barPathV`, `niceMax` | **sumber tunggal** perhitungan & warna, dipakai React maupun standalone |
| `tokens.ts` | `VIZ`, `VIZ_STATUS`, `VIZ_SOLO`, `idFmt`, tipe `Datum`/`SeriesDatum`/`Fmt` | meneruskan token dari `core.js` + tipe TypeScript |
| `geometry.ts` | `barPathH`, `barPathV`, `niceMax` | meneruskan geometri dari `core.js` |
| `standalone/renderer.js` | seluruh chart versi SVG-string | render tanpa React |
| `standalone/demo.js` | data contoh + susunan halaman | isi halaman demo |
| `standalone/build.mjs` | perangkai | menyatukan semuanya jadi `graphify.html` |
| `chart-frame.tsx` | `ChartFrame` | kerangka: judul, legenda, tombol **Tabel**, catatan |
| `bar-chart.tsx` | `BarChart` | peringkat — label panjang, batang horizontal |
| `column-chart.tsx` | `ColumnChart` | deret waktu / kategori sedikit |
| `grouped-column-chart.tsx` | `GroupedColumnChart` | membandingkan 2–4 seri berdampingan |
| `stacked-column-chart.tsx` | `StackedColumnChart` | komposisi dalam satu total |
| `line-chart.tsx` | `LineChart` | tren banyak seri, dengan crosshair |
| `area-chart.tsx` | `AreaChart` | tren satu seri, menekankan volume |
| `donut-chart.tsx` | `DonutChart` | proporsi + angka utama di tengah |
| `gauge-arc.tsx` | `GaugeArc` | capaian terhadap target |
| `sparkline.tsx` | `Sparkline` | tren mini di dalam sel/tabel |
| `meter-bar.tsx` | `MeterBar` | rasio ringkas satu baris |

## Memilih bentuk

Mulai dari pekerjaan datanya, bukan dari selera bentuk:

- **Peringkat / membandingkan besaran antar item** → `BarChart`
- **Perubahan sepanjang waktu** → `LineChart` (banyak seri) atau `AreaChart` (satu seri)
- **Komposisi terhadap total** → `StackedColumnChart` atau `DonutChart`
- **Membandingkan beberapa seri per kelompok** → `GroupedColumnChart`
- **Satu angka vs target** → `GaugeArc` atau `MeterBar`
- **Angka tunggal tanpa konteks** → jangan pakai chart, pakai `StatCard`

## Aturan warna

1. **Slot kategorikal tetap** (`VIZ[0]`..`VIZ[7]`), diberikan berurutan dan **tidak pernah
   di-cycle**. Warna mengikuti entitas, bukan peringkat — filter yang mengubah jumlah seri tidak
   boleh mengecat ulang seri yang tersisa.
2. **Satu sumbu saja.** Tidak ada dual-axis. Dua satuan berbeda → dua chart.
3. **Merah merek bukan warna data.** Di aplikasi ini merah berarti "kritis" (kontrak lewat,
   barcode duplikat). Warna baku chart satu seri diambil dari `VIZ_SOLO` (`--viz-solo`).
4. **Warna status** (`VIZ_STATUS.good/warning/serious/critical`) khusus untuk keadaan, tidak
   pernah dipakai sebagai "seri ke-4", dan selalu didampingi ikon + label.
5. Di mode terang, tiga slot berada di bawah kontras 3:1 terhadap surface. Karena itu setiap chart
   menyediakan **label langsung** pada mark dan tombol **Tabel** untuk membaca angka persis.

## Kontrak antarmuka

Semua chart menerima `title`, `subtitle?`, `format?`, dan `catatan?`. Chart multi-seri menerima
`keys` (urutan seri) dan `colors?`. Semua membungkus dirinya dengan `ChartFrame`, sehingga mode
tabel, legenda, dan gaya kartunya konsisten tanpa usaha tambahan di halaman pemakai.

## CSS Variables yang dibutuhkan

Graphify me-referensikan CSS custom properties `--viz-*`. App consumer harus menyediakan variabel
ini di root stylesheet. Lihat `globals.css` untuk contoh lengkap palet light + dark mode.
