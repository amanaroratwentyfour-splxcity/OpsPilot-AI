/** @type {import('next').NextConfig} */
const nextConfig = {
  // The libSQL driver adapter (lib/db/prisma.ts) pulls in Node-only native
  // bindings and non-JS asset files (README.md, prebuilt .node binaries)
  // that webpack cannot parse when bundled for the server. Marking these
  // as external server packages skips bundling them and resolves them via
  // native `require` at runtime instead, which is how Prisma's own docs
  // recommend using driver adapters with Next.js.
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
  },
};

export default nextConfig;
