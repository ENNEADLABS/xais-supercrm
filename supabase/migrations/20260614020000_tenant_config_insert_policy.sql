-- Policy INSERT manquante sur tenant_config.
-- updateTenantConfig() fait un upsert (INSERT ... ON CONFLICT DO UPDATE) ; sous
-- RLS, le WITH CHECK de l'INSERT est évalué même quand la ligne existe déjà
-- (cas de l'onboarding : tenant_config créé par handle_new_user). Sans policy
-- INSERT, l'upsert échouait → « Erreur lors de la finalisation ».
-- Cohérent avec tenant_config_update : réservé aux admins de l'org.
create policy "tenant_config_insert" on tenant_config
  for insert with check (
    organization_id in (
      select organization_id
      from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );
