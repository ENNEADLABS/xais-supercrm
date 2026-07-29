import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  checkRateLimit,
  AUTH_LIMIT,
  BOT_API_IP_LIMIT,
  MUTATION_LIMIT,
  READ_LIMIT,
} from "@/lib/utils/rate-limit";

// Extraire l'IP du client pour le rate limiting
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Determiner la config de rate limit selon la route et la methode
function getRateLimitConfig(pathname: string, method: string) {
  // Auth endpoints : limite stricte anti-brute-force, UNIQUEMENT sur les
  // mutations (POST…). Les GET de page et les prefetch RSC de /login, /signup
  // ne doivent PAS être limités (sinon 429 quasi immédiat sur navigation, vu
  // l'agressivité du prefetch Next — 5 req/min sont triviales à dépasser).
  if (
    method !== "GET" &&
    (pathname.startsWith("/api/auth") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup"))
  ) {
    return { config: AUTH_LIMIT, prefix: "auth" };
  }

  // API bot externe : bucket IP dedie, plus permissif — la vraie limite est
  // par cle (BOT_API_LIMIT dans authenticateBotRequest). Sans ce bucket, le
  // MUTATION_LIMIT partage avec tout /api/* etranglerait la limite par cle
  // des que plusieurs bots sortent par la meme IP.
  if (pathname.startsWith("/api/v1/")) {
    return { config: BOT_API_IP_LIMIT, prefix: "bot-ip" };
  }

  // API mutations (POST, PUT, PATCH, DELETE)
  if (pathname.startsWith("/api/") && method !== "GET") {
    return { config: MUTATION_LIMIT, prefix: "mut" };
  }

  // API lectures (GET)
  if (pathname.startsWith("/api/")) {
    return { config: READ_LIMIT, prefix: "read" };
  }

  // Pages normales : pas de rate limit
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // API bot externe (cf. specs/done/024-bot-api-contacts-notes.md) : auth par
  // cle API geree dans la route elle-meme (authenticateBotRequest), jamais
  // par session cookie — ne jamais rediriger vers /login pour ces requetes
  // (elles n'ont et n'auront jamais de cookie de session).
  const isBotApiRoute = pathname.startsWith("/api/v1/");

  // Rate limiting sur les API routes et auth
  const rateLimitInfo = getRateLimitConfig(pathname, method);
  if (rateLimitInfo) {
    const ip = getClientIp(request);
    const key = `${rateLimitInfo.prefix}:${ip}`;
    const result = await checkRateLimit(key, rateLimitInfo.config);

    if (!result.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Trop de requêtes — réessayez plus tard" } },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
          },
        },
      );
    }

    if (isBotApiRoute) {
      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Reset", String(result.resetAt));
      return response;
    }

    // Continuer avec les headers informatifs
    const response = await updateSession(request);
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.resetAt));
    return response;
  }

  if (isBotApiRoute) return NextResponse.next();

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Matcher toutes les routes sauf les fichiers statiques et API internes Next.js
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
