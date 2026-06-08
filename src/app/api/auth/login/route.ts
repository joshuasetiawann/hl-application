import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { handleError } from "@/lib/api";

// Auth + DB route: must run on the Node.js runtime and never be statically
// collected/prerendered at build time (it reads cookies and the database).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { username } });
    // Generic error to avoid leaking which field was wrong.
    const invalid = NextResponse.json(
      { error: "Username atau password salah" },
      { status: 401 }
    );
    if (!user) return invalid;

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return invalid;

    const token = await createSessionToken({
      sub: user.id,
      username: user.username,
    });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, username: user.username });
  } catch (err) {
    return handleError(err);
  }
}
