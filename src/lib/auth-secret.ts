/**
 * Single source of truth for the session-signing secret.
 *
 * Imported by BOTH the Node auth helpers (src/lib/auth.ts) and the Edge
 * middleware (src/middleware.ts). They MUST resolve to the same value — if they
 * don't, a JWT signed at login fails verification in the middleware and the user
 * is bounced straight back to /login in a silent redirect loop.
 *
 * Resolution order:
 *   1. process.env.AUTH_SECRET — set this in Vercel (Settings → Environment
 *      Variables) for sessions that stay valid across deploys. Recommended for
 *      production, but OPTIONAL: the app runs fine without it.
 *   2. BAKED_SECRET — a per-build random value written into this file by
 *      `scripts/gen-auth-secret.mjs` just before `next build`. This is what lets
 *      the app deploy to Vercel with ZERO configuration. Sessions reset on each
 *      new deploy (you simply log in again — fine for a single-admin app).
 *
 * This module is intentionally Edge-safe: no Node built-ins, just a string
 * constant plus a process.env read, so the Edge middleware can import it.
 */

// hl:baked-secret — the build replaces the quoted value below with a fresh
// random hex string. The committed placeholder is only ever used for local
// `next dev` when AUTH_SECRET is unset (i.e. localhost), never in production.
const BAKED_SECRET = "hl-dev-only-fallback-secret-set-AUTH_SECRET-in-production";

const MIN_LENGTH = 16;

/** The resolved signing secret as a string. */
export function getAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= MIN_LENGTH) return fromEnv;
  return BAKED_SECRET;
}

/** The resolved signing secret encoded for `jose` (SignJWT / jwtVerify). */
export function getAuthSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}
