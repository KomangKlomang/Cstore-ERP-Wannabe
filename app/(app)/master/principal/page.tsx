"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Download, ExternalLink, Pencil, Plus } from "lucide-react";

import { Guard } from "@/components/app-shell";
import {
  FormModal,
  NumberInput,
  PageHeader,
  SearchBox,
  SelectField,
  StatusChip,
  TextInput,
  Toolbar,
} from "@/components/ui";
import { BarChart } from "@/graphify";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV, exportExcel } from "@/lib/export";
import { kontrakInfo, nilaiKontrakPerPrincipal } from "@/lib/derive";
import { fmtRp, fmtRpShort } from "@/lib/format";
import type { Principal } from "@/lib/types";

export default function PrincipalPage() {
  return (
    <Guard modul="principal">
      <PrincipalView />
    </Guard>
  );
}

const KOSONG: Principal = {
  id: "",
  kode: "",
  nama: "",
  brand: [],
  pic: "",
  telp: "",
  email: "",
  alamat: "",
  npwp: "",
  isiSatuPack: 1,
  status: "AKTIF",
  updatedAt: "",
  updatedBy: "",
};

function PrincipalView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "principal", "edit");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [punyaKontrak, setPunyaKontrak] = useState("");

  const stat = useMemo(() => {
    const m = new Map<string, { kontrak: number; aktif: number; nilai: number; sku: number; aset: number }>();
    db.principals.forEach((p) => m.set(p.id, { kontrak: 0, aktif: 0, nilai: 0, sku: 0, aset: 0 }));
    db.kontrak.forEach((k) => {
      const s = m.get(k.principalId);
      if (!s) return;
      s.kontrak += 1;
      s.nilai += k.nilai;
      if (kontrakInfo(k).sisaHari >= 0) s.aktif += 1;
    });
    db.products.forEach((p) => {
      const s = m.get(p.principalId);
      if (s) s.sku += 1;
    });
    db.aset.forEach((a) => {
      const s = m.get(a.principalId);
      if (s) s.aset += 1;
    });
    return m;
  }, [db.principals, db.kontrak, db.products, db.aset]);

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.principals.filter((p) => {
      if (status && p.status !== status) return false;
      if (punyaKontrak === "YA" && (stat.get(p.id)?.aktif ?? 0) === 0) return false;
      if (punyaKontrak === "TIDAK" && (stat.get(p.id)?.aktif ?? 0) > 0) return false;
      if (!term) return true;
      return [p.nama, p.kode, p.pic, ...p.brand].join(" ").toLowerCase().includes(term);
    });
  }, [db.principals, q, status, punyaKontrak, stat]);

  const kolom = [
    { key: "kode", header: "Kode", value: (p: Principal) => p.kode },
    { key: "nama", header: "Nama Principal", value: (p: Principal) => p.nama },
    { key: "brand", header: "Brand", value: (p: Principal) => p.brand.join(", ") },
    { key: "pic", header: "PIC", value: (p: Principal) => p.pic },
    { key: "telp", header: "Telp", value: (p: Principal) => p.telp },
    { key: "email", header: "Email", value: (p: Principal) => p.email },
    { key: "alamat", header: "Alamat", value: (p: Principal) => p.alamat },
    { key: "npwp", header: "NPWP", value: (p: Principal) => p.npwp },
    { key: "isi", header: "Isi 1 pack", value: (p: Principal) => p.isiSatuPack },
    { key: "status", header: "Status", value: (p: Principal) => p.status },
    { key: "kontrak", header: "Jumlah kontrak", value: (p: Principal) => stat.get(p.id)?.kontrak ?? 0 },
    { key: "nilai", header: "Total nilai kontrak", value: (p: Principal) => stat.get(p.id)?.nilai ?? 0 },
    { key: "sku", header: "Jumlah SKU", value: (p: Principal) => stat.get(p.id)?.sku ?? 0 },
    { key: "aset", header: "Jumlah aset", value: (p: Principal) => stat.get(p.id)?.aset ?? 0 },
  ];

  return (
    <>
      <PageHeader
        judul="Master Principal / Supplier"
        modul="M1 · IMP-5"
        deskripsi="Principal dinormalisasi menjadi master tersendiri agar tidak ada duplikasi nama, dan menjadi titik tarik data gabungan (kontrak + aset + SKU) sesuai R5."
        aksi={
          <>
            {boleh ? <FormPrincipal onSimpan={(v) => saveRow("principals", v)} daftar={db.principals} /> : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "master-principal")}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" onPress={() => exportExcel(terfilter, kolom, "master-principal", "Principal")}>
              <Download className="size-4" /> Excel
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <BarChart
          title="Total nilai kontrak per principal"
          subtitle="Enam principal dengan komitmen kontrak terbesar"
          data={nilaiKontrakPerPrincipal(db.kontrak, db.principals)}
          format={fmtRpShort}
          satuan="Nilai kontrak"
        />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nama principal / brand / PIC…" />
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
        <SelectField
          label="Punya kontrak berjalan"
          items={[
            { id: "", label: "Semua" },
            { id: "YA", label: "Ya" },
            { id: "TIDAK", label: "Tidak" },
          ]}
          value={punyaKontrak}
          onChange={setPunyaKontrak}
          className="w-52"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} principal</span>
      </Toolbar>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[1020px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Kode</th>
              <th className="px-3 py-2 font-medium">Principal</th>
              <th className="px-3 py-2 font-medium">Brand</th>
              <th className="px-3 py-2 font-medium">PIC / Kontak</th>
              <th className="px-3 py-2 text-right font-medium">SKU</th>
              <th className="px-3 py-2 text-right font-medium">Aset</th>
              <th className="px-3 py-2 text-right font-medium">Kontrak</th>
              <th className="px-3 py-2 text-right font-medium">Nilai kontrak</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {terfilter.map((p) => {
              const s = stat.get(p.id);
              return (
                <tr key={p.id} className="border-b border-separator/60 last:border-0">
                  <td className="px-3 py-2 tnum text-foreground">{p.kode}</td>
                  <td className="px-3 py-2">
                    <span className="block font-medium text-foreground">{p.nama}</span>
                    <span className="block text-xs text-muted">
                      {p.npwp} · isi 1 pack {p.isiSatuPack}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {p.brand.map((b) => (
                        <Chip key={b} size="sm" variant="soft">
                          {b}
                        </Chip>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="block text-foreground">{p.pic}</span>
                    <span className="block text-muted">
                      {p.telp} · {p.email}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tnum">{s?.sku ?? 0}</td>
                  <td className="px-3 py-2 text-right tnum">{s?.aset ?? 0}</td>
                  <td className="px-3 py-2 text-right tnum">
                    {s?.kontrak ?? 0}
                    <span className="block text-[11px] text-muted">{s?.aktif ?? 0} berjalan</span>
                  </td>
                  <td className="px-3 py-2 text-right tnum text-foreground">{fmtRp(s?.nilai ?? 0)}</td>
                  <td className="px-3 py-2">
                    <StatusChip status={p.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/laporan?principal=${p.id}`}
                        title="Tarik seluruh data principal ini"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                      {boleh ? (
                        <FormPrincipal principal={p} onSimpan={(v) => saveRow("principals", v)} daftar={db.principals} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FormPrincipal({
  principal,
  daftar,
  onSimpan,
}: {
  principal?: Principal;
  daftar: Principal[];
  onSimpan: (p: Principal) => void;
}) {
  const state = useOverlayState();
  const [draft, setDraft] = useState<Principal>(principal ?? { ...KOSONG });
  const [brandText, setBrandText] = useState((principal?.brand ?? []).join(", "));
  const [err, setErr] = useState("");

  const set = <K extends keyof Principal>(k: K, v: Principal[K]) => setDraft({ ...draft, [k]: v });

  function simpan() {
    if (!draft.nama.trim() || !draft.kode.trim()) {
      setErr("Kode dan nama principal wajib diisi.");
      return false;
    }
    if (daftar.some((p) => p.id !== draft.id && p.kode === draft.kode)) {
      setErr("Kode principal sudah dipakai.");
      return false;
    }
    onSimpan({
      ...draft,
      id: draft.id || newId("prn"),
      brand: brandText.split(",").map((b) => b.trim().toUpperCase()).filter(Boolean),
    });
    setErr("");
    return true;
  }

  return (
    <>
      {principal ? (
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={`Ubah ${principal.nama}`}
          onPress={() => {
            setDraft(principal);
            setBrandText(principal.brand.join(", "));
            state.open();
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      ) : (
        <Button
          variant="primary"
          onPress={() => {
            setDraft({ ...KOSONG });
            setBrandText("");
            state.open();
          }}
        >
          <Plus className="size-4" /> Principal baru
        </Button>
      )}

      <FormModal state={state} judul={principal ? `Ubah ${principal.nama}` : "Tambah principal"} onSimpan={simpan}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Kode" value={draft.kode} onChange={(v) => set("kode", v.toUpperCase())} isRequired />
          <TextInput label="Nama Principal" value={draft.nama} onChange={(v) => set("nama", v)} isRequired />
          <TextInput
            label="Brand (pisahkan dengan koma)"
            value={brandText}
            onChange={setBrandText}
            className="sm:col-span-2"
          />
          <TextInput label="PIC" value={draft.pic} onChange={(v) => set("pic", v)} />
          <TextInput label="Telp" value={draft.telp} onChange={(v) => set("telp", v)} />
          <TextInput label="Email" value={draft.email} onChange={(v) => set("email", v)} />
          <TextInput label="NPWP" value={draft.npwp} onChange={(v) => set("npwp", v)} />
          <TextInput label="Alamat" value={draft.alamat} onChange={(v) => set("alamat", v)} className="sm:col-span-2" />
          <NumberInput
            label="Isi 1 pack"
            value={draft.isiSatuPack}
            onChange={(v) => set("isiSatuPack", v)}
            description="OQ-5 — disepakati sama dengan pack size default SKU principal ini."
          />
          <SelectField
            label="Status"
            items={[
              { id: "AKTIF", label: "Aktif" },
              { id: "NONAKTIF", label: "Nonaktif" },
            ]}
            value={draft.status}
            onChange={(v) => set("status", v as Principal["status"])}
          />
          {err ? <p className="text-sm text-danger sm:col-span-2">{err}</p> : null}
        </div>
      </FormModal>
    </>
  );
}
