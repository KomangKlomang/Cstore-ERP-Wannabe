import { ApiError, optionalEnum, optionalNumber, optionalString, requireString } from "@/lib/api";

export const PRODUCT_STATUSES = ["DRAFT", "AKTIF", "NONAKTIF", "DELISTING"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Field yang boleh diisi client. Sisanya (id, createdAt, relasi) ditolak diam-diam. */
const TEXT_FIELDS = ["kodeProduct", "barcode", "namaProduct", "principalId", "categoryId", "brand", "uom"] as const;
const NUMBER_FIELDS = ["isiSatuPack", "hargaBeli", "hargaJual", "msrp"] as const;
const OPTIONAL_TEXT_FIELDS = ["c1", "c2", "c3", "c4", "c5"] as const;

export function buildProductCreate(body: Record<string, unknown>, actorId: string) {
  return {
    kodeProduct: requireString(body, "kodeProduct", "Kode produk"),
    barcode: requireString(body, "barcode", "Barcode"),
    namaProduct: requireString(body, "namaProduct", "Nama produk"),
    principalId: requireString(body, "principalId", "Principal"),
    categoryId: requireString(body, "categoryId", "Kategori"),
    brand: requireString(body, "brand", "Brand"),
    uom: optionalString(body, "uom") ?? "PCS",
    isiSatuPack: optionalNumber(body, "isiSatuPack") ?? 1,
    hargaBeli: optionalNumber(body, "hargaBeli") ?? 0,
    hargaJual: optionalNumber(body, "hargaJual") ?? 0,
    msrp: optionalNumber(body, "msrp") ?? 0,
    c1: optionalString(body, "c1"),
    c2: optionalString(body, "c2"),
    c3: optionalString(body, "c3"),
    c4: optionalString(body, "c4"),
    c5: optionalString(body, "c5"),
    status: optionalEnum(body, "status", PRODUCT_STATUSES) ?? ("DRAFT" as ProductStatus),
    updatedBy: actorId,
  };
}

/**
 * Update parsial. Sebelumnya route melakukan `data: { ...body }`, sehingga client
 * bisa menimpa `id`, `updatedAt`, atau relasi apa pun (mass assignment).
 */
export function buildProductUpdate(body: Record<string, unknown>, actorId: string) {
  const data: Record<string, unknown> = { updatedBy: actorId };

  for (const field of TEXT_FIELDS) {
    if (field in body) data[field] = requireString(body, field, field);
  }
  for (const field of NUMBER_FIELDS) {
    if (field in body) data[field] = optionalNumber(body, field) ?? 0;
  }
  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (field in body) data[field] = optionalString(body, field) ?? null;
  }
  if ("status" in body) {
    data.status = optionalEnum(body, "status", PRODUCT_STATUSES);
    if (data.status === undefined) throw new ApiError(400, "status tidak boleh kosong");
  }

  if (Object.keys(data).length === 1) {
    throw new ApiError(400, "Tidak ada field yang bisa diubah pada request ini");
  }
  return data;
}
