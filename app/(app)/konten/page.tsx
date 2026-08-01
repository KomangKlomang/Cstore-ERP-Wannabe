"use client";

import { useMemo, useState } from "react";
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
  TextAreaInput,
  TextInput,
  Toolbar,
  type Opt,
} from "@/components/ui";
import { AreaChart, BarChart, DonutChart, LineChart, MeterBar, VIZ } from "@/graphify";
import { newId, useApp } from "@/lib/store";
import { can, inScope } from "@/lib/rbac";
import { exportCSV } from "@/lib/export";
import { engagementPerBulan, kontenPerJenis, topTokoKonten } from "@/lib/derive";
import { fmtDurasi, fmtNum, fmtNumShort, fmtTgl } from "@/lib/format";
import { JENIS_KONTEN, PLATFORMS, type ContentReport } from "@/lib/types";

export default function KontenPage() {
  return (
    <Guard modul="konten">
      <KontenView />
    </Guard>
  );
}

function KontenView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "konten", "create");
  const isCrew = user?.role === "CREW";

  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("");
  const [jenis, setJenis] = useState("");
  const [store, setStore] = useState("");

  const storeRegion = useMemo(() => new Map(db.stores.map((s) => [s.storeCode, s.region])), [db.stores]);
  const storeNama = (code: string) => db.stores.find((s) => s.storeCode === code)?.storeName ?? code;

  /** FR-9.5 — Crew hanya melihat laporan miliknya sendiri. */
  const terlihat = useMemo(
    () =>
      db.contentReports.filter((c) => {
        if (isCrew) return c.crewId === user?.id || c.storeCode === user?.storeCode;
        return inScope(user, storeRegion.get(c.storeCode));
      }),
    [db.contentReports, isCrew, user, storeRegion],
  );

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return terlihat
      .filter((c) => {
        if (platform && c.platform !== platform) return false;
        if (jenis && c.jenisKonten !== jenis) return false;
        if (store && c.storeCode !== store) return false;
        if (!term) return true;
        return [c.namaKonten, c.storeCode, storeNama(c.storeCode)].join(" ").toLowerCase().includes(term);
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terlihat, q, platform, jenis, store]);

  const stOpt: Opt[] = db.stores
    .filter((s) => (isCrew ? s.storeCode === user?.storeCode : inScope(user, s.region)))
    .map((s) => ({ id: s.storeCode, label: `${s.storeCode} — ${s.storeName}`, hint: s.region }));

  const promoOpt: Opt[] = [
    { id: "", label: "— tanpa promosi —" },
    ...db.promosi.map((p) => ({ id: p.id, label: p.nama, hint: p.kodePromo })),
  ];

  const kolom = [
    { key: "tanggal", header: "Tanggal", value: (c: ContentReport) => c.tanggal },
    { key: "store", header: "Store Code", value: (c: ContentReport) => c.storeCode },
    { key: "storeName", header: "Store Name", value: (c: ContentReport) => storeNama(c.storeCode) },
    { key: "nama", header: "Nama Konten", value: (c: ContentReport) => c.namaKonten },
    { key: "platform", header: "Platform", value: (c: ContentReport) => c.platform },
    { key: "jenis", header: "Jenis Konten", value: (c: ContentReport) => c.jenisKonten },
    { key: "like", header: "Like", value: (c: ContentReport) => c.like },
    { key: "comment", header: "Comment", value: (c: ContentReport) => c.comment },
    { key: "share", header: "Share", value: (c: ContentReport) => c.share },
    { key: "repost", header: "Repost", value: (c: ContentReport) => c.repost },
    { key: "watch", header: "Watch Time (detik)", value: (c: ContentReport) => c.watchTime },
    { key: "promosi", header: "Promosi", value: (c: ContentReport) => db.promosi.find((p) => p.id === c.promosiId)?.kodePromo ?? "" },
  ];

  const totalEngagement = terfilter.reduce((s, c) => s + c.like + c.comment + c.share + c.repost, 0);

  return (
    <>
      <PageHeader
        judul="Content Report"
        modul="M6 · US-6.1"
        deskripsi={
          isCrew
            ? "Isi laporan konten toko Anda: nama konten, jenis, performa, dan screenshot KV."
            : "Laporan performa konten sosial media per toko, platform, dan jenis konten."
        }
        aksi={
          <>
            {boleh ? (
              <FormKonten
                stOpt={stOpt}
                promoOpt={promoOpt}
                defaultStore={user?.storeCode ?? ""}
                crewId={user?.id ?? ""}
                onSimpan={(v) => saveRow("contentReports", v)}
              />
            ) : null}
            {!isCrew ? (
              <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "content-report")}>
                <Download className="size-4" /> CSV
              </Button>
            ) : null}
          </>
        }
      />

      {isCrew ? (
        <div className="mb-4">
          <Callout tone="info" judul="Akses Crew">
            Peran Crew hanya memiliki modul ini, dan hanya melihat laporan miliknya sendiri (FR-9.5). Form dirancang
            ringkas agar mudah diisi dari ponsel (IMP-10).
          </Callout>
        </div>
      ) : (
        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <LineChart
            title="Engagement per bulan"
            subtitle="Like + comment + share + repost per platform"
            data={engagementPerBulan(terlihat)}
            keys={[...PLATFORMS]}
            format={fmtNumShort}
          />
          <DonutChart
            title="Engagement per jenis konten"
            subtitle="Kontribusi tiap format konten"
            data={kontenPerJenis(terlihat)}
            heroLabel="engagement"
            format={fmtNumShort}
          />
          <AreaChart
            title="Total engagement seluruh platform"
            subtitle="Gabungan empat platform per bulan — melihat arah tren tanpa terganggu rincian"
            data={engagementPerBulan(terlihat).map((d) => ({
              label: d.label,
              values: { Total: Object.values(d.values).reduce((s, v) => s + v, 0) },
            }))}
            seriesKey="Total"
            format={fmtNumShort}
          />
          <div className="rounded-xl border border-border bg-surface p-4 shadow-surface">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Rasio interaksi</h3>
            <div className="grid grid-cols-2 gap-3">
              <MeterBar
                label="Comment per like"
                value={terlihat.reduce((s, c) => s + c.comment, 0)}
                target={Math.max(terlihat.reduce((s, c) => s + c.like, 0), 1)}
                color={VIZ[2]}
              />
              <MeterBar
                label="Share per like"
                value={terlihat.reduce((s, c) => s + c.share, 0)}
                target={Math.max(terlihat.reduce((s, c) => s + c.like, 0), 1)}
                color={VIZ[1]}
              />
            </div>
          </div>
        </div>
      )}

      {!isCrew ? (
        <div className="mb-4">
          <BarChart
            title="Toko dengan engagement tertinggi"
            subtitle="Delapan toko teratas berdasarkan total interaksi"
            data={topTokoKonten(terlihat, db.stores)}
            format={fmtNumShort}
            satuan="Engagement"
          />
        </div>
      ) : null}

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nama konten / toko…" className="w-64" />
        <SelectField
          label="Platform"
          items={[{ id: "", label: "Semua platform" }, ...PLATFORMS.map((p) => ({ id: p, label: p }))]}
          value={platform}
          onChange={setPlatform}
          className="w-44"
        />
        <SelectField
          label="Jenis"
          items={[{ id: "", label: "Semua jenis" }, ...JENIS_KONTEN.map((j) => ({ id: j, label: j }))]}
          value={jenis}
          onChange={setJenis}
          className="w-40"
        />
        {!isCrew ? (
          <SelectField
            label="Toko"
            items={[{ id: "", label: "Semua toko" }, ...stOpt]}
            value={store}
            onChange={setStore}
            className="w-56"
          />
        ) : null}
        <span className="ml-auto self-center text-xs text-muted tnum">
          {terfilter.length} laporan · {fmtNum(totalEngagement)} engagement
        </span>
      </Toolbar>

      {terfilter.length === 0 ? (
        <KosongRow pesan="Belum ada laporan konten." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Tanggal</th>
                <th className="px-3 py-2 font-medium">Konten</th>
                <th className="px-3 py-2 font-medium">Toko</th>
                <th className="px-3 py-2 font-medium">Platform / jenis</th>
                <th className="px-3 py-2 text-right font-medium">Like</th>
                <th className="px-3 py-2 text-right font-medium">Comment</th>
                <th className="px-3 py-2 text-right font-medium">Share</th>
                <th className="px-3 py-2 text-right font-medium">Repost</th>
                <th className="px-3 py-2 text-right font-medium">Watch</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {terfilter.slice(0, 100).map((c) => (
                <tr key={c.id} className="border-b border-separator/60 last:border-0">
                  <td className="px-3 py-2 text-xs tnum text-muted">{fmtTgl(c.tanggal)}</td>
                  <td className="px-3 py-2">
                    <span className="block text-foreground">{c.namaKonten}</span>
                    {c.promosiId ? (
                      <span className="block text-[11px] text-muted">
                        promo: {db.promosi.find((p) => p.id === c.promosiId)?.kodePromo}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs tnum text-muted">{c.storeCode}</td>
                  <td className="px-3 py-2">
                    <Chip size="sm" variant="soft">
                      {c.platform}
                    </Chip>
                    <span className="mt-0.5 block text-[11px] text-muted">{c.jenisKonten}</span>
                  </td>
                  <td className="px-3 py-2 text-right tnum">{fmtNum(c.like)}</td>
                  <td className="px-3 py-2 text-right tnum">{fmtNum(c.comment)}</td>
                  <td className="px-3 py-2 text-right tnum">{fmtNum(c.share)}</td>
                  <td className="px-3 py-2 text-right tnum">{fmtNum(c.repost)}</td>
                  <td className="px-3 py-2 text-right text-xs tnum text-muted">{fmtDurasi(c.watchTime)}</td>
                  <td className="px-3 py-2">
                    {boleh ? (
                      <FormKonten
                        laporan={c}
                        stOpt={stOpt}
                        promoOpt={promoOpt}
                        defaultStore={c.storeCode}
                        crewId={c.crewId}
                        onSimpan={(v) => saveRow("contentReports", v)}
                      />
                    ) : null}
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

function FormKonten({
  laporan,
  stOpt,
  promoOpt,
  defaultStore,
  crewId,
  onSimpan,
}: {
  laporan?: ContentReport;
  stOpt: Opt[];
  promoOpt: Opt[];
  defaultStore: string;
  crewId: string;
  onSimpan: (c: ContentReport) => void;
}) {
  const state = useOverlayState();

  const kosong = (): ContentReport => ({
    id: newId("cr"),
    tanggal: new Date().toISOString().slice(0, 10),
    storeCode: defaultStore,
    crewId,
    namaKonten: "",
    platform: "INSTAGRAM",
    jenisKonten: "REELS",
    like: 0,
    comment: 0,
    share: 0,
    repost: 0,
    watchTime: 0,
    screenshot: [],
    createdAt: new Date().toISOString(),
  });

  const [draft, setDraft] = useState<ContentReport>(laporan ?? kosong());
  const [err, setErr] = useState("");
  const set = <K extends keyof ContentReport>(k: K, v: ContentReport[K]) => setDraft({ ...draft, [k]: v });

  function simpan() {
    if (!draft.namaKonten.trim() || !draft.storeCode) {
      setErr("Nama konten dan toko wajib diisi.");
      return false;
    }
    onSimpan(draft);
    setErr("");
    return true;
  }

  return (
    <>
      {laporan ? (
        <Button size="sm" variant="ghost" isIconOnly aria-label="Ubah laporan" onPress={() => { setDraft(laporan); state.open(); }}>
          <Pencil className="size-3.5" />
        </Button>
      ) : (
        <Button variant="primary" onPress={() => { setDraft(kosong()); state.open(); }}>
          <Plus className="size-4" /> Laporan baru
        </Button>
      )}

      <FormModal state={state} judul={laporan ? "Ubah laporan konten" : "Laporan konten baru"} size="md" onSimpan={simpan}>
        <div className="space-y-3">
          <TextInput label="Nama konten" value={draft.namaKonten} onChange={(v) => set("namaKonten", v)} isRequired />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Tanggal" type="date" value={draft.tanggal} onChange={(v) => set("tanggal", v)} />
            <SelectField label="Toko" items={stOpt} value={draft.storeCode} onChange={(v) => set("storeCode", v)} />
            <SelectField
              label="Platform"
              items={PLATFORMS.map((p) => ({ id: p, label: p }))}
              value={draft.platform}
              onChange={(v) => set("platform", v as ContentReport["platform"])}
            />
            <SelectField
              label="Jenis konten"
              items={JENIS_KONTEN.map((j) => ({ id: j, label: j }))}
              value={draft.jenisKonten}
              onChange={(v) => set("jenisKonten", v as ContentReport["jenisKonten"])}
            />
            <SelectField
              label="Promosi terkait"
              items={promoOpt}
              value={draft.promosiId ?? ""}
              onChange={(v) => set("promosiId", v || undefined)}
              className="sm:col-span-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <NumberInput label="Like" value={draft.like} onChange={(v) => set("like", v)} />
            <NumberInput label="Comment" value={draft.comment} onChange={(v) => set("comment", v)} />
            <NumberInput label="Share" value={draft.share} onChange={(v) => set("share", v)} />
            <NumberInput label="Repost" value={draft.repost} onChange={(v) => set("repost", v)} />
            <NumberInput label="Watch time (detik)" value={draft.watchTime} onChange={(v) => set("watchTime", v)} />
          </div>

          <FileUploadField
            label="Screenshot / KV"
            files={draft.screenshot}
            onChange={(f) => set("screenshot", f)}
            accept="image/*"
          />

          <TextAreaInput label="Catatan" value={draft.catatan ?? ""} onChange={(v) => set("catatan", v)} rows={2} />

          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      </FormModal>
    </>
  );
}
