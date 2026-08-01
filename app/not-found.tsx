import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>404</div>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Halaman tidak ditemukan</h2>
        <p style={{ color: "#888", marginBottom: "1.5rem" }}>
          Halaman yang kamu cari tidak tersedia atau sudah dipindahkan.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "0.5rem 1.5rem",
            borderRadius: 8,
            background: "#d31d24",
            color: "#fff",
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
