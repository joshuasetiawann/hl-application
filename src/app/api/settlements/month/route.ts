import { NextResponse } from "next/server";
import { requireAuth, handleError } from "@/lib/api";
import { settleMonthSchema } from "@/lib/validation";
import { settleMonth } from "@/lib/services/transaction";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const { customerId, year, month, paymentDate } =
      settleMonthSchema.parse(body);
    const result = await settleMonth(customerId, year, month, paymentDate);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}
