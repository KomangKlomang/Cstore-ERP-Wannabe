"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Download, Pencil, Plus } from "lucide-react";

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
import { BarChart } from "@/graphify";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV } from "@/lib/export";
import { fmtRp, fmtRpShort, fmtTgl } from "@/lib/format";
import { REGIONS, type Promosi, type Region } from "@/lib/types";

export default function PromosiPage() {
  return (
    <Guard modul="promosi">
      <Suspense fallback={null}>
        <PromosiView />
      </Suspense>
    </Guard>
  );
}

function PromosiView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "promosi", "edit");
  const params = useSearchParams();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const qq = params.get("q");
    if (qq) setQ(qq);
  }, [params]);

  const prnNama = (id: string) => db.principals.find((p) => p.id === id)?.nama ?? "-";
  const prnOpt: Opt[] = db.principals.map((p) => ({ id: p.id, label: p.nama, hint: p.kode }));

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.promosi.filter((p) => {
      if (status && p.status !== status) return false;
      if (!term) return true;
      return [p.nama, p.kodePromo, p.mekanisme].join(" ").toLowerCase().includes(term);
    });
  }, [db.promosi, q, status]);

  const kolom = [
    { key: "kode", header: "Kode Promo", value: (p: Promosi) => p.kodePromo },
    { key: "nama", header: "Nama Promo", value: (p: Promosi) => p.nama },
    { key: "principal", header: "Principal", value: (p: Promosi) => prnNama(p.principalId) },
    { key: "mekanisme", header: "Mekanisme", value: (p: Promosi) => p.mekanisme },
    { key: "mulai", header: "Tgl Mulai", value: (p: Promosi) => p.tglMulai },
    { key: "selesai", header: "Tgl Selesai", value: (p: Promosi) => p.tglSelesai },
    { key: "plu", header: "Jumlah PLU", value: (p: Promosi) => p.pluIds.length },
    { key: "toko", header: "Jumlah Toko", value: (p: Promosi) => p.storeCodes.length },
    { key: "region", header: "Region", value: (p: Promosi) => p.regions.join(", ") },
    { key: "budget", header: "Budget", value: (p: Promosi) => p.budget },
    { key: "status", header: "Status", value: (p: Promosi) => p.status },
  ];

  const budgetPerPrincipal = useMemo(() => {
    const m = new Map<string, number>();
    db.promosi.forEach((p) => m.set(p.principalId, (m.get(p.principalId) ?? 0) + p.budget));
    return [...m.entries()]
      .map(([id, value]) => ({ key: id, label: prnNama(id).replace(/^PT\s+/, ""), value }))
      .sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.promosi, db.principals]);

  return (
    <>
      <PageHeader
        judul="Promosi"
        modul="M5 · US-5.1"
        deskripsi="Mekanisme promo, KV, periode berlaku, dan daftar PLU. PLU wajib SKU aktif dan KV wajib diunggah."
        aksi={
          <>
            {boleh ? <FormPromosi prnOpt={prnOpt} onSimpan={(v) => saveRow("promosi", v)} /> : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "promosi")}>
              <Download className="size-4" /> CSV
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <BarChart
          title="Budget promosi per principal"
          subtitle="Akumulasi seluruh promo (draft, berjalan, selesai)"
          data={budgetPerPrincipal}
          format={fmtRpShort}
          satuan="Budget"
        />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nama promo / kode / mekanisme…" className="w-72" />
        <SelectField
          label="Status"
          items={[
            { id: "", label: "Semua status" },
            { id: "DRAFT", label: "Draft" },
            { id: "BERJALAN", label: "Berjalan" },
            { id: "SELESAI", label: "Selesai" },
            { id: "DIBATALKAN", label: "Dibatalkan" },
          ]}
          value={status}
          onChange={setStatus}
          className="w-44"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} promo</span>
      </Toolbar>

      {terfilter.length === 0 ? (
        <KosongRow pesan="Belum ada promosi." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {terfilter.map((p) => (
            <article key={p.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-foreground">{p.nama}</h3>
                  <p className="text-xs tnum text-muted">
                    {p.kodePromo} · {prnNama(p.principalId)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusChip status={p.status} />
                  {boleh ? <FormPromosi promosi={p} prnOpt={prnOpt} onSimpan={(v) => saveRow("promosi", v)} /> : null}
                </div>
              </div>

              <p className="mb-2 text-sm text-foreground">{p.mekanisme}</p>

              <div className="mb-2 flex flex-wrap gap-1">
                {p.regions.map((r) => (
                  <Chip key={r} size="sm" variant="soft">
                    {r}
                  </Chip>
                ))}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <Info label="Periode" value={`${fmtTgl(p.tglMulai)} – ${fmtTgl(p.tglSelesai)}`} />
                <Info label="PLU" value={String(p.pluIds.length)} />
                <Info label="Toko" value={String(p.storeCodes.length)} />
                <Info label="Budget" value={fmtRp(p.budget)} />
              </dl>

              {p.kv.length ? (
                <div className="mt-2 flex gap-1">
                  {p.kv.slice(0, 3).map((f) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={f.id} src={f.dataUrl} alt={f.nama} className="h-16 w-24 rounded object-cover" />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-warning">KV belum diunggah.</p>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Callout tone="info" judul="Keterkaitan dengan Content Report">
          Laporan konten dapat ditautkan ke promosi sehingga performa tiap promo terlihat per toko dan per platform
          (Flow D).
        </Callout>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="tnum text-foreground">{value}</dd>
    </div>
  );
}

function FormPromosi({
  promosi,
  prnOpt,
  onSimpan,
}: {
  promosi?: Promosi;
  prnOpt: Opt[];
  onSimpan: (p: Promosi) => void;
}) {
  const state = useOverlayState();
  const db = useApp((s) => s);

  const kosong = (): Promosi => ({
    id: newId("pro"),
    kodePromo: "",
    nama: "",
    principalId: "",
    mekanisme: "",
    tglMulai: new Date().toISOString().slice(0, 10),
    tglSelesai: new Date().toISOString().slice(0, 10),
    pluIds: [],
    storeCodes: [],
    regions: [],
    kv: [],
    dokumen: [],
    status: "DRAFT",
    budget: 0,
    updatedAt: "",
    updatedBy: "",
  });

  const [draft, setDraft] = useState<Promosi>(promosi ?? kosong());
  const [err, setErr] = useState("");
  const [cariPlu, setCariPlu] = useState("");
  const set = <K extends keyof Promosi>(k: K, v: Promosi[K]) => setDraft({ ...draft, [k]: v });

  const skuAktif = db.products.filter((p) => p.status === "AKTIF");
  const skuTampil = skuAktif
    .filter((p) => (cariPlu ? `${p.namaProduct} ${p.kodeProduct}`.toLowerCase().includes(cariPlu.toLowerCase()) : true))
    .slice(0, 40);

  function simpan() {
    if (!draft.kodePromo.trim() || !draft.nama.trim() || !draft.principalId) {
      setErr("Kode promo, nama, dan principal wajib diisi.");
      return false;
    }
    if (draft.kv.length === 0) {
      setErr("KV wajib diunggah (US-5.1).");
      return false;
    }
    const pluTidakAktif = draft.pluIds.filter((id) => !skuAktif.some((p) => p.id === id));
    if (pluTidakAktif.length) {
      setErr("Seluruh PLU harus SKU berstatus AKTIF.");
      return false;
    }
    onSimpan(draft);
    setErr("");
    return true;
  }

  return (
    <>
      {promosi ? (
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={`Ubah ${promosi.nama}`}
          onPress={() => {
            setDraft(promosi);
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
          <Plus className="size-4" /> Promosi baru
        </Button>
      )}

      <FormModal state={state} judul={promosi ? `Ubah ${promosi.nama}` : "Buat promosi"} onSimpan={simpan}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Kode promo" value={draft.kodePromo} onChange={(v) => set("kodePromo", v.toUpperCase())} isRequired />
            <TextInput label="Nama promo" value={draft.nama} onChange={(v) => set("nama", v)} isRequired />
            <SelectField label="Principal" items={prnOpt} value={draft.principalId} onChange={(v) => set("principalId", v)} />
            <SelectField
              label="Status"
              items={[
                { id: "DRAFT", label: "Draft" },
                { id: "BERJALAN", label: "Berjalan" },
                { id: "SELESAI", label: "Selesai" },
                { id: "DIBATALKAN", label: "Dibatalkan" },
              ]}
              value={draft.status}
              onChange={(v) => set("status", v as Promosi["status"])}
            />
            <TextInput label="Tgl mulai" type="date" value={draft.tglMulai} onChange={(v) => set("tglMulai", v)} />
            <TextInput label="Tgl selesai" type="date" value={draft.tglSelesai} onChange={(v) => set("tglSelesai", v)} />
            <NumberInput label="Budget" value={draft.budget} onChange={(v) => set("budget", v)} />
          </div>

          <TextAreaInput label="Mekanisme" value={draft.mekanisme} onChange={(v) => set("mekanisme", v)} />

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Region berlaku</p>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <label key={r} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={draft.regions.includes(r)}
                    onChange={(e) =>
                      set("regions", e.target.checked ? [...draft.regions, r] : draft.regions.filter((x) => x !== r))
                    }
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">PLU terkait ({draft.pluIds.length})</p>
            <TextInput value={cariPlu} onChange={setCariPlu} placeholder="Cari SKU aktif…" />
            <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {skuTampil.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={draft.pluIds.includes(p.id)}
                    onChange={(e) =>
                      set("pluIds", e.target.checked ? [...draft.pluIds, p.id] : draft.pluIds.filter((x) => x !== p.id))
                    }
                  />
                  <span className="tnum text-muted">{p.kodeProduct}</span>
                  <span className="truncate">{p.namaProduct}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Toko ({draft.storeCodes.length})</p>
            <div className="grid max-h-36 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-3">
              {db.stores
                .filter((s) => draft.regions.length === 0 || draft.regions.includes(s.region as Region))
                .map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={draft.storeCodes.includes(s.storeCode)}
                      onChange={(e) =>
                        set(
                          "storeCodes",
                          e.target.checked
                            ? [...draft.storeCodes, s.storeCode]
                            : draft.storeCodes.filter((c) => c !== s.storeCode),
                        )
                      }
                    />
                    <span className="truncate">
                      {s.storeCode} · {s.region}
                    </span>
                  </label>
                ))}
            </div>
          </div>

          <FileUploadField label="Key Visual (wajib)" files={draft.kv} onChange={(f) => set("kv", f)} accept="image/*" />
          <FileUploadField label="Dokumen pendukung" files={draft.dokumen} onChange={(f) => set("dokumen", f)} />

          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      </FormModal>
    </>
  );
}
