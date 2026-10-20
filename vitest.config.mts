import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Every test file truncates the same tables, so files must run one at a time.
    fileParallelism: false,
    pool: "forks",
    testTimeout: 30_000,
    // Fixtures make many round trips to a remote Neon branch, which can exceed the 10s default hook timeout.
    hookTimeout: 60_000,
  },
});
