"use client";

import { useMemo, useState } from "react";
import { Button, useOverlayState } from "@heroui/react";
import { Download, Gift, Plus, Trash2 } from "lucide-react";

import { Guard } from "@/components/app-shell";
import { Callout, FormModal, KosongRow, PageHeader, SearchBox, SelectField, Toolbar } from "@/components/ui";
import { newId, useApp } from "@/lib/store";
import { can } from "@/lib/rbac";
import { exportCSV } from "@/lib/export";
import type { FreeGift } from "@/lib/types";

export default function FreeGiftPage() {
  return (
    <Guard modul="freegift">
      <FreeGiftView />
    </Guard>
  );
}

function FreeGiftView() {
  const db = useApp((s) => s);
  const saveRow = useApp((s) => s.saveRow);
  const removeRow = useApp((s) => s.removeRow);
  const user = useApp((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
  const boleh = can(user, "freegift", "edit");

  const [q, setQ] = useState("");

  const terfilter = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.freeGift.filter((f) =>
      term ? `${f.kodeProduct} ${f.kodeProductInduk} ${f.deskripsi}`.toLowerCase().includes(term) : true,
    );
  }, [db.freeGift, q]);

  const kolom = [
    { key: "kode", header: "KODE_PRODUCT", value: (f: FreeGift) => f.kodeProduct },
    { key: "induk", header: "KODEPRODUCT (induk)", value: (f: FreeGift) => f.kodeProductInduk },
    { key: "desk", header: "DESKRIPSI", value: (f: FreeGift) => f.deskripsi },
  ];

  return (
    <>
      <PageHeader
        judul="Free Gift SKU"
        modul="Product MDM · FR-FG-01 / FR-FG-02"
        deskripsi="SKU hadiah promo selalu terhubung satu-ke-satu ke SKU induk yang valid. Kode dan deskripsi dibentuk otomatis dari produk induknya."
        aksi={
          <>
            {boleh ? <FormFreeGift onSimpan={(v) => saveRow("freeGift", v)} /> : null}
            <Button variant="outline" onPress={() => exportCSV(terfilter, kolom, "free-gift")}>
              <Download className="size-4" /> CSV
            </Button>
          </>
        }
      />

      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Kode FG / SKU induk / deskripsi…" className="w-72" />
        <span className="ml-auto self-center text-xs text-muted tnum">{terfilter.length} free gift</span>
      </Toolbar>

      {terfilter.length === 0 ? (
        <KosongRow pesan="Belum ada SKU free gift." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Kode Free Gift</th>
                <th className="px-3 py-2 font-medium">SKU induk</th>
                <th className="px-3 py-2 font-medium">Deskripsi</th>
                <th className="px-3 py-2 font-medium">Status induk</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {terfilter.map((f) => {
                const induk = db.products.find((p) => p.kodeProduct === f.kodeProductInduk);
                return (
                  <tr key={f.id} className="border-b border-separator/60 last:border-0">
                    <td className="px-3 py-2 tnum font-medium text-foreground">{f.kodeProduct}</td>
                    <td className="px-3 py-2 tnum text-muted">{f.kodeProductInduk}</td>
                    <td className="px-3 py-2 text-foreground">{f.deskripsi}</td>
                    <td className="px-3 py-2 text-xs">
                      {induk ? (
                        <span className="text-success">valid · {induk.status}</span>
                      ) : (
                        <span className="text-danger">SKU induk tidak ditemukan</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {boleh ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          isIconOnly
                          aria-label={`Hapus ${f.kodeProduct}`}
                          onPress={() => removeRow("freeGift", f.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Callout tone="info" judul="Aturan pembentukan">
          Kode selalu <b>FG + kode SKU induk</b> dan deskripsi selalu <b>[FG] + deskripsi induk</b>. Free gift ditolak
          bila SKU induk tidak ada di Master Product.
        </Callout>
      </div>
    </>
  );
}

function FormFreeGift({ onSimpan }: { onSimpan: (f: FreeGift) => void }) {
  const state = useOverlayState();
  const products = useApp((s) => s.products);
  const freeGift = useApp((s) => s.freeGift);

  const [indukId, setIndukId] = useState("");
  const [err, setErr] = useState("");

  const induk = products.find((p) => p.id === indukId);
  const kode = induk ? `FG${induk.kodeProduct.replace(/\D/g, "")}` : "";
  const deskripsi = induk ? `[FG] ${induk.namaProduct}` : "";

  function simpan() {
    if (!induk) {
      setErr("Pilih SKU induk terlebih dahulu.");
      return false;
    }
    if (freeGift.some((f) => f.kodeProduct === kode)) {
      setErr(`Free gift untuk ${induk.kodeProduct} sudah ada.`);
      return false;
    }
    onSimpan({
      id: newId("fg"),
      kodeProduct: kode,
      kodeProductInduk: induk.kodeProduct,
      deskripsi,
      updatedAt: "",
      updatedBy: "",
    });
    setIndukId("");
    setErr("");
    return true;
  }

  return (
    <>
      <Button variant="primary" onPress={() => state.open()}>
        <Plus className="size-4" /> Free gift baru
      </Button>
      <FormModal state={state} judul="Tambah Free Gift" size="md" onSimpan={simpan}>
        <div className="space-y-3">
          <SelectField
            label="SKU induk"
            items={products.map((p) => ({ id: p.id, label: p.namaProduct, hint: p.kodeProduct }))}
            value={indukId}
            onChange={setIndukId}
          />

          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Gift className="size-3.5" /> Hasil otomatis
            </p>
            <p className="mt-1 tnum text-foreground">{kode || "—"}</p>
            <p className="text-muted">{deskripsi || "—"}</p>
          </div>

          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      </FormModal>
    </>
  );
}
