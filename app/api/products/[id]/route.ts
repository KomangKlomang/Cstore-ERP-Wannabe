import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, readJson, requirePermission } from "@/lib/api";
import { buildProductUpdate } from "@/lib/validators/product";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("product", "view");

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { principal: true, category: true, tagRegions: true, pluAllocations: true },
    });

    if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("product", "edit");

    const { id } = await params;
    const body = await readJson(req);
    const data = buildProductUpdate(body, session.id);

    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) return null;

      const updated = await tx.product.update({ where: { id }, data });
      await tx.auditTrail.create({
        data: {
          entity: "product",
          entityId: id,
          entityLabel: updated.namaProduct,
          action: "UPDATE",
          aktorId: session.id,
          aktorRole: session.role,
        },
      });
      return updated;
    });

    if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission("product", "delete");

    const { id } = await params;

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) return null;

      await tx.product.delete({ where: { id } });
      await tx.auditTrail.create({
        data: {
          entity: "product",
          entityId: id,
          entityLabel: existing.namaProduct,
          action: "DELETE",
          aktorId: session.id,
          aktorRole: session.role,
        },
      });
      return existing;
    });

    if (!deleted) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
