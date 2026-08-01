import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const skip = (page - 1) * limit;

  const where = {
    ...(search && {
      OR: [
        { namaProduct: { contains: search, mode: "insensitive" as const } },
        { kodeProduct: { contains: search, mode: "insensitive" as const } },
        { barcode: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status: status as "DRAFT" | "AKTIF" | "NONAKTIF" | "DELISTING" }),
  };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { principal: { select: { nama: true } }, category: { select: { subCategory: true } }, tagRegions: true },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const product = await prisma.product.create({
    data: {
      kodeProduct: body.kodeProduct,
      barcode: body.barcode,
      namaProduct: body.namaProduct,
      principalId: body.principalId,
      categoryId: body.categoryId,
      brand: body.brand,
      uom: body.uom || "PCS",
      isiSatuPack: body.isiSatuPack || 1,
      hargaBeli: body.hargaBeli || 0,
      hargaJual: body.hargaJual || 0,
      msrp: body.msrp || 0,
      c1: body.c1,
      c2: body.c2,
      c3: body.c3,
      c4: body.c4,
      c5: body.c5,
      status: body.status || "DRAFT",
      updatedBy: session.id,
    },
  });

  await prisma.auditTrail.create({
    data: {
      entity: "product",
      entityId: product.id,
      entityLabel: product.namaProduct,
      action: "CREATE",
      aktorId: session.id,
      aktorRole: session.role as "MDM",
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
