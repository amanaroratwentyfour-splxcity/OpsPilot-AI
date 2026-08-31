import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

/**
 * Prisma Client singleton, connected via the libSQL driver adapter instead
 * of Prisma's native binary query engine. The same `Config` shape works
 * against both a local SQLite file (DATABASE_URL="file:./dev.db",
 * TURSO_AUTH_TOKEN unset) and a remote Turso database (a libsql:// URL +
 * auth token) — no code branching needed between development and
 * production. This is what makes the client deployable to serverless
 * runtimes (e.g. Netlify Functions) that can't run a native engine binary
 * or write to the local filesystem.
 *
 * In development, Next.js hot-reloads modules on every save, which would
 * otherwise construct a new PrismaClient (and a new database connection)
 * on every reload. Caching the instance on `globalThis` survives the
 * reload and reuses the same client. This is the standard pattern
 * recommended by Prisma for Next.js apps.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaLibSQL({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
