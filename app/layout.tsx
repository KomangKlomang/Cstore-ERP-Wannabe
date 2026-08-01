import type { Metadata, Viewport } from "next";

/**
 * Figtree — di-bundle via @fontsource, bukan next/font/google. Berkas font
 * ini ikut ter-bundle ke dalam build, jadi tidak ada permintaan ke Google
 * Fonts saat dev, build, maupun runtime — konsisten dengan syarat aplikasi
 * ini harus bisa berjalan sepenuhnya offline.
 */
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP Wanna be | by @anggoro._.404",
  description:
    "Sistem terpusat master data produk, pengajuan SKU baru, kontrak & aset principal, promosi, dan laporan konten.",
  icons: {
    icon: "/logo-cstore.png",
    apple: "/logo-cstore.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
