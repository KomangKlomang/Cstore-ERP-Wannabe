"use client";

import { useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { AlertTriangle, Check, Download, Plus, RotateCcw, Trash2 } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { Callout, PageHeader, SearchBox, SelectField, StatusChip, Toolbar } from "@/components/ui";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV, exportExcel } from "@/lib/export";
import type { CategoryRow } from "@/lib/types";
import { fmtTglJam } from "@/lib/format";

export default function CategoryPage() {
  return (
    <Guard modul="category">
      <CategoryView />
    </Guard>
  );
}

/* ----------------------------------------------------------------- validasi */

/** IMP-6 — kode wajib hierarkis: setiap level diawali kode induknya. */
export function validateCategory(row: CategoryRow, semua: CategoryRow[]): string[] {
  const err: string[] = [];
  const wajib: Array<[keyof CategoryRow, string]> = [
    ["segmentCode", "Kode Segment"],
    ["segment", "Nama Segment"],
    ["deptCode", "Kode Dept"],
    ["dept", "Nama Dept"],
    ["subDeptCode", "Kode Sub Dept"],
    ["subDept", "Nama Sub Dept"],
    ["categoryCode", "Kode Category"],
    ["category", "Nama Category"],
    ["subCategoryCode", "Kode Sub Category"],
    ["subCategory", "Nama Sub Category"],
  ];
  wajib.forEach(([k, label]) => {
    if (!String(row[k] ?? "").trim()) err.push(`${label} wajib diisi.`);
  });

  /* Hirarki kode: Dept > Sub Dept > Category > Sub Category.
     Segment adalah pengelompokan komersial terpisah, bukan induk Dept. */
  if (row.subDeptCode && !row.subDeptCode.startsWith(row.deptCode)) err.push("Kode Sub Dept harus diawali kode Dept.");
  if (row.categoryCode && !row.categoryCode.startsWith(row.subDeptCode)) err.push("Kode Category harus diawali kode Sub Dept.");
  if (row.subCategoryCode && !row.subCategoryCode.startsWith(row.categoryCode))
    err.push("Kode Sub Category harus diawali kode Category.");

  const dupSub = semua.some((c) => c.id !== row.id && c.subCategoryCode === row.subCategoryCode);
  if (dupSub) err.push(`Kode Sub Category "${row.subCategoryCode}" sudah dipakai (duplikat ditolak).`);

  const bentrokCategory = semua.some(
    (c) => c.id !== row.id && c.categoryCode === row.categoryCode && c.category !== row.category,
  );
  if (bentrokCategory) err.push(`Kode Category "${row.categoryCode}" sudah dipakai untuk nama Category lain.`);

  /* FR-TAX-02 — dual mapping wajib terisi sebelum baris dipakai SKU. */
  if (!row.kdHashmicro?.trim()) err.push("Kode sisi HASHMICRO wajib diisi.");
  if (!row.kdCompLtw?.trim()) err.push("Kode sisi COMP. LTW wajib diisi.");

  return err;
}

const KOSONG: CategoryRow = {
  id: "",
  segmentCode: "",
  segment: "",
  deptCode: "",
  dept: "",
  subDeptCode: "",
  subDept: "",
  categoryCode: "",
  category: "",
  subCategoryCode: "",
  subCategory: "",
  kdHashmicro: "",
  kdCompLtw: "",
  untukCoa: true,
  status: "AKTIF",
  updatedAt: "",
  updatedBy: "",
};

/* --------------------------------------------------------------------- view */

function CategoryView() {
  const rows = useApp((s) => s.categories);
  const saveRow = useApp((s) => s.saveRow);
  const removeRow = useApp((s) => s.removeRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);

  const boleh = can(user, "category", "edit");
  const bolehHapus = can(user, "category", "delete");

  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState("");
  const [baris, setBaris] = useState<CategoryRow>({ ...KOSONG });
  const [errBaru, setErrBaru] = useState<string[]>([]);

  const segments = useMemo(
    () => [...new Set(rows.map((r) => r.segment))].map((s) => ({ id: s, label: s })),
    [rows],
  );

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (segment && r.segment !== segment) return false;
      if (status && r.status !== status) return false;
      if (!term) return true;
      return [r.subCategoryCode, r.subCategory, r.category, r.subDept, r.dept, r.segment]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [rows, q, segment, status]);

  const kolomExport = [
    { key: "segmentCode", header: "Segment Code", value: (r: CategoryRow) => r.segmentCode },
    { key: "segment", header: "Segment", value: (r: CategoryRow) => r.segment },
    { key: "deptCode", header: "Dept Code", value: (r: CategoryRow) => r.deptCode },
    { key: "dept", header: "Dept", value: (r: CategoryRow) => r.dept },
    { key: "subDeptCode", header: "Sub Dept Code", value: (r: CategoryRow) => r.subDeptCode },
    { key: "subDept", header: "Sub Dept", value: (r: CategoryRow) => r.subDept },
    { key: "categoryCode", header: "Category Code", value: (r: CategoryRow) => r.categoryCode },
    { key: "category", header: "Category", value: (r: CategoryRow) => r.category },
    { key: "subCategoryCode", header: "Sub Category Code", value: (r: CategoryRow) => r.subCategoryCode },
    { key: "subCategory", header: "Sub Category", value: (r: CategoryRow) => r.subCategory },
    { key: "kdHashmicro", header: "Kode HASHMICRO", value: (r: CategoryRow) => r.kdHashmicro ?? "" },
    { key: "kdCompLtw", header: "Kode COMP. LTW", value: (r: CategoryRow) => r.kdCompLtw ?? "" },
    { key: "coa", header: "UNTUK COA", value: (r: CategoryRow) => (r.untukCoa ? "Y" : "N") },
    { key: "status", header: "Status", value: (r: CategoryRow) => r.status },
    { key: "alias", header: "Alias (kode lama)", value: (r: CategoryRow) => r.alias ?? "" },
  ];

  function tambahBaris() {
    const calon: CategoryRow = { ...baris, id: newId("cat") };
    const err = validateCategory(calon, rows);
    if (err.length) {
      setErrBaru(err);
      return;
    }
    saveRow("categories", calon);
    setBaris({ ...KOSONG, segmentCode: baris.segmentCode, segment: baris.segment, deptCode: baris.deptCode, dept: baris.dept });
    setErrBaru([]);
  }

  return (
    <>
      <PageHeader
        judul="Master Category"
        modul="M1 · FR-1.1 / FR-1.2"
        deskripsi="Taksonomi 5 level dalam bentuk tabel. Penambahan & perubahan dilakukan langsung di dalam baris tabel — tanpa panel atau modal terpisah (R8 & R9)."
        aksi={
          <>
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolomExport, "master-category")}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" onPress={() => exportExcel(terfilter, kolomExport, "master-category", "Category")}>
              <Download className="size-4" /> Excel
            </Button>
          </>
        }
      />

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Cari kode / nama kategori…" />
        <SelectField
          label="Segment"
          items={[{ id: "", label: "Semua segment" }, ...segments]}
          value={segment}
          onChange={setSegment}
          className="w-56"
        />
        <SelectField
          label="Status"
          items={[
            { id: "", label: "Semua status" },
            { id: "AKTIF", label: "Aktif" },
            { id: "NONAKTIF", label: "Nonaktif" },
          ]}
          value={status}
          onChange={setStatus}
          className="w-44"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">
          {terfilter.length} dari {rows.length} baris
        </span>
      </Toolbar>

      <div className="mb-4">
        <Callout tone="info" judul="Dual-code mapping & flag COA">
          Setiap baris menyimpan kode pada dua sisi sistem: <b>HASHMICRO</b> (ERP internal) dan sisi kedua yang pada
          file sumber dilabeli <b>COMP. LTW</b>. Keduanya wajib terisi sebelum baris boleh dipakai SKU (FR-TAX-02).
          Arti pasti sisi COMP. LTW dan flag <b>UNTUK COA</b> masih menunggu konfirmasi tim Finance (OQ 9.4).
          Segment adalah pengelompokan komersial turunan Sub Category, bukan induk dari Dept.
        </Callout>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[1180px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Segment</th>
              <th className="px-3 py-2 font-medium">Dept</th>
              <th className="px-3 py-2 font-medium">Sub Dept</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Sub Category</th>
              <th className="px-3 py-2 font-medium">Mapping kode</th>
              <th className="px-3 py-2 text-center font-medium">COA</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Terakhir diubah</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {terfilter.map((r) => (
              <BarisKategori key={r.id} row={r} semua={rows} boleh={boleh} bolehHapus={bolehHapus} onSimpan={(v) => saveRow("categories", v)} onHapus={() => removeRow("categories", r.id)} />
            ))}

            {boleh ? (
              <tr className="border-t-2 border-accent/30 bg-accent-soft/30">
                <td className="px-3 py-2">
                  <SelKode
                    kode={baris.segmentCode}
                    nama={baris.segment}
                    onKode={(v) => setBaris({ ...baris, segmentCode: v })}
                    onNama={(v) => setBaris({ ...baris, segment: v })}
                    phKode="1"
                    phNama="OPEN SYSTEM"
                  />
                </td>
                <td className="px-3 py-2">
                  <SelKode
                    kode={baris.deptCode}
                    nama={baris.dept}
                    onKode={(v) => setBaris({ ...baris, deptCode: v })}
                    onNama={(v) => setBaris({ ...baris, dept: v })}
                    phKode="1"
                    phNama="E-CIGARETTE"
                  />
                </td>
                <td className="px-3 py-2">
                  <SelKode
                    kode={baris.subDeptCode}
                    nama={baris.subDept}
                    onKode={(v) => setBaris({ ...baris, subDeptCode: v })}
                    onNama={(v) => setBaris({ ...baris, subDept: v })}
                    phKode="17"
                    phNama="Nama sub dept"
                  />
                </td>
                <td className="px-3 py-2">
                  <SelKode
                    kode={baris.categoryCode}
                    nama={baris.category}
                    onKode={(v) => setBaris({ ...baris, categoryCode: v })}
                    onNama={(v) => setBaris({ ...baris, category: v })}
                    phKode="171"
                    phNama="Nama category"
                  />
                </td>
                <td className="px-3 py-2">
                  <SelKode
                    kode={baris.subCategoryCode}
                    nama={baris.subCategory}
                    onKode={(v) => setBaris({ ...baris, subCategoryCode: v })}
                    onNama={(v) => setBaris({ ...baris, subCategory: v })}
                    phKode="171A"
                    phNama="Nama sub category"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="cell-input tnum text-xs"
                    placeholder="1.17.171.171A"
                    value={baris.kdHashmicro ?? ""}
                    onChange={(e) => setBaris({ ...baris, kdHashmicro: e.target.value })}
                  />
                  <input
                    className="cell-input tnum text-xs text-muted"
                    placeholder="LTW-1711"
                    value={baris.kdCompLtw ?? ""}
                    onChange={(e) => setBaris({ ...baris, kdCompLtw: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <button type="button" onClick={() => setBaris({ ...baris, untukCoa: !baris.untukCoa })}>
                    <Chip size="sm" variant="soft" color={baris.untukCoa ? "success" : "default"}>
                      {baris.untukCoa ? "Y" : "N"}
                    </Chip>
                  </button>
                </td>
                <td className="px-3 py-2">
                  <Chip size="sm" variant="soft" color="accent">
                    Baris baru
                  </Chip>
                </td>
                <td className="px-3 py-2 text-xs text-muted">Belum disimpan</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="primary" onPress={tambahBaris}>
                      <Plus className="size-3.5" /> Tambah
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label="Kosongkan baris baru"
                      onPress={() => {
                        setBaris({ ...KOSONG });
                        setErrBaru([]);
                      }}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {errBaru.length ? (
        <ul className="mt-3 space-y-1 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          {errBaru.map((e) => (
            <li key={e} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {e}
            </li>
          ))}
        </ul>
      ) : null}

      {!boleh ? (
        <p className="mt-3 text-xs text-muted">
          Peran Anda hanya memiliki izin baca pada modul ini, sehingga baris tidak dapat diubah (FR-9.3).
        </p>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------- helper */

function SelKode({
  kode,
  nama,
  onKode,
  onNama,
  phKode,
  phNama,
  readOnly,
}: {
  kode: string;
  nama: string;
  onKode: (v: string) => void;
  onNama: (v: string) => void;
  phKode: string;
  phNama: string;
  readOnly?: boolean;
}) {
  return (
    <div className="min-w-[150px]">
      <input
        className="cell-input tnum text-xs font-medium text-accent"
        value={kode}
        placeholder={phKode}
        readOnly={readOnly}
        onChange={(e) => onKode(e.target.value.toUpperCase())}
      />
      <input
        className="cell-input text-sm text-foreground"
        value={nama}
        placeholder={phNama}
        readOnly={readOnly}
        onChange={(e) => onNama(e.target.value.toUpperCase())}
      />
    </div>
  );
}

function BarisKategori({
  row,
  semua,
  boleh,
  bolehHapus,
  onSimpan,
  onHapus,
}: {
  row: CategoryRow;
  semua: CategoryRow[];
  boleh: boolean;
  bolehHapus: boolean;
  onSimpan: (v: CategoryRow) => void;
  onHapus: () => void;
}) {
  const [draft, setDraft] = useState<CategoryRow>(row);
  const [err, setErr] = useState<string[]>([]);
  const berubah = JSON.stringify({ ...draft, updatedAt: "", updatedBy: "" }) !== JSON.stringify({ ...row, updatedAt: "", updatedBy: "" });

  function commit() {
    if (!berubah) return;
    const e = validateCategory(draft, semua);
    setErr(e);
    if (e.length) return;
    onSimpan(draft);
  }

  return (
    <>
      <tr className={`border-b border-separator/60 last:border-0 ${berubah ? "bg-warning-soft/40" : ""}`}>
        <td className="px-3 py-1.5">
          <SelKode
            kode={draft.segmentCode}
            nama={draft.segment}
            onKode={(v) => setDraft({ ...draft, segmentCode: v })}
            onNama={(v) => setDraft({ ...draft, segment: v })}
            phKode="kode"
            phNama="nama"
            readOnly={!boleh}
          />
        </td>
        <td className="px-3 py-1.5">
          <SelKode
            kode={draft.deptCode}
            nama={draft.dept}
            onKode={(v) => setDraft({ ...draft, deptCode: v })}
            onNama={(v) => setDraft({ ...draft, dept: v })}
            phKode="kode"
            phNama="nama"
            readOnly={!boleh}
          />
        </td>
        <td className="px-3 py-1.5">
          <SelKode
            kode={draft.subDeptCode}
            nama={draft.subDept}
            onKode={(v) => setDraft({ ...draft, subDeptCode: v })}
            onNama={(v) => setDraft({ ...draft, subDept: v })}
            phKode="kode"
            phNama="nama"
            readOnly={!boleh}
          />
        </td>
        <td className="px-3 py-1.5">
          <SelKode
            kode={draft.categoryCode}
            nama={draft.category}
            onKode={(v) => setDraft({ ...draft, categoryCode: v })}
            onNama={(v) => setDraft({ ...draft, category: v })}
            phKode="kode"
            phNama="nama"
            readOnly={!boleh}
          />
        </td>
        <td className="px-3 py-1.5">
          <SelKode
            kode={draft.subCategoryCode}
            nama={draft.subCategory}
            onKode={(v) => setDraft({ ...draft, subCategoryCode: v })}
            onNama={(v) => setDraft({ ...draft, subCategory: v })}
            phKode="kode"
            phNama="nama"
            readOnly={!boleh}
          />
          {draft.alias ? (
            <span className="mt-0.5 block text-[11px] text-muted">alias: {draft.alias}</span>
          ) : null}
        </td>
        <td className="px-3 py-1.5">
          <input
            className="cell-input tnum text-xs text-foreground"
            value={draft.kdHashmicro ?? ""}
            readOnly={!boleh}
            placeholder="HASHMICRO"
            onChange={(e) => setDraft({ ...draft, kdHashmicro: e.target.value })}
          />
          <input
            className="cell-input tnum text-xs text-muted"
            value={draft.kdCompLtw ?? ""}
            readOnly={!boleh}
            placeholder="COMP. LTW"
            onChange={(e) => setDraft({ ...draft, kdCompLtw: e.target.value })}
          />
        </td>
        <td className="px-3 py-1.5 text-center">
          <button
            type="button"
            disabled={!boleh}
            onClick={() => setDraft({ ...draft, untukCoa: !draft.untukCoa })}
            className="disabled:cursor-default"
          >
            <Chip size="sm" variant="soft" color={draft.untukCoa ? "success" : "default"}>
              {draft.untukCoa ? "Y" : "N"}
            </Chip>
          </button>
        </td>
        <td className="px-3 py-1.5">
          <button
            type="button"
            disabled={!boleh}
            onClick={() => setDraft({ ...draft, status: draft.status === "AKTIF" ? "NONAKTIF" : "AKTIF" })}
            className="disabled:cursor-default"
          >
            <StatusChip status={draft.status} />
          </button>
        </td>
        <td className="px-3 py-1.5 text-xs text-muted">
          <span className="block tnum">{fmtTglJam(row.updatedAt)}</span>
          <span className="block">{row.updatedBy}</span>
        </td>
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1">
            {berubah ? (
              <>
                <Button size="sm" variant="primary" onPress={commit}>
                  <Check className="size-3.5" /> Simpan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label="Batalkan perubahan"
                  onPress={() => {
                    setDraft(row);
                    setErr([]);
                  }}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </>
            ) : bolehHapus ? (
              <Button size="sm" variant="ghost" isIconOnly aria-label="Hapus baris" onPress={onHapus}>
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
      {err.length ? (
        <tr>
          <td colSpan={10} className="bg-danger-soft px-3 py-1.5 text-xs text-danger-soft-foreground">
            {err.join(" ")}
          </td>
        </tr>
      ) : null}
    </>
  );
}
