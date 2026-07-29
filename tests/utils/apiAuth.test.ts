import { describe, it, expect, afterEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import {
  generateRawKey,
  hashApiKey,
  keyPrefixFor,
  extractBearerToken,
  createRobotJwt,
} from "@/lib/utils/apiAuth";

const TEST_SECRET = "test-secret-at-least-32-characters-long";

describe("generateRawKey", () => {
  it("commence par le prefixe sk_live_ et a une entropie suffisante", () => {
    const key = generateRawKey();
    expect(key.startsWith("sk_live_")).toBe(true);
    expect(key.length).toBeGreaterThan(40);
  });

  it("genere une cle differente a chaque appel", () => {
    expect(generateRawKey()).not.toBe(generateRawKey());
  });
});

describe("hashApiKey", () => {
  it("est deterministe pour la meme cle", () => {
    const key = generateRawKey();
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("produit des hash differents pour des cles differentes", () => {
    expect(hashApiKey("sk_live_a")).not.toBe(hashApiKey("sk_live_b"));
  });

  it("ne retourne jamais la cle brute", () => {
    const key = generateRawKey();
    expect(hashApiKey(key)).not.toContain(key);
  });
});

describe("keyPrefixFor", () => {
  it("tronque la cle brute a un prefixe affichable", () => {
    const key = "sk_live_abcdefghijklmnop"; // gitleaks:allow
    const prefix = keyPrefixFor(key);
    expect(prefix).toBe("sk_live_abcd");
    expect(prefix.length).toBeLessThan(key.length);
  });
});

describe("extractBearerToken", () => {
  it("extrait le token d'un header Authorization: Bearer valide", () => {
    expect(extractBearerToken("Bearer sk_live_xyz")).toBe("sk_live_xyz");
  });

  it("accepte le scheme en toute casse (RFC 7235)", () => {
    expect(extractBearerToken("bearer sk_live_xyz")).toBe("sk_live_xyz");
    expect(extractBearerToken("BEARER sk_live_xyz")).toBe("sk_live_xyz");
  });

  it("retourne null si le header est absent", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("retourne null si le schema n'est pas Bearer", () => {
    expect(extractBearerToken("Basic sk_live_xyz")).toBeNull();
  });

  it("retourne null si Bearer est suivi de rien", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
  });
});

describe("createRobotJwt", () => {
  const ORIGINAL_SECRET = process.env.SUPABASE_JWT_SECRET;

  afterEach(() => {
    process.env.SUPABASE_JWT_SECRET = ORIGINAL_SECRET;
    vi.useRealTimers();
  });

  it("signe un JWT dont sub = robotUserId et role = authenticated", () => {
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
    const robotUserId = "11111111-1111-1111-1111-111111111111";

    const token = createRobotJwt(robotUserId);
    const claims = jwt.verify(token, TEST_SECRET) as jwt.JwtPayload;

    expect(claims.sub).toBe(robotUserId);
    expect(claims.role).toBe("authenticated");
  });

  it("signe explicitement en HS256 (celui que PostgREST verifie)", () => {
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
    const token = createRobotJwt("11111111-1111-1111-1111-111111111111");
    const header = jwt.decode(token, { complete: true })?.header;
    expect(header?.alg).toBe("HS256");
  });

  it("expire a 5 minutes, jamais plus", () => {
    process.env.SUPABASE_JWT_SECRET = TEST_SECRET;
    const token = createRobotJwt("11111111-1111-1111-1111-111111111111");
    const claims = jwt.decode(token) as jwt.JwtPayload;

    const lifetimeSeconds = claims.exp! - claims.iat!;
    expect(lifetimeSeconds).toBe(5 * 60);
  });

  it("leve une erreur explicite si SUPABASE_JWT_SECRET est absent", () => {
    delete process.env.SUPABASE_JWT_SECRET;
    expect(() => createRobotJwt("11111111-1111-1111-1111-111111111111")).toThrow(
      "SUPABASE_JWT_SECRET",
    );
  });
});
