-- ============================================================================
-- Durcissement api_keys (findings review PR #24, cf. fix/bot-api-review-findings) :
-- 1. SET search_path = '' sur les fonctions SECURITY DEFINER — sans lui,
--    elles s'executent avec le search_path de l'appelant (anon/authenticated) :
--    un objet shadow dans un schema prioritaire pourrait detourner la
--    resolution de cle (lint Supabase function_search_path_mutable).
-- 2. Moindre privilege sur la table : anon n'a AUCUN besoin d'acces direct
--    (le chemin bot passe exclusivement par les fonctions SECURITY DEFINER) ;
--    le GRANT ALL initial transformait toute regression RLS future en
--    exposition des key_hash de toutes les organisations. authenticated
--    (UI admin, RLS admin-only) n'a besoin que de SELECT/INSERT/UPDATE.
-- NB : get_user_org_id()/get_user_role() (baseline) ont le meme defaut de
-- search_path — durcissement global a traiter separement, hors scope ici.
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."resolve_api_key"("p_key_hash" "text") RETURNS TABLE("organization_id" "uuid", "robot_user_id" "uuid", "id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" = ''
    AS $$
  select organization_id, robot_user_id, id
  from public.api_keys
  where key_hash = p_key_hash and revoked_at is null;
$$;

CREATE OR REPLACE FUNCTION "public"."touch_api_key_usage"("p_key_hash" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" = ''
    AS $$
  update public.api_keys
  set last_used_at = now()
  where key_hash = p_key_hash and revoked_at is null;
$$;

REVOKE ALL ON TABLE "public"."api_keys" FROM "anon";
REVOKE ALL ON TABLE "public"."api_keys" FROM "authenticated";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."api_keys" TO "authenticated";
