-- ============================================================================
-- Fix : la table activities n'avait qu'une policy RLS SELECT, aucune policy
-- INSERT. Sans policy INSERT correspondante, AUCUN insert n'est possible
-- (RLS active + zero policy = deny par defaut), y compris pour une session
-- humaine normale — bug preexistant, decouvert en testant l'API bot,
-- mais qui bloque activityService.log()
-- pour tout le monde. Meme pattern que contacts_insert/notes_insert.
-- ============================================================================

CREATE POLICY "activities_insert" ON "public"."activities" FOR INSERT WITH CHECK (
    ("organization_id" = "public"."get_user_org_id"())
    AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'member'::"text"]))
);
