import { describe, it, expect } from "vitest";
import { checkRateLimit, BOT_API_LIMIT } from "@/lib/utils/rate-limit";

// Sans Upstash configure (cas de ces tests), checkRateLimit traverse le
// backend in-memory — celui qui sert aussi de fallback en prod.

describe("checkRateLimit (in-memory)", () => {
  it("autorise jusqu'a maxRequests puis refuse la suivante dans la fenetre", async () => {
    const key = `test-bot-${Date.now()}`;

    for (let i = 0; i < BOT_API_LIMIT.maxRequests; i++) {
      const result = await checkRateLimit(key, BOT_API_LIMIT);
      expect(result.allowed).toBe(true);
    }

    const overflow = await checkRateLimit(key, BOT_API_LIMIT);
    expect(overflow.allowed).toBe(false);
    expect(overflow.remaining).toBe(0);
    expect(overflow.resetAt).toBeGreaterThan(Date.now());
  });

  it("isole les compteurs par cle (une cle saturee n'affecte pas les autres)", async () => {
    const saturated = `test-a-${Date.now()}`;
    for (let i = 0; i <= BOT_API_LIMIT.maxRequests; i++) {
      await checkRateLimit(saturated, BOT_API_LIMIT);
    }

    const other = await checkRateLimit(`test-b-${Date.now()}`, BOT_API_LIMIT);
    expect(other.allowed).toBe(true);
  });
});
