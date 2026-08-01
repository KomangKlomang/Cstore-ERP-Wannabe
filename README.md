# ERP Wanna Be — C Store

Sistem manajemen terpadu C Store: master data merchandising & marketing (PRD/SRS v1.0) digabung
dengan Product MDM (pengajuan SKU baru, alokasi PLU, free gift, data quality).
Next.js 16 + React 19 + Tailwind v4 + **HeroUI v3**.

Tone merek memakai **merah C Store** (`--accent: #d31d24`). Karena accent kini merah, token
`danger` digeser ke burgundy agar aksi merusak tetap terbaca beda — dan setiap aksi destruktif
selalu memakai ikon + label, tidak pernah warna saja.

Aplikasi berjalan **sepenuhnya offline**: tidak ada permintaan ke internet, tidak ada CDN, tidak ada
font eksternal, tidak ada database server. Seluruh data tersimpan di `localStorage` peramban.

---

## Menjalankan

```bash
npm install
```

```bash
npm run dev
```

Buka `http://localhost:3000`. Untuk mode produksi:

```bash
npm run build
```

```bash
npm start
```

Sesudah `npm install` selesai satu kali, **tidak ada langkah lain yang butuh jaringan** — matikan
Wi-Fi dan aplikasi tetap jalan penuh.

### Akun demo

Password seluruh akun: **`mms2026`**. Halaman login menampilkan daftar akun; klik salah satu untuk
mengisinya otomatis.

| Email | Peran | Cakupan |
|---|---|---|
| `mdm@cstore.co.id` | MDM | semua modul, satu-satunya yang bisa approve |
| `category1@cstore.co.id` | Category Officer | master data + submit usulan |
| `buyer1@cstore.co.id` | Buyer | principal, kontrak, dokumen + submit usulan |
| `marketing@cstore.co.id` | Marketing Officer | aset, promosi, platform, konten |
| `spv.jbtk@cstore.co.id` | SPV Area | hanya data region JBTK |
| `crew.jk001@cstore.co.id` | Crew Toko | hanya Content Report miliknya |
| `it@cstore.co.id` | Admin/IT | user, role, audit trail |

Masuk sebagai peran berbeda untuk melihat menu dan izin berubah (FR-9.3 / FR-9.4 / FR-9.5).

---

## Peta modul PRD → halaman

| Modul | Halaman | Catatan implementasi |
|---|---|---|
| **M1** Master Data | `/master/category`, `/master/product`, `/master/tag`, `/master/store`, `/master/principal` | Grid kategori **inline add/edit tanpa modal** (R8/R9), SKU baru **via barcode** (R3), validasi kode hierarkis (IMP-6) |
| **M2** Usulan | `/usulan/npd`, `/usulan/tag` | State machine Draft → Submitted → On Progress → Approved/Declined; approve NPD **otomatis membentuk Master Product** |
| **M3** Kontrak & Dokumen | `/kontrak`, `/dokumen` | Reminder bertingkat **H-90 / H-60 / H-30 / H-7** (IMP-3) |
| **M4** Aset Marketing | `/aset` | Foto terpasang wajib untuk aset tangible |
| **M5** Promosi | `/promosi` | KV wajib diunggah, PLU harus SKU aktif |
| **M6** Platform & Konten | `/platform`, `/konten` | Form konten ringkas untuk Crew (IMP-10) |
| **M7** Dashboard | `/dashboard`, `/master/store/[code]` | Kartu notifikasi yang bisa diklik (US-7.1), profil toko drill-down (US-7.2) |
| **M8** Search & Export | search bar di header, `/laporan` | Global search lintas entitas, export CSV/Excel/PDF, paket data per principal (R5) |
| **M9** RBAC | `/login`, `/admin/users` | Matriks izin per modul ditampilkan di halaman user |
| **M10** Media | melekat di form terkait | Upload jadi data URL, tersimpan lokal |
| **M11** Audit | `/admin/audit` | Siapa, kapan, nilai lama → nilai baru |
| Analitik | `/analitik` | Grafik lintas modul dengan filter region & segment |

### Product MDM (PRD/SRS Sistem Manajemen Master Data Produk)

| Kebutuhan | Halaman | Catatan implementasi |
|---|---|---|
| FR-INT-01 · pengajuan item baru | `/pengajuan` | Grid ala Excel: **paste langsung dari Excel (Ctrl+V)**, blok sel klik+drag, blok baris/kolom lewat header, hapus dengan Delete. Empat band kolom: Identitas Produk, Klasifikasi, Spesifikasi Teknis, Konversi BBM (Qty). Kolom **Dept terisi otomatis** dari taksonomi |
| FR-INT-03 · approve/reject | `/pengajuan/approver` | Kartu Total/Menunggu/Disetujui/Ditolak, filter status, pencarian, kolom **Kode Produk** dengan pengisian otomatis dari alokasi PLU, aksi Setujui / Tolak / Reset. Approve → SKU terbentuk di Master Product + slot PLU ditandai |
| FR-PLU-01/02 · alokasi PLU | `/mdm/plu` | Prefix 2 digit per seri kategori + nomor urut bersama, kapasitas 8.889 slot per seri, nomor bebas berikutnya, deteksi tabrakan |
| FR-FG-01/02 · free gift | `/mdm/freegift` | Kode `FG` + SKU induk, deskripsi `[FG] ` + deskripsi induk, ditolak bila induk tidak valid |
| FR-REP-01 · data quality | `/mdm/quality` | Kelengkapan & duplikat barcode, varian penulisan brand, antrian pengajuan yang menua (FR-INT-04) |
| FR-TAX-01/02 · taksonomi | `/master/category` | Hirarki Dept > Sub Dept > Category > Sub Category + **dual-code mapping** HASHMICRO ↔ COMP. LTW + flag UNTUK COA |

---

## Data awal

Seluruh angka di aplikasi berasal dari data seed di `lib/seed/`:

- **Taksonomi MASTER_CAT**: 4 Dept, 10 Sub Dept, 28 Category, **53 Sub Category**, label format
  `N _ NAMA` (mis. `2 _ CLOSE SYSTEM`, `122 _ CARTRIDGE CLOSE SYSTEM`, `122A _ CARTRIDGE CLOSE SYSTEM`),
  lengkap dengan dual-code HASHMICRO ↔ COMP. LTW dan flag UNTUK COA (`lib/seed/categories.ts`)
- **11 master tag** dengan perlakuan Jual/PO
- **22 toko** di 5 region (JBTK, SRG, BDG, SMG, SBY), tipe DTS & EX. LWS, 19 kolom termasuk
  `Store ID (HM)` dan `Analytical Group (HM)`
- **10 principal**, **52 SKU**, **12 kontrak**, **66 aset**, **4 promosi**, **64 content report**,
  **4 usulan NPD**, **3 usulan tag**, **12 user**
- **3 pengajuan produk** (Menunggu / Disetujui / Ditolak), **53 slot PLU terpakai**, **11 free gift**

> **Catatan penting.** Isi tabel taksonomi, master tag, master toko, dan `MASTERAN (2).xlsx`
> **tidak ikut tersalin** di dokumen PRD/SRS yang diberikan — yang tersalin hanya jumlah baris dan
> strukturnya. Data di sini karena itu **disusun ulang agar konsisten dengan struktur, kode, dan
> istilah yang disebut dokumen** serta contoh yang terlihat pada tangkapan layar form
> (`2 _ CLOSE SYSTEM`, `122 _ CARTRIDGE CLOSE SYSTEM`, `151A _ COIL`, `ECP-13200-001`).
> Untuk memakai data asli: ganti isi berkas di `lib/seed/`, lalu tekan **Reset data demo** di
> `/admin/audit`. Jika bentuk seed berubah, naikkan `STORAGE_KEY` di `lib/store.ts` supaya data lama
> di peramban tidak bentrok.

Tombol **Reset data demo** di halaman Audit Trail mengembalikan seluruh data ke kondisi awal.

---

## Keputusan teknis yang perlu diketahui

**Penyimpanan.** Data hidup di `localStorage` lewat store Zustand (`lib/store.ts`) dengan pola
repository: `saveRow`, `saveRows`, `removeRow`, ditambah dua aksi workflow. Mengganti lapisan ini
dengan API/Postgres cukup menyentuh satu berkas — halaman tidak menyentuh penyimpanan secara langsung.

**Grafik — Graphify.** Seluruh chart adalah SVG buatan sendiri di `components/graphify.tsx`, tanpa
pustaka chart eksternal, supaya syarat offline terpenuhi. Isinya: `BarChart` (peringkat),
`ColumnChart` (deret waktu), `GroupedColumnChart` (perbandingan), `StackedColumnChart` (komposisi),
`LineChart` & `AreaChart` (tren), `DonutChart` (proporsi), `GaugeArc` (capaian vs target),
`Sparkline`, dan `MeterBar`. Dipakai di **16 halaman** dengan ~70 pemakaian.

Palet kategorikal sudah divalidasi untuk keterbacaan color-blind di mode terang maupun gelap; tiga
warna di mode terang berada di bawah kontras 3:1, sehingga tiap grafik menyediakan **label langsung**
dan tombol **Tabel** untuk membaca angka persis. Tidak ada grafik dua sumbu.

Merah merek **tidak** dipakai sebagai warna seri data: di aplikasi ini merah sudah berarti "kritis"
(kontrak lewat, barcode duplikat), jadi memakainya untuk data akan menabrak arti itu. Warna baku
chart satu-seri diatur lewat `--viz-solo`.

**Navigasi.** Tekan `Ctrl + K` di mana saja untuk membuka command palette — melompat antar modul
sekaligus mencari produk, toko, principal, kategori, kontrak, dan promosi. Breadcrumb ada di header,
dan grup menu di sidebar bisa dilipat (preferensinya tersimpan per peramban).

**Logo.** Digambar sebagai SVG inline di `components/logo.tsx` supaya tetap tajam dan bebas
jaringan. Untuk memakai berkas resmi: simpan di `public/logo.png`, lalu ganti isi `<LogoMark>`
dengan `<img src="/logo.png" alt="C Store" />` — penempatan di sidebar, halaman masuk, dan header
mobile sudah mengikuti komponen itu.

**Kredensial (IMP-4).** Field `Password email` / `Passoword sosmed` dari board **sengaja tidak
diimplementasikan**. Yang disimpan hanya referensi vault (`vault://…`); kata sandi korporat tidak
boleh berada di aplikasi ini.

**Perbaikan data dari board.** `CIGARRETE` → `CIGARETTE`, `Passoword` → Password,
`Langitude latitidude` → Latitude/Longitude, `Analitycal` → Analytical (IMP-11) — nilai lama tetap
disimpan pada kolom `alias`. Kode duplikat `115A` dipisah menjadi `115A` (HNB Filter Device) dan
`115B` (HNB Tobacco Device) sesuai IMP-12.

**Open question yang masih terbuka** dan ditandai di UI: OQ-2 (arti C1–C5, disimpan apa adanya),
OQ-4 (HM vs MMS sebagai master toko), OQ-5 (isi 1 pack), OQ-6 (Buyer & Category saling melihat
usulan — saat ini boleh). OQ-1 (channel Grab) dan OQ-3 belum diimplementasikan karena masih
pertanyaan bisnis, bukan kebutuhan yang disetujui.

Dari dokumen Product MDM: arti tag **B/D/G/N/S** (9.2), **prefix pasti kode PLU per kategori** (9.3),
makna sisi **COMP. LTW** dan flag **UNTUK COA** (9.4) belum dikonfirmasi. Ketiganya sudah berjalan di
aplikasi memakai pola yang teramati dari data, dan ditandai eksplisit di layar terkait supaya tidak
terlanjur dianggap final.

---

## Yang belum termasuk

Sesuai Non-Goals PRD dan batas fase: tidak ada POS/kasir, akuntansi, WMS, atau ordering.
Integrasi dua arah dengan **HM**, portal principal (fase 3–4), notifikasi email/WhatsApp, SSO/MFA
sungguhan, dan object storage untuk media juga belum ada — semuanya membutuhkan backend yang
memang di luar cakupan prototipe offline ini.

---

## Struktur

```
app/
  login/                 halaman masuk
  (app)/                 seluruh halaman yang butuh sesi + shell
components/
  app-shell.tsx          sidebar, topbar, global search, guard per modul
  charts.tsx             pustaka grafik SVG
  ui.tsx                 komponen form & tabel di atas HeroUI
lib/
  types.ts               model data
  seed/                  data awal
  store.ts               penyimpanan + audit trail
  rbac.ts                matriks izin & scoping region
  derive.ts              turunan: reminder kontrak, notifikasi, agregasi chart
  workflow.ts            state machine usulan
  export.ts              CSV / Excel / PDF / upload
scripts/dev-preview.mjs  hanya untuk preview harness; penggunaan normal cukup `npm run dev`
```
