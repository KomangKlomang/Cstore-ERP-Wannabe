"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import { DEMO_PASSWORD, useApp } from "@/lib/store";
import { useHydrated } from "@/components/app-shell";
import { LogoMark } from "@/components/logo";
import { CyberGraph } from "@/components/cyber-graph";

/**
 * Halaman masuk — SELALU gelap, apa pun tema sistem/OS pengguna.
 *
 * Sengaja tidak memakai token tema HeroUI (`bg-surface`, `text-foreground`,
 * komponen `<Card>`/`<Button>`/`<Input>` berstyle) di mana pun di halaman
 * ini — semua warna ditulis literal (hex/rgba) supaya tampilannya terkunci
 * pada palet sian/amber cyberpunk dan tidak ikut berubah saat pengguna
 * mengganti tema terang/gelap aplikasi. Field & tombol karena itu dibangun
 * dari elemen HTML polos, bukan `<Input>`/`<Button>` HeroUI — komponen itu
 * menyuntikkan kelas `bg-field`/`text-field-foreground` yang justru
 * bergantung pada variabel tema yang ingin dihindari di sini.
 */
export default function LoginPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const login = useApp((s) => s.login);

  const [email, setEmail] = useState("mdm@cstore.co.id");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const currentUserId = useApp((s) => s.currentUserId);

  useEffect(() => {
    if (hydrated && currentUserId) router.replace("/dashboard");
  }, [hydrated, currentUserId, router]);

  function submit() {
    const res = login(email, password);
    if (!res.ok) {
      setError(res.error ?? "Login gagal.");
      return;
    }
    setError("");
    router.replace("/dashboard");
  }

  return (
    <div className="fixed inset-0 grid grid-cols-1 bg-[#0a0a0f] lg:grid-cols-[3fr_2fr]">
      {/* Kanvas mengisi seluruh layar, bukan hanya kolom kiri — kartu form di
          kanan mengambang tembus pandang di atasnya, bukan berbatas tegas.
          Posisinya sudah baku "absolute inset-0" di dalam komponennya sendiri. */}
      <CyberGraph />

      {/* Kolom kiri kosong secara struktural — memberi ruang 60% supaya kanvas
          terlihat lega di layar lebar, sesuai proporsi yang diminta. */}
      <div aria-hidden className="hidden lg:block" />

      {/* Tagline di atas kanvas — teks HTML biasa (bukan digambar di canvas)
          supaya tetap tajam di segala resolusi & gampang diubah. Ditaruh
          pojok kiri-atas supaya tidak pernah bertabrakan dengan kartu form
          yang berpusat vertikal di sisi kanan. */}
      <div aria-hidden className="pointer-events-none absolute left-6 top-6 z-10 max-w-[80vw] select-none lg:left-12 lg:top-12 lg:max-w-md">
        <p
          className="text-2xl font-extrabold uppercase leading-none tracking-wide lg:text-4xl"
          style={{
            backgroundImage: "linear-gradient(135deg, #00e5ff, #ffb300)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: "drop-shadow(0 0 18px rgba(0,229,255,0.25))",
          }}
        >
          FLAVOR&apos;S THAT HIT DIFFRENT
        </p>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6 lg:p-10">
        <div
          className="w-full max-w-sm rounded-xl p-7"
          style={{
            background: "rgba(10,10,20,0.75)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(0,229,255,0.15)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
          }}
        >
          <div className="mb-6 flex items-center gap-3">
            <LogoMark size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">ERP Wanna Be</p>
              <p className="truncate text-[11px] text-white/45">ingat kata pria solo itu</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white">eyy yooo welcome aboard</h1>
          <p className="mt-1.5 text-sm text-white/55">your work waiting mate</p>

          <form
            className="mt-6 space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/70">Username</span>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@cstore.co.id"
                autoComplete="username"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(0,229,255,0.18)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,229,255,0.55)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,229,255,0.18)")}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/70">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(0,229,255,0.18)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,229,255,0.55)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,229,255,0.18)")}
              />
            </label>

            {error ? <p className="text-xs text-[#ff6b81]">{error}</p> : null}

            <button
              type="submit"
              disabled={!hydrated}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold tracking-wide text-[#04141a] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #00e5ff, #ffb300)",
                boxShadow: "0 0 24px rgba(0,229,255,0.25)",
              }}
            >
              <KeyRound className="size-4" /> login
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-white/35">
            in god we trust, with friend we growth together
          </p>

          <p className="mt-4 text-center text-[11px] text-white/30">
            by{" "}
            <a
              href="https://www.instagram.com/404._.anggoro/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00e5ff]/70 underline decoration-dotted underline-offset-2 hover:text-[#00e5ff]"
            >
              @404._.anggoro
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
