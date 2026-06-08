import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton — safe for Next.js / Vercel serverless.
 *
 * The real PrismaClient is created LAZILY on first property access (i.e. the
 * first database call inside a request handler), NOT at import time. During
 * `next build`, Next.js imports every route module to "collect page data";
 * deferring construction means a missing DATABASE_URL or a not-yet-generated
 * client can never crash that build-time collection. At runtime the client is
 * created once and cached on globalThis (one instance per serverless lambda /
 * dev process — avoids exhausting DB connections on hot reload).
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new Proxy({} as PrismaClient, {
    get(_target, prop) {
      const client = getClient();
      const value = Reflect.get(client, prop, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
