import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

import { assertSafeTestDatabase } from "./scripts/test-database-guard"

const root = path.dirname(fileURLToPath(import.meta.url))
assertSafeTestDatabase(process.env)

export default defineConfig({
  resolve: { alias: { "@": path.resolve(root, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
})
