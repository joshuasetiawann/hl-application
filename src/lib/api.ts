import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth";
import { BusinessError } from "@/lib/services/transaction";
import { DbSetupError } from "@/lib/bootstrap";

/** Require an authenticated session in a route handler. Throws a Response on failure. */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  return session;
}

/** Wrap a route handler with consistent error handling. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof NextResponse) return err;
  if (err instanceof Response) return err as NextResponse;
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validasi gagal", issues: err.flatten() },
      { status: 400 }
    );
  }
  if (err instanceof BusinessError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof DbSetupError) {
    console.error(`[db-setup] ${err.problem}: ${err.message}`);
    return NextResponse.json(
      { error: err.message, code: err.problem },
      { status: err.status }
    );
  }
  // Prisma unique constraint
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  ) {
    return NextResponse.json(
      { error: "Data sudah ada (duplikat)" },
      { status: 409 }
    );
  }
  console.error(err);
  return NextResponse.json(
    { error: "Terjadi kesalahan pada server" },
    { status: 500 }
  );
}
