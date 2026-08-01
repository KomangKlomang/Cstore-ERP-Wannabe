"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Chip, Spinner, useTheme } from "@heroui/react";
import {
  Activity,
  BadgeCheck,
  Barcode,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CornerDownLeft,
  Database,
  FileText,
  Gift,
  Handshake,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Network,
  PackagePlus,
  PanelsTopLeft,
  Search,
  Share2,
  ShieldCheck,
  Store as StoreIcon,
  Sun,
  Tags,
  Users,
} from "lucide-react";

import { useApp, markHydrated } from "@/lib/store";
import { can, scopeLabel, type ModuleKey } from "@/lib/rbac";
import { globalSearch } from "@/lib/derive";
import { ROLE_LABEL } from "@/lib/types";
import { LogoLockup, LogoMark } from "@/components/logo";

interface NavItem {
  href: string;
  label: string;
  /** Satu baris singkat di bawah label — apa yang sebenarnya dikerjakan modul ini. */
  deskripsi: string;
  modul: ModuleKey;
  icon: React.ComponentType<{ className?: string }>;
  /** Sorot hanya bila path persis sama (untuk parent yang punya sub-route). */
  exact?: boolean;
}

interface NavGroup {
  judul: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    judul: "Ringkasan",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        deskripsi: "Ringkasan KPI & prioritas kerja harian",
        modul: "dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/analitik",
        label: "Analitik",
        deskripsi: "Grafik & tren lintas modul (graphify)",
        modul: "analitik",
        icon: PanelsTopLeft,
      },
      {
        href: "/peta-relasi",
        label: "Peta Relasi",
        deskripsi: "Knowledge graph relasi seluruh master data",
        modul: "analitik",
        icon: Network,
      },
    ],
  },
  {
    judul: "Product MDM",
    items: [
      {
        href: "/pengajuan",
        label: "Form Pengajuan",
        deskripsi: "Ajukan SKU baru lewat grid tempel Excel",
        modul: "pengajuan",
        icon: PackagePlus,
        exact: true,
      },
      {
        href: "/pengajuan/approver",
        label: "Dashboard Approver",
        deskripsi: "Tinjau & putuskan pengajuan SKU masuk",
        modul: "approver",
        icon: ShieldCheck,
      },
      {
        href: "/mdm/plu",
        label: "Alokasi PLU",
        deskripsi: "Kelola slot nomor PLU per prefix & sub-dept",
        modul: "plu",
        icon: Barcode,
      },
      {
        href: "/mdm/freegift",
        label: "Free Gift",
        deskripsi: "Atur SKU bonus yang menyertai promosi",
        modul: "freegift",
        icon: Gift,
      },
      {
        href: "/mdm/quality",
        label: "Data Quality",
        deskripsi: "Skor kelengkapan data produk per SKU",
        modul: "quality",
        icon: Activity,
      },
    ],
  },
  {
    judul: "M1 · Master Data",
    items: [
      {
        href: "/master/category",
        label: "Kategori",
        deskripsi: "Taksonomi Segment–Dept–Category (MASTER_CAT)",
        modul: "category",
        icon: Boxes,
      },
      {
        href: "/master/product",
        label: "Produk",
        deskripsi: "Katalog SKU aktif & riwayat perubahannya",
        modul: "product",
        icon: Database,
      },
      {
        href: "/master/tag",
        label: "Tag",
        deskripsi: "Label klasifikasi tambahan pada produk",
        modul: "tag",
        icon: Tags,
      },
      {
        href: "/master/store",
        label: "Toko",
        deskripsi: "Profil & data operasional tiap toko",
        modul: "store",
        icon: StoreIcon,
      },
      {
        href: "/master/principal",
        label: "Principal",
        deskripsi: "Data mitra pemasok & brand yang dinaunginya",
        modul: "principal",
        icon: Building2,
      },
    ],
  },
  {
    judul: "M2 · Usulan",
    items: [
      {
        href: "/usulan/npd",
        label: "Usulan NPD",
        deskripsi: "Ajukan produk baru untuk dikembangkan",
        modul: "npd",
        icon: ClipboardList,
      },
      {
        href: "/usulan/tag",
        label: "Usulan Tag",
        deskripsi: "Ajukan penambahan atau ubah tag pada SKU",
        modul: "usulantag",
        icon: BadgeCheck,
      },
    ],
  },
  {
    judul: "M3–M5 · Kontrak & Marketing",
    items: [
      {
        href: "/kontrak",
        label: "Kontrak",
        deskripsi: "Pantau masa berlaku & perpanjangan kontrak",
        modul: "kontrak",
        icon: Handshake,
      },
      {
        href: "/dokumen",
        label: "Dokumen",
        deskripsi: "Arsip dokumen pendukung kontrak & legal",
        modul: "dokumen",
        icon: FileText,
      },
      {
        href: "/aset",
        label: "Aset Marketing",
        deskripsi: "Lacak aset display principal di tiap toko",
        modul: "aset",
        icon: PanelsTopLeft,
      },
      {
        href: "/promosi",
        label: "Promosi",
        deskripsi: "Kelola mekanisme & periode promosi SKU",
        modul: "promosi",
        icon: Megaphone,
      },
    ],
  },
  {
    judul: "M6 · Platform & Konten",
    items: [
      {
        href: "/platform",
        label: "Akun Platform",
        deskripsi: "Daftar akun media sosial per toko/principal",
        modul: "platform",
        icon: Share2,
      },
      {
        href: "/konten",
        label: "Content Report",
        deskripsi: "Laporan unggahan konten dari crew toko",
        modul: "konten",
        icon: Megaphone,
      },
    ],
  },
  {
    judul: "M8–M11 · Lainnya",
    items: [
      {
        href: "/laporan",
        label: "Export & Laporan",
        deskripsi: "Unduh data ke CSV atau cetak ke PDF",
        modul: "laporan",
        icon: FileText,
      },
      {
        href: "/admin/users",
        label: "User & Role",
        deskripsi: "Kelola akun pengguna & hak akses per peran",
        modul: "users",
        icon: Users,
      },
      {
        href: "/admin/audit",
        label: "Audit Trail",
        deskripsi: "Riwayat perubahan data lintas modul",
        modul: "audit",
        icon: ShieldCheck,
      },
    ],
  },
];

const SEMUA_ITEM = NAV.flatMap((g) => g.items.map((i) => ({ ...i, grup: g.judul })));

/** Label ruas URL untuk breadcrumb. */
const RUAS: Record<string, string> = {
  dashboard: "Dashboard",
  analitik: "Analitik",
  "peta-relasi": "Peta Relasi",
  master: "Master Data",
  category: "Kategori",
  product: "Produk",
  tag: "Tag",
  store: "Toko",
  principal: "Principal",
  usulan: "Usulan",
  npd: "Usulan NPD",
  kontrak: "Kontrak",
  dokumen: "Dokumen",
  aset: "Aset Marketing",
  promosi: "Promosi",
  platform: "Akun Platform",
  konten: "Content Report",
  laporan: "Export & Laporan",
  admin: "Administrasi",
  users: "User & Role",
  audit: "Audit Trail",
  pengajuan: "Form Pengajuan",
  approver: "Dashboard Approver",
  mdm: "Product MDM",
  plu: "Alokasi PLU",
  freegift: "Free Gift",
  quality: "Data Quality",
};

/* ------------------------------------------------------------------ Hydration */

export function useHydrated() {
  const hydrated = useApp((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) markHydrated();
  }, [hydrated]);
  return hydrated;
}

/* ------------------------------------------------------------ Command palette */

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const db = useApp((s) => s);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const [q, setQ] = useState("");
  const [aktif, setAktif] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const modul = useMemo(
    () =>
      SEMUA_ITEM.filter((i) => can(user, i.modul)).filter((i) =>
        q.trim() ? `${i.label} ${i.grup}`.toLowerCase().includes(q.trim().toLowerCase()) : true,
      ),
    [user, q],
  );

  const entitas = useMemo(() => {
    if (q.trim().length < 2) return [];
    return Object.entries(globalSearch(db, q, 4)).flatMap(([grup, hits]) =>
      hits.map((h) => ({ grup, ...h })),
    );
  }, [db, q]);

  const daftar = useMemo(
    () => [
      ...modul.slice(0, 8).map((m) => ({ tipe: "modul" as const, href: m.href, judul: m.label, sub: m.grup, icon: m.icon })),
      ...entitas.map((e) => ({ tipe: "data" as const, href: e.href, judul: e.judul, sub: `${e.grup} · ${e.subjudul}`, icon: undefined })),
    ],
    [modul, entitas],
  );

  useEffect(() => {
    if (open) {
      setQ("");
      setAktif(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => setAktif(0), [q]);

  const buka = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh] no-print">
      <div className="absolute inset-0 bg-backdrop" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cari atau lompat ke halaman"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-overlay shadow-overlay"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari halaman, produk, toko, principal…"
            className="w-full bg-transparent py-3.5 text-sm text-foreground outline-none placeholder:text-muted"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setAktif((a) => Math.min(a + 1, daftar.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setAktif((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter" && daftar[aktif]) buka(daftar[aktif].href);
            }}
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[11px] text-muted sm:block">Esc</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {daftar.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">Tidak ada yang cocok dengan “{q}”.</p>
          ) : (
            daftar.map((d, i) => {
              const Icon = d.icon;
              return (
                <button
                  key={`${d.tipe}-${d.href}-${i}`}
                  type="button"
                  onMouseEnter={() => setAktif(i)}
                  onClick={() => buka(d.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                    i === aktif ? "bg-accent-soft text-accent-soft-foreground" : "text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {Icon ? (
                    <Icon className="size-4 shrink-0 opacity-70" />
                  ) : (
                    <span className="grid size-4 shrink-0 place-items-center text-[10px] opacity-70">#</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{d.judul}</span>
                    <span className="block truncate text-xs text-muted">{d.sub}</span>
                  </span>
                  {i === aktif ? <CornerDownLeft className="size-3.5 shrink-0 opacity-60" /> : null}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted">
          <span>↑↓ pilih</span>
          <span>⏎ buka</span>
          <span className="ml-auto">Ctrl + K untuk membuka kapan saja</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Sidebar */

const KEY_GRUP = "erp-nav-collapsed";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const [tutup, setTutup] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY_GRUP);
      if (raw) setTutup(JSON.parse(raw));
    } catch {
      /* abaikan — preferensi tampilan saja */
    }
  }, []);

  function toggle(judul: string) {
    setTutup((prev) => {
      const next = prev.includes(judul) ? prev.filter((x) => x !== judul) : [...prev, judul];
      try {
        localStorage.setItem(KEY_GRUP, JSON.stringify(next));
      } catch {
        /* abaikan */
      }
      return next;
    });
  }

  return (
    <nav className="flex h-full flex-col gap-3 overflow-y-auto p-3" aria-label="Navigasi utama">
      <Link href="/dashboard" className="px-1 py-1" onClick={onNavigate}>
        <LogoLockup size={38} />
      </Link>

      {NAV.map((grup) => {
        const items = grup.items.filter((i) => can(user, i.modul));
        if (!items.length) return null;
        const adaAktif = items.some((i) => pathname === i.href || (!i.exact && pathname.startsWith(`${i.href}/`)));
        const dilipat = tutup.includes(grup.judul) && !adaAktif;

        return (
          <div key={grup.judul}>
            <button
              type="button"
              onClick={() => toggle(grup.judul)}
              aria-expanded={!dilipat}
              className="mb-1 flex w-full items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted hover:bg-surface-hover"
            >
              {dilipat ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
              <span className="truncate">{grup.judul}</span>
              {dilipat ? <span className="ml-auto tabular-nums opacity-60">{items.length}</span> : null}
            </button>

            {!dilipat ? (
              <ul className="space-y-0.5">
                {items.map((i) => {
                  const aktif = i.exact
                    ? pathname === i.href
                    : pathname === i.href || pathname.startsWith(`${i.href}/`);
                  const Icon = i.icon;
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={onNavigate}
                        aria-current={aktif ? "page" : undefined}
                        className={`relative flex items-start gap-2.5 rounded-lg py-1.5 pl-3 pr-2 text-sm transition-colors ${
                          aktif
                            ? "bg-accent-soft font-medium text-accent-soft-foreground"
                            : "text-foreground hover:bg-surface-hover"
                        }`}
                      >
                        {aktif ? (
                          <span aria-hidden className="absolute left-0 top-1.5 h-[calc(100%-0.75rem)] w-0.5 rounded-full bg-accent" />
                        ) : null}
                        <Icon className="mt-0.5 size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate leading-tight">{i.label}</span>
                          <span className="block truncate text-xs leading-tight text-muted">{i.deskripsi}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

/* ---------------------------------------------------------------- Breadcrumb */

function Breadcrumb() {
  const pathname = usePathname();
  const ruas = pathname.split("/").filter(Boolean);
  if (!ruas.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
      {ruas.map((r, i) => {
        const href = `/${ruas.slice(0, i + 1).join("/")}`;
        const terakhir = i === ruas.length - 1;
        const label = RUAS[r] ?? decodeURIComponent(r);
        return (
          <span key={href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 ? <ChevronRight className="size-3.5 shrink-0 text-muted" aria-hidden /> : null}
            {terakhir ? (
              <span className="truncate font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="truncate text-muted hover:text-foreground">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* --------------------------------------------------------------------- Shell */

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const currentUserId = useApp((s) => s.currentUserId);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const logout = useApp((s) => s.logout);
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    if (hydrated && !currentUserId) router.replace("/login");
  }, [hydrated, currentUserId, router]);

  /* FR-9.5 — Crew hanya punya modul Content Report, jadi diarahkan ke sana. */
  useEffect(() => {
    if (user?.role === "CREW" && !pathname.startsWith("/konten")) router.replace("/konten");
  }, [user?.role, pathname, router]);

  /* Pintasan global: Ctrl/Cmd + K membuka pencarian & lompat halaman. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center gap-3 text-center">
        <Spinner />
        <p className="text-sm text-muted">Mengalihkan ke halaman login…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-surface lg:block no-print">
        <Sidebar />
      </aside>

      {mobileNav ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-backdrop" onClick={() => setMobileNav(false)} aria-hidden />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-border bg-surface">
            <Sidebar onNavigate={() => setMobileNav(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur no-print">
          <Button variant="ghost" isIconOnly aria-label="Buka menu" className="lg:hidden" onPress={() => setMobileNav(true)}>
            <Menu className="size-4" />
          </Button>
          <LogoMark size={26} className="lg:hidden" />

          <Breadcrumb />

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-hover"
              aria-label="Cari atau lompat ke halaman"
            >
              <Search className="size-4" />
              <span className="hidden sm:inline">Cari atau lompat…</span>
              <kbd className="hidden rounded border border-border px-1 text-[10px] sm:inline">Ctrl K</kbd>
            </button>

            <Button
              variant="ghost"
              isIconOnly
              aria-label="Ganti tema"
              onPress={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-foreground">{user.nama}</p>
              <p className="text-[11px] leading-tight text-muted">
                {ROLE_LABEL[user.role]} · {scopeLabel(user)}
              </p>
            </div>
            <Chip size="sm" variant="soft" color="accent" className="hidden sm:inline-flex">
              {user.role}
            </Chip>
            <Button
              variant="ghost"
              isIconOnly
              aria-label="Keluar"
              onPress={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

/** Guard per modul — dipakai di setiap halaman. */
export function Guard({ modul, children }: { modul: ModuleKey; children: React.ReactNode }) {
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  if (!can(user, modul)) {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger-soft p-6 text-danger-soft-foreground">
        <p className="font-medium">Akses ditolak</p>
        <p className="mt-1 text-sm">
          Peran <b>{user ? ROLE_LABEL[user.role] : "-"}</b> tidak memiliki izin untuk modul ini (FR-9.3).
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
