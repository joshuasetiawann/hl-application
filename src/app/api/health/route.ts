import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Lightweight health probe used by the ops scripts (check-health / run-server readiness).
 * Returns 200 only when the app is up AND the database answers a trivial query.
 * No authentication required (registered as a public path in middleware).
 */
export async function GET() {
  const startedAt = Date.now();
  let db: "ok" | "error" = "ok";
  let dbError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    db = "error";
    dbError = e instanceof Error ? e.message : "unknown database error";
  }

  const body = {
    status: db === "ok" ? "ok" : "degraded",
    db,
    ...(dbError ? { dbError } : {}),
    uptimeSeconds: Math.round(process.uptime()),
    responseMs: Date.now() - startedAt,
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: db === "ok" ? 200 : 503 });
}
