import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests share a single Postgres test DB; run serially to avoid races.
    fileParallelism: false,
    globalSetup: ["./vitest.global-setup.ts"],
    env: {
      // Integration tests run against a real Postgres (same engine as production).
      // Provide one via TEST_DATABASE_URL; when absent they skip (unit tests still run).
      //   e.g. docker run -d -p 55432:5432 -e POSTGRES_PASSWORD=test postgres:16-alpine
      //        TEST_DATABASE_URL="postgresql://postgres:test@localhost:55432/postgres" npm test
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      AUTH_SECRET: "test-secret-please-ignore-0123456789abcdef",
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin123",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
