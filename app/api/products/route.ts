import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, handleApiError, readJson, requirePermission } from "@/lib/api";
import { PRODUCT_STATUSES, buildProductCreate, type ProductStatus } from "@/lib/validators/product";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("product", "view");

    const url = new URL(req.url);
    const search = url.searchParams.get("q")?.trim() || "";
    const status = url.searchParams.get("status");
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));

    if (status && !PRODUCT_STATUSES.includes(status as ProductStatus)) {
      throw new ApiError(400, `status harus salah satu dari: ${PRODUCT_STATUSES.join(", ")}`);
    }

    const where = {
      ...(search && {
        OR: [
          { namaProduct: { contains: search, mode: "insensitive" as const } },
          { kodeProduct: { contains: search, mode: "insensitive" as const } },
          { barcode: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status: status as ProductStatus }),
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          principal: { select: { nama: true } },
          category: { select: { subCategory: true } },
          tagRegions: true,
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("product", "create");
    const body = await readJson(req);
    const data = buildProductCreate(body, session.id);

    // Satu transaksi: produk tanpa jejak audit (atau sebaliknya) tidak boleh terjadi.
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data });
      await tx.auditTrail.create({
        data: {
          entity: "product",
          entityId: created.id,
          entityLabel: created.namaProduct,
          action: "CREATE",
          aktorId: session.id,
          aktorRole: session.role,
        },
      });
      return created;
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
