import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./client/src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["client/src/**/*.{ts,tsx}", "server/**/*.{ts,tsx}", "shared/**/*.{ts,tsx}"],
      exclude: [
        "client/src/test-setup.ts",
        "client/src/**/__tests__/**",
        "client/src/**/*.test.{ts,tsx}",
        "client/src/**/*.spec.{ts,tsx}",
        "server/**/__tests__/**",
        "server/**/*.test.{ts,tsx}",
        "server/**/*.spec.{ts,tsx}",
        "shared/**/__tests__/**",
        "shared/**/*.test.{ts,tsx}",
        "shared/**/*.spec.{ts,tsx}",
        "node_modules/**",
      ],
      all: true,
      reportsDirectory: "./coverage",
      // Coverage thresholds act as a one-way ratchet: every time a meaningful
      // batch of new tests lands, bump these up to roughly the new measured
      // baseline (with a small ~1% buffer for flakiness) so the safety net
      // stays meaningful and we never silently regress.
      //
      // History / incremental steps:
      //   step 0  – initial floor (statements 14 / branches 45 / funcs 20 / lines 14)
      //   step 1  – functions lowered 20 → 16 when the first server-side test
      //             (server/__tests__/delete-service.test.ts) pulled all of
      //             MemStorage's ~100 uncovered methods into the v8 denominator
      //   step 2  – CURRENT: statements 14 → 17, branches 45 → 50,
      //             functions 16 → 17, lines 14 → 17 after additional client
      //             page/component and server pricing-tier tests landed
      //             (measured baseline ~17.67 / 52.02 / 17.84 / 17.67)
      //
      // Target end-state (long term, once the backlog of untested pages and
      // routes is covered): roughly 60 / 70 / 60 / 60. Plan to climb in ~5–10
      // point increments per batch of new tests rather than one big jump.
      thresholds: {
        statements: 17,
        branches: 50,
        functions: 17,
        lines: 17,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
});
