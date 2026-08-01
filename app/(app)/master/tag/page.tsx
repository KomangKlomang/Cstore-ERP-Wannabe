"use client";

import { useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Check, Download, Plus, RotateCcw } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { Callout, PageHeader, StatusChip, TextInput, Toolbar } from "@/components/ui";
import { DonutChart } from "@/graphify";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV } from "@/lib/export";
import { fmtTglJam } from "@/lib/format";
import { REGIONS, type TagRow } from "@/lib/types";

export default function TagPage() {
  return (
    <Guard modul="tag">
      <TagView />
    </Guard>
  );
}

const KOSONG: TagRow = {
  id: "",
  kode: "",
  nama: "",
  jual: true,
  po: true,
  perlakuan: "",
  warna: "default",
  status: "AKTIF",
  updatedAt: "",
  updatedBy: "",
};

function TagView() {
  const tags = useApp((s) => s.tags);
  const products = useApp((s) => s.products);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "tag", "edit");

  const [baru, setBaru] = useState<TagRow>({ ...KOSONG });
  const [err, setErr] = useState("");

  /** Berapa SKU×region memakai tag ini — dasar dampak perubahan perlakuan. */
  const pemakaian = (kode: string) =>
    products.reduce((n, p) => n + REGIONS.filter((r) => p.tagPerRegion[r] === kode).length, 0);

  const kolom = [
    { key: "kode", header: "Kode Tag", value: (t: TagRow) => t.kode },
    { key: "nama", header: "Nama Tag", value: (t: TagRow) => t.nama },
    { key: "jual", header: "Jual", value: (t: TagRow) => (t.jual ? "Y" : "N") },
    { key: "po", header: "PO", value: (t: TagRow) => (t.po ? "Y" : "N") },
    { key: "perlakuan", header: "Perlakuan", value: (t: TagRow) => t.perlakuan },
    { key: "status", header: "Status", value: (t: TagRow) => t.status },
    { key: "pakai", header: "Dipakai (SKU x region)", value: (t: TagRow) => pemakaian(t.kode) },
  ];

  function tambah() {
    if (!baru.kode.trim() || !baru.nama.trim()) {
      setErr("Kode dan nama tag wajib diisi.");
      return;
    }
    if (tags.some((t) => t.kode === baru.kode.trim().toUpperCase())) {
      setErr(`Kode tag "${baru.kode}" sudah ada.`);
      return;
    }
    saveRow("tags", { ...baru, id: newId("tag"), kode: baru.kode.trim().toUpperCase() });
    setBaru({ ...KOSONG });
    setErr("");
  }

  const distribusi = tags
    .map((t) => ({ label: `${t.kode} · ${t.nama}`, value: pemakaian(t.kode) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <>
      <PageHeader
        judul="Master Tag"
        modul="M1 · US-1.4"
        deskripsi="Tag menentukan perlakuan item terhadap Jual dan PO. Perubahan perlakuan langsung berdampak pada validasi usulan tag."
        aksi={
          <Button variant="outline" onPress={() => exportCSV(tags, kolom, "master-tag")}>
            <Download className="size-4" /> CSV
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Kode</th>
                <th className="px-3 py-2 font-medium">Nama Tag</th>
                <th className="px-3 py-2 text-center font-medium">Jual</th>
                <th className="px-3 py-2 text-center font-medium">PO</th>
                <th className="px-3 py-2 font-medium">Perlakuan</th>
                <th className="px-3 py-2 text-right font-medium">Dipakai</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => (
                <BarisTag key={t.id} row={t} boleh={boleh} pakai={pemakaian(t.kode)} onSimpan={(v) => saveRow("tags", v)} />
              ))}

              {boleh ? (
                <tr className="border-t-2 border-accent/30 bg-accent-soft/30">
                  <td className="px-3 py-2">
                    <input
                      className="cell-input w-16 tnum text-xs font-semibold text-accent"
                      placeholder="L"
                      value={baru.kode}
                      onChange={(e) => setBaru({ ...baru, kode: e.target.value.toUpperCase() })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="cell-input text-sm"
                      placeholder="NAMA TAG BARU"
                      value={baru.nama}
                      onChange={(e) => setBaru({ ...baru, nama: e.target.value.toUpperCase() })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <YN value={baru.jual} onChange={(v) => setBaru({ ...baru, jual: v })} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <YN value={baru.po} onChange={(v) => setBaru({ ...baru, po: v })} />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="cell-input text-sm"
                      placeholder="Deskripsi perlakuan"
                      value={baru.perlakuan}
                      onChange={(e) => setBaru({ ...baru, perlakuan: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted">0</td>
                  <td className="px-3 py-2">
                    <Chip size="sm" variant="soft" color="accent">
                      Baru
                    </Chip>
                  </td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="primary" onPress={tambah}>
                      <Plus className="size-3.5" /> Tambah
                    </Button>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <DonutChart
          title="Pemakaian tag"
          subtitle="Jumlah kombinasi SKU × region per tag (8 terbanyak)"
          data={distribusi}
          heroLabel="SKU × region"
        />
      </div>

      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

      <Callout tone="info" judul="Kenapa tag penting">
        Usulan Tag (M2) hanya boleh diajukan bila tag asal sama dengan tag aktif SKU pada region tersebut. Tag dengan
        <b> Jual = N</b> membuat SKU tidak muncul pada daftar SKU aktif profil toko.
      </Callout>
    </>
  );
}

function YN({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} aria-label={value ? "Ya" : "Tidak"}>
      <Chip size="sm" variant="soft" color={value ? "success" : "danger"}>
        {value ? "Y" : "N"}
      </Chip>
    </button>
  );
}

function BarisTag({
  row,
  boleh,
  pakai,
  onSimpan,
}: {
  row: TagRow;
  boleh: boolean;
  pakai: number;
  onSimpan: (t: TagRow) => void;
}) {
  const [draft, setDraft] = useState(row);
  const berubah = JSON.stringify({ ...draft, updatedAt: "", updatedBy: "" }) !== JSON.stringify({ ...row, updatedAt: "", updatedBy: "" });

  return (
    <tr className={`border-b border-separator/60 last:border-0 ${berubah ? "bg-warning-soft/40" : ""}`}>
      <td className="px-3 py-2">
        <Chip size="sm" variant="soft" color={draft.warna}>
          {draft.kode}
        </Chip>
      </td>
      <td className="px-3 py-2">
        <input
          className="cell-input text-sm font-medium text-foreground"
          value={draft.nama}
          readOnly={!boleh}
          onChange={(e) => setDraft({ ...draft, nama: e.target.value.toUpperCase() })}
        />
      </td>
      <td className="px-3 py-2 text-center">
        {boleh ? <YN value={draft.jual} onChange={(v) => setDraft({ ...draft, jual: v })} /> : <Chip size="sm" variant="soft">{draft.jual ? "Y" : "N"}</Chip>}
      </td>
      <td className="px-3 py-2 text-center">
        {boleh ? <YN value={draft.po} onChange={(v) => setDraft({ ...draft, po: v })} /> : <Chip size="sm" variant="soft">{draft.po ? "Y" : "N"}</Chip>}
      </td>
      <td className="px-3 py-2">
        <input
          className="cell-input text-xs text-muted"
          value={draft.perlakuan}
          readOnly={!boleh}
          onChange={(e) => setDraft({ ...draft, perlakuan: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 text-right tnum text-muted">{pakai}</td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={!boleh}
          onClick={() => setDraft({ ...draft, status: draft.status === "AKTIF" ? "NONAKTIF" : "AKTIF" })}
        >
          <StatusChip status={draft.status} />
        </button>
      </td>
      <td className="px-3 py-2">
        {berubah ? (
          <div className="flex gap-1">
            <Button size="sm" variant="primary" onPress={() => onSimpan(draft)}>
              <Check className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Batal" onPress={() => setDraft(row)}>
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        ) : (
          <span className="block text-[11px] text-muted tnum">{fmtTglJam(row.updatedAt)}</span>
        )}
      </td>
    </tr>
  );
}
