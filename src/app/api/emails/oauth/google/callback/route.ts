import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GmailDriver } from "@/lib/services/email-sync/gmail-driver";
import { encrypt } from "@/lib/utils/encryption";
import type { DecryptedCredentials } from "@/lib/services/email-sync/types";

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Gestion des erreurs OAuth
  if (error) {
    const redirectUrl = new URL("/emails?error=oauth_denied", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.json(
      { error: { code: "MISSING_CODE", message: "Authorization code is required" } },
      { status: 400 },
    );
  }

  // Verification anti-CSRF du state
  const storedState = request.cookies.get("oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json(
      { error: { code: "CSRF_DETECTED", message: "Invalid OAuth state parameter" } },
      { status: 403 },
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: { code: "OAUTH_NOT_CONFIGURED", message: "Google OAuth is not configured" } },
      { status: 501 },
    );
  }

  try {
    // 1. Echanger le code contre des tokens OAuth
    const driver = new GmailDriver();
    const tokens = await driver.exchangeAuthCode(code, redirectUri);

    // 2. Recuperer l'email de l'utilisateur via Google userinfo
    const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userinfoRes.ok) throw new Error(`Userinfo fetch failed: ${userinfoRes.status}`);
    const userinfo = (await userinfoRes.json()) as { email: string; name?: string };

    // 3. Verifier l'authentification de l'utilisateur
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login?error=not_authenticated", request.url));
    }

    // Recuperer l'organization_id
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!membership || membership.length === 0) {
      return NextResponse.redirect(new URL("/emails?error=no_organization", request.url));
    }
    const organizationId = membership[0].organization_id;

    // 4. Chiffrer les credentials
    const credentials: DecryptedCredentials = {
      provider: "gmail",
      oauth: tokens,
    };
    const credentialsEncrypted = encrypt(JSON.stringify(credentials));

    // 5. Creer le connected_account (ou mettre a jour si deja existant)
    const { data: existing } = await supabase
      .from("connected_accounts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email_address", userinfo.email);

    if (existing && existing.length > 0) {
      // Mettre a jour les credentials du compte existant
      await supabase
        .from("connected_accounts")
        .update({
          credentials_encrypted: credentialsEncrypted,
          status: "connected" as const,
          sync_error: null,
        })
        .eq("id", existing[0].id);
    } else {
      // Creer un nouveau compte
      const { data: newAccount, error: insertErr } = await supabase
        .from("connected_accounts")
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          provider: "gmail" as const,
          email_address: userinfo.email,
          display_name: userinfo.name ?? null,
          credentials_encrypted: credentialsEncrypted,
          status: "connected" as const,
        })
        .select("id");

      if (insertErr) throw insertErr;

      // Creer un canal par defaut
      if (newAccount && newAccount.length > 0) {
        await supabase.from("email_channels").insert({
          connected_account_id: newAccount[0].id,
          organization_id: organizationId,
          sync_mode: "inbound_only",
          is_active: true,
        });
      }
    }

    // Redirection vers la page emails avec succes
    return NextResponse.redirect(new URL("/emails?connected=google", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const redirectUrl = new URL(
      `/emails?error=oauth_failed&message=${encodeURIComponent(message)}`,
      request.url,
    );
    return NextResponse.redirect(redirectUrl);
  }
}
