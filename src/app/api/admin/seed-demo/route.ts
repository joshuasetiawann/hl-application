import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDatabaseReady } from "@/lib/bootstrap";
import { requireAuth, handleError } from "@/lib/api";
import { seedDemoData } from "@/lib/demo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fill an EMPTY database with the demo dataset (customers, products, bons).
 * Backs the "Isi Data Contoh" button shown on the dashboard when there is no
 * data yet. Refuses (409) when any customer already exists, so it can never
 * pollute real business data.
 */
export async function POST() {
  try {
    await requireAuth();
    await ensureDatabaseReady();

    const result = await seedDemoData(prisma);
    if (!result.seeded) {
      return NextResponse.json(
        { error: "Database sudah berisi data — data contoh tidak ditambahkan." },
        { status: 409 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}
