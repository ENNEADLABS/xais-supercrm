import { defineConfig } from "vitest/config";
import path from "path";

// Tests d'intégration RLS / isolation multi-tenant (ADR-0008).
// Env `node` (pas jsdom) : ils parlent à la DB Supabase locale via @supabase/supabase-js.
// Lancés via `pnpm test:integration` ; exclus du run unit (`pnpm test`).
// Prérequis : `supabase start` + `pnpm db:reset`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // Création de users GoTrue + reqs DB : marges larges vs les tests unit.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
