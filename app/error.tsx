"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

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
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Terjadi kesalahan</h2>
        <p style={{ color: "#888", marginBottom: "1.5rem" }}>
          Aplikasi mengalami error yang tidak terduga. Silakan coba lagi.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.5rem",
            borderRadius: 8,
            border: "1px solid #d31d24",
            background: "#d31d24",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Coba lagi
        </button>
      </div>
    </div>
  );
}
