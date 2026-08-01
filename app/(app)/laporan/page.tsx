"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Chip, Tabs } from "@heroui/react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { Callout, KosongRow, PageHeader, SelectField, StatusChip, Toolbar } from "@/components/ui";
import { BarChart, DonutChart } from "@/graphify";
import { useApp } from "@/lib/store";
import { exportCSV, exportExcel, type Column } from "@/lib/export";
import { kontrakInfo } from "@/lib/derive";
import { fmtRp, fmtRpShort, fmtTgl } from "@/lib/format";

export default function LaporanPage() {
  return (
    <Guard modul="laporan">
      <Suspense fallback={null}>
        <LaporanView />
      </Suspense>
    </Guard>
  );
}

type EntitasKey = "products" | "stores" | "kontrak" | "aset" | "promosi" | "contentReports" | "categories" | "principals";

interface EntitasDef {
  label: string;
  rows: unknown[];
  cols: Column<unknown>[];
}

/** Menyatukan berbagai entitas ke satu bentuk export tanpa kehilangan type-safety
 *  saat kolom didefinisikan. */
function def<T>(label: string, rows: T[], cols: Column<T>[]): EntitasDef {
  return { label, rows, cols: cols as unknown as Column<unknown>[] };
}

function LaporanView() {
  const db = useApp((s) => s);
  const params = useSearchParams();

  const [principalId, setPrincipalId] = useState("");
  const [entitas, setEntitas] = useState<EntitasKey>("kontrak");
  const [hanyaBerkontrak, setHanyaBerkontrak] = useState("YA");

  useEffect(() => {
    const p = params.get("principal");
    if (p) setPrincipalId(p);
  }, [params]);

  const prnNama = (id: string) => db.principals.find((p) => p.id === id)?.nama ?? "-";
  const storeNama = (code: string) => db.stores.find((s) => s.storeCode === code)?.storeName ?? code;

  /* ------------------------------------------------- ringkasan per principal */

  const principalTerpilih = db.principals.find((p) => p.id === principalId);

  const paket = useMemo(() => {
    if (!principalId) return null;
    return {
      kontrak: db.kontrak.filter((k) => k.principalId === principalId),
      aset: db.aset.filter((a) => a.principalId === principalId),
      produk: db.products.filter((p) => p.principalId === principalId),
      promosi: db.promosi.filter((p) => p.principalId === principalId),
      dokumen: db.dokumen.filter((d) => d.principalId === principalId),
    };
  }, [db, principalId]);

  /* --------------------------------------------------------- export generik */

  const definisi: Record<EntitasKey, EntitasDef> = useMemo(() => {
    const filterPrincipal = <T extends { principalId?: string }>(arr: T[]) =>
      principalId ? arr.filter((r) => r.principalId === principalId) : arr;

    return {
      kontrak: def("Kontrak", filterPrincipal(db.kontrak), [
          { key: "nomorSurat", header: "Nomor Surat", value: (k) => k.nomorSurat },
          { key: "judul", header: "Judul", value: (k) => k.judul },
          { key: "principal", header: "Principal", value: (k) => prnNama(k.principalId) },
          { key: "jenis", header: "Jenis", value: (k) => k.jenis },
          { key: "mulai", header: "Masa Mulai", value: (k) => k.masaMulai },
          { key: "akhir", header: "Masa Berakhir", value: (k) => k.masaBerakhir },
          { key: "sisa", header: "Sisa Hari", value: (k) => kontrakInfo(k).sisaHari },
          { key: "reminder", header: "Reminder", value: (k) => kontrakInfo(k).tier },
          { key: "nilai", header: "Nilai", value: (k) => k.nilai },
          { key: "toko", header: "Jumlah Toko", value: (k) => k.storeCodes.length },
          { key: "lampiran", header: "Jumlah Lampiran", value: (k) => k.lampiran.length },
          { key: "status", header: "Status", value: (k) => k.status },
        ]),
      aset: def("Aset marketing", filterPrincipal(db.aset), [
          { key: "kodeAset", header: "Kode Aset", value: (a) => a.kodeAset },
          { key: "nama", header: "Nama", value: (a) => a.nama },
          { key: "jenis", header: "Jenis", value: (a) => a.jenis },
          { key: "principal", header: "Principal", value: (a) => prnNama(a.principalId) },
          { key: "store", header: "Store Code", value: (a) => a.storeCode },
          { key: "storeName", header: "Store Name", value: (a) => storeNama(a.storeCode) },
          { key: "qty", header: "Qty", value: (a) => a.qty },
          { key: "kondisi", header: "Kondisi", value: (a) => a.kondisi },
          { key: "masuk", header: "Tgl Masuk", value: (a) => a.tglMasuk },
          { key: "foto", header: "Jumlah Foto", value: (a) => a.fotoTerpasang.length },
        ]),
      products: def("Master product", filterPrincipal(db.products), [
          { key: "kode", header: "Kode Product", value: (p) => p.kodeProduct },
          { key: "barcode", header: "Barcode", value: (p) => p.barcode },
          { key: "nama", header: "Nama Product", value: (p) => p.namaProduct },
          { key: "principal", header: "Principal", value: (p) => prnNama(p.principalId) },
          { key: "brand", header: "Brand", value: (p) => p.brand },
          { key: "beli", header: "Harga Beli", value: (p) => p.hargaBeli },
          { key: "jual", header: "Harga Jual", value: (p) => p.hargaJual },
          { key: "status", header: "Status", value: (p) => p.status },
        ]),
      promosi: def("Promosi", filterPrincipal(db.promosi), [
          { key: "kode", header: "Kode Promo", value: (p) => p.kodePromo },
          { key: "nama", header: "Nama", value: (p) => p.nama },
          { key: "principal", header: "Principal", value: (p) => prnNama(p.principalId) },
          { key: "mulai", header: "Tgl Mulai", value: (p) => p.tglMulai },
          { key: "selesai", header: "Tgl Selesai", value: (p) => p.tglSelesai },
          { key: "budget", header: "Budget", value: (p) => p.budget },
          { key: "status", header: "Status", value: (p) => p.status },
        ]),
      stores: def("Master store", db.stores, [
          { key: "code", header: "Store Code", value: (s) => s.storeCode },
          { key: "name", header: "Store Name", value: (s) => s.storeName },
          { key: "hm", header: "Store ID (HM)", value: (s) => s.storeIdHM },
          { key: "ag", header: "Analytical Group (HM)", value: (s) => s.analyticalGroupHM },
          { key: "type", header: "Store Type", value: (s) => s.storeType },
          { key: "region", header: "Region", value: (s) => s.region },
          { key: "kota", header: "Kota", value: (s) => s.kota },
          { key: "status", header: "Status", value: (s) => s.status },
        ]),
      categories: def("Master category", db.categories, [
          { key: "seg", header: "Segment", value: (c) => `${c.segmentCode} ${c.segment}` },
          { key: "dept", header: "Dept", value: (c) => `${c.deptCode} ${c.dept}` },
          { key: "sub", header: "Sub Dept", value: (c) => `${c.subDeptCode} ${c.subDept}` },
          { key: "cat", header: "Category", value: (c) => `${c.categoryCode} ${c.category}` },
          { key: "subcat", header: "Sub Category", value: (c) => `${c.subCategoryCode} ${c.subCategory}` },
          { key: "status", header: "Status", value: (c) => c.status },
        ]),
      principals: def("Master principal", db.principals, [
          { key: "kode", header: "Kode", value: (p) => p.kode },
          { key: "nama", header: "Nama", value: (p) => p.nama },
          { key: "brand", header: "Brand", value: (p) => p.brand.join(", ") },
          { key: "pic", header: "PIC", value: (p) => p.pic },
          { key: "status", header: "Status", value: (p) => p.status },
        ]),
      contentReports: def("Content report", db.contentReports, [
          { key: "tanggal", header: "Tanggal", value: (c) => c.tanggal },
          { key: "store", header: "Store Code", value: (c) => c.storeCode },
          { key: "nama", header: "Nama Konten", value: (c) => c.namaKonten },
          { key: "platform", header: "Platform", value: (c) => c.platform },
          { key: "jenis", header: "Jenis", value: (c) => c.jenisKonten },
          { key: "like", header: "Like", value: (c) => c.like },
          { key: "comment", header: "Comment", value: (c) => c.comment },
          { key: "share", header: "Share", value: (c) => c.share },
        ]),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, principalId]);

  const aktif = definisi[entitas];

  /* R5 — daftar principal aktif yang punya kontrak berjalan */
  const principalBerkontrak = useMemo(
    () =>
      db.principals
        .filter((p) => p.status === "AKTIF")
        .map((p) => {
          const list = db.kontrak.filter((k) => k.principalId === p.id);
          const berjalan = list.filter((k) => kontrakInfo(k).sisaHari >= 0);
          return { principal: p, total: list.length, berjalan: berjalan.length, nilai: berjalan.reduce((s, k) => s + k.nilai, 0) };
        })
        .filter((r) => (hanyaBerkontrak === "YA" ? r.berjalan > 0 : true))
        .sort((a, b) => b.nilai - a.nilai),
    [db.principals, db.kontrak, hanyaBerkontrak],
  );

  return (
    <div className="print-sheet">
      <PageHeader
        judul="Export &amp; Laporan"
        modul="M8 · R5 / US-8.2"
        deskripsi="Tarik data gabungan per entitas atau per principal — dari kontrak beserta masa berlakunya sampai dokumentasi aset — lalu unduh sebagai CSV/Excel atau cetak ke PDF."
      />

      <Tabs defaultSelectedKey="principal">
        <Tabs.List aria-label="Mode laporan">
          <Tabs.Tab id="principal">Paket data per principal</Tabs.Tab>
          <Tabs.Tab id="entitas">Export per entitas</Tabs.Tab>
          <Tabs.Tab id="ringkas">Principal aktif berkontrak</Tabs.Tab>
        </Tabs.List>

        {/* ------------------------------------------------------ per principal */}
        <Tabs.Panel id="principal" className="pt-4">
          <Toolbar>
            <SelectField
              label="Principal"
              items={[{ id: "", label: "— pilih principal —" }, ...db.principals.map((p) => ({ id: p.id, label: p.nama, hint: p.kode }))]}
              value={principalId}
              onChange={setPrincipalId}
              className="w-72"
            />
            <Button variant="outline" onPress={() => window.print()} isDisabled={!principalId}>
              <Printer className="size-4" /> Cetak / PDF
            </Button>
          </Toolbar>

          {!principalTerpilih || !paket ? (
            <KosongRow pesan="Pilih principal untuk menarik seluruh datanya." />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{principalTerpilih.nama}</h2>
                    <p className="text-sm text-muted">
                      {principalTerpilih.kode} · PIC {principalTerpilih.pic} · {principalTerpilih.telp} ·{" "}
                      {principalTerpilih.email}
                    </p>
                    <p className="mt-1 text-xs text-muted">{principalTerpilih.alamat}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {principalTerpilih.brand.map((b) => (
                      <Chip key={b} size="sm" variant="soft">
                        {b}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <Kotak label="Kontrak" value={String(paket.kontrak.length)} />
                  <Kotak label="Nilai kontrak" value={fmtRpShort(paket.kontrak.reduce((s, k) => s + k.nilai, 0))} />
                  <Kotak label="SKU" value={String(paket.produk.length)} />
                  <Kotak label="Aset terpasang" value={String(paket.aset.length)} />
                  <Kotak label="Promosi" value={String(paket.promosi.length)} />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Kontrak &amp; masa berlaku</h3>
                  {paket.kontrak.length === 0 ? (
                    <p className="text-sm text-muted">Tidak ada kontrak.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted">
                          <th className="py-1.5 pr-2 font-medium">Nomor</th>
                          <th className="py-1.5 pr-2 font-medium">Jenis</th>
                          <th className="py-1.5 pr-2 font-medium">Berlaku</th>
                          <th className="py-1.5 pr-2 text-right font-medium">Nilai</th>
                          <th className="py-1.5 font-medium">Reminder</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paket.kontrak.map((k) => {
                          const info = kontrakInfo(k);
                          return (
                            <tr key={k.id} className="border-b border-separator/50 last:border-0">
                              <td className="py-1.5 pr-2 tnum">{k.nomorSurat}</td>
                              <td className="py-1.5 pr-2">{k.jenis}</td>
                              <td className="py-1.5 pr-2 tnum text-muted">
                                {fmtTgl(k.masaMulai)} – {fmtTgl(k.masaBerakhir)}
                              </td>
                              <td className="py-1.5 pr-2 text-right tnum">{fmtRp(k.nilai)}</td>
                              <td className="py-1.5">
                                <span className={info.level === "critical" ? "text-danger" : info.level === "good" ? "text-muted" : "text-warning"}>
                                  {info.tier}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <DonutChart
                  title="Aset principal ini per kondisi"
                  data={[
                    { label: "GOOD", value: paket.aset.filter((a) => a.kondisi === "GOOD").length },
                    { label: "REPLACE", value: paket.aset.filter((a) => a.kondisi === "REPLACE").length },
                    { label: "HILANG", value: paket.aset.filter((a) => a.kondisi === "HILANG").length },
                  ].filter((d) => d.value > 0)}
                  heroLabel="aset"
                />
              </div>

              <div className="rounded-xl border border-border bg-surface p-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Dokumentasi aset per toko</h3>
                {paket.aset.length === 0 ? (
                  <p className="text-sm text-muted">Tidak ada aset.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted">
                          <th className="py-1.5 pr-2 font-medium">Kode aset</th>
                          <th className="py-1.5 pr-2 font-medium">Toko</th>
                          <th className="py-1.5 pr-2 font-medium">Jenis</th>
                          <th className="py-1.5 pr-2 text-right font-medium">Qty</th>
                          <th className="py-1.5 pr-2 font-medium">Masuk</th>
                          <th className="py-1.5 pr-2 font-medium">Kondisi</th>
                          <th className="py-1.5 font-medium">Foto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paket.aset.map((a) => (
                          <tr key={a.id} className="border-b border-separator/50 last:border-0">
                            <td className="py-1.5 pr-2 tnum">{a.kodeAset}</td>
                            <td className="py-1.5 pr-2">{storeNama(a.storeCode)}</td>
                            <td className="py-1.5 pr-2">{a.jenis}</td>
                            <td className="py-1.5 pr-2 text-right tnum">{a.qty}</td>
                            <td className="py-1.5 pr-2 tnum text-muted">{fmtTgl(a.tglMasuk)}</td>
                            <td className="py-1.5 pr-2">
                              <StatusChip status={a.kondisi} />
                            </td>
                            <td className="py-1.5">
                              {a.fotoTerpasang.length ? `${a.fotoTerpasang.length} foto` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </Tabs.Panel>

        {/* --------------------------------------------------------- per entitas */}
        <Tabs.Panel id="entitas" className="pt-4">
          <Toolbar>
            <SelectField
              label="Entitas"
              items={(Object.keys(definisi) as EntitasKey[]).map((k) => ({ id: k, label: definisi[k].label }))}
              value={entitas}
              onChange={(v) => setEntitas(v as EntitasKey)}
              className="w-56"
            />
            <SelectField
              label="Filter principal"
              items={[{ id: "", label: "Semua principal" }, ...db.principals.map((p) => ({ id: p.id, label: p.nama }))]}
              value={principalId}
              onChange={setPrincipalId}
              className="w-64"
            />
            <Button
              variant="primary"
              onPress={() => exportCSV(aktif.rows, aktif.cols, `mms-${entitas}`)}
            >
              <Download className="size-4" /> CSV
            </Button>
            <Button
              variant="secondary"
              onPress={() => exportExcel(aktif.rows, aktif.cols, `mms-${entitas}`, aktif.label)}
            >
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <span className="ml-auto self-center text-xs text-muted tnum">{aktif.rows.length} baris siap diexport</span>
          </Toolbar>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-secondary text-left text-muted">
                  {aktif.cols.map((c) => (
                    <th key={c.key} className="px-3 py-2 font-medium">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aktif.rows.slice(0, 25).map((r, i) => (
                  <tr key={i} className="border-b border-separator/50 last:border-0">
                    {aktif.cols.map((c) => (
                      <td key={c.key} className="px-3 py-1.5 text-foreground">
                        {String(c.value(r) ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            Pratinjau 25 baris pertama. File hasil export berisi seluruh {aktif.rows.length} baris.
          </p>
        </Tabs.Panel>

        {/* ------------------------------------------------------------ ringkasan */}
        <Tabs.Panel id="ringkas" className="pt-4">
          <Toolbar>
            <SelectField
              label="Tampilkan"
              items={[
                { id: "YA", label: "Hanya yang punya kontrak berjalan" },
                { id: "SEMUA", label: "Semua principal aktif" },
              ]}
              value={hanyaBerkontrak}
              onChange={setHanyaBerkontrak}
              className="w-72"
            />
          </Toolbar>

          <div className="mb-4">
            <BarChart
              title="Nilai kontrak berjalan per principal"
              subtitle="Hanya kontrak yang belum lewat masa berlaku"
              data={principalBerkontrak.map((r) => ({ key: r.principal.id, label: r.principal.nama.replace(/^PT\s+/, ""), value: r.nilai }))}
              format={fmtRpShort}
              satuan="Nilai"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Principal</th>
                  <th className="px-3 py-2 text-right font-medium">Kontrak</th>
                  <th className="px-3 py-2 text-right font-medium">Berjalan</th>
                  <th className="px-3 py-2 text-right font-medium">Nilai berjalan</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {principalBerkontrak.map((r) => (
                  <tr key={r.principal.id} className="border-b border-separator/60 last:border-0">
                    <td className="px-3 py-2">
                      <span className="block font-medium text-foreground">{r.principal.nama}</span>
                      <span className="block text-xs tnum text-muted">{r.principal.kode}</span>
                    </td>
                    <td className="px-3 py-2 text-right tnum">{r.total}</td>
                    <td className="px-3 py-2 text-right tnum">{r.berjalan}</td>
                    <td className="px-3 py-2 text-right tnum text-foreground">{fmtRp(r.nilai)}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" onPress={() => setPrincipalId(r.principal.id)}>
                        Tarik paket data
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Panel>
      </Tabs>

      <div className="mt-4">
        <Callout tone="info" judul="Format export">
          CSV memakai pemisah titik koma dan BOM UTF-8 agar langsung rapi di Excel Indonesia. Excel (.xls) dibuat dari
          SpreadsheetML sederhana, dan PDF memakai dialog cetak browser — ketiganya berjalan sepenuhnya offline tanpa
          server.
        </Callout>
      </div>
    </div>
  );
}

function Kotak({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tnum text-foreground">{value}</p>
    </div>
  );
}
