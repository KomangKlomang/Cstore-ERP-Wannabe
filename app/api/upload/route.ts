import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError, requirePermission } from "@/lib/api";
import { saveFile } from "@/lib/upload";
import { prisma } from "@/lib/db";
import type { ModuleKey } from "@/lib/rbac";

/**
 * entityType dibatasi ke daftar yang dikenal, dan izinnya diturunkan dari modul
 * pemiliknya — supaya Crew tidak bisa melampirkan file ke entitas mana pun.
 */
const ENTITY_MODULE: Record<string, ModuleKey> = {
  product: "product",
  category: "category",
  tag: "tag",
  store: "store",
  principal: "principal",
  npd: "npd",
  usulantag: "usulantag",
  kontrak: "kontrak",
  dokumen: "dokumen",
  aset: "aset",
  promosi: "promosi",
  konten: "konten",
  pengajuan: "pengajuan",
  freegift: "freegift",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => {
      throw new ApiError(400, "Request harus berupa multipart/form-data");
    });

    const file = formData.get("file");
    const entityType = formData.get("entityType");
    const entityId = formData.get("entityId");
    const fieldRaw = formData.get("field");

    // `as File` pada nilai string akan lolos type-check tapi meledak saat runtime.
    if (!(file instanceof File)) {
      throw new ApiError(400, "Field 'file' wajib diisi dan harus berupa file");
    }
    if (typeof entityType !== "string" || typeof entityId !== "string" || !entityType || !entityId) {
      throw new ApiError(400, "entityType dan entityId wajib diisi");
    }

    const modul = ENTITY_MODULE[entityType];
    if (!modul) {
      throw new ApiError(400, `entityType tidak dikenal. Pilihan: ${Object.keys(ENTITY_MODULE).join(", ")}`);
    }

    const session = await requirePermission(modul, "edit");
    const field = typeof fieldRaw === "string" && fieldRaw ? fieldRaw.slice(0, 30) : "default";

    const result = await saveFile(file, entityType, entityId);

    const media = await prisma.mediaFile.create({
      data: {
        entityType,
        entityId,
        field,
        nama: result.nama,
        tipe: result.tipe,
        ukuran: result.ukuran,
        storagePath: result.storagePath,
        uploadedBy: session.id,
      },
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
