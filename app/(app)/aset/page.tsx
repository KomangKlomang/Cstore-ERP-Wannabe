"use client";

import { Suspense, useMemo, useState } from "react";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Download, Pencil, Plus, Printer } from "lucide-react";

import { Guard } from "@/components/app-shell";
import {
  Callout,
  FileUploadField,
  FormModal,
  KosongRow,
  NumberInput,
  PageHeader,
  SearchBox,
  SelectField,
  StatusChip,
  TextAreaInput,
  TextInput,
  Toolbar,
  type Opt,
} from "@/components/ui";
import { StackedColumnChart, VIZ_STATUS } from "@/graphify";
import { newId, useApp } from "@/lib/store";
import { can, inScope } from "@/lib/rbac";
import { exportCSV, exportExcel } from "@/lib/export";
import { asetPerRegion } from "@/lib/derive";
import { fmtTgl } from "@/lib/format";
import { useSearchParamState } from "@/lib/use-search-param-state";
import { JENIS_ASET, REGIONS, type Aset } from "@/lib/types";

export default function AsetPage() {
  return (
    <Guard modul="aset">
      <Suspense fallback={null}>
        <AsetView />
      </Suspense>
    </Guard>
  );
}

function AsetView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "aset", "edit");
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");
  const [kondisi, setKondisi] = useSearchParamState("kondisi");
  const [region, setRegion] = useState("");
  const [foto, setFoto] = useSearchParamState("foto", ["kosong"]);

  const storeRegion = useMemo(() => new Map(db.stores.map((s) => [s.storeCode, s.region])), [db.stores]);
  const storeNama = (code: string) => db.stores.find((s) => s.storeCode === code)?.storeName ?? code;
  const prnNama = (id: string) => db.principals.find((p) => p.id === id)?.nama ?? "-";

  const terlihat = useMemo(
    () => db.aset.filter((a) => inScope(user, storeRegion.get(a.storeCode))),
    [db.aset, user, storeRegion],
  );

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return terlihat.filter((a) => {
      if (jenis && a.jenis !== jenis) return false;
      if (kondisi && a.kondisi !== kondisi) return false;
      if (region && storeRegion.get(a.storeCode) !== region) return false;
      if (foto === "kosong" && (!a.tangible || a.fotoTerpasang.length > 0)) return false;
      if (!term) return true;
      return [a.kodeAset, a.nama, storeNama(a.storeCode), prnNama(a.principalId)]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terlihat, q, jenis, kondisi, region, foto, storeRegion]);

  const prnOpt: Opt[] = db.principals.map((p) => ({ id: p.id, label: p.nama, hint: p.kode }));
  const stOpt: Opt[] = db.stores.map((s) => ({
    id: s.storeCode,
    label: `${s.storeCode} — ${s.storeName}`,
    hint: s.region,
  }));
  const ktrOpt: Opt[] = [
    { id: "", label: "— tanpa kontrak —" },
    ...db.kontrak.map((k) => ({ id: k.id, label: k.judul, hint: k.nomorSurat })),
  ];

  const kolom = [
    { key: "kode", header: "Kode Aset", value: (a: Aset) => a.kodeAset },
    { key: "nama", header: "Nama Aset", value: (a: Aset) => a.nama },
    { key: "jenis", header: "Jenis", value: (a: Aset) => a.jenis },
    { key: "tangible", header: "Tangible", value: (a: Aset) => (a.tangible ? "Y" : "N") },
    { key: "principal", header: "Principal", value: (a: Aset) => prnNama(a.principalId) },
    {
      key: "kontrak",
      header: "Kontrak",
      value: (a: Aset) => db.kontrak.find((k) => k.id === a.kontrakId)?.nomorSurat ?? "",
    },
    { key: "store", header: "Store Code", value: (a: Aset) => a.storeCode },
    { key: "storeName", header: "Store Name", value: (a: Aset) => storeNama(a.storeCode) },
    { key: "region", header: "Region", value: (a: Aset) => storeRegion.get(a.storeCode) ?? "" },
    { key: "qty", header: "Qty", value: (a: Aset) => a.qty },
    { key: "kondisi", header: "Kondisi", value: (a: Aset) => a.kondisi },
    { key: "masuk", header: "Tgl Masuk", value: (a: Aset) => a.tglMasuk },
    { key: "retur", header: "Tgl Retur", value: (a: Aset) => a.tglRetur ?? "" },
    { key: "pic", header: "PIC", value: (a: Aset) => a.pic },
    { key: "foto", header: "Jumlah Foto", value: (a: Aset) => a.fotoTerpasang.length },
  ];

  const tanpaFoto = terlihat.filter((a) => a.tangible && a.fotoTerpasang.length === 0).length;

  return (
    <div className="print-sheet">
      <PageHeader
        judul="Aset Marketing"
        modul="M4 · US-4.1"
        deskripsi="Aset per toko (akrilik, header, lolipop, showcase) dengan qty, kondisi good/replace, tanggal masuk, dan foto terpasang. Aset tangible wajib punya dokumentasi foto."
        aksi={
          <>
            {boleh ? (
              <FormAset prnOpt={prnOpt} stOpt={stOpt} ktrOpt={ktrOpt} onSimpan={(v) => saveRow("aset", v)} />
            ) : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "aset-marketing")}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" onPress={() => exportExcel(terfilter, kolom, "aset-marketing", "Aset")}>
              <Download className="size-4" /> Excel
            </Button>
            <Button variant="outline" onPress={() => window.print()}>
              <Printer className="size-4" /> PDF
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <StackedColumnChart
          title="Kondisi aset per region"
          subtitle="Dasar prioritas penggantian aset di lapangan"
          data={asetPerRegion(terlihat, db.stores)}
          keys={["GOOD", "REPLACE", "HILANG"]}
          colors={["var(--viz-6)", VIZ_STATUS.warning, VIZ_STATUS.critical]}
          format={(n) => String(Math.round(n))}
          height={230}
        />
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Total aset terlihat</p>
            <p className="mt-1 text-2xl font-semibold tnum text-foreground">{terlihat.length}</p>
            <p className="mt-0.5 text-xs text-muted">
              {terlihat.filter((a) => a.kondisi === "REPLACE").length} perlu diganti ·{" "}
              {terlihat.filter((a) => a.kondisi === "HILANG").length} hilang
            </p>
          </div>
          <Callout tone={tanpaFoto ? "warning" : "info"} judul={`${tanpaFoto} aset tangible belum ada foto`}>
            Foto terpasang wajib untuk aset tangible sebagai bukti pemasangan ke principal (US-4.1).
          </Callout>
        </div>
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Kode aset / toko / principal…" className="w-64" />
        <SelectField
          label="Jenis"
          items={[{ id: "", label: "Semua jenis" }, ...JENIS_ASET.map((j) => ({ id: j, label: j }))]}
          value={jenis}
          onChange={setJenis}
          className="w-44"
        />
        <SelectField
          label="Kondisi"
          items={[
            { id: "", label: "Semua kondisi" },
            { id: "GOOD", label: "Good" },
            { id: "REPLACE", label: "Replace" },
            { id: "HILANG", label: "Hilang" },
            { id: "RETUR", label: "Retur" },
          ]}
          value={kondisi}
          onChange={setKondisi}
          className="w-44"
        />
        <SelectField
          label="Region"
          items={[{ id: "", label: "Semua region" }, ...REGIONS.map((r) => ({ id: r, label: r }))]}
          value={region}
          onChange={setRegion}
          className="w-36"
        />
        <SelectField
          label="Dokumentasi"
          items={[
            { id: "", label: "Semua" },
            { id: "kosong", label: "Belum ada foto" },
          ]}
          value={foto}
          onChange={setFoto}
          className="w-44"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} aset</span>
      </Toolbar>

      {terfilter.length === 0 ? (
        <KosongRow pesan="Tidak ada aset yang cocok." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Kode aset</th>
                <th className="px-3 py-2 font-medium">Jenis</th>
                <th className="px-3 py-2 font-medium">Toko</th>
                <th className="px-3 py-2 font-medium">Principal / kontrak</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Masuk</th>
                <th className="px-3 py-2 font-medium">Kondisi</th>
                <th className="px-3 py-2 font-medium">Foto</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {terfilter.map((a) => (
                <tr key={a.id} className="border-b border-separator/60 last:border-0">
                  <td className="px-3 py-2">
                    <span className="block tnum font-medium text-foreground">{a.kodeAset}</span>
                    <span className="block text-xs text-muted">{a.nama}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Chip size="sm" variant="soft">
                      {a.jenis}
                    </Chip>
                    {!a.tangible ? <span className="mt-0.5 block text-[11px] text-muted">intangible</span> : null}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="block text-foreground">{storeNama(a.storeCode)}</span>
                    <span className="block tnum text-muted">
                      {a.storeCode} · {storeRegion.get(a.storeCode)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    <span className="block">{prnNama(a.principalId)}</span>
                    <span className="block tnum">
                      {db.kontrak.find((k) => k.id === a.kontrakId)?.nomorSurat ?? "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tnum">{a.qty}</td>
                  <td className="px-3 py-2 text-xs tnum text-muted">{fmtTgl(a.tglMasuk)}</td>
                  <td className="px-3 py-2">
                    <StatusChip status={a.kondisi} />
                  </td>
                  <td className="px-3 py-2">
                    {a.fotoTerpasang.length ? (
                      <div className="flex gap-1">
                        {a.fotoTerpasang.slice(0, 2).map((f) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={f.id} src={f.dataUrl} alt={f.nama} className="size-9 rounded object-cover" />
                        ))}
                      </div>
                    ) : a.tangible ? (
                      <span className="text-xs text-warning">belum ada</span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {boleh ? (
                      <FormAset
                        aset={a}
                        prnOpt={prnOpt}
                        stOpt={stOpt}
                        ktrOpt={ktrOpt}
                        onSimpan={(v) => saveRow("aset", v)}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormAset({
  aset,
  prnOpt,
  stOpt,
  ktrOpt,
  onSimpan,
}: {
  aset?: Aset;
  prnOpt: Opt[];
  stOpt: Opt[];
  ktrOpt: Opt[];
  onSimpan: (a: Aset) => void;
}) {
  const state = useOverlayState();

  const kosong = (): Aset => ({
    id: newId("ast"),
    kodeAset: "",
    nama: "",
    jenis: "AKRILIK",
    tangible: true,
    principalId: "",
    storeCode: "",
    qty: 1,
    kondisi: "GOOD",
    tglMasuk: new Date().toISOString().slice(0, 10),
    pic: "",
    fotoTerpasang: [],
    updatedAt: "",
    updatedBy: "",
  });

  const [draft, setDraft] = useState<Aset>(aset ?? kosong());
  const [err, setErr] = useState("");
  const set = <K extends keyof Aset>(k: K, v: Aset[K]) => setDraft({ ...draft, [k]: v });

  function simpan() {
    if (!draft.kodeAset.trim() || !draft.storeCode || !draft.principalId) {
      setErr("Kode aset, toko, dan principal wajib diisi.");
      return false;
    }
    if (draft.tangible && draft.fotoTerpasang.length === 0) {
      setErr("Aset tangible wajib punya minimal 1 foto terpasang (US-4.1).");
      return false;
    }
    onSimpan(draft);
    setErr("");
    return true;
  }

  return (
    <>
      {aset ? (
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={`Ubah ${aset.kodeAset}`}
          onPress={() => {
            setDraft(aset);
            state.open();
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      ) : (
        <Button
          variant="primary"
          onPress={() => {
            setDraft(kosong());
            state.open();
          }}
        >
          <Plus className="size-4" /> Aset baru
        </Button>
      )}

      <FormModal state={state} judul={aset ? `Ubah ${aset.kodeAset}` : "Catat aset baru"} onSimpan={simpan}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Kode aset"
              value={draft.kodeAset}
              onChange={(v) => set("kodeAset", v.toUpperCase())}
              isRequired
            />
            <TextInput label="Nama aset" value={draft.nama} onChange={(v) => set("nama", v)} />
            <SelectField
              label="Jenis"
              items={JENIS_ASET.map((j) => ({ id: j, label: j }))}
              value={draft.jenis}
              onChange={(v) => set("jenis", v as Aset["jenis"])}
            />
            <SelectField
              label="Tipe"
              items={[
                { id: "true", label: "Tangible (fisik)" },
                { id: "false", label: "Intangible (digital)" },
              ]}
              value={String(draft.tangible)}
              onChange={(v) => set("tangible", v === "true")}
            />
            <SelectField label="Toko" items={stOpt} value={draft.storeCode} onChange={(v) => set("storeCode", v)} />
            <SelectField
              label="Principal"
              items={prnOpt}
              value={draft.principalId}
              onChange={(v) => set("principalId", v)}
            />
            <SelectField
              label="Kontrak aset"
              items={ktrOpt}
              value={draft.kontrakId ?? ""}
              onChange={(v) => set("kontrakId", v || undefined)}
            />
            <NumberInput label="Qty" value={draft.qty} onChange={(v) => set("qty", v)} />
            <SelectField
              label="Kondisi"
              items={[
                { id: "GOOD", label: "Good" },
                { id: "REPLACE", label: "Replace" },
                { id: "HILANG", label: "Hilang" },
                { id: "RETUR", label: "Retur" },
              ]}
              value={draft.kondisi}
              onChange={(v) => set("kondisi", v as Aset["kondisi"])}
            />
            <TextInput label="PIC" value={draft.pic} onChange={(v) => set("pic", v)} />
            <TextInput label="Tgl masuk" type="date" value={draft.tglMasuk} onChange={(v) => set("tglMasuk", v)} />
            <TextInput
              label="Tgl retur"
              type="date"
              value={draft.tglRetur ?? ""}
              onChange={(v) => set("tglRetur", v)}
            />
          </div>

          <FileUploadField
            label={`Foto terpasang${draft.tangible ? " (wajib)" : ""}`}
            files={draft.fotoTerpasang}
            onChange={(f) => set("fotoTerpasang", f)}
            accept="image/*"
          />

          <TextAreaInput label="Catatan" value={draft.catatan ?? ""} onChange={(v) => set("catatan", v)} rows={2} />

          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      </FormModal>
    </>
  );
}
