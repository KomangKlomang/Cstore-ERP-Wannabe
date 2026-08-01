"use client";

import { useEffect, useRef } from "react";

/**
 * Latar animasi halaman masuk — konstelasi entitas basis data yang melayang
 * pelan dan saling terhubung oleh denyut cahaya yang berjalan di sepanjang
 * tautannya.
 *
 * Sengaja BUKAN memakai mesin `graphify/explorer` (force-directed, deteksi
 * komunitas, pan/zoom) — itu dibangun untuk menjelajahi data sungguhan.
 * Komponen ini murni dekoratif: tiap simpul melayang independen di sekitar
 * posisi dasarnya sendiri, bukan saling tarik-menarik secara fisik.
 */

interface SimpulGraf {
  label: string;
  /** Posisi dasar dalam pecahan 0..1 — dihitung ulang tiap resize supaya tata
   *  letak tetap sebanding pada ukuran layar berapa pun. */
  fx: number;
  fy: number;
  /** Posisi piksel saat ini, hasil dasar + wander + tarikan kursor. */
  x: number;
  y: number;
  /** Fase acak per simpul — supaya wander-nya tidak serentak dan terasa hidup. */
  fase: number;
  kecepatan: number;
  warna: string;
}

interface TautanGraf {
  a: number;
  b: number;
  warna: string;
  /** Beberapa denyut berjalan di satu tautan, tiap denyut punya progres 0..1 sendiri. */
  denyut: { t: number; kecepatan: number }[];
}

const ENTITAS: Array<{ label: string; fx: number; fy: number }> = [
  { label: "Store", fx: 0.16, fy: 0.22 },
  { label: "Product", fx: 0.5, fy: 0.12 },
  { label: "Principal", fx: 0.82, fy: 0.2 },
  { label: "User", fx: 0.12, fy: 0.55 },
  { label: "Contract", fx: 0.85, fy: 0.52 },
  { label: "Asset", fx: 0.3, fy: 0.82 },
  { label: "Promotion", fx: 0.6, fy: 0.88 },
  { label: "Brand", fx: 0.68, fy: 0.62 },
];

/** Relasi longgar antar entitas — cukup untuk terasa seperti skema DB sungguhan. */
const RELASI: Array<[number, number]> = [
  [3, 0], // User -> Store
  [3, 1], // User -> Product
  [2, 1], // Principal -> Product
  [2, 7], // Principal -> Brand
  [2, 4], // Principal -> Contract
  [4, 0], // Contract -> Store
  [4, 5], // Contract -> Asset
  [5, 0], // Asset -> Store
  [6, 2], // Promotion -> Principal
  [6, 1], // Promotion -> Product
  [7, 1], // Brand -> Product
];

const SIAN = "#00e5ff";
const AMBER = "#ffb300";
const TAUTAN_REDUP = "#1a3a3a";

/** Pembangkit acak berbenih — tata letak awal harus sama tiap kali dimuat. */
function acakBerbenih(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function CyberGraph({ className = "" }: { className?: string }) {
  const kanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const kanvas = kanvasRef.current;
    if (!kanvas) return;
    const ctx = kanvas.getContext("2d");
    if (!ctx) return;

    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rnd = acakBerbenih(19);

    const simpul: SimpulGraf[] = ENTITAS.map((e, i) => ({
      label: e.label,
      fx: e.fx,
      fy: e.fy,
      x: 0,
      y: 0,
      fase: rnd() * Math.PI * 2,
      kecepatan: 0.35 + rnd() * 0.35,
      warna: i % 3 === 0 ? AMBER : SIAN,
    }));

    const tautan: TautanGraf[] = RELASI.map(([a, b], i) => ({
      a,
      b,
      warna: i % 4 === 0 ? AMBER : SIAN,
      denyut: [
        { t: rnd(), kecepatan: 0.12 + rnd() * 0.1 },
        ...(rnd() > 0.5 ? [{ t: rnd(), kecepatan: 0.1 + rnd() * 0.08 }] : []),
      ],
    }));

    let W = 0;
    let H = 0;
    let dpr = 1;

    function ukuranUlang() {
      const kv = kanvasRef.current;
      if (!kv) return;
      const r = kv.parentElement?.getBoundingClientRect() ?? kv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      kv.width = Math.round(W * dpr);
      kv.height = Math.round(H * dpr);
      kv.style.width = `${W}px`;
      kv.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const s of simpul) {
        s.x = s.fx * W;
        s.y = s.fy * H;
      }
    }

    const pointer = { x: -9999, y: -9999, aktif: false };
    function onMove(ev: MouseEvent) {
      const kv = kanvasRef.current;
      if (!kv) return;
      const r = kv.getBoundingClientRect();
      pointer.x = ev.clientX - r.left;
      pointer.y = ev.clientY - r.top;
      pointer.aktif = true;
    }
    function onLeave() {
      pointer.aktif = false;
    }

    ukuranUlang();
    window.addEventListener("resize", ukuranUlang);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    let waktuTerakhir = 0;
    let mulai = 0;
    let idFrame = 0;
    /** Batasi ke ~60fps — sebagian layar (120/144Hz) memanggil rAF lebih cepat dari itu. */
    const INTERVAL_MIN = 1000 / 60 - 2;

    function gambar(waktu: number) {
      idFrame = requestAnimationFrame(gambar);
      if (waktu - waktuTerakhir < INTERVAL_MIN) return;
      const dt = waktuTerakhir ? (waktu - waktuTerakhir) / 1000 : 0;
      waktuTerakhir = waktu;
      if (!mulai) mulai = waktu;
      const t = (waktu - mulai) / 1000;

      ctx!.clearRect(0, 0, W, H);
      if (!W || !H) return;

      /* --- posisi simpul: dasar + wander pelan + tarikan kursor --- */
      for (const s of simpul) {
        const dasarX = s.fx * W;
        const dasarY = s.fy * H;
        const wanderX = Math.cos(t * s.kecepatan + s.fase) * 14;
        const wanderY = Math.sin(t * s.kecepatan * 0.8 + s.fase) * 14;

        let tujuanX = dasarX + wanderX;
        let tujuanY = dasarY + wanderY;

        if (pointer.aktif) {
          const dx = pointer.x - s.x;
          const dy = pointer.y - s.y;
          const jarak = Math.sqrt(dx * dx + dy * dy);
          if (jarak < 120 && jarak > 0.01) {
            const tarik = (1 - jarak / 120) * 22;
            tujuanX += (dx / jarak) * tarik;
            tujuanY += (dy / jarak) * tarik;
          }
        }

        /* pegas lembut menuju tujuan — kalau langsung di-snap, geraknya patah-patah */
        const pegas = kurangiGerak ? 1 : Math.min(1, dt * 3.2);
        s.x += (tujuanX - s.x) * pegas;
        s.y += (tujuanY - s.y) * pegas;
      }

      /* --- tautan + denyut yang berjalan di sepanjangnya --- */
      for (const l of tautan) {
        const a = simpul[l.a];
        const b = simpul[l.b];

        ctx!.strokeStyle = TAUTAN_REDUP;
        ctx!.lineWidth = 1;
        ctx!.globalAlpha = 0.55;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
        ctx!.globalAlpha = 1;

        if (!kurangiGerak) {
          for (const d of l.denyut) {
            d.t = (d.t + d.kecepatan * dt) % 1;
            const px = a.x + (b.x - a.x) * d.t;
            const py = a.y + (b.y - a.y) * d.t;

            ctx!.beginPath();
            ctx!.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx!.fillStyle = l.warna;
            ctx!.shadowColor = l.warna;
            ctx!.shadowBlur = 8;
            ctx!.fill();
            ctx!.shadowBlur = 0;
          }
        }
      }

      /* --- simpul + label, digambar setelah tautan supaya selalu di atas --- */
      ctx!.font = "500 11px system-ui, sans-serif";
      ctx!.textAlign = "center";
      for (const s of simpul) {
        const dx = pointer.x - s.x;
        const dy = pointer.y - s.y;
        const jarak = Math.sqrt(dx * dx + dy * dy);
        const dekat = pointer.aktif && jarak < 120;
        const intensitas = dekat ? 1 - jarak / 120 : 0;

        const radius = 5 + intensitas * 2.5;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx!.fillStyle = s.warna;
        ctx!.shadowColor = s.warna;
        ctx!.shadowBlur = 10 + intensitas * 16;
        ctx!.fill();
        ctx!.shadowBlur = 0;

        /* cincin tipis di sekitar simpul — aksen khas panel kendali */
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, radius + 4, 0, Math.PI * 2);
        ctx!.strokeStyle = s.warna;
        ctx!.globalAlpha = 0.25 + intensitas * 0.35;
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.globalAlpha = 1;

        ctx!.fillStyle = "rgba(224,240,245,0.75)";
        ctx!.fillText(s.label, s.x, s.y - radius - 9);
      }
    }

    /* Gambar satu frame sinkron dulu, jangan tunggu rAF — kalau tab ini baru
       dibuka di latar belakang, rAF ditahan penuh oleh peramban sampai tab
       tampil, dan kanvas akan kosong selama itu tanpa langkah ini. */
    gambar(performance.now());

    return () => {
      cancelAnimationFrame(idFrame);
      window.removeEventListener("resize", ukuranUlang);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    // `absolute inset-0` baku di sini, bukan lewat prop `className` — kalau
    // pemanggil mengoper "absolute" lewat className dan root ini juga punya
    // "relative", Tailwind akan memuat definisi `absolute` lebih dulu di
    // stylesheet lalu `relative` menimpanya (last-defined-wins), sehingga
    // elemen jatuh jadi item grid biasa dan tingginya collapse ke 0 — persis
    // yang terjadi sebelum perbaikan ini.
    <div className={`absolute inset-0 h-full w-full overflow-hidden bg-[#0a0a0f] ${className}`}>
      <canvas ref={kanvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

      {/* Overlay scanline + grid — CSS murni, bukan canvas, supaya tidak ikut
          terhitung dalam anggaran gambar-ulang tiap frame. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(rgba(0,229,255,0.05) 0px, rgba(0,229,255,0.05) 1px, transparent 1px, transparent 3px)," +
            "linear-gradient(rgba(0,229,255,0.05) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(0,229,255,0.05) 1px, transparent 1px)",
          backgroundSize: "100% 3px, 48px 48px, 48px 48px",
          mixBlendMode: "screen",
        }}
      />

      {/* Vignette lembut supaya tepi kanvas melebur ke panel form. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(10,10,15,0.55) 100%)",
        }}
      />
    </div>
  );
}
