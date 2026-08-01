"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Chip, Tabs } from "@heroui/react";
import { ArrowLeft, MapPin, Printer } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { KosongRow, PageHeader, StatusChip } from "@/components/ui";
import { DonutChart } from "@/graphify";
import { useApp } from "@/lib/store";
import { kontrakInfo, profilToko } from "@/lib/derive";
import { fmtNum, fmtRp, fmtTgl } from "@/lib/format";
import { REGION_LABEL } from "@/lib/types";

export default function StoreDetailPage() {
  return (
    <Guard modul="store">
      <StoreDetail />
    </Guard>
  );
}

function StoreDetail() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(String(params.code ?? ""));
  const db = useApp((s) => s);
  const profil = useMemo(() => profilToko(db, code), [db, code]);

  if (!profil) {
    return <KosongRow pesan={`Toko dengan kode "${code}" tidak ditemukan.`} />;
  }

  const { store, aset, kontrak, promosi, konten, sku } = profil;
  const prn = (id: string) => db.principals.find((p) => p.id === id)?.nama ?? "-";
  const kat = (id: string) => {
    const c = db.categories.find((x) => x.id === id);
    return c ? `${c.subCategoryCode} — ${c.subCategory}` : "-";
  };
  const spv = db.users.find((u) => u.id === store.spvId);

  const biodata: Array<[string, string]> = [
    ["Store Code", store.storeCode],
    ["Store ID (HM)", store.storeIdHM],
    ["Analytical Group (HM)", store.analyticalGroupHM],
    ["Store Type", store.storeType],
    ["Region", `${store.region} — ${REGION_LABEL[store.region]}`],
    ["Area", store.area],
    ["Kota", store.kota],
    ["Alamat", store.alamat],
    ["Koordinat", `${store.latitude}, ${store.longitude}`],
    ["No Telp", store.noTelp],
    ["Tgl Buka", fmtTgl(store.tglBuka)],
    ["Tgl Tutup", store.tglTutup ? fmtTgl(store.tglTutup) : "-"],
    ["Relokasi dari", store.relocateFromStoreCode ?? "-"],
    ["Luas", `${store.luasM2} m²`],
    ["Jumlah rak", String(store.jumlahRak)],
    ["Planogram aktif", store.planogramAktif ?? "-"],
    ["SPV Area", spv?.nama ?? "-"],
    ["Crew", store.crewIds.map((id) => db.users.find((u) => u.id === id)?.nama ?? id).join(", ") || "-"],
  ];

  const engagement = konten.reduce((s, c) => s + c.like + c.comment + c.share + c.repost, 0);

  return (
    <div className="print-sheet">
      <div className="mb-3 no-print">
        <Link href="/master/store" className="inline-flex items-center gap-1 text-sm text-accent">
          <ArrowLeft className="size-3.5" /> Kembali ke Master Store
        </Link>
      </div>

      <PageHeader
        judul={store.storeName}
        modul="M7 · US-7.2"
        deskripsi="Profil lengkap toko: biodata, planogram, aset terpasang, SKU aktif beserta tanggal masuk, kontrak, promosi, dan laporan konten."
        aksi={
          <Button variant="outline" onPress={() => window.print()}>
            <Printer className="size-4" /> Cetak / PDF
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusChip status={store.status} size="md" />
        <Chip variant="soft" color="default">
          {store.storeType}
        </Chip>
        <Chip variant="soft" color="accent">
          {store.region}
        </Chip>
        <span className="inline-flex items-center gap-1 text-sm text-muted">
          <MapPin className="size-3.5" /> {store.alamat}, {store.kota}
        </span>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Ringkas label="SKU aktif di toko" value={fmtNum(sku.length)} hint="berdasarkan tag region yang boleh dijual" />
        <Ringkas label="Aset terpasang" value={fmtNum(aset.length)} hint={`${aset.filter((a) => a.kondisi === "REPLACE").length} perlu diganti`} />
        <Ringkas label="Kontrak terkait" value={fmtNum(kontrak.length)} hint={`${kontrak.filter((k) => kontrakInfo(k).tier !== "AMAN").length} masuk reminder`} />
        <Ringkas label="Engagement konten" value={fmtNum(engagement)} hint={`${konten.length} laporan konten`} />
      </div>

      <Tabs defaultSelectedKey="biodata">
        <Tabs.List aria-label="Detail toko">
          <Tabs.Tab id="biodata">Biodata</Tabs.Tab>
          <Tabs.Tab id="aset">Aset &amp; planogram</Tabs.Tab>
          <Tabs.Tab id="sku">SKU &amp; foto pack</Tabs.Tab>
          <Tabs.Tab id="kontrak">Kontrak &amp; promosi</Tabs.Tab>
          <Tabs.Tab id="konten">Content report</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="biodata" className="pt-4">
          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
              {biodata.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-separator/50 py-1.5 last:border-0">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="text-right text-sm text-foreground">{v}</dd>
                </div>
              ))}
            </dl>

            <DonutChart
              title="Kondisi aset di toko ini"
              data={[
                { label: "GOOD", value: aset.filter((a) => a.kondisi === "GOOD").length },
                { label: "REPLACE", value: aset.filter((a) => a.kondisi === "REPLACE").length },
                { label: "HILANG", value: aset.filter((a) => a.kondisi === "HILANG").length },
              ].filter((d) => d.value > 0)}
              heroLabel="aset"
            />
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="aset" className="pt-4">
          <div className="mb-3 rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Planogram aktif</p>
            <p className="text-sm font-medium text-foreground">{store.planogramAktif ?? "Belum ada planogram"}</p>
            <p className="mt-1 text-xs text-muted">
              Versi planogram disimpan dengan soft delete + versioning (IMP-7) sehingga riwayat penataan ruang tetap
              dapat diaudit.
            </p>
          </div>

          {aset.length === 0 ? (
            <KosongRow pesan="Belum ada aset terdaftar di toko ini." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                    <th className="px-3 py-2 font-medium">Kode aset</th>
                    <th className="px-3 py-2 font-medium">Jenis</th>
                    <th className="px-3 py-2 font-medium">Principal</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Masuk</th>
                    <th className="px-3 py-2 font-medium">Kondisi</th>
                    <th className="px-3 py-2 font-medium">Foto terpasang</th>
                  </tr>
                </thead>
                <tbody>
                  {aset.map((a) => (
                    <tr key={a.id} className="border-b border-separator/60 last:border-0">
                      <td className="px-3 py-2 tnum text-foreground">{a.kodeAset}</td>
                      <td className="px-3 py-2 text-xs">{a.jenis}</td>
                      <td className="px-3 py-2 text-xs text-muted">{prn(a.principalId)}</td>
                      <td className="px-3 py-2 text-right tnum">{a.qty}</td>
                      <td className="px-3 py-2 text-xs tnum text-muted">{fmtTgl(a.tglMasuk)}</td>
                      <td className="px-3 py-2">
                        <StatusChip status={a.kondisi} />
                      </td>
                      <td className="px-3 py-2">
                        {a.fotoTerpasang.length ? (
                          <div className="flex gap-1">
                            {a.fotoTerpasang.slice(0, 3).map((f) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={f.id} src={f.dataUrl} alt={f.nama} className="size-9 rounded object-cover" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-warning">belum ada foto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel id="sku" className="pt-4">
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Kode / Barcode</th>
                  <th className="px-3 py-2 font-medium">Nama Product</th>
                  <th className="px-3 py-2 font-medium">Sub Category</th>
                  <th className="px-3 py-2 font-medium">Tag {store.region}</th>
                  <th className="px-3 py-2 font-medium">Masuk sejak</th>
                  <th className="px-3 py-2 text-right font-medium">Harga jual</th>
                  <th className="px-3 py-2 font-medium">Foto pack</th>
                </tr>
              </thead>
              <tbody>
                {sku.map((p) => (
                  <tr key={p.id} className="border-b border-separator/60 last:border-0">
                    <td className="px-3 py-2">
                      <span className="block tnum text-foreground">{p.kodeProduct}</span>
                      <span className="block text-xs tnum text-muted">{p.barcode}</span>
                    </td>
                    <td className="px-3 py-2 text-foreground">{p.namaProduct}</td>
                    <td className="px-3 py-2 text-xs text-muted">{kat(p.categoryId)}</td>
                    <td className="px-3 py-2">
                      <Chip size="sm" variant="soft">
                        {p.tagPerRegion[store.region]}
                      </Chip>
                    </td>
                    <td className="px-3 py-2 text-xs tnum text-muted">{fmtTgl(p.tglAktif)}</td>
                    <td className="px-3 py-2 text-right tnum">{fmtRp(p.hargaJual)}</td>
                    <td className="px-3 py-2">
                      {p.fotoPack.length ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.fotoPack[0].dataUrl} alt={p.namaProduct} className="size-9 rounded object-cover" />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="kontrak" className="pt-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Kontrak yang mencakup toko ini</h3>
              {kontrak.length === 0 ? (
                <p className="text-sm text-muted">Tidak ada.</p>
              ) : (
                <ul className="space-y-2">
                  {kontrak.map((k) => {
                    const info = kontrakInfo(k);
                    return (
                      <li key={k.id} className="rounded-lg border border-border px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{k.judul}</span>
                          <Chip size="sm" variant="soft">
                            {k.jenis}
                          </Chip>
                        </div>
                        <p className="text-xs tnum text-muted">
                          {k.nomorSurat} · {prn(k.principalId)} · {fmtTgl(k.masaMulai)} – {fmtTgl(k.masaBerakhir)}
                        </p>
                        <p
                          className={`mt-1 text-xs font-medium ${
                            info.level === "critical" ? "text-danger" : info.level === "good" ? "text-muted" : "text-warning"
                          }`}
                        >
                          {info.tier} · {info.label}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Promosi berjalan di toko ini</h3>
              {promosi.length === 0 ? (
                <p className="text-sm text-muted">Tidak ada.</p>
              ) : (
                <ul className="space-y-2">
                  {promosi.map((p) => (
                    <li key={p.id} className="rounded-lg border border-border px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{p.nama}</span>
                        <StatusChip status={p.status} />
                      </div>
                      <p className="text-xs tnum text-muted">
                        {p.kodePromo} · {fmtTgl(p.tglMulai)} – {fmtTgl(p.tglSelesai)} · {p.pluIds.length} PLU
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="konten" className="pt-4">
          {konten.length === 0 ? (
            <KosongRow pesan="Belum ada laporan konten dari toko ini." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                    <th className="px-3 py-2 font-medium">Tanggal</th>
                    <th className="px-3 py-2 font-medium">Nama konten</th>
                    <th className="px-3 py-2 font-medium">Platform</th>
                    <th className="px-3 py-2 font-medium">Jenis</th>
                    <th className="px-3 py-2 text-right font-medium">Like</th>
                    <th className="px-3 py-2 text-right font-medium">Comment</th>
                    <th className="px-3 py-2 text-right font-medium">Share</th>
                    <th className="px-3 py-2 text-right font-medium">Repost</th>
                  </tr>
                </thead>
                <tbody>
                  {konten.slice(0, 20).map((c) => (
                    <tr key={c.id} className="border-b border-separator/60 last:border-0">
                      <td className="px-3 py-2 text-xs tnum text-muted">{fmtTgl(c.tanggal)}</td>
                      <td className="px-3 py-2 text-foreground">{c.namaKonten}</td>
                      <td className="px-3 py-2 text-xs">{c.platform}</td>
                      <td className="px-3 py-2 text-xs text-muted">{c.jenisKonten}</td>
                      <td className="px-3 py-2 text-right tnum">{fmtNum(c.like)}</td>
                      <td className="px-3 py-2 text-right tnum">{fmtNum(c.comment)}</td>
                      <td className="px-3 py-2 text-right tnum">{fmtNum(c.share)}</td>
                      <td className="px-3 py-2 text-right tnum">{fmtNum(c.repost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

function Ringkas({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tnum text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </div>
  );
}
