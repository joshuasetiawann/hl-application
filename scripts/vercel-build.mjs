#!/usr/bin/env node
/**
 * Vercel build step (Vercel auto-runs the "vercel-build" npm script if present).
 *
 * Goal: a fresh Vercel deploy is login-ready with NO manual db push / seed.
 *   1) prisma generate            (never needs a DB)
 *   2) prisma db push             (create/sync tables) — if a DB is configured
 *   3) seed admin user            (idempotent; never overwrites a changed password)
 *
 * Resilient by design: if no database env var is present, or push/seed fails,
 * it logs a WARNING and continues so the build still succeeds (the site deploys;
 * DB features start working once a valid DATABASE_URL is set).
 */
import { execSync } from "node:child_process";

function run(cmd, extraEnv) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

// Prefer a DIRECT (non-pooled) connection for DDL (db push); fall back through
// the common Vercel / Neon variable names. Neon's direct URL is DATABASE_URL_UNPOOLED.
const dbUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NO_SSL ||
  "";

// 0) Bake a session secret so login works with zero config (AUTH_SECRET env
//    var, when set, still wins at runtime). Must happen before `next build`.
run("node scripts/gen-auth-secret.mjs");

// 1) Always generate the Prisma client.
run("prisma generate");

// 2) + 3) Provision the database if one is configured.
if (dbUrl) {
  const env = { DATABASE_URL: dbUrl };
  try {
    run("prisma db push --skip-generate", env);
  } catch (err) {
    console.warn("[vercel-build] WARNING: `prisma db push` failed — continuing build.");
    console.warn(`  ${err?.message ?? err}`);
  }
  try {
    run("npx tsx prisma/seed.ts", env);
  } catch (err) {
    console.warn("[vercel-build] WARNING: seed failed — continuing build.");
    console.warn(`  ${err?.message ?? err}`);
  }
} else {
  console.warn(
    "[vercel-build] No database env var found (DATABASE_URL or POSTGRES_*). " +
      "Skipping db push & seed. Set it in Vercel for login/database to work."
  );
}

console.log("\n[vercel-build] Prisma steps complete; running `next build` next.");
