/** Authentication: single-user, cookie-based JWT session. No public registration. */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getAuthSecretBytes } from "./auth-secret";

const COOKIE_NAME = "hl_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 hours

// Resolves AUTH_SECRET (env) or the per-build baked fallback — see auth-secret.ts.
// Must match the secret used by the Edge middleware exactly.
function getSecret(): Uint8Array {
  return getAuthSecretBytes();
}

export interface SessionPayload {
  sub: string; // user id
  username: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.username !== "string") return null;
    return { sub: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

/** Set the session cookie (call from a Route Handler / Server Action). */
export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

/** Read and verify the current session from cookies. Returns null if unauthenticated. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
