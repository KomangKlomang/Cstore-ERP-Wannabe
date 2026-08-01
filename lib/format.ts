const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const angka = new Intl.NumberFormat("id-ID");

export const fmtRp = (n: number) => rupiah.format(n || 0);
export const fmtNum = (n: number) => angka.format(n || 0);

export function fmtRpShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (abs >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} jt`;
  if (abs >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return fmtRp(n);
}

export function fmtNumShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}rb`;
  return String(n);
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Tanggal ISO (YYYY-MM-DD atau full ISO) → "31 Jul 2026". Aman untuk SSR. */
export function fmtTgl(iso?: string): string {
  if (!iso) return "-";
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
}

export function fmtTglJam(iso?: string): string {
  if (!iso) return "-";
  if (iso.length <= 10) return fmtTgl(iso);
  return `${fmtTgl(iso)} ${iso.slice(11, 16)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Selisih hari (target - hari ini). Negatif = sudah lewat. */
export function daysUntil(iso: string, from = todayISO()): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${iso.slice(0, 10)}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function fmtDurasi(detik: number): string {
  if (!detik) return "-";
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return m ? `${m}m ${s}d` : `${s}d`;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
