import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, handleError } from "@/lib/api";
import { productSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });
    if (!product)
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(product);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = productSchema.parse(body);
    const updated = await prisma.product.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}

// Soft-delete.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    return handleError(err);
  }
}
