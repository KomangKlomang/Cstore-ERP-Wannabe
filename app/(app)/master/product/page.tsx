"use client";

import { useMemo, useState } from "react";
import { Button, Chip, useOverlayState } from "@heroui/react";
import { Download, Pencil, ScanBarcode } from "lucide-react";

import { Guard } from "@/components/app-shell";
import {
  Callout,
  FileUploadField,
  FormModal,
  NumberInput,
  PageHeader,
  SearchBox,
  SelectField,
  StatusChip,
  TextInput,
  Toolbar,
  type Opt,
} from "@/components/ui";
import { emptyTagMap, newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV, exportExcel } from "@/lib/export";
import { fmtRp, fmtTgl } from "@/lib/format";
import { produkLengkap } from "@/lib/derive";
import { REGIONS, type MediaFile, type Product, type Region } from "@/lib/types";

export default function ProductPage() {
  return (
    <Guard modul="product">
      <ProductView />
    </Guard>
  );
}

function ProductView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "product", "edit");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [principal, setPrincipal] = useState("");
  const [region, setRegion] = useState<string>("");
  const [tag, setTag] = useState("");

  const katOpt: Opt[] = useMemo(
    () =>
      db.categories.map((c) => ({
        id: c.id,
        label: `${c.subCategoryCode} — ${c.subCategory}`,
        hint: `${c.segment} › ${c.subDept} › ${c.category}`,
      })),
    [db.categories],
  );
  const prnOpt: Opt[] = useMemo(
    () => db.principals.map((p) => ({ id: p.id, label: p.nama, hint: p.kode })),
    [db.principals],
  );
  const tagOpt: Opt[] = useMemo(
    () => db.tags.map((t) => ({ id: t.kode, label: `${t.kode} — ${t.nama}`, hint: `Jual ${t.jual ? "Y" : "N"} · PO ${t.po ? "Y" : "N"}` })),
    [db.tags],
  );

  const katLabel = (id: string) => {
    const c = db.categories.find((x) => x.id === id);
    return c ? `${c.subCategoryCode} — ${c.subCategory}` : "-";
  };
  const prnLabel = (id: string) => db.principals.find((p) => p.id === id)?.nama ?? "-";

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.products.filter((p) => {
      if (status && p.status !== status) return false;
      if (principal && p.principalId !== principal) return false;
      if (tag) {
        if (region) {
          if (p.tagPerRegion[region as Region] !== tag) return false;
        } else if (!REGIONS.some((r) => p.tagPerRegion[r] === tag)) return false;
      }
      if (!term) return true;
      return [p.namaProduct, p.kodeProduct, p.barcode, p.brand].join(" ").toLowerCase().includes(term);
    });
  }, [db.products, q, status, principal, tag, region]);

  const kolom = [
    { key: "kodeProduct", header: "Kode Product", value: (p: Product) => p.kodeProduct },
    { key: "barcode", header: "Barcode", value: (p: Product) => p.barcode },
    { key: "namaProduct", header: "Nama Product", value: (p: Product) => p.namaProduct },
    { key: "brand", header: "Brand", value: (p: Product) => p.brand },
    { key: "principal", header: "Principal", value: (p: Product) => prnLabel(p.principalId) },
    { key: "kategori", header: "Sub Category", value: (p: Product) => katLabel(p.categoryId) },
    { key: "uom", header: "UOM", value: (p: Product) => p.uom },
    { key: "isi", header: "Isi 1 Pack", value: (p: Product) => p.isiSatuPack },
    { key: "hargaBeli", header: "Harga Beli", value: (p: Product) => p.hargaBeli },
    { key: "hargaJual", header: "Harga Jual", value: (p: Product) => p.hargaJual },
    { key: "msrp", header: "MSRP", value: (p: Product) => p.msrp },
    ...REGIONS.map((r) => ({ key: `tag${r}`, header: `Tag ${r}`, value: (p: Product) => p.tagPerRegion[r] })),
    { key: "c1", header: "C1", value: (p: Product) => p.c1 ?? "" },
    { key: "c2", header: "C2", value: (p: Product) => p.c2 ?? "" },
    { key: "c3", header: "C3", value: (p: Product) => p.c3 ?? "" },
    { key: "c4", header: "C4", value: (p: Product) => p.c4 ?? "" },
    { key: "c5", header: "C5", value: (p: Product) => p.c5 ?? "" },
    { key: "status", header: "Status", value: (p: Product) => p.status },
    { key: "tglAktif", header: "Tgl Aktif", value: (p: Product) => p.tglAktif ?? "" },
  ];

  return (
    <>
      <PageHeader
        judul="Master Product"
        modul="M1 · US-1.2"
        deskripsi="Sumber kebenaran SKU: atribut teknis, harga, tag per region, dan foto pack. SKU baru dibuat lewat barcode (R3)."
        aksi={
          <>
            {boleh ? <TambahViaBarcode katOpt={katOpt} prnOpt={prnOpt} tagOpt={tagOpt} /> : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "master-product")}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" onPress={() => exportExcel(terfilter, kolom, "master-product", "Product")}>
              <Download className="size-4" /> Excel
            </Button>
          </>
        }
      />

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Nama produk / kode / barcode…" className="w-72" />
        <SelectField
          label="Status"
          items={[
            { id: "", label: "Semua status" },
            { id: "AKTIF", label: "Aktif" },
            { id: "DRAFT", label: "Draft" },
            { id: "NONAKTIF", label: "Nonaktif" },
            { id: "DELISTING", label: "Delisting" },
          ]}
          value={status}
          onChange={setStatus}
          className="w-40"
        />
        <SelectField
          label="Principal"
          items={[{ id: "", label: "Semua principal" }, ...prnOpt]}
          value={principal}
          onChange={setPrincipal}
          className="w-56"
        />
        <SelectField
          label="Region"
          items={[{ id: "", label: "Semua region" }, ...REGIONS.map((r) => ({ id: r, label: r }))]}
          value={region}
          onChange={setRegion}
          className="w-36"
        />
        <SelectField
          label="Tag"
          items={[{ id: "", label: "Semua tag" }, ...tagOpt]}
          value={tag}
          onChange={setTag}
          className="w-52"
        />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} SKU</span>
      </Toolbar>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[1200px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Kode / Barcode</th>
              <th className="px-3 py-2 font-medium">Nama Product</th>
              <th className="px-3 py-2 font-medium">Principal / Brand</th>
              <th className="px-3 py-2 font-medium">Sub Category</th>
              <th className="px-3 py-2 text-right font-medium">Beli</th>
              <th className="px-3 py-2 text-right font-medium">Jual</th>
              <th className="px-3 py-2 font-medium">Tag per region</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {terfilter.map((p) => (
              <tr key={p.id} className="border-b border-separator/60 last:border-0 align-top">
                <td className="px-3 py-2">
                  <span className="block font-medium tnum text-foreground">{p.kodeProduct}</span>
                  <span className="block text-xs tnum text-muted">{p.barcode}</span>
                </td>
                <td className="max-w-[280px] px-3 py-2">
                  <span className="block text-foreground">{p.namaProduct}</span>
                  <span className="block text-xs text-muted">
                    {p.uom} · isi {p.isiSatuPack}
                    {p.tglAktif ? ` · aktif ${fmtTgl(p.tglAktif)}` : ""}
                  </span>
                  {!produkLengkap(p) ? (
                    <Chip size="sm" variant="soft" color="warning" className="mt-1">
                      atribut belum lengkap
                    </Chip>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className="block text-foreground">{prnLabel(p.principalId)}</span>
                  <span className="block text-muted">{p.brand}</span>
                </td>
                <td className="px-3 py-2 text-xs text-muted">{katLabel(p.categoryId)}</td>
                <td className="px-3 py-2 text-right tnum text-muted">{fmtRp(p.hargaBeli)}</td>
                <td className="px-3 py-2 text-right tnum text-foreground">{fmtRp(p.hargaJual)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {REGIONS.map((r) => {
                      const t = db.tags.find((x) => x.kode === p.tagPerRegion[r]);
                      return (
                        <span
                          key={r}
                          title={t ? `${r}: ${t.nama} — ${t.perlakuan}` : r}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px]"
                        >
                          <span className="text-muted">{r}</span>
                          <Chip size="sm" variant="soft" color={t?.warna ?? "default"}>
                            {p.tagPerRegion[r]}
                          </Chip>
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <StatusChip status={p.status} />
                </td>
                <td className="px-3 py-2">
                  {boleh ? (
                    <EditProduk produk={p} katOpt={katOpt} prnOpt={prnOpt} tagOpt={tagOpt} onSimpan={(v) => saveRow("products", v)} />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Kolom C1–C5 masih terbuka definisinya (OQ-2) sehingga disimpan apa adanya dan ikut ter-export.
      </p>
    </>
  );
}

/* --------------------------------------------------- Tambah SKU via barcode */

function TambahViaBarcode({ katOpt, prnOpt, tagOpt }: { katOpt: Opt[]; prnOpt: Opt[]; tagOpt: Opt[] }) {
  const state = useOverlayState();
  const products = useApp((s) => s.products);
  const saveRow = useApp((s) => s.saveRow);

  const [barcode, setBarcode] = useState("");
  const [draft, setDraft] = useState<Product | null>(null);

  const existing = products.find((p) => p.barcode === barcode.trim());

  function siapkan() {
    if (!barcode.trim() || existing) return;
    setDraft({
      id: newId("prd"),
      kodeProduct: `PRD-${String(products.length + 1).padStart(5, "0")}`,
      barcode: barcode.trim(),
      namaProduct: "",
      principalId: "",
      categoryId: "",
      brand: "",
      uom: "PCS",
      isiSatuPack: 1,
      hargaBeli: 0,
      hargaJual: 0,
      msrp: 0,
      tagPerRegion: emptyTagMap("A"),
      status: "DRAFT",
      fotoPack: [],
      updatedAt: "",
      updatedBy: "",
    });
  }

  const bisaSimpan = Boolean(draft?.namaProduct && draft?.principalId && draft?.categoryId && draft.fotoPack.length > 0);

  return (
    <>
      <Button variant="primary" onPress={() => state.open()}>
        <ScanBarcode className="size-4" /> SKU baru via barcode
      </Button>
      <FormModal
        state={state}
        judul="Buat SKU baru dari barcode"
        deskripsi="Scan atau ketik barcode. Bila barcode sudah terdaftar, sistem menampilkan SKU yang ada dan tidak membuat duplikat (US-1.2)."
        simpanLabel="Simpan sebagai Draft"
        bisaSimpan={bisaSimpan}
        onSimpan={() => {
          if (!draft || !bisaSimpan) return false;
          saveRow("products", { ...draft, status: "DRAFT" });
          setBarcode("");
          setDraft(null);
        }}
      >
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <TextInput
              label="Barcode"
              value={barcode}
              onChange={(v) => {
                setBarcode(v);
                setDraft(null);
              }}
              placeholder="899…"
              className="flex-1"
            />
            <Button variant="secondary" onPress={siapkan} isDisabled={!barcode.trim() || Boolean(existing)}>
              Cek &amp; lanjut
            </Button>
          </div>

          {existing ? (
            <Callout tone="warning" judul="Barcode sudah terdaftar">
              <b>{existing.kodeProduct}</b> — {existing.namaProduct}. Gunakan menu edit pada SKU tersebut alih-alih
              membuat data baru.
            </Callout>
          ) : null}

          {draft ? (
            <FormProduk
              value={draft}
              onChange={setDraft}
              katOpt={katOpt}
              prnOpt={prnOpt}
              tagOpt={tagOpt}
              wajibFoto
            />
          ) : null}
        </div>
      </FormModal>
    </>
  );
}

/* ------------------------------------------------------------------- Edit */

function EditProduk({
  produk,
  katOpt,
  prnOpt,
  tagOpt,
  onSimpan,
}: {
  produk: Product;
  katOpt: Opt[];
  prnOpt: Opt[];
  tagOpt: Opt[];
  onSimpan: (p: Product) => void;
}) {
  const state = useOverlayState();
  const [draft, setDraft] = useState<Product>(produk);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        aria-label={`Ubah ${produk.namaProduct}`}
        onPress={() => {
          setDraft(produk);
          state.open();
        }}
      >
        <Pencil className="size-3.5" />
      </Button>
      <FormModal
        state={state}
        judul={`Ubah SKU ${produk.kodeProduct}`}
        onSimpan={() => onSimpan(draft)}
      >
        <FormProduk value={draft} onChange={setDraft} katOpt={katOpt} prnOpt={prnOpt} tagOpt={tagOpt} bisaUbahStatus />
      </FormModal>
    </>
  );
}

/* ------------------------------------------------------------------- Form */

function FormProduk({
  value,
  onChange,
  katOpt,
  prnOpt,
  tagOpt,
  wajibFoto,
  bisaUbahStatus,
}: {
  value: Product;
  onChange: (p: Product) => void;
  katOpt: Opt[];
  prnOpt: Opt[];
  tagOpt: Opt[];
  wajibFoto?: boolean;
  bisaUbahStatus?: boolean;
}) {
  const set = <K extends keyof Product>(k: K, v: Product[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Kode Product" value={value.kodeProduct} onChange={(v) => set("kodeProduct", v)} />
        <TextInput label="Barcode" value={value.barcode} onChange={(v) => set("barcode", v)} />
        <TextInput
          label="Nama Product"
          value={value.namaProduct}
          onChange={(v) => set("namaProduct", v.toUpperCase())}
          isRequired
          className="sm:col-span-2"
        />
        <SelectField label="Principal" items={prnOpt} value={value.principalId} onChange={(v) => set("principalId", v)} />
        <TextInput label="Brand" value={value.brand} onChange={(v) => set("brand", v.toUpperCase())} />
        <SelectField
          label="Sub Category"
          items={katOpt}
          value={value.categoryId}
          onChange={(v) => set("categoryId", v)}
          className="sm:col-span-2"
        />
        <TextInput label="UOM" value={value.uom} onChange={(v) => set("uom", v.toUpperCase())} />
        <NumberInput label="Isi 1 pack" value={value.isiSatuPack} onChange={(v) => set("isiSatuPack", v)} />
        <NumberInput label="Harga beli" value={value.hargaBeli} onChange={(v) => set("hargaBeli", v)} />
        <NumberInput label="Harga jual" value={value.hargaJual} onChange={(v) => set("hargaJual", v)} />
        <NumberInput label="MSRP" value={value.msrp} onChange={(v) => set("msrp", v)} />
        {bisaUbahStatus ? (
          <SelectField
            label="Status"
            items={[
              { id: "DRAFT", label: "Draft" },
              { id: "AKTIF", label: "Aktif" },
              { id: "NONAKTIF", label: "Nonaktif" },
              { id: "DELISTING", label: "Delisting" },
            ]}
            value={value.status}
            onChange={(v) => set("status", v as Product["status"])}
          />
        ) : null}
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Tag per region</p>
        <div className="grid gap-2 sm:grid-cols-5">
          {REGIONS.map((r) => (
            <SelectField
              key={r}
              label={r}
              items={tagOpt}
              value={value.tagPerRegion[r]}
              onChange={(v) => onChange({ ...value, tagPerRegion: { ...value.tagPerRegion, [r]: v } })}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {(["c1", "c2", "c3", "c4", "c5"] as const).map((c) => (
          <TextInput key={c} label={c.toUpperCase()} value={value[c] ?? ""} onChange={(v) => set(c, v)} />
        ))}
      </div>

      <FileUploadField
        label={`Foto pack produk${wajibFoto ? " (wajib minimal 1)" : ""}`}
        files={value.fotoPack}
        onChange={(f: MediaFile[]) => set("fotoPack", f)}
        accept="image/*"
      />
    </div>
  );
}
