// Global Vitest setup. Loads environment variables (e.g. DATABASE_URL) so
// future integration tests (Milestone 2.3 onward) that hit the real Prisma
// client can find them without each test file loading dotenv itself.
import "dotenv/config";
