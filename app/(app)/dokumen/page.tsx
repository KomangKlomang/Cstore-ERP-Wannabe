"use client";

import { useMemo, useState } from "react";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Download, FileText, Pencil, Plus } from "lucide-react";

import { Guard } from "@/components/app-shell";
import {
  FileUploadField,
  FormModal,
  KosongRow,
  PageHeader,
  SearchBox,
  SelectField,
  TextAreaInput,
  TextInput,
  Toolbar,
  type Opt,
} from "@/components/ui";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV } from "@/lib/export";
import { fmtBytes } from "@/lib/export";
import { fmtTgl } from "@/lib/format";
import type { Dokumen, JenisDokumen } from "@/lib/types";

const JENIS: JenisDokumen[] = ["SURAT", "KONTRAK", "BERITA_ACARA", "KV", "PLANOGRAM", "LAINNYA"];

export default function DokumenPage() {
  return (
    <Guard modul="dokumen">
      <DokumenView />
    </Guard>
  );
}

function DokumenView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "dokumen", "edit");

  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");
  const [principal, setPrincipal] = useState("");

  const prnOpt: Opt[] = db.principals.map((p) => ({ id: p.id, label: p.nama, hint: p.kode }));
  const prnNama = (id?: string) => db.principals.find((p) => p.id === id)?.nama ?? "-";
  const ktrNomor = (id?: string) => db.kontrak.find((k) => k.id === id)?.nomorSurat ?? "-";

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.dokumen.filter((d) => {
      if (jenis && d.jenis !== jenis) return false;
      if (principal && d.principalId !== principal) return false;
      if (!term) return true;
      return [d.judul, d.nomor, prnNama(d.principalId)].join(" ").toLowerCase().includes(term);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.dokumen, db.principals, q, jenis, principal]);

  const kolom = [
    { key: "nomor", header: "Nomor", value: (d: Dokumen) => d.nomor },
    { key: "judul", header: "Judul", value: (d: Dokumen) => d.judul },
    { key: "jenis", header: "Jenis", value: (d: Dokumen) => d.jenis },
    { key: "principal", header: "Principal", value: (d: Dokumen) => prnNama(d.principalId) },
    { key: "kontrak", header: "Kontrak", value: (d: Dokumen) => ktrNomor(d.kontrakId) },
    { key: "tanggal", header: "Tanggal", value: (d: Dokumen) => d.tanggal },
    { key: "file", header: "Jumlah File", value: (d: Dokumen) => d.file.length },
  ];

  return (
    <>
      <PageHeader
        judul="Dokumen"
        modul="M3 · M10"
        deskripsi="Repositori surat, kontrak, berita acara, KV, dan planogram. Setiap dokumen tertaut ke principal atau kontraknya sehingga penarikan data gabungan menjadi satu klik (R5/R6)."
        aksi={
          <>
            {boleh ? <FormDokumen prnOpt={prnOpt} onSimpan={(v) => saveRow("dokumen", v)} /> : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "dokumen")}>
              <Download className="size-4" /> CSV
            </Button>
          </>
        }
      />

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nomor / judul dokumen…" className="w-72" />
        <SelectField
          label="Jenis"
          items={[{ id: "", label: "Semua jenis" }, ...JENIS.map((j) => ({ id: j, label: j.replace("_", " ") }))]}
          value={jenis}
          onChange={setJenis}
          className="w-48"
        />
        <SelectField
          label="Principal"
          items={[{ id: "", label: "Semua principal" }, ...prnOpt]}
          value={principal}
          onChange={setPrincipal}
          className="w-56"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} dokumen</span>
      </Toolbar>

      {terfilter.length === 0 ? (
        <KosongRow pesan="Belum ada dokumen." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {terfilter.map((d) => (
            <article key={d.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <Chip size="sm" variant="soft">
                  {d.jenis.replace("_", " ")}
                </Chip>
                {boleh ? <FormDokumen dokumen={d} prnOpt={prnOpt} onSimpan={(v) => saveRow("dokumen", v)} /> : null}
              </div>
              <h3 className="text-sm font-medium text-foreground">{d.judul}</h3>
              <p className="mt-0.5 text-xs tnum text-muted">
                {d.nomor} · {fmtTgl(d.tanggal)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {d.principalId ? prnNama(d.principalId) : "Tanpa principal"} · {ktrNomor(d.kontrakId)}
              </p>

              {d.file.length ? (
                <ul className="mt-2 space-y-1">
                  {d.file.map((f) => (
                    <li key={f.id}>
                      <a
                        href={f.dataUrl}
                        download={f.nama}
                        className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                      >
                        <FileText className="size-3.5" /> {f.nama}
                        <span className="ml-auto tnum text-muted">{fmtBytes(f.ukuran)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted">Belum ada file terlampir.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function FormDokumen({
  dokumen,
  prnOpt,
  onSimpan,
}: {
  dokumen?: Dokumen;
  prnOpt: Opt[];
  onSimpan: (d: Dokumen) => void;
}) {
  const state = useOverlayState();
  const kontrak = useApp((s) => s.kontrak);

  const kosong = (): Dokumen => ({
    id: newId("dok"),
    nomor: "",
    judul: "",
    jenis: "SURAT",
    tanggal: new Date().toISOString().slice(0, 10),
    file: [],
    updatedAt: "",
    updatedBy: "",
  });

  const [draft, setDraft] = useState<Dokumen>(dokumen ?? kosong());
  const [err, setErr] = useState("");
  const set = <K extends keyof Dokumen>(k: K, v: Dokumen[K]) => setDraft({ ...draft, [k]: v });

  function simpan() {
    if (!draft.judul.trim() || !draft.nomor.trim()) {
      setErr("Nomor dan judul wajib diisi.");
      return false;
    }
    onSimpan(draft);
    setErr("");
    return true;
  }

  return (
    <>
      {dokumen ? (
        <Button size="sm" variant="ghost" isIconOnly aria-label={`Ubah ${dokumen.judul}`} onPress={() => { setDraft(dokumen); state.open(); }}>
          <Pencil className="size-3.5" />
        </Button>
      ) : (
        <Button variant="primary" onPress={() => { setDraft(kosong()); state.open(); }}>
          <Plus className="size-4" /> Dokumen baru
        </Button>
      )}

      <FormModal state={state} judul={dokumen ? "Ubah dokumen" : "Unggah dokumen"} onSimpan={simpan}>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Nomor" value={draft.nomor} onChange={(v) => set("nomor", v)} isRequired />
            <TextInput label="Tanggal" type="date" value={draft.tanggal} onChange={(v) => set("tanggal", v)} />
            <TextInput label="Judul" value={draft.judul} onChange={(v) => set("judul", v)} isRequired className="sm:col-span-2" />
            <SelectField
              label="Jenis"
              items={JENIS.map((j) => ({ id: j, label: j.replace("_", " ") }))}
              value={draft.jenis}
              onChange={(v) => set("jenis", v as JenisDokumen)}
            />
            <SelectField
              label="Principal"
              items={[{ id: "", label: "—" }, ...prnOpt]}
              value={draft.principalId ?? ""}
              onChange={(v) => set("principalId", v || undefined)}
            />
            <SelectField
              label="Kontrak terkait"
              items={[{ id: "", label: "—" }, ...kontrak.map((k) => ({ id: k.id, label: k.judul, hint: k.nomorSurat }))]}
              value={draft.kontrakId ?? ""}
              onChange={(v) => set("kontrakId", v || undefined)}
              className="sm:col-span-2"
            />
          </div>

          <FileUploadField label="File dokumen" files={draft.file} onChange={(f) => set("file", f)} />
          <TextAreaInput label="Keterangan" value={draft.keterangan ?? ""} onChange={(v) => set("keterangan", v)} rows={2} />

          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      </FormModal>
    </>
  );
}
