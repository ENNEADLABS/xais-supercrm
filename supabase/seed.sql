-- ============================================================================
-- ENNEAD Studio Creator — Donnees de demo
-- Applique apres les migrations par `supabase db reset`
-- Utilise service_role (bypass RLS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Organisation demo
-- ----------------------------------------------------------------------------
insert into organizations (id, name, slug) values
  ('a0000000-0000-0000-0000-000000000001', 'Demo SARL', 'demo-sarl');

-- ----------------------------------------------------------------------------
-- Organization Member demo
-- Rattache le premier user auth existant comme admin de l'org demo
-- En dev local, creer d'abord un user via le dashboard Supabase
-- ----------------------------------------------------------------------------
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'Aucun user auth trouve — seed member ignore. Creez un user via le dashboard Supabase.';
    return;
  end if;

  insert into organization_members (organization_id, user_id, role)
  values ('a0000000-0000-0000-0000-000000000001', v_user_id, 'admin')
  on conflict do nothing;
end $$;

-- ----------------------------------------------------------------------------
-- Tenant Config
-- Pipeline stages, tags par defaut, currency, prefixes
-- ----------------------------------------------------------------------------
insert into tenant_config (organization_id, config) values
  ('a0000000-0000-0000-0000-000000000001', '{
    "currency": "EUR",
    "locale": "fr-FR",
    "quote_prefix": "DEV",
    "invoice_prefix": "FAC",
    "pipeline_stages": [
      {"id": "new", "label": "Nouveau", "color": "#6B7280", "order": 0},
      {"id": "qualifying", "label": "Qualification", "color": "#3B82F6", "order": 1},
      {"id": "proposal", "label": "Proposition", "color": "#8B5CF6", "order": 2},
      {"id": "negotiation", "label": "Negociation", "color": "#F59E0B", "order": 3},
      {"id": "won", "label": "Gagne", "color": "#10B981", "order": 4},
      {"id": "lost", "label": "Perdu", "color": "#EF4444", "order": 5}
    ],
    "probability_map": {
      "new": 10,
      "qualifying": 25,
      "proposal": 50,
      "negotiation": 75,
      "won": 100,
      "lost": 0
    },
    "default_vat_rate": 2000,
    "payment_terms_days": 30,
    "task_types": ["appel", "email", "reunion", "relance", "administratif"]
  }'::jsonb);

-- ----------------------------------------------------------------------------
-- Companies
-- ----------------------------------------------------------------------------
insert into companies (id, organization_id, name, domain, industry, size, city, postal_code, siren, siret, vat_number, legal_form, capital, naf_code) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Entreprise Demo Alpha', 'alpha.example', 'Industrie', '50-100', 'Lyon', '69001', '000000001', '00000000100001', 'FR00000000001', 'SAS', 5000000, '2562B'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Entreprise Demo Beta', 'beta.example', 'Tech', '10-50', 'Paris', '75003', '000000002', '00000000200002', 'FR00000000002', 'SAS', 1000000, '6201Z'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Entreprise Demo Gamma', 'gamma.example', 'BTP', '10-50', 'Marseille', '13001', '000000003', '00000000300003', 'FR00000000003', 'SARL', 800000, '4120A'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Entreprise Demo Delta', 'delta.example', 'Services', '1-10', 'Bordeaux', '33000', null, null, null, 'EI', null, '6920Z'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Entreprise Demo Epsilon', 'epsilon.example', 'Restauration', '100-500', 'Nice', '06000', '000000005', '00000000500005', 'FR00000000005', 'SA', 15000000, '5610A');

-- ----------------------------------------------------------------------------
-- Contacts
-- ----------------------------------------------------------------------------
insert into contacts (id, organization_id, first_name, last_name, email, phone, job_title) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 01', 'contact01@alpha.example', '+33 0 00 00 00 01', 'Directrice Generale'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 02', 'contact02@beta.example', '+33 0 00 00 00 02', 'CTO'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 03', 'contact03@alpha.example', '+33 0 00 00 00 03', 'Responsable Achats'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 04', 'contact04@gamma.example', '+33 0 00 00 00 04', 'Gerant'),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 05', 'contact05@delta.example', '+33 0 00 00 00 05', 'Associee'),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 06', 'contact06@epsilon.example', '+33 0 00 00 00 06', 'Directeur Operations'),
  ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 07', 'contact07@beta.example', '+33 0 00 00 00 07', 'Product Manager'),
  ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 08', 'contact08@alpha.example', '+33 0 00 00 00 08', 'DSI'),
  ('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 09', 'contact09@gamma.example', '+33 0 00 00 00 09', 'Responsable Projets'),
  ('d0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Contact', 'Demo 10', 'contact10@epsilon.example', null, 'Chef Cuisinier');

-- ----------------------------------------------------------------------------
-- Contact <-> Company
-- ----------------------------------------------------------------------------
insert into contact_companies (contact_id, company_id, role, is_primary) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Directrice Generale', true),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'CTO', true),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Responsable Achats', false),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'Gerant', true),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', 'Associee', true),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005', 'Directeur Operations', true),
  ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'Product Manager', false),
  ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000001', 'DSI', false),
  ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000003', 'Responsable Projets', false),
  ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000005', 'Chef Cuisinier', false);

-- ----------------------------------------------------------------------------
-- Tags
-- ----------------------------------------------------------------------------
insert into tags (id, organization_id, name, color, entity_type) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'VIP', '#EF4444', 'contact'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Prospect chaud', '#F59E0B', 'contact'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Partenaire', '#10B981', 'contact'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Grand compte', '#3B82F6', 'company'),
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'PME', '#8B5CF6', 'company'),
  ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Secteur public', '#6B7280', 'company');

-- ----------------------------------------------------------------------------
-- Contact Tags
-- ----------------------------------------------------------------------------
insert into contact_tags (contact_id, tag_id) values
  ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001'), -- Contact 01 = VIP
  ('d0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002'), -- Contact 02 = Prospect chaud
  ('d0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000003'); -- Contact 05 = Partenaire

-- ----------------------------------------------------------------------------
-- Company Tags
-- ----------------------------------------------------------------------------
insert into company_tags (company_id, tag_id) values
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004'), -- Demo Alpha = Grand compte
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005'), -- Demo Beta = PME
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000005'), -- Entreprise Demo Gamma = PME
  ('c0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004'); -- Demo Epsilon = Grand compte

-- ----------------------------------------------------------------------------
-- Notes
-- Les author_id sont des placeholders — a remplacer par les vrais user IDs
-- En dev local, utiliser le user admin cree via le dashboard
-- ----------------------------------------------------------------------------
-- Notes seront inserees une fois les users crees via Supabase Auth

-- ----------------------------------------------------------------------------
-- Deals
-- Montants en centimes. Probabilites selon le stage (probability_map).
-- ----------------------------------------------------------------------------
insert into deals (id, organization_id, name, company_id, stage, deal_status, amount, probability, expected_close_date, position) values
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Migration ERP Demo Alpha', 'c0000000-0000-0000-0000-000000000001', 'negotiation', 'open', 4500000, 75, '2026-05-15', 0),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Refonte site web Demo Beta', 'c0000000-0000-0000-0000-000000000002', 'proposal', 'open', 1800000, 50, '2026-06-01', 0),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Logiciel gestion chantiers', 'c0000000-0000-0000-0000-000000000003', 'qualifying', 'open', 2200000, 25, '2026-07-01', 0),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Audit comptable annuel', 'c0000000-0000-0000-0000-000000000004', 'new', 'open', 850000, 10, '2026-08-01', 0),
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Systeme reservation en ligne', 'c0000000-0000-0000-0000-000000000005', 'proposal', 'open', 3200000, 50, '2026-05-30', 1),
  ('f0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Formation cybersecurite', 'c0000000-0000-0000-0000-000000000001', 'new', 'open', 600000, 10, '2026-09-01', 1),
  ('f0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'App mobile gestion stocks', 'c0000000-0000-0000-0000-000000000005', 'negotiation', 'open', 2800000, 75, '2026-04-30', 1);

-- ----------------------------------------------------------------------------
-- Deal <-> Contact
-- ----------------------------------------------------------------------------
insert into deal_contacts (deal_id, contact_id, role) values
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Sponsor'),
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000008', 'Referent technique'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'Decideur'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000007', 'Utilisateur cle'),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 'Decideur'),
  ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 'Contact principal'),
  ('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000006', 'Sponsor'),
  ('f0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000010', 'Utilisateur cle');

-- ----------------------------------------------------------------------------
-- Products (catalogue)
-- Prix en centimes, TVA en basis points (2000 = 20%)
-- ----------------------------------------------------------------------------
insert into products (id, organization_id, name, description, reference, unit_price, unit, vat_rate) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Developpement web', 'Developpement sur mesure (journee)', 'DEV-WEB', 65000, 'jour', 2000),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Formation', 'Formation technique (journee)', 'FORM-01', 120000, 'jour', 2000),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Licence logiciel', 'Licence annuelle par utilisateur', 'LIC-SOFT', 2400, 'utilisateur', 2000),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Maintenance', 'Contrat de maintenance mensuel', 'MAINT-01', 45000, 'mois', 2000);

-- ----------------------------------------------------------------------------
-- Quotes (devis) — 3 devis a differents statuts
-- Les totaux sont recalcules automatiquement par le trigger sur quote_lines
-- ----------------------------------------------------------------------------
insert into quotes (id, organization_id, reference, deal_id, company_id, contact_id, status, subject, validity_days) values
  ('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'DEV-2026-0001', 'f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'validated', 'Migration ERP — Phase 1', 30),
  ('aa000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', null, 'f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'draft', 'Refonte site web Demo Beta', 30),
  ('aa000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'DEV-2026-0002', 'f0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000006', 'sent', 'Systeme de reservation en ligne', 30);

-- ----------------------------------------------------------------------------
-- Quote Lines (lignes de devis)
-- Les totaux ligne sont calcules automatiquement par le trigger
-- ----------------------------------------------------------------------------
-- Devis 1 : Migration ERP (2 lignes)
insert into quote_lines (quote_id, product_id, description, quantity, unit, unit_price, vat_rate, discount_percent, position) values
  ('aa000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Developpement sur mesure — module comptabilite', 15, 'jour', 65000, 2000, 0, 0),
  ('aa000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Formation equipe comptable', 2, 'jour', 120000, 2000, 0, 1);

-- Devis 2 : Refonte site web (2 lignes)
insert into quote_lines (quote_id, product_id, description, quantity, unit, unit_price, vat_rate, discount_percent, position) values
  ('aa000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Developpement frontend React', 10, 'jour', 65000, 2000, 500, 0),
  ('aa000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Developpement backend API', 8, 'jour', 65000, 2000, 0, 1);

-- Devis 3 : Systeme reservation (3 lignes)
insert into quote_lines (quote_id, product_id, description, quantity, unit, unit_price, vat_rate, discount_percent, position) values
  ('aa000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Developpement plateforme reservation', 20, 'jour', 65000, 2000, 1000, 0),
  ('aa000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Licences logiciel (50 utilisateurs)', 50, 'utilisateur', 2400, 2000, 0, 1),
  ('aa000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'Maintenance 6 mois', 6, 'mois', 45000, 2000, 0, 2);

-- ----------------------------------------------------------------------------
-- Invoices (factures) — 3 factures a differents statuts
-- Les totaux sont recalcules automatiquement par le trigger sur invoice_lines
-- ----------------------------------------------------------------------------
insert into invoices (id, organization_id, reference, company_id, contact_id, deal_id, source_quote_id, status, subject, due_date, issued_at, sent_at, paid_amount) values
  ('bb000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', null, 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', null, 'draft', 'Refonte site web Demo Beta — Acompte', '2026-05-15', null, null, 0),
  ('bb000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'FAC-2026-0001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'validated', 'Migration ERP — Phase 1', '2026-04-30', '2026-03-20 10:00:00+01', null, 0),
  ('bb000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'FAC-2026-0002', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000006', null, null, 'sent', 'Systeme reservation — Lot 1', '2026-04-15', '2026-03-10 09:00:00+01', '2026-03-12 14:00:00+01', 50000);

-- ----------------------------------------------------------------------------
-- Invoice Lines
-- Les totaux ligne sont calcules automatiquement par le trigger
-- ----------------------------------------------------------------------------
-- Facture 1 : Brouillon (2 lignes)
insert into invoice_lines (invoice_id, product_id, description, quantity, unit, unit_price, vat_rate, discount_percent, position) values
  ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Developpement frontend React', 5, 'jour', 65000, 2000, 0, 0),
  ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Developpement backend API', 3, 'jour', 65000, 2000, 0, 1);

-- Facture 2 : Validee, liee au devis 1 (3 lignes)
insert into invoice_lines (invoice_id, product_id, description, quantity, unit, unit_price, vat_rate, discount_percent, position) values
  ('bb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Developpement sur mesure — module comptabilite', 15, 'jour', 65000, 2000, 0, 0),
  ('bb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Formation equipe comptable', 2, 'jour', 120000, 2000, 0, 1),
  ('bb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'Maintenance 3 mois', 3, 'mois', 45000, 2000, 0, 2);

-- Facture 3 : Envoyee avec paiement partiel (2 lignes)
insert into invoice_lines (invoice_id, product_id, description, quantity, unit, unit_price, vat_rate, discount_percent, position) values
  ('bb000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Developpement plateforme reservation — Lot 1', 10, 'jour', 65000, 2000, 500, 0),
  ('bb000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Licences logiciel (25 utilisateurs)', 25, 'utilisateur', 2400, 2000, 0, 1);

-- Sequence factures (2 references deja utilisees)
insert into invoice_sequences (organization_id, year, last_number) values
  ('a0000000-0000-0000-0000-000000000001', 2026, 2);

-- ----------------------------------------------------------------------------
-- Connected Accounts (email)
-- Status 'disconnected' car pas de vrais tokens en demo
-- Le user_id utilise une sous-requete car les users sont crees via Supabase Auth
-- ----------------------------------------------------------------------------
-- Note : le seed email necessite un user auth. En dev local, si aucun user n'existe,
-- ces inserts seront ignores. Creer un user via le dashboard Supabase d'abord.
do $$
declare
  v_user_id uuid;
  v_org_id uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  -- Recuperer le premier user existant (cree via dashboard)
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'Aucun user auth trouve — seed email ignore';
    return;
  end if;

  -- Compte email connecte demo
  insert into connected_accounts (id, organization_id, user_id, provider, email_address, display_name, credentials_encrypted, status)
  values (
    'a1b2c3d4-0007-4000-8000-000000000001',
    v_org_id,
    v_user_id,
    'gmail',
    'demo@example.com',
    'Demo User',
    'ENCRYPTED_PLACEHOLDER',
    'disconnected'
  );

  -- Channel associe (inactif en demo)
  insert into email_channels (id, connected_account_id, organization_id, sync_mode, is_active)
  values (
    'a1b2c3d4-0007-4000-8000-000000000002',
    'a1b2c3d4-0007-4000-8000-000000000001',
    v_org_id,
    'inbound_only',
    false
  );

  -- Emails demo
  insert into emails (id, organization_id, channel_id, message_id, subject, body_text, snippet, direction, received_at, is_read, folder) values
    ('a1b2c3d4-0007-4000-8000-000000000010', v_org_id, 'a1b2c3d4-0007-4000-8000-000000000002', '<demo-001@example.com>', 'Demande de devis pour prestation web', 'Bonjour, je souhaiterais obtenir un devis pour...', 'Bonjour, je souhaiterais obtenir un devis pour la creation de notre site...', 'inbound', now() - interval '3 days', true, 'inbox'),
    ('a1b2c3d4-0007-4000-8000-000000000011', v_org_id, 'a1b2c3d4-0007-4000-8000-000000000002', '<demo-002@example.com>', 'RE: Demande de devis pour prestation web', 'Merci pour votre retour rapide...', 'Merci pour votre retour rapide. Le budget envisage est de...', 'inbound', now() - interval '2 days', false, 'inbox'),
    ('a1b2c3d4-0007-4000-8000-000000000012', v_org_id, 'a1b2c3d4-0007-4000-8000-000000000002', '<demo-003@example.com>', 'Facture en attente #FAC-2026-0003', 'Veuillez trouver ci-joint la facture...', 'Veuillez trouver ci-joint la facture pour la prestation de mars...', 'outbound', now() - interval '1 day', true, 'sent');

  -- Participants demo
  insert into email_participants (email_id, role, email_address, display_name) values
    ('a1b2c3d4-0007-4000-8000-000000000010', 'from', 'client@alpha.example', 'Contact Demo 11'),
    ('a1b2c3d4-0007-4000-8000-000000000010', 'to', 'demo@example.com', 'Demo User'),
    ('a1b2c3d4-0007-4000-8000-000000000011', 'from', 'client@alpha.example', 'Contact Demo 11'),
    ('a1b2c3d4-0007-4000-8000-000000000011', 'to', 'demo@example.com', 'Demo User'),
    ('a1b2c3d4-0007-4000-8000-000000000012', 'from', 'demo@example.com', 'Demo User'),
    ('a1b2c3d4-0007-4000-8000-000000000012', 'to', 'client@alpha.example', 'Contact Demo 11');
end $$;

-- ----------------------------------------------------------------------------
-- Payments (paiements demo sur facture 3 — envoyee avec paiement partiel)
-- Le trigger recalcule automatiquement paid_amount + statut sur invoices
-- ----------------------------------------------------------------------------
insert into payments (id, organization_id, invoice_id, amount, payment_date, payment_method, reference, notes) values
  ('dd000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 30000, '2026-03-18', 'virement', 'VIR-2026-0042', 'Acompte initial'),
  ('dd000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 20000, '2026-03-25', 'cheque', 'CHQ-7891', 'Deuxieme versement');

-- ----------------------------------------------------------------------------
-- Tasks (taches demo rattachees a diverses entites)
-- ----------------------------------------------------------------------------
insert into tasks (id, organization_id, title, description, status, priority, task_type, due_date, completed_at, entity_type, entity_id) values
  ('cc000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Appeler Contact Demo 01', 'Discuter des besoins pour la phase 2 de la migration ERP', 'todo', 'high', 'call', now() + interval '2 days', null, 'contact', 'd0000000-0000-0000-0000-000000000001'),
  ('cc000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Envoyer devis refonte site web', 'Finaliser et envoyer le devis a Demo Beta', 'in_progress', 'urgent', 'email', now() + interval '1 day', null, 'deal', 'f0000000-0000-0000-0000-000000000002'),
  ('cc000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Reunion kickoff Entreprise Demo Gamma', 'Planifier la reunion de lancement du projet chantiers', 'todo', 'medium', 'meeting', now() + interval '5 days', null, 'company', 'c0000000-0000-0000-0000-000000000003'),
  ('cc000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Relancer facture FAC-2026-0002', 'Paiement partiel recu, relancer pour le solde', 'todo', 'high', 'follow_up', now() - interval '1 day', null, 'invoice', 'bb000000-0000-0000-0000-000000000003'),
  ('cc000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Preparer demo Entreprise Demo Epsilon', 'Preparer la demo du systeme de reservation', 'in_progress', 'medium', 'meeting', now() + interval '3 days', null, 'deal', 'f0000000-0000-0000-0000-000000000005'),
  ('cc000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Mettre a jour fiche Demo Alpha', 'Ajouter les nouvelles coordonnees du siege', 'done', 'low', null, now() - interval '3 days', now() - interval '2 days', 'company', 'c0000000-0000-0000-0000-000000000001'),
  ('cc000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Verifier contrat maintenance', 'Revoir les termes du contrat avant renouvellement', 'todo', 'low', null, now() + interval '10 days', null, null, null),
  ('cc000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Formation equipe commerciale CRM', 'Organiser une session de formation sur le CRM', 'cancelled', 'medium', 'meeting', now() - interval '5 days', null, null, null);

-- ----------------------------------------------------------------------------
-- Content Studio — Templates de demo (spec 022 V1.5)
-- 4 gabarits reutilisables pour l'org demo : YouTube Long, YouTube Short,
-- Skool Post, Newsletter. Les JSONB suivent la structure validee par Zod :
--   script_skeleton    : { hook?, intro?, structure?, key_points?, cta?, shooting_notes? }
--   checklist_items    : string[]
--   deliverable_specs  : { title, format, channel?, status?, offset_days? }[]
-- ----------------------------------------------------------------------------
insert into content_templates (id, organization_id, name, description, format, target_audience, default_priority, script_skeleton, checklist_items, deliverable_specs) values
  (
    'ee000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'YouTube Long',
    'Video longue (8-15 min) avec declinaisons short et post communaute.',
    'youtube_long',
    'Createurs et solopreneurs francophones',
    'high',
    '{
      "hook": "Accroche 0-15s : promesse claire + tension",
      "intro": "Qui je suis, ce que la video apporte, plan",
      "structure": "1. Probleme  2. Methode  3. Demonstration  4. Recap",
      "key_points": "3 points cles a retenir",
      "cta": "Abonnement + lien ressource en description",
      "shooting_notes": "Camera A face + B-roll ecran, lumiere cle a gauche"
    }'::jsonb,
    '["Valider l angle", "Ecrire le script", "Tourner les rushes", "Montage", "Miniature", "SEO titre + description", "Programmer la publication"]'::jsonb,
    '[
      {"title": "Short extrait moment fort", "format": "youtube_short", "channel": "youtube", "status": "planned", "offset_days": 1},
      {"title": "Post Skool recap", "format": "skool_post", "channel": "skool", "status": "planned", "offset_days": 0},
      {"title": "Newsletter de la semaine", "format": "newsletter", "channel": "newsletter", "status": "planned", "offset_days": 2}
    ]'::jsonb
  ),
  (
    'ee000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'YouTube Short',
    'Format vertical court (< 60s), une idee = une video.',
    'youtube_short',
    'Audience large mobile',
    'medium',
    '{
      "hook": "Accroche 0-3s percutante, pas de blabla",
      "structure": "Une seule idee, payoff a la fin",
      "cta": "Suivre pour la suite",
      "shooting_notes": "Vertical 9:16, sous-titres incrustes"
    }'::jsonb,
    '["Choisir l idee", "Tourner", "Sous-titres", "Publier"]'::jsonb,
    '[
      {"title": "Reupload TikTok", "format": "youtube_short", "channel": "tiktok", "status": "planned", "offset_days": 0},
      {"title": "Reupload Instagram Reels", "format": "youtube_short", "channel": "instagram", "status": "planned", "offset_days": 0}
    ]'::jsonb
  ),
  (
    'ee000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Skool Post',
    'Post de valeur pour la communaute Skool.',
    'skool_post',
    'Membres de la communaute',
    'medium',
    '{
      "hook": "Premiere ligne qui donne envie de lire",
      "structure": "Contexte -> insight -> action concrete",
      "cta": "Question ouverte pour engager les commentaires"
    }'::jsonb,
    '["Rediger le post", "Relire", "Publier", "Repondre aux commentaires"]'::jsonb,
    '[
      {"title": "Cross-post LinkedIn", "format": "linkedin_post", "channel": "linkedin", "status": "planned", "offset_days": 1}
    ]'::jsonb
  ),
  (
    'ee000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Newsletter',
    'Edition hebdomadaire envoyee a la liste.',
    'newsletter',
    'Abonnes email',
    'high',
    '{
      "hook": "Objet + premiere phrase qui ouvrent l email",
      "intro": "Edito court et personnel",
      "structure": "1 idee principale + 3 liens curates",
      "cta": "Repondre / partager"
    }'::jsonb,
    '["Choisir le sujet", "Rediger", "Selectionner les liens", "Relire", "Programmer l envoi"]'::jsonb,
    '[
      {"title": "Version blog de l edito", "format": "blog_article", "channel": "blog", "status": "planned", "offset_days": 3}
    ]'::jsonb
  );

-- ----------------------------------------------------------------------------
-- Activities
-- Seront generees automatiquement par le backend
-- ----------------------------------------------------------------------------
