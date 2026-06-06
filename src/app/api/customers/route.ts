import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, handleError } from "@/lib/api";
import { customerSchema } from "@/lib/validation";
import { stringifyDiscountArray } from "@/lib/serialize";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const customers = await prisma.customer.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { nama: "asc" },
    });
    return NextResponse.json(customers);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = customerSchema.parse(body);
    const created = await prisma.customer.create({
      data: {
        nama: data.nama,
        lmDiscounts: stringifyDiscountArray(data.lmDiscounts),
        brDiscounts: stringifyDiscountArray(data.brDiscounts),
        bonusThreshold: data.bonusThreshold,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
