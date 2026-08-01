"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { ColumnChart, StackedColumnChart, VIZ_STATUS } from "@/graphify";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV, exportExcel } from "@/lib/export";
import { jatuhTempoPerBulan, kontrakInfo, type ReminderTier } from "@/lib/derive";
import { fmtRp, fmtRpShort, fmtTgl } from "@/lib/format";
import { JENIS_KONTRAK, type Kontrak } from "@/lib/types";

export default function KontrakPage() {
  return (
    <Guard modul="kontrak">
      <Suspense fallback={null}>
        <KontrakView />
      </Suspense>
    </Guard>
  );
}

const TIER_URUT: ReminderTier[] = ["LEWAT", "H-7", "H-30", "H-60", "H-90", "AMAN"];

function KontrakView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "kontrak", "edit");
  const params = useSearchParams();

  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");
  const [tier, setTier] = useState("");
  const [principal, setPrincipal] = useState("");

  useEffect(() => {
    const j = params.get("jenis");
    if (j) setJenis(j);
    const qq = params.get("q");
    if (qq) setQ(qq);
  }, [params]);

  const prnOpt: Opt[] = db.principals.map((p) => ({ id: p.id, label: p.nama, hint: p.kode }));
  const prnNama = (id: string) => db.principals.find((p) => p.id === id)?.nama ?? "-";

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.kontrak
      .filter((k) => {
        if (jenis && k.jenis !== jenis) return false;
        if (principal && k.principalId !== principal) return false;
        if (tier && kontrakInfo(k).tier !== tier) return false;
        if (!term) return true;
        return [k.judul, k.nomorSurat, prnNama(k.principalId), k.ruangLingkup].join(" ").toLowerCase().includes(term);
      })
      .sort((a, b) => kontrakInfo(a).sisaHari - kontrakInfo(b).sisaHari);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.kontrak, db.principals, q, jenis, tier, principal]);

  const kolom = [
    { key: "nomor", header: "Nomor Surat", value: (k: Kontrak) => k.nomorSurat },
    { key: "judul", header: "Judul", value: (k: Kontrak) => k.judul },
    { key: "principal", header: "Principal", value: (k: Kontrak) => prnNama(k.principalId) },
    { key: "jenis", header: "Jenis", value: (k: Kontrak) => k.jenis },
    { key: "lingkup", header: "Ruang Lingkup", value: (k: Kontrak) => k.ruangLingkup },
    { key: "mulai", header: "Masa Mulai", value: (k: Kontrak) => k.masaMulai },
    { key: "akhir", header: "Masa Berakhir", value: (k: Kontrak) => k.masaBerakhir },
    { key: "sisa", header: "Sisa Hari", value: (k: Kontrak) => kontrakInfo(k).sisaHari },
    { key: "reminder", header: "Reminder", value: (k: Kontrak) => kontrakInfo(k).tier },
    { key: "nilai", header: "Nilai", value: (k: Kontrak) => k.nilai },
    { key: "pembuat", header: "Pembuat", value: (k: Kontrak) => k.pembuat },
    { key: "penyetuju", header: "Penyetuju", value: (k: Kontrak) => k.penyetuju },
    { key: "toko", header: "Jumlah Toko", value: (k: Kontrak) => k.storeCodes.length },
    { key: "status", header: "Status", value: (k: Kontrak) => k.status },
    { key: "lampiran", header: "Jumlah Lampiran", value: (k: Kontrak) => k.lampiran.length },
  ];

  const perJenisTier = JENIS_KONTRAK.map((j) => {
    const list = db.kontrak.filter((k) => k.jenis === j);
    return {
      label: j,
      values: {
        "Lewat / H-7": list.filter((k) => ["LEWAT", "H-7"].includes(kontrakInfo(k).tier)).length,
        "H-30 / H-60": list.filter((k) => ["H-30", "H-60"].includes(kontrakInfo(k).tier)).length,
        "H-90": list.filter((k) => kontrakInfo(k).tier === "H-90").length,
        Aman: list.filter((k) => kontrakInfo(k).tier === "AMAN").length,
      },
    };
  });

  return (
    <div className="print-sheet">
      <PageHeader
        judul="Kontrak Principal"
        modul="M3 · US-3.1 / IMP-3"
        deskripsi="Nomor surat, masa kontrak, ruang lingkup, pembuat & penyetuju, beserta lampiran. Masa berakhir otomatis menghasilkan reminder bertingkat H-90 / H-60 / H-30 / H-7."
        aksi={
          <>
            {boleh ? <FormKontrak prnOpt={prnOpt} onSimpan={(v) => saveRow("kontrak", v)} /> : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "kontrak")}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" onPress={() => exportExcel(terfilter, kolom, "kontrak", "Kontrak")}>
              <Download className="size-4" /> Excel
            </Button>
            <Button variant="outline" onPress={() => window.print()}>
              <Printer className="size-4" /> PDF
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <ColumnChart
          title="Kontrak jatuh tempo — 6 bulan ke depan"
          subtitle="Jumlah kontrak yang berakhir per bulan"
          data={jatuhTempoPerBulan(db.kontrak)}
          color={VIZ_STATUS.serious}
          satuan="Jumlah kontrak"
          format={(n) => String(Math.round(n))}
          height={220}
        />
        <StackedColumnChart
          title="Status reminder per jenis kontrak"
          subtitle="Header, lolipop, dan akrilik adalah fokus notifikasi dashboard (R1)"
          data={perJenisTier}
          keys={["Lewat / H-7", "H-30 / H-60", "H-90", "Aman"]}
          colors={[VIZ_STATUS.critical, VIZ_STATUS.serious, VIZ_STATUS.warning, "var(--viz-6)"]}
          format={(n) => String(Math.round(n))}
          height={220}
        />
      </div>

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nomor surat / judul / principal…" className="w-72" />
        <SelectField
          label="Jenis"
          items={[{ id: "", label: "Semua jenis" }, ...JENIS_KONTRAK.map((j) => ({ id: j, label: j }))]}
          value={jenis}
          onChange={setJenis}
          className="w-44"
        />
        <SelectField
          label="Reminder"
          items={[{ id: "", label: "Semua" }, ...TIER_URUT.map((t) => ({ id: t as string, label: t as string }))]}
          value={tier}
          onChange={setTier}
          className="w-40"
        />
        <SelectField
          label="Principal"
          items={[{ id: "", label: "Semua principal" }, ...prnOpt]}
          value={principal}
          onChange={setPrincipal}
          className="w-56"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">
          {terfilter.length} kontrak · {fmtRpShort(terfilter.reduce((s, k) => s + k.nilai, 0))}
        </span>
      </Toolbar>

      {terfilter.length === 0 ? (
        <KosongRow pesan="Tidak ada kontrak yang cocok." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Nomor / Judul</th>
                <th className="px-3 py-2 font-medium">Principal</th>
                <th className="px-3 py-2 font-medium">Jenis</th>
                <th className="px-3 py-2 font-medium">Masa kontrak</th>
                <th className="px-3 py-2 font-medium">Reminder</th>
                <th className="px-3 py-2 text-right font-medium">Nilai</th>
                <th className="px-3 py-2 text-right font-medium">Toko</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {terfilter.map((k) => {
                const info = kontrakInfo(k);
                return (
                  <tr key={k.id} className="border-b border-separator/60 last:border-0">
                    <td className="px-3 py-2">
                      <span className="block font-medium text-foreground">{k.judul}</span>
                      <span className="block text-xs tnum text-muted">{k.nomorSurat}</span>
                      <span className="block text-[11px] text-muted">
                        {k.pembuat} → {k.penyetuju}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{prnNama(k.principalId)}</td>
                    <td className="px-3 py-2">
                      <Chip size="sm" variant="soft">
                        {k.jenis}
                      </Chip>
                    </td>
                    <td className="px-3 py-2 text-xs tnum text-muted">
                      {fmtTgl(k.masaMulai)} –<br />
                      {fmtTgl(k.masaBerakhir)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          info.level === "critical"
                            ? "bg-danger-soft text-danger-soft-foreground"
                            : info.level === "serious" || info.level === "warning"
                              ? "bg-warning-soft text-warning-soft-foreground"
                              : "bg-default-soft text-default-soft-foreground"
                        }`}
                      >
                        {info.tier}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">{info.label}</span>
                    </td>
                    <td className="px-3 py-2 text-right tnum text-foreground">{fmtRp(k.nilai)}</td>
                    <td className="px-3 py-2 text-right tnum text-muted">{k.storeCodes.length}</td>
                    <td className="px-3 py-2">
                      <StatusChip status={k.status} />
                    </td>
                    <td className="px-3 py-2">
                      {boleh ? <FormKontrak kontrak={k} prnOpt={prnOpt} onSimpan={(v) => saveRow("kontrak", v)} /> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Callout tone="warning" judul="Eskalasi reminder">
          Kontrak yang melewati H-7 tanpa tindakan otomatis muncul sebagai kartu kritis di dashboard MDM. Target G2:
          nol kontrak lewat masa berlaku tanpa notifikasi.
        </Callout>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- form */

function FormKontrak({
  kontrak,
  prnOpt,
  onSimpan,
}: {
  kontrak?: Kontrak;
  prnOpt: Opt[];
  onSimpan: (k: Kontrak) => void;
}) {
  const state = useOverlayState();
  const stores = useApp((s) => s.stores);

  const kosong = (): Kontrak => ({
    id: newId("ktr"),
    nomorSurat: "",
    judul: "",
    principalId: "",
    jenis: "HEADER",
    ruangLingkup: "",
    masaMulai: new Date().toISOString().slice(0, 10),
    masaBerakhir: new Date().toISOString().slice(0, 10),
    nilai: 0,
    pembuat: "",
    penyetuju: "",
    storeCodes: [],
    status: "DRAFT",
    lampiran: [],
    updatedAt: "",
    updatedBy: "",
  });

  const [draft, setDraft] = useState<Kontrak>(kontrak ?? kosong());
  const [err, setErr] = useState("");
  const set = <K extends keyof Kontrak>(k: K, v: Kontrak[K]) => setDraft({ ...draft, [k]: v });

  function simpan() {
    if (!draft.nomorSurat.trim() || !draft.judul.trim() || !draft.principalId) {
      setErr("Nomor surat, judul, dan principal wajib diisi.");
      return false;
    }
    if (draft.masaBerakhir < draft.masaMulai) {
      setErr("Masa berakhir tidak boleh lebih awal dari masa mulai.");
      return false;
    }
    onSimpan(draft);
    setErr("");
    return true;
  }

  return (
    <>
      {kontrak ? (
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={`Ubah ${kontrak.nomorSurat}`}
          onPress={() => {
            setDraft(kontrak);
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
          <Plus className="size-4" /> Kontrak baru
        </Button>
      )}

      <FormModal state={state} judul={kontrak ? `Ubah ${kontrak.nomorSurat}` : "Daftarkan kontrak"} onSimpan={simpan}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Nomor surat" value={draft.nomorSurat} onChange={(v) => set("nomorSurat", v)} isRequired />
            <TextInput label="Judul kontrak" value={draft.judul} onChange={(v) => set("judul", v)} isRequired />
            <SelectField label="Principal" items={prnOpt} value={draft.principalId} onChange={(v) => set("principalId", v)} />
            <SelectField
              label="Jenis"
              items={JENIS_KONTRAK.map((j) => ({ id: j, label: j }))}
              value={draft.jenis}
              onChange={(v) => set("jenis", v as Kontrak["jenis"])}
            />
            <TextInput label="Masa mulai" type="date" value={draft.masaMulai} onChange={(v) => set("masaMulai", v)} />
            <TextInput label="Masa berakhir" type="date" value={draft.masaBerakhir} onChange={(v) => set("masaBerakhir", v)} />
            <NumberInput label="Nilai kontrak" value={draft.nilai} onChange={(v) => set("nilai", v)} />
            <SelectField
              label="Status"
              items={[
                { id: "DRAFT", label: "Draft" },
                { id: "AKTIF", label: "Aktif" },
                { id: "DIPERPANJANG", label: "Diperpanjang" },
                { id: "BERAKHIR", label: "Berakhir" },
                { id: "DIBATALKAN", label: "Dibatalkan" },
              ]}
              value={draft.status}
              onChange={(v) => set("status", v as Kontrak["status"])}
            />
            <TextInput label="Pembuat" value={draft.pembuat} onChange={(v) => set("pembuat", v)} />
            <TextInput label="Penyetuju" value={draft.penyetuju} onChange={(v) => set("penyetuju", v)} />
          </div>

          <TextAreaInput label="Ruang lingkup" value={draft.ruangLingkup} onChange={(v) => set("ruangLingkup", v)} />

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Toko tercakup ({draft.storeCodes.length}/{stores.length})
            </p>
            <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-3">
              {stores.map((s) => {
                const aktif = draft.storeCodes.includes(s.storeCode);
                return (
                  <label key={s.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={aktif}
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
                );
              })}
            </div>
          </div>

          <FileUploadField
            label="Lampiran surat / kontrak"
            files={draft.lampiran}
            onChange={(f) => set("lampiran", f)}
          />

          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      </FormModal>
    </>
  );
}
