import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, handleError } from "@/lib/api";
import { customerSchema } from "@/lib/validation";
import { stringifyDiscountArray } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });
    if (!customer)
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(customer);
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
    const data = customerSchema.parse(body);
    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
        nama: data.nama,
        lmDiscounts: stringifyDiscountArray(data.lmDiscounts),
        brDiscounts: stringifyDiscountArray(data.brDiscounts),
        bonusThreshold: data.bonusThreshold,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}

// Soft-delete (never hard-delete master data with history).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    return handleError(err);
  }
}
