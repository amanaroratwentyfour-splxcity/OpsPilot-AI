import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Prisma Client singleton.
 *
 * In development, Next.js hot-reloads modules on every save, which would
 * otherwise construct a new PrismaClient (and a new database connection)
 * on every reload. Caching the instance on `globalThis` survives the
 * reload and reuses the same client. This is the standard pattern
 * recommended by Prisma for Next.js apps.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
