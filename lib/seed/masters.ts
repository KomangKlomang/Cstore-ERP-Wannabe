import type { AkunPlatform, Principal, Store, TagRow, User } from "@/lib/types";

const STAMP = "2026-07-01T08:00:00.000Z";

/* ------------------------------------------------------------- Master Tag (11) */

const tagRaw: Array<Omit<TagRow, "id" | "status" | "updatedAt" | "updatedBy">> = [
  { kode: "A", nama: "NEW PRODUCT", jual: true, po: true, perlakuan: "SKU baru, boleh dijual & di-PO. Wajib evaluasi 3 bulan.", warna: "accent" },
  { kode: "B", nama: "REGULAR", jual: true, po: true, perlakuan: "Item reguler, jual & PO normal.", warna: "success" },
  { kode: "C", nama: "FAST MOVING", jual: true, po: true, perlakuan: "Prioritas display & alokasi PO ditambah.", warna: "success" },
  { kode: "D", nama: "SLOW MOVING", jual: true, po: true, perlakuan: "PO dibatasi, masuk daftar evaluasi bulanan.", warna: "warning" },
  { kode: "E", nama: "SEASONAL", jual: true, po: true, perlakuan: "Hanya di-PO pada periode musiman yang ditetapkan.", warna: "warning" },
  { kode: "F", nama: "EXCLUSIVE", jual: true, po: true, perlakuan: "Eksklusif region/toko tertentu sesuai kontrak principal.", warna: "accent" },
  { kode: "G", nama: "TRIAL", jual: true, po: true, perlakuan: "Uji pasar pada toko terpilih, PO terbatas.", warna: "accent" },
  { kode: "H", nama: "STOP PO", jual: true, po: false, perlakuan: "Masih dijual sampai stok habis, PO ditutup.", warna: "warning" },
  { kode: "I", nama: "STOP JUAL", jual: false, po: false, perlakuan: "Tidak boleh dijual, stok ditarik ke gudang.", warna: "danger" },
  { kode: "J", nama: "DELISTING", jual: false, po: false, perlakuan: "Proses delist, retur ke principal.", warna: "danger" },
  { kode: "K", nama: "TIDAK MASUK REGION", jual: false, po: false, perlakuan: "SKU tidak didistribusikan ke region ini.", warna: "default" },
];

export const seedTags: TagRow[] = tagRaw.map((t, i) => ({
  ...t,
  id: `tag-${i + 1}`,
  status: "AKTIF",
  updatedAt: STAMP,
  updatedBy: "seed",
}));

/* --------------------------------------------------------------- Master User */

export const seedUsers: User[] = [
  { id: "u-mdm", nama: "Komang Legoas", email: "mdm@cstore.co.id", role: "MDM", regions: [], aktif: true, mfaAktif: true },
  { id: "u-cat1", nama: "Rina Puspita", email: "category1@cstore.co.id", role: "CATEGORY_OFFICER", regions: [], aktif: true, mfaAktif: false },
  { id: "u-cat2", nama: "Bagas Prakoso", email: "category2@cstore.co.id", role: "CATEGORY_OFFICER", regions: [], aktif: true, mfaAktif: false },
  { id: "u-buy1", nama: "Hendra Wijaya", email: "buyer1@cstore.co.id", role: "BUYER", regions: [], aktif: true, mfaAktif: false },
  { id: "u-buy2", nama: "Salsa Maharani", email: "buyer2@cstore.co.id", role: "BUYER", regions: [], aktif: true, mfaAktif: false },
  { id: "u-mkt", nama: "Yoga Pratama", email: "marketing@cstore.co.id", role: "MARKETING_OFFICER", regions: [], aktif: true, mfaAktif: false },
  { id: "u-spv-jbtk", nama: "Andri Setiawan", email: "spv.jbtk@cstore.co.id", role: "SPV_AREA", regions: ["JBTK"], aktif: true, mfaAktif: false },
  { id: "u-spv-bdg", nama: "Nadia Ramadhani", email: "spv.bdg@cstore.co.id", role: "SPV_AREA", regions: ["BDG"], aktif: true, mfaAktif: false },
  { id: "u-spv-sby", nama: "Fajar Nugroho", email: "spv.sby@cstore.co.id", role: "SPV_AREA", regions: ["SBY", "SMG"], aktif: true, mfaAktif: false },
  { id: "u-crew1", nama: "Dimas Aditya", email: "crew.jk001@cstore.co.id", role: "CREW", regions: ["JBTK"], storeCode: "JK001", aktif: true, mfaAktif: false },
  { id: "u-crew2", nama: "Putri Larasati", email: "crew.bd001@cstore.co.id", role: "CREW", regions: ["BDG"], storeCode: "BD001", aktif: true, mfaAktif: false },
  { id: "u-admin", nama: "Krisna Adi", email: "it@cstore.co.id", role: "ADMIN_IT", regions: [], aktif: true, mfaAktif: true },
];

/* ---------------------------------------------------------- Master Principal */

const principalRaw: Array<Omit<Principal, "id" | "status" | "updatedAt" | "updatedBy">> = [
  { kode: "PRN-001", nama: "PT Sampoerna Niaga Utama", brand: ["MARLBORO", "DJI SAM SOE", "SAMPOERNA A"], pic: "Bpk. Ridwan", telp: "021-5551001", email: "trade@sampoernaniaga.co.id", alamat: "Jl. Rungkut Industri Raya No. 18, Surabaya", npwp: "01.234.567.8-054.000", isiSatuPack: 20 },
  { kode: "PRN-002", nama: "PT Gudang Garam Distribusi", brand: ["GUDANG GARAM", "SURYA", "GG MOVE"], pic: "Ibu Lestari", telp: "0354-551002", email: "distribusi@ggdist.co.id", alamat: "Jl. Semampir II/1, Kediri", npwp: "01.334.111.2-051.000", isiSatuPack: 16 },
  { kode: "PRN-003", nama: "PT Djarum Trade Partner", brand: ["DJARUM SUPER", "LA BOLD", "MLD"], pic: "Bpk. Handoko", telp: "0291-551003", email: "trade@djarumpartner.co.id", alamat: "Jl. A. Yani No. 28, Kudus", npwp: "01.221.998.7-506.000", isiSatuPack: 16 },
  { kode: "PRN-004", nama: "PT OXVA Indonesia", brand: ["OXVA", "XLIM"], pic: "Bpk. Kelvin", telp: "021-5551004", email: "id@oxva.com", alamat: "Ruko Green Lake City Blok D No. 9, Jakarta Barat", npwp: "02.112.334.5-077.000", isiSatuPack: 10 },
  { kode: "PRN-005", nama: "PT Vaporesso Nusantara", brand: ["VAPORESSO", "XROS"], pic: "Ibu Cindy", telp: "021-5551005", email: "sales@vaporesso.id", alamat: "Jl. Panjang No. 45, Jakarta Selatan", npwp: "02.556.778.9-013.000", isiSatuPack: 10 },
  { kode: "PRN-006", nama: "PT Liquid Nusantara Kreasi", brand: ["FOOM", "EMKAY", "NEXT LIQUID"], pic: "Bpk. Reza", telp: "022-5551006", email: "order@liquidnusantara.co.id", alamat: "Jl. Soekarno Hatta No. 210, Bandung", npwp: "03.667.112.3-428.000", isiSatuPack: 12 },
  { kode: "PRN-007", nama: "PT KT&G Indonesia", brand: ["ESSE", "LIL SOLID", "FIIT"], pic: "Mr. Park", telp: "021-5551007", email: "trade@ktgindonesia.com", alamat: "Sudirman Plaza Lt. 12, Jakarta Pusat", npwp: "02.889.001.4-062.000", isiSatuPack: 20 },
  { kode: "PRN-008", nama: "PT Tokai Lighter Indonesia", brand: ["TOKAI", "CRICKET"], pic: "Ibu Wulan", telp: "021-5551008", email: "sales@tokai.co.id", alamat: "Kawasan Industri MM2100, Bekasi", npwp: "03.110.223.6-431.000", isiSatuPack: 50 },
  { kode: "PRN-009", nama: "PT Adult Care Sejahtera", brand: ["SUTRA", "FIESTA"], pic: "Bpk. Yusuf", telp: "031-5551009", email: "cs@adultcare.co.id", alamat: "Jl. Raya Darmo No. 88, Surabaya", npwp: "03.998.776.5-609.000", isiSatuPack: 24 },
  { kode: "PRN-010", nama: "PT Beverage Ritel Indonesia", brand: ["KOPI KENANGAN RTD", "HYDRO+"], pic: "Ibu Maya", telp: "024-5551010", email: "trade@beverageritel.co.id", alamat: "Jl. Pemuda No. 150, Semarang", npwp: "04.223.114.7-503.000", isiSatuPack: 24 },
];

export const seedPrincipals: Principal[] = principalRaw.map((p, i) => ({
  ...p,
  id: `prn-${String(i + 1).padStart(3, "0")}`,
  status: "AKTIF",
  updatedAt: STAMP,
  updatedBy: "seed",
}));

/* -------------------------------------------------------------- Master Store */

type StoreSeed = [
  code: string,
  name: string,
  hm: string,
  ag: string,
  type: Store["storeType"],
  region: Store["region"],
  area: string,
  kota: string,
  alamat: string,
  lat: number,
  lng: number,
  buka: string,
  status: Store["status"],
  luas: number,
  rak: number,
];

const storeRaw: StoreSeed[] = [
  ["JK001", "C-Store Kemang Raya", "HM-1001", "AG-URBAN-A", "DTS", "JBTK", "Jakarta Selatan", "Jakarta Selatan", "Jl. Kemang Raya No. 12", -6.26041, 106.81334, "2021-03-15", "AKTIF", 78, 14],
  ["JK002", "C-Store Tebet Barat", "HM-1002", "AG-URBAN-A", "DTS", "JBTK", "Jakarta Selatan", "Jakarta Selatan", "Jl. Tebet Barat Dalam Raya No. 5", -6.23412, 106.85211, "2021-06-01", "AKTIF", 65, 12],
  ["JK003", "C-Store Kelapa Gading", "HM-1003", "AG-URBAN-B", "DTS", "JBTK", "Jakarta Utara", "Jakarta Utara", "Jl. Boulevard Raya Blok M No. 3", -6.15771, 106.90671, "2022-01-20", "AKTIF", 92, 18],
  ["JK004", "C-Store BSD Serpong", "HM-1004", "AG-SUBURB-A", "EX. LWS", "JBTK", "Tangerang Selatan", "Tangerang Selatan", "Ruko Golden Boulevard Blok C No. 8", -6.30124, 106.65432, "2020-11-05", "AKTIF", 110, 20],
  ["JK005", "C-Store Bekasi Galaxy", "HM-1005", "AG-SUBURB-B", "EX. LWS", "JBTK", "Bekasi", "Bekasi", "Jl. Boulevard Timur Raya No. 21", -6.24567, 106.98812, "2022-08-12", "AKTIF", 84, 16],
  ["JK006", "C-Store Depok Margonda", "HM-1006", "AG-SUBURB-B", "DTS", "JBTK", "Depok", "Depok", "Jl. Margonda Raya No. 358", -6.37124, 106.83211, "2023-02-18", "AKTIF", 70, 13],
  ["SR001", "C-Store Serang Kota", "HM-2001", "AG-RURAL-A", "DTS", "SRG", "Serang", "Serang", "Jl. Ahmad Yani No. 45", -6.11012, 106.15043, "2022-05-10", "AKTIF", 58, 10],
  ["SR002", "C-Store Cilegon Ramanuju", "HM-2002", "AG-RURAL-A", "EX. LWS", "SRG", "Cilegon", "Cilegon", "Jl. Raya Ramanuju No. 7", -6.00234, 106.01123, "2023-04-02", "AKTIF", 62, 11],
  ["SR003", "C-Store Pandeglang", "HM-2003", "AG-RURAL-B", "DTS", "SRG", "Pandeglang", "Pandeglang", "Jl. Raya Labuan KM 5", -6.30891, 106.10567, "2024-01-15", "AKTIF", 48, 8],
  ["BD001", "C-Store Dago Atas", "HM-3001", "AG-URBAN-A", "DTS", "BDG", "Bandung Utara", "Bandung", "Jl. Ir. H. Juanda No. 322", -6.86123, 107.61456, "2021-09-09", "AKTIF", 74, 14],
  ["BD002", "C-Store Buah Batu", "HM-3002", "AG-URBAN-B", "DTS", "BDG", "Bandung Selatan", "Bandung", "Jl. Buah Batu No. 155", -6.94512, 107.63012, "2022-03-21", "AKTIF", 66, 12],
  ["BD003", "C-Store Cimahi Baros", "HM-3003", "AG-SUBURB-A", "EX. LWS", "BDG", "Cimahi", "Cimahi", "Jl. Baros No. 88", -6.88345, 107.53421, "2023-07-30", "AKTIF", 59, 10],
  ["BD004", "C-Store Sumedang Kota", "HM-3004", "AG-RURAL-B", "DTS", "BDG", "Sumedang", "Sumedang", "Jl. Prabu Geusan Ulun No. 14", -6.85678, 107.92134, "2024-05-06", "AKTIF", 44, 8],
  ["SM001", "C-Store Semarang Simpang Lima", "HM-4001", "AG-URBAN-A", "DTS", "SMG", "Semarang Tengah", "Semarang", "Jl. Pandanaran No. 30", -6.98412, 110.41023, "2021-12-01", "AKTIF", 81, 15],
  ["SM002", "C-Store Tembalang", "HM-4002", "AG-URBAN-B", "DTS", "SMG", "Semarang Selatan", "Semarang", "Jl. Prof. Soedarto No. 41", -7.05123, 110.44012, "2023-01-11", "AKTIF", 63, 11],
  ["SM003", "C-Store Solo Slamet Riyadi", "HM-4003", "AG-URBAN-B", "EX. LWS", "SMG", "Surakarta", "Surakarta", "Jl. Slamet Riyadi No. 210", -7.56789, 110.81234, "2022-10-17", "AKTIF", 77, 14],
  ["SM004", "C-Store Kudus Jati", "HM-4004", "AG-RURAL-A", "DTS", "SMG", "Kudus", "Kudus", "Jl. Jenderal Sudirman No. 65", -6.80234, 110.84567, "2024-02-26", "AKTIF", 52, 9],
  ["SB001", "C-Store Surabaya Gubeng", "HM-5001", "AG-URBAN-A", "DTS", "SBY", "Surabaya Timur", "Surabaya", "Jl. Raya Gubeng No. 40", -7.26512, 112.75123, "2021-04-19", "AKTIF", 88, 16],
  ["SB002", "C-Store Surabaya Darmo", "HM-5002", "AG-URBAN-A", "DTS", "SBY", "Surabaya Selatan", "Surabaya", "Jl. Raya Darmo No. 102", -7.29012, 112.73456, "2022-06-23", "AKTIF", 79, 15],
  ["SB003", "C-Store Sidoarjo Lingkar", "HM-5003", "AG-SUBURB-A", "EX. LWS", "SBY", "Sidoarjo", "Sidoarjo", "Jl. Lingkar Timur No. 3", -7.44123, 112.71789, "2023-09-14", "AKTIF", 68, 12],
  ["SB004", "C-Store Malang Soekarno Hatta", "HM-5004", "AG-URBAN-B", "DTS", "SBY", "Malang", "Malang", "Jl. Soekarno Hatta No. 17", -7.95234, 112.61345, "2024-03-08", "AKTIF", 71, 13],
  ["SB005", "C-Store Gresik Kota (Relokasi)", "HM-5005", "AG-RURAL-A", "EX. LWS", "SBY", "Gresik", "Gresik", "Jl. Dr. Wahidin Sudirohusodo No. 55", -7.15678, 112.65432, "2025-01-13", "RELOKASI", 57, 10],
];

const KODE_AREA: Record<string, string> = {
  JBTK: "021",
  SRG: "0254",
  BDG: "022",
  SMG: "024",
  SBY: "031",
};

const spvByRegion: Record<string, string> = {
  JBTK: "u-spv-jbtk",
  SRG: "u-spv-jbtk",
  BDG: "u-spv-bdg",
  SMG: "u-spv-sby",
  SBY: "u-spv-sby",
};

export const seedStores: Store[] = storeRaw.map(
  ([storeCode, storeName, storeIdHM, analyticalGroupHM, storeType, region, area, kota, alamat, latitude, longitude, tglBuka, status, luasM2, jumlahRak]) => ({
    id: `st-${storeCode}`,
    storeCode,
    storeName,
    storeIdHM,
    analyticalGroupHM,
    storeType,
    region,
    area,
    alamat,
    kota,
    latitude,
    longitude,
    tglBuka,
    status,
    relocateFromStoreCode: storeCode === "SB005" ? "SB003" : undefined,
    spvId: spvByRegion[region],
    crewIds: storeCode === "JK001" ? ["u-crew1"] : storeCode === "BD001" ? ["u-crew2"] : [],
    noTelp: `${KODE_AREA[region]}-${5000 + Number(storeCode.slice(2)) * 7}`,
    luasM2,
    jumlahRak,
    planogramAktif: `PLANO-${storeCode}-2026-Q3`,
    updatedAt: STAMP,
    updatedBy: "seed",
  }),
);

/* ------------------------------------------------------- M6 Akun sosial media */

export const seedAkunPlatform: AkunPlatform[] = [
  { id: "ap-1", platform: "INSTAGRAM", username: "@cstore.id", pic: "Yoga Pratama", region: "PUSAT", followers: 148200, vaultRef: "vault://mms/sosmed/ig-cstore-id", status: "AKTIF", updatedAt: STAMP },
  { id: "ap-2", platform: "TIKTOK", username: "@cstore.official", pic: "Yoga Pratama", region: "PUSAT", followers: 96400, vaultRef: "vault://mms/sosmed/tt-cstore-official", status: "AKTIF", updatedAt: STAMP },
  { id: "ap-3", platform: "INSTAGRAM", username: "@cstore.jabodetabek", pic: "Andri Setiawan", region: "JBTK", followers: 21500, vaultRef: "vault://mms/sosmed/ig-cstore-jbtk", status: "AKTIF", updatedAt: STAMP },
  { id: "ap-4", platform: "INSTAGRAM", username: "@cstore.bandung", pic: "Nadia Ramadhani", region: "BDG", followers: 17800, vaultRef: "vault://mms/sosmed/ig-cstore-bdg", status: "AKTIF", updatedAt: STAMP },
  { id: "ap-5", platform: "TIKTOK", username: "@cstore.surabaya", pic: "Fajar Nugroho", region: "SBY", followers: 12300, vaultRef: "vault://mms/sosmed/tt-cstore-sby", status: "AKTIF", updatedAt: STAMP },
  { id: "ap-6", platform: "YOUTUBE", username: "C-Store Indonesia", pic: "Yoga Pratama", region: "PUSAT", followers: 8400, vaultRef: "vault://mms/sosmed/yt-cstore", status: "AKTIF", updatedAt: STAMP },
  { id: "ap-7", platform: "FACEBOOK", username: "C-Store Semarang", pic: "Fajar Nugroho", region: "SMG", followers: 5600, vaultRef: "vault://mms/sosmed/fb-cstore-smg", status: "NONAKTIF", updatedAt: STAMP },
];
