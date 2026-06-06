import { NextResponse } from "next/server";
import { requireAuth, handleError } from "@/lib/api";
import { getCustomerBonusEligibility } from "@/lib/services/bonus";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const e = await getCustomerBonusEligibility(params.id);
    return NextResponse.json({
      customerId: e.customerId,
      enabled: e.enabled,
      threshold: e.threshold.toNumber(),
      accumulatedPaidOmzet: e.accumulatedPaidOmzet.toNumber(),
      bonusesAlreadyGranted: e.bonusesAlreadyGranted,
      bonusesAvailable: e.bonusesAvailable,
      consumedAmount: e.consumedAmount.toNumber(),
      carryOver: e.carryOver.toNumber(),
    });
  } catch (err) {
    return handleError(err);
  }
}
