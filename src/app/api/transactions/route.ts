import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, handleError } from "@/lib/api";
import { transactionSchema } from "@/lib/validation";
import { createTransaction } from "@/lib/services/transaction";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId") || undefined;
    const status = searchParams.get("status") || undefined;

    const transactions = await prisma.transaction.findMany({
      where: {
        deletedAt: null,
        ...(customerId ? { customerId } : {}),
        ...(status ? { status } : {}),
      },
      include: { customer: true, lines: true },
      orderBy: { tanggal: "desc" },
    });
    return NextResponse.json(transactions);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = transactionSchema.parse(body);
    const created = await createTransaction(data);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
