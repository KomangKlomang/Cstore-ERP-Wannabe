/**
 * Lambang C Store.
 *
 * Berkas resmi (`public/logo-cstore.png`), bukan lagi SVG gambar-ulang —
 * revisi sebelumnya (rekonstruksi vektor) terlihat kurang tajam/berbeda dari
 * lambang aslinya. `object-contain` di kotak persegi supaya proporsi asli
 * gambar (980×1146, sedikit portrait) tidak gepeng meregang ke persegi.
 */

export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- aset lokal statis, next/image tak perlu di sini
    <img
      src="/logo-cstore.png"
      alt="C Store"
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Lambang + nama sistem, dipakai di sidebar dan halaman masuk. */
export function LogoLockup({
  size = 36,
  subtitle = "Sistem Manajemen Terpadu",
  className = "",
}: {
  size?: number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight text-foreground">
          ERP Wanna Be
        </span>
        <span className="block truncate text-[11px] leading-tight text-muted">{subtitle}</span>
      </span>
    </span>
  );
}
