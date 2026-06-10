/**
 * Runtime database self-provisioning.
 *
 * Makes a fresh Vercel deploy work even when the database was connected AFTER
 * the build (so the build-time `prisma db push` + seed never ran): on the first
 * request that needs the DB (login / health), if the tables are missing we
 * create them from the generated DDL and seed the admin user — no redeploy
 * needed. When the DB is misconfigured we throw a DbSetupError whose message
 * tells the operator EXACTLY which one-click step is missing, instead of a
 * generic 500.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma, resolveAnyDatabaseUrl, resolveDirectDatabaseUrl } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-data";
import { BOOTSTRAP_SQL } from "@/generated/bootstrap-sql";

export type DbProblem = "NO_DB_ENV" | "DB_UNREACHABLE" | "PROVISION_FAILED";

export class DbSetupError extends Error {
  readonly status = 503;
  constructor(
    public readonly problem: DbProblem,
    message: string
  ) {
    super(message);
    this.name = "DbSetupError";
  }
}

const MESSAGES: Record<DbProblem, string> = {
  NO_DB_ENV:
    "Database belum terhubung. Di Vercel: buka project → tab Storage → Create Database → " +
    "Postgres (Neon) → Connect, lalu coba login lagi (tidak perlu redeploy). " +
    "Alternatif: set env var DATABASE_URL ke connection string Postgres (Neon/Supabase).",
  DB_UNREACHABLE:
    "Database terhubung tapi tidak bisa dijangkau dari server. Cek di Vercel/Neon apakah " +
    "database aktif (tidak di-pause / dihapus) dan kredensialnya masih berlaku, lalu coba lagi.",
  PROVISION_FAILED:
    "Gagal menyiapkan tabel database secara otomatis. Coba lagi, atau jalankan " +
    "`npx prisma db push` secara manual terhadap database yang sama.",
};

/** Extract a Postgres error code from a Prisma error, wherever it hides. */
function pgCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const e = err as { code?: string; meta?: { code?: string } };
  // P2010 = raw query failed; the PG code is in meta.code.
  return e.meta?.code ?? e.code;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** "Relation/table does not exist" — the database is empty or partially set up. */
function isMissingTableError(err: unknown): boolean {
  const code = pgCode(err);
  if (code === "P2021" || code === "P2022" || code === "42P01") return true;
  return /relation .* does not exist|does not exist in the current database/i.test(
    messageOf(err)
  );
}

/** Connection-level failure (host down, bad credentials, TLS, timeouts…). */
function isUnreachableError(err: unknown): boolean {
  const code = pgCode(err);
  if (code && /^P10\d\d$/.test(code)) return true; // P1000-P1017 init/connection errors
  return /can't reach database|connect|connection|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|timeout|SSL|TLS|password authentication/i.test(
    messageOf(err)
  );
}

/** "Already exists" errors we tolerate when re-running DDL over a partial schema. */
function isAlreadyExistsError(err: unknown): boolean {
  const code = pgCode(err);
  if (code === "42P07" || code === "42710" || code === "42701") return true;
  return /already exists/i.test(messageOf(err));
}

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(--.*\n?)+$/.test(s));
}

/** Create the admin user when no user exists yet. Never touches an existing one. */
async function seedAdminIfEmpty(client: PrismaClient): Promise<void> {
  const count = await client.user.count();
  if (count > 0) return;
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(password, 10);
  await client.user.create({ data: { username, passwordHash } });
  console.log(`[bootstrap] Admin user created: ${username}`);
}

/**
 * Fill an empty database with the demo dataset so a fresh deploy is
 * presentation-ready (nothing on any screen looks broken/blank). ON by
 * default; set SEED_DEMO=false to start with a clean database instead.
 * Never runs when ANY customer exists, so real data is never touched.
 */
async function seedDemoIfEmpty(client: PrismaClient): Promise<void> {
  if (process.env.SEED_DEMO === "false") return;
  const result = await seedDemoData(client);
  if (result.seeded) {
    console.log(
      `[bootstrap] Demo data seeded: ${result.customers} customers, ` +
        `${result.products} products, ${result.transactions} transactions`
    );
  }
}

/** Admin + demo data, both idempotent. The shared "make it usable" step. */
async function seedDefaults(client: PrismaClient): Promise<void> {
  await seedAdminIfEmpty(client);
  await seedDemoIfEmpty(client);
}

/**
 * Run the full DDL against a DIRECT (non-pooled) connection when available —
 * session-level advisory locks and DDL are unreliable through PgBouncer.
 * Tolerates partially-existing schemas so concurrent/failed runs self-heal.
 */
async function provisionSchema(): Promise<void> {
  const url = resolveDirectDatabaseUrl();
  if (!url) throw new DbSetupError("NO_DB_ENV", MESSAGES.NO_DB_ENV);

  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    // Serialize concurrent cold-start lambdas racing to provision. The lock
    // call is wrapped in a subquery because pg_advisory_lock() returns void,
    // which Prisma's raw-query deserializer rejects as a result column.
    await client.$queryRawUnsafe(
      `SELECT 1 AS locked FROM (SELECT pg_advisory_lock(72451013)) AS _`
    );
    for (const stmt of splitStatements(BOOTSTRAP_SQL)) {
      try {
        await client.$executeRawUnsafe(stmt);
      } catch (err) {
        if (!isAlreadyExistsError(err)) throw err;
      }
    }
    await seedDefaults(client);
    console.log("[bootstrap] Database schema provisioned at runtime.");
  } finally {
    try {
      await client.$queryRawUnsafe(`SELECT pg_advisory_unlock(72451013)`);
    } catch {
      // Lock dies with the connection anyway.
    }
    await client.$disconnect();
  }
}

async function check(): Promise<void> {
  if (!resolveAnyDatabaseUrl()) {
    throw new DbSetupError("NO_DB_ENV", MESSAGES.NO_DB_ENV);
  }
  try {
    // One cheap query proves both connectivity and that the schema exists…
    await seedDefaults(prisma); // …and repairs a "tables exist, never seeded" state.
    return;
  } catch (err) {
    if (err instanceof DbSetupError) throw err;
    if (isMissingTableError(err)) {
      try {
        await provisionSchema();
        return;
      } catch (provisionErr) {
        if (provisionErr instanceof DbSetupError) throw provisionErr;
        if (isUnreachableError(provisionErr)) {
          throw new DbSetupError("DB_UNREACHABLE", MESSAGES.DB_UNREACHABLE);
        }
        throw new DbSetupError(
          "PROVISION_FAILED",
          `${MESSAGES.PROVISION_FAILED} (detail: ${messageOf(provisionErr)})`
        );
      }
    }
    if (isUnreachableError(err)) {
      throw new DbSetupError("DB_UNREACHABLE", MESSAGES.DB_UNREACHABLE);
    }
    throw err;
  }
}

let ready: Promise<void> | null = null;

/**
 * Ensure the database is reachable, has the schema, and has an admin user.
 * Memoized per process: success is checked once per lambda instance; failure
 * clears the memo so the next request retries (e.g. right after the operator
 * connects the database).
 */
export function ensureDatabaseReady(): Promise<void> {
  if (!ready) {
    ready = check().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

/** Test-only: forget the memoized readiness so scenarios can run in one process. */
export function __resetBootstrapStateForTests(): void {
  ready = null;
}
