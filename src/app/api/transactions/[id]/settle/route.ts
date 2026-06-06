import { NextResponse } from "next/server";
import { requireAuth, handleError } from "@/lib/api";
import { settleSchema } from "@/lib/validation";
import { settleTransaction } from "@/lib/services/transaction";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await req.json();
    const { paymentDate } = settleSchema.parse(body);
    const updated = await settleTransaction(params.id, paymentDate);
    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}
