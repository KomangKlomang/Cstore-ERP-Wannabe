"use client";

import { useMemo, useState } from "react";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { CheckCircle2, Download, Eye, Plus, XCircle } from "lucide-react";

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
import { ColumnChart, VIZ } from "@/graphify";
import { emptyTagMap, newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV } from "@/lib/export";
import { fmtRp, fmtTgl, fmtTglJam } from "@/lib/format";
import { REGIONS, USULAN_STATUS, type UsulanNPD, type UsulanStatus } from "@/lib/types";
import { TRANSISI } from "@/lib/workflow";

export default function UsulanNPDPage() {
  return (
    <Guard modul="npd">
      <UsulanNPDView />
    </Guard>
  );
}

function UsulanNPDView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const transition = useApp((s) => s.transitionNPD);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);

  const bolehBuat = can(user, "npd", "create");
  const bolehApprove = can(user, "npd", "approve");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sumber, setSumber] = useState("");

  const prnOpt: Opt[] = db.principals.map((p) => ({ id: p.id, label: p.nama, hint: p.kode }));
  const katOpt: Opt[] = db.categories.map((c) => ({
    id: c.id,
    label: `${c.subCategoryCode} — ${c.subCategory}`,
    hint: `${c.segment} › ${c.subDept}`,
  }));
  const tagOpt: Opt[] = db.tags.map((t) => ({ id: t.kode, label: `${t.kode} — ${t.nama}` }));

  const pengusul = (id: string) => db.users.find((u) => u.id === id)?.nama ?? id;
  const prnNama = (id: string) => db.principals.find((p) => p.id === id)?.nama ?? "-";

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.usulanNPD.filter((u) => {
      if (status && u.status !== status) return false;
      if (sumber && u.sumber !== sumber) return false;
      if (!term) return true;
      return [u.nomor, u.namaProduct, u.barcode, u.brand].join(" ").toLowerCase().includes(term);
    });
  }, [db.usulanNPD, q, status, sumber]);

  const perStatus = USULAN_STATUS.map((s) => ({
    label: s.replace("_", " "),
    value: db.usulanNPD.filter((u) => u.status === s).length,
  }));

  const kolom = [
    { key: "nomor", header: "Nomor", value: (u: UsulanNPD) => u.nomor },
    { key: "sumber", header: "Sumber", value: (u: UsulanNPD) => u.sumber },
    { key: "pengusul", header: "Pengusul", value: (u: UsulanNPD) => pengusul(u.pengusulId) },
    { key: "barcode", header: "Barcode", value: (u: UsulanNPD) => u.barcode },
    { key: "nama", header: "Nama Product", value: (u: UsulanNPD) => u.namaProduct },
    { key: "principal", header: "Principal", value: (u: UsulanNPD) => prnNama(u.principalId) },
    { key: "beli", header: "Harga Beli", value: (u: UsulanNPD) => u.hargaBeli },
    { key: "jual", header: "Harga Jual", value: (u: UsulanNPD) => u.hargaJual },
    { key: "status", header: "Status", value: (u: UsulanNPD) => u.status },
    { key: "produk", header: "Produk terbentuk", value: (u: UsulanNPD) => u.produkId ?? "" },
  ];

  return (
    <>
      <PageHeader
        judul="Usulan NPD"
        modul="M2 · US-2.1 / US-2.3"
        deskripsi="Usulan produk baru dari Buyer maupun Category. Status berjalan Draft → Submitted → On Progress → Approved/Declined, dan setiap transisi mencatat aktor, waktu, serta alasan."
        aksi={
          <>
            {bolehBuat ? (
              <FormUsulan
                prnOpt={prnOpt}
                katOpt={katOpt}
                tagOpt={tagOpt}
                onSimpan={(v) => saveRow("usulanNPD", v)}
                nomorBerikutnya={`NPD/2026/07/${String(db.usulanNPD.length + 1).padStart(3, "0")}`}
                pengusulId={user?.id ?? ""}
                sumberDefault={user?.role === "BUYER" ? "BUYER" : "CATEGORY"}
              />
            ) : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "usulan-npd")}>
              <Download className="size-4" /> CSV
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <ColumnChart
          title="Usulan NPD per status"
          subtitle="Sebaran seluruh usulan pada state machine"
          data={perStatus}
          color={VIZ[0]}
          satuan="Jumlah usulan"
          format={(n) => String(Math.round(n))}
          height={200}
        />
        <Callout tone="info" judul="Aturan approval">
          Hanya MDM yang dapat menyetujui atau menolak. Usulan yang <b>Approved</b> otomatis membentuk Master Product
          beserta <b>Kode Product</b> dan menyimpan jejak “dari usulan #” — tidak ada input ganda (US-2.3).
          <br />
          OQ-6 masih terbuka: saat ini Buyer dan Category dapat saling melihat usulan; batasi di sini bila bisnis
          memutuskan sebaliknya.
        </Callout>
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nomor / nama produk / barcode…" className="w-72" />
        <SelectField
          label="Status"
          items={[{ id: "", label: "Semua status" }, ...USULAN_STATUS.map((s) => ({ id: s, label: s.replace("_", " ") }))]}
          value={status}
          onChange={setStatus}
          className="w-48"
        />
        <SelectField
          label="Sumber"
          items={[
            { id: "", label: "Semua sumber" },
            { id: "BUYER", label: "Buyer" },
            { id: "CATEGORY", label: "Category" },
          ]}
          value={sumber}
          onChange={setSumber}
          className="w-44"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} usulan</span>
      </Toolbar>

      {terfilter.length === 0 ? (
        <KosongRow pesan="Belum ada usulan yang cocok dengan filter." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Nomor</th>
                <th className="px-3 py-2 font-medium">Produk diusulkan</th>
                <th className="px-3 py-2 font-medium">Principal</th>
                <th className="px-3 py-2 font-medium">Pengusul</th>
                <th className="px-3 py-2 text-right font-medium">Beli / Jual</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {terfilter.map((u) => (
                <tr key={u.id} className="border-b border-separator/60 last:border-0">
                  <td className="px-3 py-2">
                    <span className="block tnum font-medium text-foreground">{u.nomor}</span>
                    <span className="block text-xs text-muted">{fmtTgl(u.createdAt)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="block text-foreground">{u.namaProduct}</span>
                    <span className="block text-xs tnum text-muted">{u.barcode}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{prnNama(u.principalId)}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="block text-foreground">{pengusul(u.pengusulId)}</span>
                    <Chip size="sm" variant="soft" color={u.sumber === "BUYER" ? "accent" : "default"}>
                      {u.sumber}
                    </Chip>
                  </td>
                  <td className="px-3 py-2 text-right text-xs tnum">
                    <span className="block text-muted">{fmtRp(u.hargaBeli)}</span>
                    <span className="block text-foreground">{fmtRp(u.hargaJual)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <StatusChip status={u.status} />
                    {u.produkId ? (
                      <span className="mt-0.5 block text-[11px] text-success">produk terbentuk</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <DetailUsulan
                      usulan={u}
                      bolehApprove={bolehApprove}
                      pengusul={pengusul(u.pengusulId)}
                      principal={prnNama(u.principalId)}
                      kategori={
                        db.categories.find((c) => c.id === u.categoryId)
                          ? `${db.categories.find((c) => c.id === u.categoryId)!.subCategoryCode} — ${db.categories.find((c) => c.id === u.categoryId)!.subCategory}`
                          : "-"
                      }
                      onTransisi={(st, alasan) => transition(u.id, st, alasan)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ detail */

function DetailUsulan({
  usulan,
  bolehApprove,
  pengusul,
  principal,
  kategori,
  onTransisi,
}: {
  usulan: UsulanNPD;
  bolehApprove: boolean;
  pengusul: string;
  principal: string;
  kategori: string;
  onTransisi: (status: UsulanStatus, alasan?: string) => void;
}) {
  const state = useOverlayState();
  const [alasan, setAlasan] = useState("");
  const lanjut = TRANSISI[usulan.status];

  return (
    <>
      <Button size="sm" variant="ghost" isIconOnly aria-label={`Detail ${usulan.nomor}`} onPress={() => state.open()}>
        <Eye className="size-3.5" />
      </Button>

      <FormModal state={state} judul={`${usulan.nomor} — ${usulan.namaProduct}`} size="lg">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={usulan.status} size="md" />
            <Chip variant="soft">{usulan.sumber}</Chip>
            <span className="text-sm text-muted">diusulkan oleh {pengusul}</span>
          </div>

          <dl className="grid gap-x-6 gap-y-1.5 rounded-xl border border-border p-3 sm:grid-cols-2">
            {(
              [
                ["Barcode", usulan.barcode],
                ["Principal", principal],
                ["Sub Category", kategori],
                ["Brand", usulan.brand],
                ["UOM / isi", `${usulan.uom} · ${usulan.isiSatuPack}`],
                ["Harga beli", fmtRp(usulan.hargaBeli)],
                ["Harga jual", fmtRp(usulan.hargaJual)],
                ["MSRP", fmtRp(usulan.msrp)],
                ["C1–C5", [usulan.c1, usulan.c2, usulan.c3, usulan.c4, usulan.c5].filter(Boolean).join(" · ") || "-"],
                ["Keterangan", usulan.keterangan ?? "-"],
              ] as Array<[string, string]>
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-separator/50 py-1 last:border-0">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="text-right text-sm text-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Tag usulan per region</p>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs">
                  <span className="text-muted">{r}</span>
                  <Chip size="sm" variant="soft">
                    {usulan.tagUsulanPerRegion[r]}
                  </Chip>
                </span>
              ))}
            </div>
          </div>

          {usulan.fotoPack.length ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Foto pack</p>
              <div className="flex flex-wrap gap-2">
                {usulan.fotoPack.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={f.dataUrl} alt={f.nama} className="size-20 rounded-lg object-cover" />
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Jejak approval</p>
            <ol className="space-y-2 border-l border-border pl-4">
              {usulan.history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-accent" aria-hidden />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <StatusChip status={h.status} />
                    <span className="text-sm text-foreground">{h.aktor}</span>
                    <span className="text-xs text-muted">({h.aktorRole})</span>
                    <span className="ml-auto text-xs tnum text-muted">{fmtTglJam(h.at)}</span>
                  </div>
                  {h.alasan ? <p className="mt-0.5 text-xs text-muted">“{h.alasan}”</p> : null}
                </li>
              ))}
            </ol>
          </div>

          {lanjut.length ? (
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-medium text-foreground">Tindakan</p>
              <TextAreaInput
                label="Alasan / catatan"
                value={alasan}
                onChange={setAlasan}
                placeholder="Wajib diisi untuk penolakan."
                rows={2}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {lanjut.map((st) => {
                  const perluMDM = st === "APPROVED" || st === "DECLINED" || st === "ON_PROGRESS";
                  const nonaktif = perluMDM && !bolehApprove;
                  return (
                    <Button
                      key={st}
                      size="sm"
                      variant={st === "APPROVED" ? "primary" : st === "DECLINED" ? "danger" : "secondary"}
                      isDisabled={nonaktif || (st === "DECLINED" && !alasan.trim())}
                      onPress={() => {
                        onTransisi(st, alasan.trim() || undefined);
                        setAlasan("");
                        state.close();
                      }}
                    >
                      {st === "APPROVED" ? <CheckCircle2 className="size-3.5" /> : st === "DECLINED" ? <XCircle className="size-3.5" /> : null}
                      {st.replace("_", " ")}
                    </Button>
                  );
                })}
              </div>
              {!bolehApprove ? (
                <p className="mt-2 text-xs text-muted">Approve/Decline hanya tersedia untuk peran MDM (FR-9.3).</p>
              ) : null}
            </div>
          ) : (
            <Callout tone={usulan.status === "APPROVED" ? "info" : "warning"} judul="Usulan sudah final">
              {usulan.status === "APPROVED"
                ? "Master Product sudah terbentuk dari usulan ini."
                : "Usulan ditolak dan tidak dapat diubah lagi. Buat usulan baru bila diperlukan."}
            </Callout>
          )}
        </div>
      </FormModal>
    </>
  );
}

/* -------------------------------------------------------------------- form */

function FormUsulan({
  prnOpt,
  katOpt,
  tagOpt,
  onSimpan,
  nomorBerikutnya,
  pengusulId,
  sumberDefault,
}: {
  prnOpt: Opt[];
  katOpt: Opt[];
  tagOpt: Opt[];
  onSimpan: (u: UsulanNPD) => void;
  nomorBerikutnya: string;
  pengusulId: string;
  sumberDefault: "BUYER" | "CATEGORY";
}) {
  const state = useOverlayState();
  const products = useApp((s) => s.products);
  const aktor = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);

  const kosong = (): UsulanNPD => ({
    id: newId("npd"),
    nomor: nomorBerikutnya,
    sumber: sumberDefault,
    pengusulId,
    barcode: "",
    namaProduct: "",
    principalId: "",
    categoryId: "",
    brand: "",
    uom: "PCS",
    isiSatuPack: 1,
    hargaBeli: 0,
    hargaJual: 0,
    msrp: 0,
    tagUsulanPerRegion: emptyTagMap("A"),
    fotoPack: [],
    status: "DRAFT",
    history: [],
    createdAt: new Date().toISOString().slice(0, 10),
  });

  const [draft, setDraft] = useState<UsulanNPD>(kosong());
  const [err, setErr] = useState("");
  const set = <K extends keyof UsulanNPD>(k: K, v: UsulanNPD[K]) => setDraft({ ...draft, [k]: v });

  const duplikat = products.find((p) => p.barcode === draft.barcode.trim());

  function simpan(langsungSubmit: boolean) {
    if (!draft.barcode.trim() || !draft.namaProduct.trim() || !draft.principalId || !draft.categoryId) {
      setErr("Barcode, nama produk, principal, dan sub category wajib diisi.");
      return false;
    }
    if (duplikat) {
      setErr(`Barcode sudah dipakai SKU ${duplikat.kodeProduct}.`);
      return false;
    }
    if (draft.fotoPack.length === 0) {
      setErr("Minimal 1 foto pack wajib dilampirkan (US-1.2).");
      return false;
    }
    const at = new Date().toISOString();
    const jejak = (status: UsulanStatus) => ({
      status,
      aktor: aktor?.nama ?? "system",
      aktorRole: aktor?.role ?? ("BUYER" as const),
      at,
    });
    const history = [jejak("DRAFT"), ...(langsungSubmit ? [jejak("SUBMITTED")] : [])];
    onSimpan({ ...draft, status: langsungSubmit ? "SUBMITTED" : "DRAFT", history });
    setDraft(kosong());
    setErr("");
    return true;
  }

  return (
    <>
      <Button variant="primary" onPress={() => state.open()}>
        <Plus className="size-4" /> Usulan baru
      </Button>

      <FormModal
        state={state}
        judul="Buat Usulan NPD"
        deskripsi="Atribut produk lengkap + harga beli/jual. Foto pack wajib minimal satu."
        simpanLabel="Simpan &amp; submit"
        onSimpan={() => simpan(true)}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Nomor usulan" value={draft.nomor} onChange={(v) => set("nomor", v)} />
            <SelectField
              label="Sumber usulan"
              items={[
                { id: "BUYER", label: "Buyer" },
                { id: "CATEGORY", label: "Category" },
              ]}
              value={draft.sumber}
              onChange={(v) => set("sumber", v as UsulanNPD["sumber"])}
            />
            <TextInput label="Barcode" value={draft.barcode} onChange={(v) => set("barcode", v)} isRequired />
            <TextInput label="Brand" value={draft.brand} onChange={(v) => set("brand", v.toUpperCase())} />
            <TextInput
              label="Nama Product"
              value={draft.namaProduct}
              onChange={(v) => set("namaProduct", v.toUpperCase())}
              isRequired
              className="sm:col-span-2"
            />
            <SelectField label="Principal" items={prnOpt} value={draft.principalId} onChange={(v) => set("principalId", v)} />
            <SelectField label="Sub Category" items={katOpt} value={draft.categoryId} onChange={(v) => set("categoryId", v)} />
            <TextInput label="UOM" value={draft.uom} onChange={(v) => set("uom", v.toUpperCase())} />
            <NumberInput label="Isi 1 pack" value={draft.isiSatuPack} onChange={(v) => set("isiSatuPack", v)} />
            <NumberInput label="Harga beli" value={draft.hargaBeli} onChange={(v) => set("hargaBeli", v)} />
            <NumberInput label="Harga jual" value={draft.hargaJual} onChange={(v) => set("hargaJual", v)} />
            <NumberInput label="MSRP" value={draft.msrp} onChange={(v) => set("msrp", v)} />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Tag usulan per region</p>
            <div className="grid gap-2 sm:grid-cols-5">
              {REGIONS.map((r) => (
                <SelectField
                  key={r}
                  label={r}
                  items={tagOpt}
                  value={draft.tagUsulanPerRegion[r]}
                  onChange={(v) => setDraft({ ...draft, tagUsulanPerRegion: { ...draft.tagUsulanPerRegion, [r]: v } })}
                />
              ))}
            </div>
          </div>

          <FileUploadField
            label="Foto pack produk (wajib)"
            files={draft.fotoPack}
            onChange={(f) => set("fotoPack", f)}
            accept="image/*"
          />

          <TextAreaInput
            label="Keterangan"
            value={draft.keterangan ?? ""}
            onChange={(v) => set("keterangan", v)}
            placeholder="Alasan pengajuan, data pendukung, komitmen principal…"
          />

          {duplikat ? (
            <Callout tone="danger" judul="Barcode sudah terdaftar">
              {duplikat.kodeProduct} — {duplikat.namaProduct}
            </Callout>
          ) : null}
          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      </FormModal>
    </>
  );
}
