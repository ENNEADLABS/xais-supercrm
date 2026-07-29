// Rate limiter : Upstash Redis si configure (prod), in-memory sinon (dev/fallback)
// Variables requises pour Upstash : UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

export interface RateLimitConfig {
  /** Nombre max de requetes dans la fenetre */
  maxRequests: number;
  /** Duree de la fenetre en secondes (Upstash) ou millisecondes (in-memory) */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// --- In-memory fallback (dev, instances sans Redis) ---

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

function checkRateLimitMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();

  // Nettoyage periodique
  if (memoryStore.size > 5000) {
    for (const [k, entry] of memoryStore) {
      if (now > entry.resetAt) memoryStore.delete(k);
    }
  }

  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    const newEntry: MemoryEntry = { count: 1, resetAt: now + config.windowMs };
    memoryStore.set(key, newEntry);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: newEntry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

// --- Upstash backend ---

let upstashLimiters: Map<string, unknown> | null = null;

async function checkRateLimitUpstash(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  // Cache des limiteurs par config (evite de recreer a chaque requete)
  if (!upstashLimiters) upstashLimiters = new Map();

  const cacheKey = `${config.maxRequests}:${config.windowMs}`;
  if (!upstashLimiters.has(cacheKey)) {
    upstashLimiters.set(
      cacheKey,
      new Ratelimit({
        redis: Redis.fromEnv(),
        // Fenetre glissante : plus equitable que la fenetre fixe
        limiter: Ratelimit.slidingWindow(
          config.maxRequests,
          `${Math.round(config.windowMs / 1000)} s`,
        ),
        analytics: false,
      }),
    );
  }

  const limiter = upstashLimiters.get(cacheKey) as InstanceType<typeof Ratelimit>;
  const { success, remaining, reset } = await limiter.limit(key);

  return {
    allowed: success,
    remaining,
    resetAt: reset,
  };
}

// --- Interface publique ---

/** Verifie si une requete est autorisee selon le rate limit. */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return checkRateLimitUpstash(key, config);
  }
  return checkRateLimitMemory(key, config);
}

// --- Configurations predefinies ---

/** Auth endpoints : 5 req/min (anti-brute-force) */
export const AUTH_LIMIT: RateLimitConfig = { maxRequests: 5, windowMs: 60_000 };

/** Mutations API : 30 req/min */
export const MUTATION_LIMIT: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 };

/** Lectures API : 60 req/min */
export const READ_LIMIT: RateLimitConfig = { maxRequests: 60, windowMs: 60_000 };

/** API bot externe (cle API) : 30 req/min, par cle (pas par IP) */
export const BOT_API_LIMIT: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 };

/** Garde-fou IP pre-auth du proxy pour /api/v1/* : volontairement plus haut
 * que BOT_API_LIMIT (l'autorite par cle, appliquee dans la route) pour que
 * plusieurs bots derriere une meme IP d'egress ne se partagent pas 30/min. */
export const BOT_API_IP_LIMIT: RateLimitConfig = { maxRequests: 120, windowMs: 60_000 };
