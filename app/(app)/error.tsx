"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">⚠</div>
        <h2 className="text-xl font-medium mb-2">Halaman mengalami error</h2>
        <p className="text-sm text-default-500 mb-6">{error.message || "Terjadi kesalahan yang tidak terduga."}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--brand)" }}
        >
          Muat ulang
        </button>
      </div>
    </div>
  );
}
