"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid3x3, Plus, Trash2 } from "lucide-react";

/**
 * Grid ala spreadsheet untuk input massal.
 * Mendukung paste langsung dari Excel (TSV), seleksi rentang sel dengan
 * klik + drag, seleksi baris/kolom lewat header, dan hapus isi via tombol Delete.
 */

export interface SheetColumn {
  key: string;
  label: string;
  /** Lebar kolom dalam piksel. */
  width?: number;
  required?: boolean;
  /** Kolom terisi otomatis oleh sistem — tidak bisa diketik. */
  auto?: boolean;
  placeholder?: string;
}

export interface SheetGroup {
  label: string;
  /** Warna latar band header grup. */
  bg: string;
  columns: SheetColumn[];
}

export type SheetRow = Record<string, string>;

interface Sel {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

const norm = (s: Sel) => ({
  rMin: Math.min(s.r1, s.r2),
  rMax: Math.max(s.r1, s.r2),
  cMin: Math.min(s.c1, s.c2),
  cMax: Math.max(s.c1, s.c2),
});

export function SheetGrid({
  groups,
  rows,
  onChange,
  emptyRow,
  autoFill,
}: {
  groups: SheetGroup[];
  rows: SheetRow[];
  onChange: (rows: SheetRow[]) => void;
  /** Pembuat baris kosong baru. */
  emptyRow: () => SheetRow;
  /** Dipanggil tiap baris berubah untuk mengisi kolom `auto`. */
  autoFill?: (row: SheetRow) => SheetRow;
}) {
  const cols = useMemo(() => groups.flatMap((g) => g.columns), [groups]);
  const [sel, setSel] = useState<Sel | null>(null);
  const dragging = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** Jangkar terakhir — ref supaya paste tepat setelah klik tetap terbaca. */
  const anchor = useRef<{ r: number; c: number }>({ r: 0, c: 0 });

  const pilih = useCallback((s: Sel) => {
    anchor.current = { r: Math.min(s.r1, s.r2), c: Math.min(s.c1, s.c2) };
    setSel(s);
  }, []);

  const terapkan = useCallback(
    (next: SheetRow[]) => onChange(autoFill ? next.map(autoFill) : next),
    [onChange, autoFill],
  );

  const setCell = (r: number, key: string, v: string) => {
    const next = rows.map((row, i) => (i === r ? { ...row, [key]: v } : row));
    terapkan(next);
  };

  /* ------------------------------------------------------------- seleksi */

  const inSel = (r: number, c: number) => {
    if (!sel) return false;
    const { rMin, rMax, cMin, cMax } = norm(sel);
    return r >= rMin && r <= rMax && c >= cMin && c <= cMax;
  };

  const jumlahSel = sel ? (() => {
    const { rMin, rMax, cMin, cMax } = norm(sel);
    return (rMax - rMin + 1) * (cMax - cMin + 1);
  })() : 0;

  const barisTerpilih = sel ? (() => {
    const { cMin, cMax } = norm(sel);
    return cMin === 0 && cMax === cols.length - 1;
  })() : false;

  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  /* -------------------------------------------------------------- aksi */

  function kosongkanSeleksi() {
    if (!sel) return;
    const { rMin, rMax, cMin, cMax } = norm(sel);
    const next = rows.map((row, r) => {
      if (r < rMin || r > rMax) return row;
      const copy = { ...row };
      for (let c = cMin; c <= cMax; c++) copy[cols[c].key] = "";
      return copy;
    });
    terapkan(next);
  }

  function hapusBaris() {
    if (!sel) return;
    const { rMin, rMax } = norm(sel);
    const sisa = rows.filter((_, r) => r < rMin || r > rMax);
    terapkan(sisa.length ? sisa : [emptyRow()]);
    setSel(null);
  }

  /** Paste TSV dari Excel mulai dari sel jangkar. */
  function handlePaste(e: React.ClipboardEvent) {
    const teks = e.clipboardData.getData("text/plain");
    if (!teks) return;
    const matrix = teks.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((l) => l.split("\t"));
    if (matrix.length === 1 && matrix[0].length === 1) return; // biarkan paste normal 1 sel

    e.preventDefault();
    const { r: rMin, c: cMin } = anchor.current;
    const perlu = rMin + matrix.length;
    const next = [...rows];
    while (next.length < perlu) next.push(emptyRow());

    matrix.forEach((baris, dr) => {
      const row = { ...next[rMin + dr] };
      baris.forEach((nilai, dc) => {
        const col = cols[cMin + dc];
        if (!col || col.auto) return;
        row[col.key] = nilai.trim();
      });
      next[rMin + dr] = row;
    });

    terapkan(next);
    pilih({ r1: rMin, c1: cMin, r2: rMin + matrix.length - 1, c2: Math.min(cMin + matrix[0].length - 1, cols.length - 1) });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === "Delete" || e.key === "Backspace") && jumlahSel > 1) {
      e.preventDefault();
      kosongkanSeleksi();
    }
  }

  const terisi = rows.filter((r) => (r.name ?? "").trim().length > 0).length;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div
        ref={wrapRef}
        className="overflow-x-auto"
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <table className="w-max border-collapse text-sm" style={{ minWidth: "100%" }}>
          <thead>
            {/* band grup */}
            <tr>
              <th
                rowSpan={2}
                /* DARKMODE_AUDIT.md: bg literal tetap, BUKAN --brand-ink —
                   token itu sengaja membalik polaritas per tema (gelap di
                   mode terang, nyaris putih di mode gelap) sehingga akan
                   menabrak text-white yang tetap. Sel pojok ini memang aksen
                   gelap tetap, senada dengan band grup kolom di sebelahnya. */
                className="sticky left-0 z-20 w-11 border-r border-b border-border bg-[#1c1c1c] text-white"
              >
                <Grid3x3 className="mx-auto size-4" aria-hidden />
                <span className="sr-only">Nomor baris</span>
              </th>
              {groups.map((g) => (
                <th
                  key={g.label}
                  colSpan={g.columns.length}
                  className="border-r border-border px-3 py-2 text-left text-[13px] font-semibold text-white last:border-r-0"
                  style={{ background: g.bg }}
                >
                  {g.label}
                </th>
              ))}
            </tr>
            {/* nama kolom */}
            <tr>
              {cols.map((c, ci) => (
                <th
                  key={c.key}
                  onClick={() => pilih({ r1: 0, c1: ci, r2: rows.length - 1, c2: ci })}
                  className="cursor-pointer whitespace-nowrap border-r border-b border-border bg-surface-secondary px-3 py-1.5 text-left text-xs font-medium text-muted hover:bg-surface-hover"
                  style={{ minWidth: c.width ?? 130 }}
                  title="Klik untuk memilih seluruh kolom"
                >
                  {c.label}
                  {c.required ? <span className="ml-0.5 text-danger">*</span> : null}
                  {c.auto ? <span className="ml-1 font-normal text-muted/70">(auto)</span> : null}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="even:bg-background/40">
                <td
                  onClick={() => pilih({ r1: r, c1: 0, r2: r, c2: cols.length - 1 })}
                  className={`sticky left-0 z-10 cursor-pointer border-r border-b border-border text-center text-xs tabular-nums ${
                    sel && r >= norm(sel).rMin && r <= norm(sel).rMax ? "bg-accent-soft text-accent-soft-foreground" : "bg-surface-secondary text-muted"
                  }`}
                  title="Klik untuk memilih seluruh baris"
                >
                  {r + 1}
                </td>

                {cols.map((c, ci) => {
                  const dipilih = inSel(r, ci);
                  return (
                    <td
                      key={c.key}
                      onMouseDown={() => {
                        dragging.current = true;
                        pilih({ r1: r, c1: ci, r2: r, c2: ci });
                      }}
                      onMouseEnter={() => {
                        if (dragging.current) setSel((s) => (s ? { ...s, r2: r, c2: ci } : s));
                      }}
                      className={`border-r border-b border-border p-0 ${dipilih ? "bg-accent-soft/60" : ""}`}
                    >
                      <input
                        value={row[c.key] ?? ""}
                        readOnly={c.auto}
                        placeholder={c.auto ? "auto" : c.placeholder}
                        onChange={(e) => setCell(r, c.key, e.target.value)}
                        onFocus={() => pilih({ r1: r, c1: ci, r2: r, c2: ci })}
                        className={`w-full bg-transparent px-3 py-1.5 outline-none ${
                          c.auto ? "cursor-default text-muted" : "text-foreground"
                        }`}
                        style={{ minWidth: c.width ?? 130 }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={() => terapkan([...rows, emptyRow()])}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-foreground hover:bg-surface-hover"
        >
          <Plus className="size-4" /> Tambah Baris
        </button>
        <span className="text-xs text-muted tabular-nums">
          {rows.length} baris · {terisi} terisi
        </span>

        {jumlahSel > 1 || barisTerpilih ? (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-muted tabular-nums">{jumlahSel} sel dipilih</span>
            <button
              type="button"
              onClick={kosongkanSeleksi}
              className="rounded-lg border border-border px-2 py-1 text-xs text-foreground hover:bg-surface-hover"
            >
              Kosongkan isi
            </button>
            {barisTerpilih ? (
              <button
                type="button"
                onClick={hapusBaris}
                className="inline-flex items-center gap-1 rounded-lg border border-danger/40 bg-danger-soft px-2 py-1 text-xs text-danger-soft-foreground"
              >
                <Trash2 className="size-3.5" /> Hapus baris
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
