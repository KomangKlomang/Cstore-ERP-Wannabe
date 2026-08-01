import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveFile } from "@/lib/upload";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const entityType = formData.get("entityType") as string;
  const entityId = formData.get("entityId") as string;
  const field = (formData.get("field") as string) || "default";

  if (!file || !entityType || !entityId) {
    return NextResponse.json({ error: "file, entityType, dan entityId wajib diisi" }, { status: 400 });
  }

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

  return NextResponse.json({ media });
}
