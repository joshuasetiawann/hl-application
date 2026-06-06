import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, handleError } from "@/lib/api";
import { transactionSchema } from "@/lib/validation";
import {
  updateTransaction,
  softDeleteTransaction,
} from "@/lib/services/transaction";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const txn = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { customer: true, lines: true },
    });
    if (!txn)
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    return NextResponse.json(txn);
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
    const data = transactionSchema.parse(body);
    const updated = await updateTransaction(params.id, data);
    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    await softDeleteTransaction(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
