"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, useOverlayState } from "@heroui/react";
import { Download, MapPin, Pencil, Plus } from "lucide-react";

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
import { StackedColumnChart, VIZ } from "@/graphify";
import { newId, useApp } from "@/lib/store";
import { can, inScope } from "@/lib/rbac";
import { exportCSV, exportExcel } from "@/lib/export";
import { tokoPerRegion } from "@/lib/derive";
import { fmtTgl } from "@/lib/format";
import { REGIONS, REGION_LABEL, STORE_TYPES, type Region, type Store, type StoreType } from "@/lib/types";

export default function StorePage() {
  return (
    <Guard modul="store">
      <StoreView />
    </Guard>
  );
}

const KOSONG: Store = {
  id: "",
  storeCode: "",
  storeName: "",
  storeIdHM: "",
  analyticalGroupHM: "",
  storeType: "DTS",
  region: "JBTK",
  area: "",
  alamat: "",
  kota: "",
  latitude: 0,
  longitude: 0,
  tglBuka: new Date().toISOString().slice(0, 10),
  status: "AKTIF",
  crewIds: [],
  noTelp: "",
  luasM2: 0,
  jumlahRak: 0,
  updatedAt: "",
  updatedBy: "",
};

function StoreView() {
  const stores = useApp((s) => s.stores);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "store", "edit");

  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [tipe, setTipe] = useState("");
  const [status, setStatus] = useState("");

  const terlihat = useMemo(() => stores.filter((s) => inScope(user, s.region)), [stores, user]);

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return terlihat.filter((s) => {
      if (region && s.region !== region) return false;
      if (tipe && s.storeType !== tipe) return false;
      if (status && s.status !== status) return false;
      if (!term) return true;
      return [s.storeName, s.storeCode, s.storeIdHM, s.kota, s.area].join(" ").toLowerCase().includes(term);
    });
  }, [terlihat, q, region, tipe, status]);

  const kolom = [
    { key: "storeCode", header: "Store Code", value: (s: Store) => s.storeCode },
    { key: "storeName", header: "Store Name", value: (s: Store) => s.storeName },
    { key: "storeIdHM", header: "Store ID (HM)", value: (s: Store) => s.storeIdHM },
    { key: "ag", header: "Analytical Group (HM)", value: (s: Store) => s.analyticalGroupHM },
    { key: "storeType", header: "Store Type", value: (s: Store) => s.storeType },
    { key: "region", header: "Region", value: (s: Store) => s.region },
    { key: "area", header: "Area", value: (s: Store) => s.area },
    { key: "kota", header: "Kota", value: (s: Store) => s.kota },
    { key: "alamat", header: "Alamat", value: (s: Store) => s.alamat },
    { key: "lat", header: "Latitude", value: (s: Store) => s.latitude },
    { key: "lng", header: "Longitude", value: (s: Store) => s.longitude },
    { key: "tglBuka", header: "Tgl Buka", value: (s: Store) => s.tglBuka },
    { key: "tglTutup", header: "Tgl Tutup", value: (s: Store) => s.tglTutup ?? "" },
    { key: "status", header: "Status", value: (s: Store) => s.status },
    { key: "relokasi", header: "Relocate From Store Code", value: (s: Store) => s.relocateFromStoreCode ?? "" },
    { key: "telp", header: "No Telp", value: (s: Store) => s.noTelp },
    { key: "luas", header: "Luas (m2)", value: (s: Store) => s.luasM2 },
    { key: "rak", header: "Jumlah Rak", value: (s: Store) => s.jumlahRak },
    { key: "plano", header: "Planogram Aktif", value: (s: Store) => s.planogramAktif ?? "" },
  ];

  return (
    <>
      <PageHeader
        judul="Master Store"
        modul="M1 · US-1.3"
        deskripsi="Data toko lengkap 19 kolom termasuk Store ID (HM) dan Analytical Group (HM). Klik nama toko untuk melihat profil lengkap (US-7.2)."
        aksi={
          <>
            {boleh ? <FormToko onSimpan={(v) => saveRow("stores", v)} stores={stores} /> : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "master-store")}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" onPress={() => exportExcel(terfilter, kolom, "master-store", "Store")}>
              <Download className="size-4" /> Excel
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <StackedColumnChart
          title="Sebaran toko per region"
          subtitle="Tipe DTS vs EX. LWS"
          data={tokoPerRegion(terlihat)}
          keys={[...STORE_TYPES]}
          colors={[VIZ[0], VIZ[1]]}
          height={220}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
          {REGIONS.map((r) => {
            const list = terlihat.filter((s) => s.region === r);
            return (
              <div key={r} className="rounded-xl border border-border bg-surface p-3">
                <p className="text-xs text-muted">{REGION_LABEL[r]}</p>
                <p className="mt-1 text-xl font-semibold tnum text-foreground">{list.length}</p>
                <p className="text-[11px] text-muted">
                  {list.filter((s) => s.status === "AKTIF").length} aktif ·{" "}
                  {list.filter((s) => s.storeType === "DTS").length} DTS
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nama toko / kode / HM ID…" />
        <SelectField
          label="Region"
          items={[{ id: "", label: "Semua region" }, ...REGIONS.map((r) => ({ id: r, label: `${r} — ${REGION_LABEL[r]}` }))]}
          value={region}
          onChange={setRegion}
          className="w-52"
        />
        <SelectField
          label="Tipe"
          items={[{ id: "", label: "Semua tipe" }, ...STORE_TYPES.map((t) => ({ id: t, label: t }))]}
          value={tipe}
          onChange={setTipe}
          className="w-40"
        />
        <SelectField
          label="Status"
          items={[
            { id: "", label: "Semua status" },
            { id: "AKTIF", label: "Aktif" },
            { id: "TUTUP", label: "Tutup" },
            { id: "RELOKASI", label: "Relokasi" },
            { id: "RENOVASI", label: "Renovasi" },
          ]}
          value={status}
          onChange={setStatus}
          className="w-44"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} toko</span>
      </Toolbar>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Kode / HM</th>
              <th className="px-3 py-2 font-medium">Nama Toko</th>
              <th className="px-3 py-2 font-medium">Region / Area</th>
              <th className="px-3 py-2 font-medium">Tipe</th>
              <th className="px-3 py-2 font-medium">Analytical Group</th>
              <th className="px-3 py-2 font-medium">Buka</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {terfilter.map((s) => (
              <tr key={s.id} className="border-b border-separator/60 last:border-0">
                <td className="px-3 py-2">
                  <span className="block font-medium tnum text-foreground">{s.storeCode}</span>
                  <span className="block text-xs tnum text-muted">{s.storeIdHM}</span>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/master/store/${s.storeCode}`} className="font-medium text-accent hover:underline">
                    {s.storeName}
                  </Link>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="size-3" /> {s.kota} · {s.luasM2} m² · {s.jumlahRak} rak
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  <span className="block text-foreground">{s.region}</span>
                  {s.area}
                </td>
                <td className="px-3 py-2 text-xs">{s.storeType}</td>
                <td className="px-3 py-2 text-xs tnum text-muted">{s.analyticalGroupHM}</td>
                <td className="px-3 py-2 text-xs tnum text-muted">{fmtTgl(s.tglBuka)}</td>
                <td className="px-3 py-2">
                  <StatusChip status={s.status} />
                  {s.relocateFromStoreCode ? (
                    <span className="mt-0.5 block text-[11px] text-muted">dari {s.relocateFromStoreCode}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  {boleh ? <FormToko toko={s} onSimpan={(v) => saveRow("stores", v)} stores={stores} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------- form */

function FormToko({
  toko,
  stores,
  onSimpan,
}: {
  toko?: Store;
  stores: Store[];
  onSimpan: (s: Store) => void;
}) {
  const state = useOverlayState();
  const [draft, setDraft] = useState<Store>(toko ?? { ...KOSONG });
  const [err, setErr] = useState<string[]>([]);

  const set = <K extends keyof Store>(k: K, v: Store[K]) => setDraft({ ...draft, [k]: v });

  function simpan() {
    const e: string[] = [];
    if (!draft.storeCode.trim()) e.push("Store Code wajib diisi.");
    if (!draft.storeName.trim()) e.push("Store Name wajib diisi.");
    if (stores.some((s) => s.id !== draft.id && s.storeCode === draft.storeCode)) e.push("Store Code sudah dipakai.");
    /* US-1.3 */
    if (draft.status !== "AKTIF" && !draft.tglTutup) e.push("Tgl Tutup wajib diisi bila status bukan AKTIF.");
    if (draft.status === "RELOKASI") {
      if (!draft.relocateFromStoreCode) e.push("Relocate From Store Code wajib diisi untuk status RELOKASI.");
      else if (!stores.some((s) => s.storeCode === draft.relocateFromStoreCode))
        e.push("Relocate From Store Code harus merujuk store code yang valid.");
    }
    setErr(e);
    if (e.length) return false;
    onSimpan({ ...draft, id: draft.id || newId("st") });
    return true;
  }

  return (
    <>
      {toko ? (
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={`Ubah ${toko.storeName}`}
          onPress={() => {
            setDraft(toko);
            setErr([]);
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
            setErr([]);
            state.open();
          }}
        >
          <Plus className="size-4" /> Toko baru
        </Button>
      )}

      <FormModal state={state} judul={toko ? `Ubah ${toko.storeName}` : "Tambah toko"} onSimpan={simpan}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Store Code" value={draft.storeCode} onChange={(v) => set("storeCode", v.toUpperCase())} isRequired />
            <TextInput label="Store Name" value={draft.storeName} onChange={(v) => set("storeName", v)} isRequired />
            <TextInput label="Store ID (HM)" value={draft.storeIdHM} onChange={(v) => set("storeIdHM", v)} description="Sumber sistem host existing (OQ-4)." />
            <TextInput label="Analytical Group (HM)" value={draft.analyticalGroupHM} onChange={(v) => set("analyticalGroupHM", v)} />
            <SelectField
              label="Store Type"
              items={STORE_TYPES.map((t) => ({ id: t, label: t }))}
              value={draft.storeType}
              onChange={(v) => set("storeType", v as StoreType)}
            />
            <SelectField
              label="Region"
              items={REGIONS.map((r) => ({ id: r, label: `${r} — ${REGION_LABEL[r]}` }))}
              value={draft.region}
              onChange={(v) => set("region", v as Region)}
            />
            <TextInput label="Area" value={draft.area} onChange={(v) => set("area", v)} />
            <TextInput label="Kota" value={draft.kota} onChange={(v) => set("kota", v)} />
            <TextInput label="Alamat" value={draft.alamat} onChange={(v) => set("alamat", v)} className="sm:col-span-2" />
            <NumberInput label="Latitude" value={draft.latitude} onChange={(v) => set("latitude", v)} />
            <NumberInput label="Longitude" value={draft.longitude} onChange={(v) => set("longitude", v)} />
            <TextInput label="Tgl Buka" type="date" value={draft.tglBuka} onChange={(v) => set("tglBuka", v)} />
            <TextInput label="Tgl Tutup" type="date" value={draft.tglTutup ?? ""} onChange={(v) => set("tglTutup", v)} />
            <SelectField
              label="Status"
              items={[
                { id: "AKTIF", label: "Aktif" },
                { id: "TUTUP", label: "Tutup" },
                { id: "RELOKASI", label: "Relokasi" },
                { id: "RENOVASI", label: "Renovasi" },
              ]}
              value={draft.status}
              onChange={(v) => set("status", v as Store["status"])}
            />
            <SelectField
              label="Relocate From Store Code"
              items={[{ id: "", label: "—" }, ...stores.map((s) => ({ id: s.storeCode, label: `${s.storeCode} — ${s.storeName}` }))]}
              value={draft.relocateFromStoreCode ?? ""}
              onChange={(v) => set("relocateFromStoreCode", v)}
            />
            <TextInput label="No Telp" value={draft.noTelp} onChange={(v) => set("noTelp", v)} />
            <TextInput label="Planogram aktif" value={draft.planogramAktif ?? ""} onChange={(v) => set("planogramAktif", v)} />
            <NumberInput label="Luas (m²)" value={draft.luasM2} onChange={(v) => set("luasM2", v)} />
            <NumberInput label="Jumlah rak" value={draft.jumlahRak} onChange={(v) => set("jumlahRak", v)} />
          </div>

          {err.length ? (
            <ul className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-xs text-danger-soft-foreground">
              {err.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </FormModal>
    </>
  );
}
