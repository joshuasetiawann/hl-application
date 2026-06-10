import { NextResponse } from "next/server";
import { prisma, resolveAnyDatabaseUrl } from "@/lib/db";
import { ensureDatabaseReady, DbSetupError } from "@/lib/bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health probe AND deployment diagnostic (public; no auth required).
 *
 * Visit /api/health on a broken deploy and it tells you exactly what's wrong:
 * which database env vars Vercel injected (booleans only — never values),
 * whether the schema/admin exist, and the precise fix for the detected problem.
 * It also runs the same self-provisioning as login, so simply opening it can
 * repair a fresh database (create tables + seed admin) without a redeploy.
 */
export async function GET() {
  const startedAt = Date.now();

  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    DATABASE_URL_UNPOOLED: !!process.env.DATABASE_URL_UNPOOLED,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    anyDatabaseConfigured: !!resolveAnyDatabaseUrl(),
    AUTH_SECRET:
      process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
        ? "env"
        : "baked-fallback (ok; set AUTH_SECRET to keep sessions across deploys)",
  };

  let db: "ok" | "error" = "ok";
  let problem: string | undefined;
  let dbError: string | undefined;
  let adminUser: "present" | "missing" | "unknown" = "unknown";

  try {
    await ensureDatabaseReady(); // provisions schema + admin if missing
    adminUser = (await prisma.user.count()) > 0 ? "present" : "missing";
  } catch (e) {
    db = "error";
    if (e instanceof DbSetupError) {
      problem = e.problem;
      dbError = e.message;
    } else {
      dbError = e instanceof Error ? e.message : "unknown database error";
    }
  }

  const body = {
    status: db === "ok" ? "ok" : "degraded",
    db,
    ...(problem ? { problem } : {}),
    ...(dbError ? { dbError } : {}),
    adminUser,
    env,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    uptimeSeconds: Math.round(process.uptime()),
    responseMs: Date.now() - startedAt,
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: db === "ok" ? 200 : 503 });
}
