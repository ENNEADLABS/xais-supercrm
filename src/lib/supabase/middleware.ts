import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // @supabase/ssr >= 0.10 fournit les en-tetes anti-cache a appliquer
          // avec les cookies rafraichis afin d'eviter une fuite de session via CDN.
          // Source: https://supabase.com/docs/guides/auth/server-side/advanced-guide#cdn-and-reverse-proxy-caching
          Object.entries(headers).forEach(([name, value]) =>
            supabaseResponse.headers.set(name, value),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Routes publiques qui ne necessitent pas d'auth.
  // NB : /reset-password n'est PAS public — on y arrive authentifie via /callback
  // (session de recovery), et le laisser public le redirigerait vers /dashboard.
  const publicPaths = ["/login", "/signup", "/forgot-password", "/callback"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Verrou usage personnel : seuls les emails listes dans ALLOWED_EMAILS peuvent
  // utiliser l'app. Si la variable est absente/vide, aucun filtre (comportement par
  // defaut). Un user connecte mais non autorise est traite comme banni : acces refuse
  // a toute l'app, on le laisse uniquement voir /login. On evite signOut() ici (peu
  // fiable en middleware combine a un redirect) — le cookie reste, mais RLS garantit
  // qu'il ne voit que sa propre org (vide), jamais tes donnees.
  const allowlist = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isAllowed =
    allowlist.length === 0 || (!!user?.email && allowlist.includes(user.email.toLowerCase()));

  if (user && !isAllowed) {
    if (pathname !== "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("denied", "1");
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (!user && !isPublicPath && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect les users connectes depuis login/signup vers dashboard
  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Gate onboarding : force les users dont l'onboarding n'est pas terminé vers
  // /onboarding. Décidé ici à partir du pathname NATIF de la requête (pas via un
  // header x-pathname propagé, peu fiable sous Next 16). Comme on ne redirige
  // jamais /onboarding vers lui-même, aucune boucle n'est possible.
  if (
    user &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api") &&
    !isPublicPath &&
    pathname !== "/"
  ) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);

    if (membership && membership.length > 0) {
      const { data: tenant } = await supabase
        .from("tenant_config")
        .select("config")
        .eq("organization_id", membership[0].organization_id)
        .limit(1);
      // config est du JSONB externe : cast nécessaire pour lire le flag.
      const config = tenant?.[0]?.config as Record<string, unknown> | undefined;
      if (config?.onboarding_completed !== true) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
