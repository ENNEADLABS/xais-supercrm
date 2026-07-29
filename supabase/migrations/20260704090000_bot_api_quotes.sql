-- ============================================================================
-- API bot quotes (cf. specs/todo/025-bot-api-quotes.md) :
-- 1. D1 — un devis/une facture peut viser un contact sans societe :
--    company_id devient nullable sur quotes ET invoices (le RPC
--    convert_quote_to_invoice copie company_id du devis signe vers la
--    facture — sans l'ALTER invoices, tout devis sans societe signe serait
--    inconvertible). Garde-fou : un document garde toujours au moins un
--    destinataire (company OU contact).
-- 2. Creation transactionnelle devis + lignes + validation optionnelle :
--    create_quote_with_lines, SECURITY INVOKER — la RLS de la session robot
--    s'applique integralement (policies quotes_insert / quote_lines_insert /
--    quote_sequences_* : role member suffisant). Echec n'importe ou =
--    rollback complet, zero devis orphelin.
-- ============================================================================

ALTER TABLE "public"."quotes" ALTER COLUMN "company_id" DROP NOT NULL;
ALTER TABLE "public"."invoices" ALTER COLUMN "company_id" DROP NOT NULL;

ALTER TABLE "public"."quotes" ADD CONSTRAINT "chk_quote_recipient"
  CHECK (("company_id" IS NOT NULL) OR ("contact_id" IS NOT NULL));
ALTER TABLE "public"."invoices" ADD CONSTRAINT "chk_invoice_recipient"
  CHECK (("company_id" IS NOT NULL) OR ("contact_id" IS NOT NULL));

-- p_lines : tableau jsonb de lignes { description, quantity, unit,
-- unit_price, vat_rate, discount_percent } — position = index du tableau.
-- Les triggers existants (trg_quote_lines_calc, trg_quote_totals_recalc)
-- derivent line_total_* et total_* dans la meme transaction : le RPC
-- n'accepte jamais de totaux pre-calcules.
CREATE OR REPLACE FUNCTION "public"."create_quote_with_lines"(
  "p_org_id" "uuid",
  "p_user_id" "uuid",
  "p_contact_id" "uuid",
  "p_subject" "text",
  "p_validity_days" integer,
  "p_lines" "jsonb",
  "p_validate" boolean,
  "p_company_id" "uuid" DEFAULT NULL,
  "p_notes" "text" DEFAULT NULL
) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" = 'public'
    AS $$
-- search_path epingle a 'public' (pas '') : le search_path d'une fonction se
-- propage aux policies RLS evaluees pendant ses INSERT/UPDATE, et
-- get_user_org_id()/get_user_role() (baseline) referencent
-- organization_members sans qualification — avec '' elles ne resolvent plus.
-- L'epinglage suffit contre le shadowing (INVOKER, pas d'elevation de
-- privilege) ; le durcissement des fonctions baseline reste hors scope
-- (cf. 20260702100000_api_keys_hardening.sql).
declare
  v_quote_id uuid;
  v_total_ht integer;
  v_ref text;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'Le devis doit contenir au moins une ligne';
  end if;

  -- RLS quotes_insert : organization_id doit etre l'org de la session
  -- appelante — un p_org_id etranger echoue ici (rollback).
  insert into public.quotes (
    organization_id, contact_id, company_id, subject, notes,
    validity_days, status, created_by
  ) values (
    p_org_id, p_contact_id, p_company_id, p_subject, p_notes,
    coalesce(p_validity_days, 30), 'draft', p_user_id
  )
  returning id into v_quote_id;

  insert into public.quote_lines (
    quote_id, description, quantity, unit, unit_price,
    vat_rate, discount_percent, position
  )
  select
    v_quote_id,
    line->>'description',
    (line->>'quantity')::numeric,
    coalesce(line->>'unit', 'unite'),
    (line->>'unit_price')::integer,
    (line->>'vat_rate')::integer,
    coalesce((line->>'discount_percent')::integer, 0),
    (idx - 1)::integer
  from jsonb_array_elements(p_lines) with ordinality as t(line, idx);

  if p_validate then
    -- Invariant domaine existant (cf. validateQuote) : total HT > 0.
    select total_ht into v_total_ht from public.quotes where id = v_quote_id;
    if coalesce(v_total_ht, 0) <= 0 then
      raise exception 'Le total HT doit etre superieur a 0';
    end if;

    v_ref := public.generate_quote_reference(p_org_id);

    update public.quotes
    set status = 'validated', reference = v_ref, issued_at = now()
    where id = v_quote_id;
  end if;

  return v_quote_id;
end;
$$;

-- Le chemin bot passe par le role authenticated (JWT robot) ; anon n'a
-- aucun besoin d'appeler ce RPC.
REVOKE ALL ON FUNCTION "public"."create_quote_with_lines"("uuid", "uuid", "uuid", "text", integer, "jsonb", boolean, "uuid", "text") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."create_quote_with_lines"("uuid", "uuid", "uuid", "text", integer, "jsonb", boolean, "uuid", "text") FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."create_quote_with_lines"("uuid", "uuid", "uuid", "text", integer, "jsonb", boolean, "uuid", "text") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."create_quote_with_lines"("uuid", "uuid", "uuid", "text", integer, "jsonb", boolean, "uuid", "text") TO "service_role";
