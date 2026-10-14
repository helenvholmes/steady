import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Tests use a fixed zone (UTC-6 in summer, UTC-7 in winter) so date expectations don't depend on the machine.
  test: { include: ["src/**/*.test.ts"], env: { STEADY_TIME_ZONE: "America/Boise" } },
});
