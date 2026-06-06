import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests share a single SQLite test DB; run serially to avoid races.
    fileParallelism: false,
    globalSetup: ["./vitest.global-setup.ts"],
    env: {
      DATABASE_URL: "file:./test.db",
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
