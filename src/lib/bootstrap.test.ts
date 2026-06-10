/**
 * Tests for runtime database self-provisioning (src/lib/bootstrap.ts) — the
 * mechanism that makes a fresh Vercel deploy login-ready even when the
 * database is connected after the build. DB-backed cases run against the same
 * Postgres test database as the service integration tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  ensureDatabaseReady,
  DbSetupError,
  __resetBootstrapStateForTests,
} from "@/lib/bootstrap";

const RUN_DB = !!process.env.TEST_DATABASE_URL;
const d = RUN_DB ? describe : describe.skip;

const DB_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL_NO_SSL",
] as const;

describe("ensureDatabaseReady — no database configured", () => {
  it("throws NO_DB_ENV with an actionable message when no db env var is set", async () => {
    const saved = DB_ENV_KEYS.map((k) => [k, process.env[k]] as const);
    DB_ENV_KEYS.forEach((k) => delete process.env[k]);
    __resetBootstrapStateForTests();
    try {
      await expect(ensureDatabaseReady()).rejects.toMatchObject({
        problem: "NO_DB_ENV",
        status: 503,
      });
      await expect(ensureDatabaseReady()).rejects.toBeInstanceOf(DbSetupError);
    } finally {
      saved.forEach(([k, v]) => {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      });
      __resetBootstrapStateForTests();
    }
  });
});

d("ensureDatabaseReady — against a real Postgres", () => {
  async function dropAllTables() {
    // Reverse-FK order; CASCADE for safety.
    for (const t of ["TransactionLine", "Transaction", "Product", "Customer", "User"]) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    }
  }

  async function tableNames(): Promise<string[]> {
    const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    return rows.map((r) => r.tablename).sort();
  }

  beforeEach(() => {
    __resetBootstrapStateForTests();
  });

  it("provisions schema + admin + demo data on a completely empty database", async () => {
    await dropAllTables();
    await ensureDatabaseReady();

    expect(await tableNames()).toEqual([
      "Customer",
      "Product",
      "Transaction",
      "TransactionLine",
      "User",
    ]);

    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    expect(admin).not.toBeNull();
    expect(await bcrypt.compare("admin123", admin!.passwordHash)).toBe(true);

    // Fresh database is demo-ready by default (client-presentable, never blank).
    expect(await prisma.customer.count()).toBe(2);
    expect(await prisma.transaction.count()).toBe(6);
  });

  it("skips demo data when SEED_DEMO=false (clean start)", async () => {
    process.env.SEED_DEMO = "false";
    try {
      await dropAllTables();
      await ensureDatabaseReady();

      expect(await prisma.user.count()).toBe(1); // admin only
      expect(await prisma.customer.count()).toBe(0);
      expect(await prisma.transaction.count()).toBe(0);
    } finally {
      delete process.env.SEED_DEMO;
    }
  });

  it("never adds demo data when real data already exists", async () => {
    await dropAllTables();
    await ensureDatabaseReady(); // seeds demo
    await prisma.transactionLine.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.customer.create({ data: { nama: "Pelanggan Asli" } });

    __resetBootstrapStateForTests();
    await ensureDatabaseReady();

    expect(await prisma.customer.count()).toBe(1); // untouched
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("is idempotent and never overwrites an existing user's password", async () => {
    await ensureDatabaseReady();
    const changedHash = await bcrypt.hash("user-changed-this", 10);
    await prisma.user.updateMany({ data: { passwordHash: changedHash } });

    __resetBootstrapStateForTests();
    await ensureDatabaseReady();

    const users = await prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0].passwordHash).toBe(changedHash);
  });

  it("heals a PARTIAL schema (one table missing, others present)", async () => {
    await ensureDatabaseReady();
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "User" CASCADE`);

    __resetBootstrapStateForTests();
    await ensureDatabaseReady();

    expect(await tableNames()).toContain("User");
    expect(await prisma.user.count()).toBe(1);
  });

  it("seeds the admin when tables exist but no user was ever created", async () => {
    await ensureDatabaseReady();
    await prisma.user.deleteMany();

    __resetBootstrapStateForTests();
    await ensureDatabaseReady();

    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    expect(admin).not.toBeNull();
  });
});
