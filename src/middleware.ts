import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "hl_session";

// Paths that do NOT require authentication.
const PUBLIC_PATHS = ["/login"];
const PUBLIC_API_PATHS = ["/api/auth/login"];

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  const authed = await isAuthenticated(req);

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
