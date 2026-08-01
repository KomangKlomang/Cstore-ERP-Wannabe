"use client";

import { useMemo, useState } from "react";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { ArrowRight, CheckCircle2, Download, Eye, Plus, XCircle } from "lucide-react";

import { Guard } from "@/components/app-shell";
import {
  Callout,
  FormModal,
  KosongRow,
  PageHeader,
  SearchBox,
  SelectField,
  StatusChip,
  TextAreaInput,
  TextInput,
  Toolbar,
  type Opt,
} from "@/components/ui";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV } from "@/lib/export";
import { fmtTgl, fmtTglJam } from "@/lib/format";
import { REGIONS, USULAN_STATUS, type Region, type UsulanStatus, type UsulanTag, type UsulanTagPerubahan } from "@/lib/types";
import { TRANSISI } from "@/lib/workflow";

export default function UsulanTagPage() {
  return (
    <Guard modul="usulantag">
      <UsulanTagView />
    </Guard>
  );
}

function UsulanTagView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const transition = useApp((s) => s.transitionUsulanTag);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);

  const bolehBuat = can(user, "usulantag", "create");
  const bolehApprove = can(user, "usulantag", "approve");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const produkNama = (id: string) => db.products.find((p) => p.id === id)?.namaProduct ?? id;
  const produkKode = (id: string) => db.products.find((p) => p.id === id)?.kodeProduct ?? "-";
  const pengusul = (id: string) => db.users.find((u) => u.id === id)?.nama ?? id;

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.usulanTag.filter((u) => {
      if (status && u.status !== status) return false;
      if (!term) return true;
      return [u.nomor, produkNama(u.productId), u.reason].join(" ").toLowerCase().includes(term);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.usulanTag, db.products, q, status]);

  const kolom = [
    { key: "nomor", header: "Nomor", value: (u: UsulanTag) => u.nomor },
    { key: "produk", header: "Produk", value: (u: UsulanTag) => `${produkKode(u.productId)} ${produkNama(u.productId)}` },
    { key: "sumber", header: "Sumber", value: (u: UsulanTag) => u.sumber },
    { key: "pengusul", header: "Pengusul", value: (u: UsulanTag) => pengusul(u.pengusulId) },
    {
      key: "perubahan",
      header: "Perubahan",
      value: (u: UsulanTag) => u.perubahan.map((c) => `${c.region}: ${c.tagAsal}→${c.tagTujuan}`).join(" | "),
    },
    { key: "reason", header: "Reason", value: (u: UsulanTag) => u.reason },
    { key: "keterangan", header: "Keterangan", value: (u: UsulanTag) => u.keterangan ?? "" },
    { key: "status", header: "Status", value: (u: UsulanTag) => u.status },
  ];

  return (
    <>
      <PageHeader
        judul="Usulan Tag"
        modul="M2 · US-2.2"
        deskripsi="Mutasi tag antar region (JBTK, SRG, BDG, SMG, SBY). Minimal satu region berubah dan tag asal harus sama dengan tag aktif SKU saat ini."
        aksi={
          <>
            {bolehBuat ? (
              <FormUsulanTag
                onSimpan={(v) => saveRow("usulanTag", v)}
                nomorBerikutnya={`TAG/2026/07/${String(db.usulanTag.length + 1).padStart(3, "0")}`}
              />
            ) : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "usulan-tag")}>
              <Download className="size-4" /> CSV
            </Button>
          </>
        }
      />

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nomor / produk / alasan…" className="w-72" />
        <SelectField
          label="Status"
          items={[{ id: "", label: "Semua status" }, ...USULAN_STATUS.map((s) => ({ id: s, label: s.replace("_", " ") }))]}
          value={status}
          onChange={setStatus}
          className="w-48"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} usulan</span>
      </Toolbar>

      {terfilter.length === 0 ? (
        <KosongRow pesan="Belum ada usulan tag." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Nomor</th>
                <th className="px-3 py-2 font-medium">Produk</th>
                <th className="px-3 py-2 font-medium">Perubahan tag</th>
                <th className="px-3 py-2 font-medium">Alasan</th>
                <th className="px-3 py-2 font-medium">Pengusul</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {terfilter.map((u) => (
                <tr key={u.id} className="border-b border-separator/60 last:border-0 align-top">
                  <td className="px-3 py-2">
                    <span className="block tnum font-medium text-foreground">{u.nomor}</span>
                    <span className="block text-xs text-muted">{fmtTgl(u.createdAt)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="block text-foreground">{produkNama(u.productId)}</span>
                    <span className="block text-xs tnum text-muted">{produkKode(u.productId)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {u.perubahan.map((c) => (
                        <div key={c.region} className="flex items-center gap-1.5 text-xs">
                          <span className="w-10 text-muted">{c.region}</span>
                          <Chip size="sm" variant="soft">
                            {c.tagAsal}
                          </Chip>
                          <ArrowRight className="size-3 text-muted" />
                          <Chip size="sm" variant="soft" color="accent">
                            {c.tagTujuan}
                          </Chip>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="max-w-[240px] px-3 py-2 text-xs text-muted">{u.reason}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="block text-foreground">{pengusul(u.pengusulId)}</span>
                    <Chip size="sm" variant="soft">
                      {u.sumber}
                    </Chip>
                  </td>
                  <td className="px-3 py-2">
                    <StatusChip status={u.status} />
                  </td>
                  <td className="px-3 py-2">
                    <DetailUsulanTag
                      usulan={u}
                      produk={`${produkKode(u.productId)} — ${produkNama(u.productId)}`}
                      pengusul={pengusul(u.pengusulId)}
                      bolehApprove={bolehApprove}
                      onTransisi={(st, alasan) => transition(u.id, st, alasan)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Callout tone="info" judul="Efek approval">
          Usulan yang disetujui langsung memperbarui <b>tagPerRegion</b> pada Master Product. Tag dengan Jual = N
          membuat SKU hilang dari daftar SKU aktif profil toko region tersebut.
        </Callout>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ detail */

function DetailUsulanTag({
  usulan,
  produk,
  pengusul,
  bolehApprove,
  onTransisi,
}: {
  usulan: UsulanTag;
  produk: string;
  pengusul: string;
  bolehApprove: boolean;
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

      <FormModal state={state} judul={`${usulan.nomor} — ${produk}`}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={usulan.status} size="md" />
            <Chip variant="soft">{usulan.sumber}</Chip>
            <span className="text-sm text-muted">diusulkan oleh {pengusul}</span>
          </div>

          <div className="rounded-xl border border-border p-3">
            <p className="mb-2 text-sm font-medium text-foreground">Perubahan tag per region</p>
            <ul className="space-y-1.5">
              {usulan.perubahan.map((c) => (
                <li key={c.region} className="flex items-center gap-2 text-sm">
                  <span className="w-12 text-muted">{c.region}</span>
                  <Chip size="sm" variant="soft">
                    {c.tagAsal}
                  </Chip>
                  <ArrowRight className="size-3.5 text-muted" />
                  <Chip size="sm" variant="soft" color="accent">
                    {c.tagTujuan}
                  </Chip>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="text-xs text-muted">REASON</p>
            <p className="text-foreground">{usulan.reason}</p>
            <p className="mt-2 text-xs text-muted">KETERANGAN</p>
            <p className="text-foreground">{usulan.keterangan ?? "-"}</p>
          </div>

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
              <TextAreaInput label="Alasan / catatan" value={alasan} onChange={setAlasan} rows={2} />
              <div className="mt-2 flex flex-wrap gap-2">
                {lanjut.map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={st === "APPROVED" ? "primary" : st === "DECLINED" ? "danger" : "secondary"}
                    isDisabled={!bolehApprove || (st === "DECLINED" && !alasan.trim())}
                    onPress={() => {
                      onTransisi(st, alasan.trim() || undefined);
                      setAlasan("");
                      state.close();
                    }}
                  >
                    {st === "APPROVED" ? <CheckCircle2 className="size-3.5" /> : st === "DECLINED" ? <XCircle className="size-3.5" /> : null}
                    {st.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </FormModal>
    </>
  );
}

/* -------------------------------------------------------------------- form */

function FormUsulanTag({ onSimpan, nomorBerikutnya }: { onSimpan: (u: UsulanTag) => void; nomorBerikutnya: string }) {
  const state = useOverlayState();
  const db = useApp((s) => s);
  const aktor = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);

  const [nomor, setNomor] = useState(nomorBerikutnya);
  const [productId, setProductId] = useState("");
  const [tujuan, setTujuan] = useState<Record<Region, string>>({} as Record<Region, string>);
  const [reason, setReason] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [err, setErr] = useState("");

  const produk = db.products.find((p) => p.id === productId);
  const prodOpt: Opt[] = db.products.map((p) => ({ id: p.id, label: p.namaProduct, hint: p.kodeProduct }));
  const tagOpt: Opt[] = db.tags.map((t) => ({ id: t.kode, label: `${t.kode} — ${t.nama}`, hint: `Jual ${t.jual ? "Y" : "N"} · PO ${t.po ? "Y" : "N"}` }));

  const perubahan: UsulanTagPerubahan[] = produk
    ? REGIONS.filter((r) => tujuan[r] && tujuan[r] !== produk.tagPerRegion[r]).map((r) => ({
        region: r,
        tagAsal: produk.tagPerRegion[r],
        tagTujuan: tujuan[r],
      }))
    : [];

  function simpan() {
    if (!produk) {
      setErr("Pilih SKU terlebih dahulu.");
      return false;
    }
    if (perubahan.length === 0) {
      setErr("Minimal satu region harus berubah dari tag aktifnya (US-2.2).");
      return false;
    }
    if (!reason.trim()) {
      setErr("REASON wajib diisi.");
      return false;
    }
    const at = new Date().toISOString();
    const jejak = (status: UsulanStatus) => ({
      status,
      aktor: aktor?.nama ?? "system",
      aktorRole: aktor?.role ?? ("CATEGORY_OFFICER" as const),
      at,
    });
    onSimpan({
      id: newId("utg"),
      nomor,
      sumber: aktor?.role === "BUYER" ? "BUYER" : "CATEGORY",
      pengusulId: aktor?.id ?? "",
      productId,
      perubahan,
      reason,
      keterangan: keterangan || undefined,
      status: "SUBMITTED",
      history: [jejak("DRAFT"), jejak("SUBMITTED")],
      createdAt: at.slice(0, 10),
    });
    setProductId("");
    setTujuan({} as Record<Region, string>);
    setReason("");
    setKeterangan("");
    setErr("");
    return true;
  }

  return (
    <>
      <Button variant="primary" onPress={() => state.open()}>
        <Plus className="size-4" /> Usulan tag baru
      </Button>

      <FormModal state={state} judul="Buat Usulan Tag" simpanLabel="Submit" onSimpan={simpan}>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Nomor usulan" value={nomor} onChange={setNomor} />
            <SelectField
              label="SKU"
              items={prodOpt}
              value={productId}
              onChange={(v) => {
                setProductId(v);
                setTujuan({} as Record<Region, string>);
              }}
            />
          </div>

          {produk ? (
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-medium text-foreground">Tag tujuan per region</p>
              <div className="space-y-2">
                {REGIONS.map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <span className="w-12 text-sm text-muted">{r}</span>
                    <Chip size="sm" variant="soft">
                      {produk.tagPerRegion[r]}
                    </Chip>
                    <ArrowRight className="size-3.5 text-muted" />
                    <SelectField
                      ariaLabel={`Tag tujuan ${r}`}
                      items={[{ id: "", label: "— tidak berubah —" }, ...tagOpt]}
                      value={tujuan[r] ?? ""}
                      onChange={(v) => setTujuan({ ...tujuan, [r]: v })}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                {perubahan.length} region akan berubah. Tag asal diambil otomatis dari tag aktif SKU.
              </p>
            </div>
          ) : null}

          <TextAreaInput label="REASON" value={reason} onChange={setReason} placeholder="Alasan bisnis perubahan tag…" />
          <TextAreaInput label="KETERANGAN" value={keterangan} onChange={setKeterangan} rows={2} />

          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      </FormModal>
    </>
  );
}
