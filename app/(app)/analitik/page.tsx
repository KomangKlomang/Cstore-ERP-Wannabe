"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Printer } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { PageHeader, SelectField, StatCard, Toolbar } from "@/components/ui";
import {
  BarChart,
  ColumnChart,
  DonutChart,
  GroupedColumnChart,
  LineChart,
  StackedColumnChart,
  VIZ,
  VIZ_STATUS,
} from "@/graphify";
import { useApp } from "@/lib/store";
import {
  asetPerRegion,
  engagementPerBulan,
  jatuhTempoPerBulan,
  kontenPerJenis,
  kontrakInfo,
  kontrakPerJenis,
  nilaiKontrakPerPrincipal,
  skuPerSegment,
  TAG_LAINNYA,
  tagPerRegion,
  tokoPerRegion,
  topTokoKonten,
} from "@/lib/derive";
import { fmtNum, fmtNumShort, fmtRp, fmtRpShort, pct } from "@/lib/format";
import { PLATFORMS, REGIONS, REGION_LABEL, type Region } from "@/lib/types";

export default function AnalitikPage() {
  return (
    <Guard modul="analitik">
      <AnalitikView />
    </Guard>
  );
}

function AnalitikView() {
  const db = useApp((s) => s);
  const [region, setRegion] = useState("");
  const [segment, setSegment] = useState("");

  const segmentOpt = useMemo(
    () => [...new Set(db.categories.map((c) => c.segment))].map((s) => ({ id: s, label: s })),
    [db.categories],
  );

  const katById = useMemo(() => new Map(db.categories.map((c) => [c.id, c])), [db.categories]);
  const storeRegion = useMemo(() => new Map(db.stores.map((s) => [s.storeCode, s.region])), [db.stores]);

  const produk = useMemo(
    () => db.products.filter((p) => (segment ? katById.get(p.categoryId)?.segment === segment : true)),
    [db.products, segment, katById],
  );
  const toko = useMemo(() => db.stores.filter((s) => (region ? s.region === region : true)), [db.stores, region]);
  const aset = useMemo(
    () => db.aset.filter((a) => (region ? storeRegion.get(a.storeCode) === region : true)),
    [db.aset, region, storeRegion],
  );
  const konten = useMemo(
    () => db.contentReports.filter((c) => (region ? storeRegion.get(c.storeCode) === region : true)),
    [db.contentReports, region, storeRegion],
  );
  const kontrak = useMemo(
    () => db.kontrak.filter((k) => (region ? k.storeCodes.some((c) => storeRegion.get(c) === region) : true)),
    [db.kontrak, region, storeRegion],
  );

  /* --------------------------------------------------------- turunan analitik */

  const marginPerSegment = useMemo(() => {
    const m = new Map<string, { margin: number; n: number }>();
    produk
      .filter((p) => p.status === "AKTIF" && p.hargaJual > 0)
      .forEach((p) => {
        const seg = katById.get(p.categoryId)?.segment ?? "LAINNYA";
        const cur = m.get(seg) ?? { margin: 0, n: 0 };
        cur.margin += ((p.hargaJual - p.hargaBeli) / p.hargaJual) * 100;
        cur.n += 1;
        m.set(seg, cur);
      });
    return [...m.entries()]
      .map(([label, v]) => ({ label, value: Math.round((v.margin / Math.max(v.n, 1)) * 10) / 10 }))
      .sort((a, b) => b.value - a.value);
  }, [produk, katById]);

  const nilaiPerJenisKontrak = useMemo(() => {
    const m = new Map<string, number>();
    kontrak.forEach((k) => m.set(k.jenis, (m.get(k.jenis) ?? 0) + k.nilai));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [kontrak]);

  const skuPerRegionTag = useMemo(() => {
    const jualOk = new Set(db.tags.filter((t) => t.jual).map((t) => t.kode));
    return REGIONS.map((r) => ({
      label: r,
      values: {
        "Boleh dijual": produk.filter((p) => p.status === "AKTIF" && jualOk.has(p.tagPerRegion[r as Region])).length,
        "Tidak dijual": produk.filter((p) => p.status === "AKTIF" && !jualOk.has(p.tagPerRegion[r as Region])).length,
      },
    }));
  }, [produk, db.tags]);

  const engagement = konten.reduce((s, c) => s + c.like + c.comment + c.share + c.repost, 0);
  const nilaiKontrakBerjalan = kontrak.filter((k) => kontrakInfo(k).sisaHari >= 0).reduce((s, k) => s + k.nilai, 0);
  const asetBermasalah = aset.filter((a) => a.kondisi !== "GOOD").length;
  const tagUtama = db.tags.slice(0, 6).map((t) => t.kode);

  return (
    <div className="print-sheet">
      <PageHeader
        judul="Analitik"
        modul="M7 · M8"
        deskripsi="Pandangan lintas modul: portofolio SKU, komitmen kontrak, kondisi aset di lapangan, dan performa konten. Setiap grafik punya mode tabel untuk pembacaan angka persis."
        aksi={
          <Button variant="outline" onPress={() => window.print()}>
            <Printer className="size-4" /> Cetak / PDF
          </Button>
        }
      />

      <Toolbar>
        <SelectField
          label="Region"
          items={[{ id: "", label: "Semua region" }, ...REGIONS.map((r) => ({ id: r, label: `${r} — ${REGION_LABEL[r]}` }))]}
          value={region}
          onChange={setRegion}
          className="w-56"
        />
        <SelectField
          label="Segment"
          items={[{ id: "", label: "Semua segment" }, ...segmentOpt]}
          value={segment}
          onChange={setSegment}
          className="w-64"
        />
        <span className="ml-auto self-center text-xs text-muted">
          Filter berlaku untuk seluruh grafik di halaman ini.
        </span>
      </Toolbar>

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="SKU aktif"
          value={fmtNum(produk.filter((p) => p.status === "AKTIF").length)}
          hint={`${pct(produk.filter((p) => p.status === "AKTIF").length, Math.max(produk.length, 1))}% dari SKU terdaftar`}
        />
        <StatCard label="Nilai kontrak berjalan" value={fmtRpShort(nilaiKontrakBerjalan)} hint={`${kontrak.length} kontrak tercakup`} />
        <StatCard
          label="Aset bermasalah"
          value={fmtNum(asetBermasalah)}
          tone={asetBermasalah > 0 ? "warning" : "good"}
          hint={`dari ${aset.length} aset terpasang`}
        />
        <StatCard label="Engagement konten" value={fmtNumShort(engagement)} hint={`${konten.length} laporan konten`} />
      </section>

      <section className="mb-4 grid gap-4 xl:grid-cols-2">
        <DonutChart
          title="Portofolio SKU per segment"
          subtitle="Komposisi katalog berdasarkan taksonomi level 1"
          data={skuPerSegment(produk, db.categories)}
          heroLabel="SKU"
        />
        <BarChart
          title="Rata-rata margin per segment"
          subtitle="(Harga jual − harga beli) ÷ harga jual, SKU aktif"
          data={marginPerSegment}
          format={(n) => `${n.toFixed(1)}%`}
          color={VIZ[2]}
          satuan="Margin"
          catatan="Margin dihitung dari harga master, belum memperhitungkan diskon promo berjalan."
        />
      </section>

      <section className="mb-4 grid gap-4 xl:grid-cols-2">
        <GroupedColumnChart
          title="Ketersediaan SKU per region"
          subtitle="Berdasarkan perlakuan jual pada tag masing-masing region"
          data={skuPerRegionTag}
          keys={["Boleh dijual", "Tidak dijual"]}
          colors={[VIZ[0], VIZ[3]]}
          format={(n) => String(Math.round(n))}
        />
        <StackedColumnChart
          title="Distribusi tag per region"
          subtitle="Enam tag pertama; sisanya digabung ke LAINNYA"
          data={tagPerRegion(produk, tagUtama)}
          keys={[...tagUtama, TAG_LAINNYA]}
          format={(n) => String(Math.round(n))}
        />
      </section>

      <section className="mb-4 grid gap-4 xl:grid-cols-2">
        <ColumnChart
          title="Kontrak jatuh tempo 6 bulan ke depan"
          subtitle="Basis perencanaan negosiasi ulang"
          data={jatuhTempoPerBulan(kontrak)}
          color={VIZ_STATUS.serious}
          satuan="Jumlah kontrak"
          format={(n) => String(Math.round(n))}
          height={220}
        />
        <BarChart
          title="Nilai kontrak per jenis"
          subtitle="Header, lolipop, akrilik, showcase, program, promosi"
          data={nilaiPerJenisKontrak}
          format={fmtRpShort}
          color={VIZ[6]}
          satuan="Nilai"
        />
      </section>

      <section className="mb-4 grid gap-4 xl:grid-cols-2">
        <BarChart
          title="Komitmen kontrak per principal"
          subtitle="Enam principal terbesar"
          data={nilaiKontrakPerPrincipal(kontrak, db.principals)}
          format={fmtRpShort}
          satuan="Nilai kontrak"
        />
        <ColumnChart
          title="Jumlah kontrak per jenis"
          subtitle="Sebaran dokumen kontrak yang dikelola"
          data={kontrakPerJenis(kontrak)}
          color={VIZ[4]}
          satuan="Jumlah"
          format={(n) => String(Math.round(n))}
          height={220}
        />
      </section>

      <section className="mb-4 grid gap-4 xl:grid-cols-2">
        <StackedColumnChart
          title="Kondisi aset per region"
          subtitle="Prioritas penggantian aset principal di toko"
          data={asetPerRegion(aset, db.stores)}
          keys={["GOOD", "REPLACE", "HILANG"]}
          colors={["var(--viz-6)", VIZ_STATUS.warning, VIZ_STATUS.critical]}
          format={(n) => String(Math.round(n))}
        />
        <StackedColumnChart
          title="Sebaran toko per region"
          subtitle="Tipe DTS dan EX. LWS"
          data={tokoPerRegion(toko)}
          keys={["DTS", "EX. LWS"]}
          colors={[VIZ[0], VIZ[1]]}
          format={(n) => String(Math.round(n))}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChart
          title="Engagement konten per bulan"
          subtitle="Like + comment + share + repost per platform"
          data={engagementPerBulan(konten)}
          keys={[...PLATFORMS]}
          format={fmtNumShort}
        />
        <DonutChart
          title="Engagement per jenis konten"
          subtitle="Format konten yang paling menghasilkan interaksi"
          data={kontenPerJenis(konten)}
          heroLabel="engagement"
          format={fmtNumShort}
        />
      </section>

      <section className="mt-4">
        <BarChart
          title="Toko dengan engagement tertinggi"
          subtitle="Delapan toko teratas — dasar penentuan toko percontohan konten"
          data={topTokoKonten(konten, db.stores)}
          format={fmtNumShort}
          satuan="Engagement"
        />
      </section>

      <p className="mt-4 text-xs text-muted">
        Total nilai seluruh kontrak yang tercakup filter ini: <b className="tnum">{fmtRp(kontrak.reduce((s, k) => s + k.nilai, 0))}</b>.
      </p>
    </div>
  );
}
