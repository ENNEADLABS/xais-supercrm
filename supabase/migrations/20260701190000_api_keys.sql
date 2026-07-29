-- ============================================================================
-- API keys (bots externes) : contacts + notes/activites uniquement.
-- Cf. specs/done/024-bot-api-contacts-notes.md.
-- Chaque cle est rattachee a un compte "robot" (auth.users + organization_members
-- role=member) cree une seule fois a la generation de la cle. La cle brute
-- n'est jamais stockee (seul key_hash, sha256, l'est) ; robot_user_id sert a
-- reconstruire une session RLS-scopee via JWT signe a la volee (pas de secret
-- robot a stocker). RLS reservee aux admins de l'organisation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "robot_user_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "key_prefix" "text" NOT NULL,
    "key_hash" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone,
    "revoked_at" timestamp with time zone
);

ALTER TABLE "public"."api_keys" OWNER TO "postgres";

ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash");

ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_robot_user_id_fkey" FOREIGN KEY ("robot_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

CREATE INDEX "idx_api_keys_org_active" ON "public"."api_keys" USING "btree" ("organization_id") WHERE ("revoked_at" IS NULL);

ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;

-- Lecture/ecriture reservees aux admins de l'organisation (meme pattern que tenant_config_update).
CREATE POLICY "api_keys_select" ON "public"."api_keys" FOR SELECT USING (
    ("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text")
);

CREATE POLICY "api_keys_insert" ON "public"."api_keys" FOR INSERT WITH CHECK (
    ("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text")
);

CREATE POLICY "api_keys_update" ON "public"."api_keys" FOR UPDATE USING (
    ("organization_id" = "public"."get_user_org_id"()) AND ("public"."get_user_role"() = 'admin'::"text")
);

-- Grant blanket (le grant de la baseline ne couvre pas les migrations incrementales, ADR-0009).
GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";

-- Resolution d'une cle API brute (hashee) en organisation/robot, AVANT toute
-- session authentifiee (l'appelant est un bot anonyme muni d'une cle, pas un
-- utilisateur connecte) : la RLS admin-only ci-dessus bloquerait structurellement
-- cette lecture. SECURITY DEFINER (meme pattern que get_user_org_id/get_user_role)
-- expose UNIQUEMENT ces 3 colonnes par hash exact, jamais un acces table generique.
CREATE OR REPLACE FUNCTION "public"."resolve_api_key"("p_key_hash" "text") RETURNS TABLE("organization_id" "uuid", "robot_user_id" "uuid", "id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select organization_id, robot_user_id, id
  from api_keys
  where key_hash = p_key_hash and revoked_at is null;
$$;

ALTER FUNCTION "public"."resolve_api_key"("text") OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."resolve_api_key"("text") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."resolve_api_key"("text") TO "authenticated";

-- Meme raison d'etre que resolve_api_key : un bot authentifie par cle (donc
-- sans session admin) doit pouvoir faire avancer last_used_at sur SA PROPRE
-- ligne, ce que la RLS update (admin-only) interdirait sinon.
CREATE OR REPLACE FUNCTION "public"."touch_api_key_usage"("p_key_hash" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  update api_keys
  set last_used_at = now()
  where key_hash = p_key_hash and revoked_at is null;
$$;

ALTER FUNCTION "public"."touch_api_key_usage"("text") OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."touch_api_key_usage"("text") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."touch_api_key_usage"("text") TO "authenticated";
