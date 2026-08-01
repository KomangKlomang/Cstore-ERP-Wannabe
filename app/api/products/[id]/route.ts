import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      principal: true,
      category: true,
      tagRegions: true,
      pluAllocations: true,
    },
  });

  if (!product) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const product = await prisma.product.update({
    where: { id },
    data: { ...body, updatedBy: session.id },
  });

  await prisma.auditTrail.create({
    data: {
      entity: "product",
      entityId: id,
      entityLabel: product.namaProduct,
      action: "UPDATE",
      aktorId: session.id,
      aktorRole: session.role as "MDM",
    },
  });

  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await prisma.product.delete({ where: { id } });

  await prisma.auditTrail.create({
    data: {
      entity: "product",
      entityId: id,
      entityLabel: product.namaProduct,
      action: "DELETE",
      aktorId: session.id,
      aktorRole: session.role as "MDM",
    },
  });

  return NextResponse.json({ ok: true });
}
