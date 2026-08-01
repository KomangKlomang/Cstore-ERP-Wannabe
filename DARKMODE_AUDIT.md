# Audit Dark/Light Mode

Cakupan: seluruh `.tsx` di `app/` dan `components/` — dicari lewat grep untuk
hex literal (`#rrggbb`), `rgb()/rgba()/hsl()` literal, dan kelas palet
Tailwind mentah (`text-gray-800`, `bg-white`, dst.) yang **tidak** memakai
token semantik HeroUI (`text-foreground`, `bg-surface`, `border-border`, dst.)
atau varian `dark:`.

**Dikecualikan dari audit ini secara sengaja:** `app/login/page.tsx` dan
`components/cyber-graph.tsx`. Keduanya memang harus SELALU gelap apa pun tema
sistem (lihat komentar di puncak `login/page.tsx`) — nilai hardcode di situ
adalah keputusan desain eksplisit, bukan bug.

Ditemukan 10 isu. Semuanya sudah diperbaiki (lihat kolom FIX; kode sudah
diubah, bukan sekadar rekomendasi).

---

FILE: components/sheet-grid.tsx
LINE: 180
ISSUE: `bg-[color:var(--brand-ink,#1c1c1c)]` dipasangkan dengan `text-white`. `--brand-ink` SENGAJA membalik polaritas — `#1c1c1c` (gelap) di mode terang, tapi `#f5f5f5` (nyaris putih) di mode gelap (lihat `app/globals.css`). Hasilnya: teks putih di atas latar nyaris putih, tak terbaca, persis di sel pojok kiri-atas grid yang selalu terlihat.
FIX: latar sel pojok diganti literal tetap `bg-[#1c1c1c]` (tidak lagi memakai `--brand-ink`) — sel ini memang dimaksud sebagai aksen gelap tetap, sama seperti band grup kolom di sebelahnya yang juga warna tetap, bukan sesuatu yang seharusnya ikut membalik dengan tema.

FILE: components/sheet-grid.tsx
LINE: 180
ISSUE: `border-black/10` — garis tipis hitam 10% opasitas. Di atas permukaan gelap (`--surface` mode gelap ≈ Lab L8, nyaris hitam), kontrasnya nyaris nol dan garisnya menghilang.
FIX: diganti `border-border`, token HeroUI yang sudah didefinisikan berbeda untuk tiap tema.

FILE: components/sheet-grid.tsx
LINE: 189
ISSUE: `border-black/10` — masalah yang sama, kemunculan kedua pada baris band grup.
FIX: diganti `border-border`.

FILE: components/sheet-grid.tsx
LINE: 189
ISSUE: `text-white` dipasangkan dengan `style={{ background: g.bg }}` yang nilainya dari `GROUPS[].bg` di `pengajuan/page.tsx` — waktu itu hex literal. Pasangannya sendiri konsisten (latar gelap tetap + teks putih tetap = selalu terbaca), tapi tetap tidak memakai token, menyulitkan perawatan warna band di satu tempat.
FIX: tidak perlu ubah baris ini — terselesaikan otomatis begitu `GROUPS[].bg` (lihat 4 entri di bawah) dipindah ke custom property; teks putih tetap valid karena token barunya juga warna gelap tetap.

FILE: app/(app)/pengajuan/page.tsx
LINE: 28
ISSUE: `bg: "#8f1015"` — hex literal untuk warna band "Identitas Produk", bukan token. Secara visual tidak rusak (latar gelap tetap + teks putih tetap), tapi warna band tersebar sebagai string di kode komponen, bukan satu sumber kebenaran.
FIX: diganti `"var(--band-identitas)"`; token barunya didefinisikan sekali di `app/globals.css` (nilai sama, `#8f1015`) mengikuti pola `--viz-*`/`--brand-*` yang sudah ada di proyek ini.

FILE: app/(app)/pengajuan/page.tsx
LINE: 42
ISSUE: `bg: "#0e7a63"` — sama, untuk band "Klasifikasi".
FIX: diganti `"var(--band-klasifikasi)"`.

FILE: app/(app)/pengajuan/page.tsx
LINE: 54
ISSUE: `bg: "#6d28a8"` — sama, untuk band "Spesifikasi Teknis".
FIX: diganti `"var(--band-teknis)"`.

FILE: app/(app)/pengajuan/page.tsx
LINE: 68
ISSUE: `bg: "#c2540a"` — sama, untuk band "Konversi BBM (Qty)".
FIX: diganti `"var(--band-konversi)"`.

FILE: components/logo.tsx
LINE: 23
ISSUE: `fill="#2b2b2b"` — cincin luar lambang C Store, abu nyaris hitam. `--surface` mode gelap HeroUI juga nyaris hitam (Lab L≈8) — di sidebar/header mode gelap, cincin lambang berbaur nyaris tak kelihatan dengan latarnya.
FIX: dicerahkan ke `#3a3a3a` + ditambah `stroke="#55555599"` tipis, supaya tepi lambang tetap terdefinisi di atas latar segelap apa pun tanpa membuat lambangnya ikut berganti warna per tema (lambang merek memang sengaja warna tetap, bukan ikut tema).

FILE: components/logo.tsx
LINE: 24
ISSUE: `fill="#0d0d0d"` — piringan dalam lambang, lebih gelap lagi dari cincin luarnya. Risiko sama seperti di atas, lebih parah.
FIX: dicerahkan ke `#1a1a1a`.
