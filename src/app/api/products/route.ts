import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, handleError } from "@/lib/api";
import { productSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const products = await prisma.product.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: [{ tipe: "asc" }, { nama: "asc" }],
    });
    return NextResponse.json(products);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = productSchema.parse(body);
    const created = await prisma.product.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
