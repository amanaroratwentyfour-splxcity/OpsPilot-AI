import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./*" path alias, which Vite/Vitest
    // does not read automatically the way Next.js's own bundler does.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/unit/setup.ts"],
    // Integration tests share one local SQLite file via the libSQL driver
    // adapter. Unlike Prisma's old binary engine, the libSQL local-file
    // driver has no built-in write-queue across connections, so files
    // running in parallel workers race for the same file lock; the
    // resulting lock-contention error isn't in Prisma's known-error enum
    // and surfaces as a confusing "unknown variant `SocketTimeout`" failure.
    // Running test files sequentially avoids the concurrent-write race.
    fileParallelism: false,
  },
});
