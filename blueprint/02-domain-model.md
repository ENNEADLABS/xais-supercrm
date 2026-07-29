# 02 - Modele de domaine

> Note d'architecture domaine pour ENNEAD Studio Creator
> Derniere mise a jour : 2026-03-25

---

## 1. Objets metier minimum (V1)

### 1.1 Contact

**Description** : Personne physique. Brique fondamentale du CRM.

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | PK |
| tenant_id | uuid | oui | FK tenants, cle RLS |
| first_name | text | oui | |
| last_name | text | oui | |
| job_title | text | non | Poste occupe |
| company_id | uuid | non | FK companies |
| avatar_url | text | non | Auto-populate via gravatar/favicon (pattern Atomic CRM) |
| source | enum | non | manual, import, email, web_form, api |
| status | enum | oui | active, inactive, archived |
| custom_fields | jsonb | non | Champs libres valides par Zod |
| created_by | uuid | oui | FK users |
| created_at | timestamptz | oui | |
| updated_at | timestamptz | oui | |
| deleted_at | timestamptz | non | Soft delete |
| search_vector | tsvector | oui | Full-text search auto-genere |

**Relations** :
- N:1 Company (company_id)
- 1:N ContactEmail (multi-email avec label : pro, perso, autre)
- 1:N ContactPhone (multi-phone avec label)
- N:M Tag (via contact_tags table de jointure)
- 1:N Note (via note_targets polymorphe)
- 1:N Task (via task_targets polymorphe)
- 1:N Activity (via activity log)
- N:M Opportunity (via opportunity_contacts table de jointure avec role)
- N:M Email (via email_participants)

**Cycle de vie** : active -> inactive -> archived. Pas de state machine formelle, juste un champ statut.

---

### 1.2 Company

**Description** : Societe/organisation. Conteneur principal des relations commerciales.

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | PK |
| tenant_id | uuid | oui | FK tenants |
| name | text | oui | Raison sociale |
| legal_name | text | non | Denomination legale officielle |
| siren | text | non | Identifiant SIREN (9 chiffres) |
| siret | text | non | Identifiant SIRET (14 chiffres) |
| vat_number | text | non | Numero TVA intracommunautaire |
| website | text | non | |
| logo_url | text | non | Auto-populate via favicon (pattern Atomic CRM) |
| industry | text | non | Secteur d'activite |
| size | enum | non | solo, 2-10, 11-50, 51-200, 200+ |
| address | jsonb | non | {street, city, zip, country, lat, lng} |
| annual_revenue | integer | non | En centimes |
| status | enum | oui | prospect, client, former_client, partner, supplier |
| parent_company_id | uuid | non | FK companies (hierarchie) |
| custom_fields | jsonb | non | |
| created_by | uuid | oui | |
| created_at | timestamptz | oui | |
| updated_at | timestamptz | oui | |
| deleted_at | timestamptz | non | |
| search_vector | tsvector | oui | |

**Relations** :
- 1:N Contact (company_id)
- 1:N Opportunity (company_id)
- 1:N Quote (company_id)
- 1:N Invoice (company_id)
- N:1 Company (parent_company_id -- hierarchie)
- 1:N Note, Task, Activity (via polymorphe)

**Cycle de vie** : prospect -> client -> former_client. Aussi : partner, supplier. Transition manuelle.

---

### 1.3 Opportunity (Deal)

**Description** : Opportunite commerciale dans le pipeline de vente. Inspire d'EspoCRM (stages + probability map) et Atomic CRM (kanban).

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | PK |
| tenant_id | uuid | oui | |
| name | text | oui | Nom de l'opportunite |
| company_id | uuid | oui | FK companies |
| stage | text | oui | Etape du pipeline (configurable par tenant) |
| amount | integer | non | Montant en centimes |
| currency | text | oui | Code ISO 4217, default EUR |
| probability | integer | non | 0-100, auto-calcule depuis probability_map du pipeline |
| weighted_amount | integer | non | amount * probability / 100, colonne generee |
| expected_close_date | date | non | Date de conclusion prevue |
| lost_reason | text | non | Raison de la perte (si stage = lost) |
| pipeline_id | text | oui | Identifiant du pipeline (multi-pipeline V2) |
| position | integer | oui | Ordre dans la colonne kanban |
| assigned_to | uuid | non | FK users |
| custom_fields | jsonb | non | |
| created_by | uuid | oui | |
| created_at | timestamptz | oui | |
| updated_at | timestamptz | oui | |
| closed_at | timestamptz | non | Date effective de conclusion |
| deleted_at | timestamptz | non | |

**Relations** :
- N:1 Company (company_id)
- N:M Contact (via opportunity_contacts avec role : decision_maker, influencer, user, champion)
- 1:N Quote (opportunity_id)
- 1:N Note, Task, Activity (via polymorphe)
- N:1 User (assigned_to)

**Cycle de vie** (inspire EspoCRM, configurable par tenant) :
```
qualification (10%) -> proposition (30%) -> negociation (50%) -> engagement (80%) -> won (100%) / lost (0%)
```
Chaque etape a une probabilite associee (probability_map stocke dans Configuration tenant). La transition won/lost est irreversible sauf reouverture explicite.

**Evenements** :
- `opportunity.stage_changed` -> log activite, recalcul forecast
- `opportunity.won` -> proposition auto de creer une facture si devis signe lie
- `opportunity.lost` -> log raison, notification assigned_to

---

### 1.4 Quote (Devis)

**Description** : Proposition commerciale chiffree. Workflow inspire de Dolibarr (statuts eprouves sur 20+ ans) mais simplifie.

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | PK |
| tenant_id | uuid | oui | |
| reference | text | oui | Auto-genere (format configurable : DEV-2026-0001) |
| company_id | uuid | oui | FK companies |
| contact_id | uuid | non | FK contacts (interlocuteur principal) |
| opportunity_id | uuid | non | FK opportunities |
| status | enum | oui | draft, validated, sent, signed, refused, canceled |
| title | text | oui | Objet du devis |
| introduction | text | non | Texte d'introduction |
| conclusion | text | non | Conditions, mentions legales |
| total_ht | integer | oui | En centimes, calcule depuis les lignes |
| total_tax | integer | oui | En centimes |
| total_ttc | integer | oui | En centimes |
| discount_percent | numeric(5,2) | non | Remise globale |
| currency | text | oui | Default EUR |
| validity_date | date | non | Date limite de validite |
| issued_at | timestamptz | non | Date d'emission (validation) |
| signed_at | timestamptz | non | Date de signature |
| payment_terms | text | non | Conditions de paiement |
| payment_method | text | non | Mode de reglement |
| notes_internal | text | non | Notes internes (non visibles client) |
| pdf_url | text | non | URL du PDF genere (Supabase Storage) |
| assigned_to | uuid | non | |
| created_by | uuid | oui | |
| created_at | timestamptz | oui | |
| updated_at | timestamptz | oui | |
| deleted_at | timestamptz | non | |

**Cycle de vie** (inspire Dolibarr Propal) :
```
draft -> validated -> sent -> signed -> invoiced
                          \-> refused
draft -> canceled (a tout moment depuis draft)
```

**Regles de transition** :
- `draft -> validated` : toutes les lignes doivent avoir un prix, le total > 0. Genere la reference definitive.
- `validated -> sent` : genere le PDF, enregistre la date d'envoi.
- `sent -> signed` : enregistre signed_at. Declenche `quote.signed`.
- `sent -> refused` : enregistre la raison du refus.
- `signed -> invoiced` : un lien EntityLink vers l'Invoice creee doit exister. Statut terminal.
- Retour a `draft` possible depuis `validated` uniquement (permet les corrections).

---

### 1.5 QuoteLine (Ligne de devis)

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| quote_id | uuid | oui | FK quotes, cascade delete |
| product_id | uuid | non | FK products (optionnel, ligne libre possible) |
| position | integer | oui | Ordre d'affichage |
| description | text | oui | Libelle de la ligne |
| quantity | numeric(10,3) | oui | Supporte les decimales (heures, kg) |
| unit | text | non | unite, heure, jour, forfait, kg |
| unit_price_ht | integer | oui | Prix unitaire HT en centimes |
| discount_percent | numeric(5,2) | non | Remise sur la ligne |
| tax_rate | numeric(5,2) | oui | Taux TVA (20.00, 10.00, 5.50, 0.00) |
| total_ht | integer | oui | Calcule : qty * unit_price * (1 - discount/100) |
| total_tax | integer | oui | Calcule : total_ht * tax_rate / 100 |
| total_ttc | integer | oui | Calcule : total_ht + total_tax |

---

### 1.6 Invoice (Facture)

**Description** : Document comptable. Workflow inspire de Dolibarr. Les montants sont TOUJOURS en centimes.

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| reference | text | oui | Auto-genere (FAC-2026-0001), IMMUTABLE apres validation |
| company_id | uuid | oui | |
| contact_id | uuid | non | |
| status | enum | oui | draft, validated, sent, partially_paid, paid, canceled |
| type | enum | oui | standard, credit_note, deposit |
| title | text | oui | |
| total_ht | integer | oui | |
| total_tax | integer | oui | |
| total_ttc | integer | oui | |
| amount_paid | integer | oui | Default 0, somme des paiements |
| amount_due | integer | oui | Calcule : total_ttc - amount_paid |
| currency | text | oui | |
| issued_at | timestamptz | non | Date de facturation |
| due_date | date | non | Date d'echeance |
| payment_terms | text | non | |
| payment_method | text | non | |
| notes_internal | text | non | |
| pdf_url | text | non | |
| assigned_to | uuid | non | |
| created_by | uuid | oui | |
| created_at | timestamptz | oui | |
| updated_at | timestamptz | oui | |
| deleted_at | timestamptz | non | |

**Cycle de vie** (inspire Dolibarr Facture) :
```
draft -> validated -> sent -> partially_paid -> paid
                                             \-> canceled (avoir obligatoire si deja payee partiellement)
```

**Regles critiques** :
- Une facture `validated` ne peut PLUS etre modifiee (obligation legale francaise). Seul un avoir (credit_note) peut corriger.
- La reference est IMMUTABLE apres validation.
- `amount_paid` est mis a jour automatiquement a chaque Payment enregistre.
- Transition `paid` automatique quand `amount_due <= 0`.

---

### 1.7 InvoiceLine

Meme structure que QuoteLine, avec `invoice_id` au lieu de `quote_id`.

---

### 1.8 Product

**Description** : Catalogue produits/services pour composer les lignes de devis/factures.

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| name | text | oui | |
| description | text | non | |
| type | enum | oui | product, service |
| reference | text | non | Code/SKU interne |
| unit_price_ht | integer | oui | Prix unitaire par defaut en centimes |
| unit | text | non | unite, heure, jour, forfait |
| tax_rate | numeric(5,2) | oui | Taux TVA par defaut |
| is_active | boolean | oui | Default true |
| custom_fields | jsonb | non | |
| created_at | timestamptz | oui | |
| updated_at | timestamptz | oui | |
| deleted_at | timestamptz | non | |

---

### 1.9 Payment

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| invoice_id | uuid | oui | FK invoices |
| amount | integer | oui | En centimes |
| payment_date | date | oui | |
| payment_method | text | oui | virement, cheque, carte, prelevement, especes |
| reference | text | non | Reference du paiement |
| notes | text | non | |
| created_by | uuid | oui | |
| created_at | timestamptz | oui | |

**Evenement** : `payment.created` -> recalcul amount_paid + amount_due sur Invoice, transition auto vers `paid` si solde = 0.

---

### 1.10 Email

**Description** : Email synchronise depuis une boite connectee. Architecture inspiree de Twenty (ConnectedAccount -> Channel -> Message).

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| channel_id | uuid | oui | FK email_channels |
| thread_id | text | non | Groupement par conversation |
| message_id | text | oui | Header Message-ID (deduplication) |
| subject | text | non | |
| body_text | text | non | Version texte brut |
| body_html | text | non | Version HTML |
| direction | enum | oui | inbound, outbound |
| received_at | timestamptz | oui | |
| is_read | boolean | oui | |
| folder | text | non | inbox, sent, archive, trash |
| headers | jsonb | non | Headers bruts pour tracing |
| created_at | timestamptz | oui | |

**Relations** :
- N:1 EmailChannel (channel_id)
- 1:N EmailParticipant (from, to, cc, bcc avec role)
- 1:N Attachment (via polymorphe)
- N:M Contact (via email_participants matching)

---

### 1.11 ConnectedAccount

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| user_id | uuid | oui | FK users, proprietaire du compte |
| provider | enum | oui | gmail, microsoft, imap_smtp |
| email_address | text | oui | Adresse du compte |
| credentials | jsonb | oui | Tokens OAuth ou IMAP/SMTP config (CHIFFRE) |
| status | enum | oui | active, error, disconnected |
| last_sync_at | timestamptz | non | |
| created_at | timestamptz | oui | |

---

### 1.12 EmailChannel

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| connected_account_id | uuid | oui | FK connected_accounts |
| sync_mode | enum | oui | full, inbound_only |
| sync_cursor | text | non | Token de pagination pour la sync incrementale |
| is_active | boolean | oui | |
| created_at | timestamptz | oui | |

---

### 1.13 EmailParticipant

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| email_id | uuid | oui | FK emails |
| role | enum | oui | from, to, cc, bcc |
| email_address | text | oui | |
| display_name | text | non | |
| contact_id | uuid | non | FK contacts, resolu par matching (pattern Twenty match-participant) |

---

### 1.14 Document

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| name | text | oui | Nom du fichier |
| file_path | text | oui | Chemin Supabase Storage |
| mime_type | text | oui | |
| size_bytes | integer | oui | |
| entity_type | text | non | Lien polymorphe (contact, company, quote, invoice...) |
| entity_id | uuid | non | |
| uploaded_by | uuid | oui | FK users |
| created_at | timestamptz | oui | |
| deleted_at | timestamptz | non | |

---

### 1.15 Task

**Description** : Tache rattachable a n'importe quel objet via le pattern Target polymorphe (inspire Twenty).

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| title | text | oui | |
| description | text | non | |
| status | enum | oui | todo, in_progress, done, canceled |
| priority | enum | oui | low, medium, high, urgent |
| due_date | timestamptz | non | |
| completed_at | timestamptz | non | |
| assigned_to | uuid | non | FK users |
| entity_type | text | non | Lien polymorphe |
| entity_id | uuid | non | |
| created_by | uuid | oui | |
| created_at | timestamptz | oui | |
| updated_at | timestamptz | oui | |
| deleted_at | timestamptz | non | |

**Cycle de vie** : `todo -> in_progress -> done / canceled`

---

### 1.16 Activity

**Description** : Log d'activite automatique. Pas une table ecrite -- une vue SQL UNION ALL (pattern Atomic CRM) + une table pour les activites manuelles (appels, reunions).

**Vue `activity_log`** : agrege les creations/modifications de tous les objets principaux. Colonnes : `id, tenant_id, type (create/update/call/meeting/email/note), entity_type, entity_id, actor_id, metadata jsonb, occurred_at`.

**Table `activities`** (activites manuelles) :

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| type | enum | oui | call, meeting, note, email_sent |
| subject | text | non | |
| description | text | non | |
| entity_type | text | non | Lien polymorphe |
| entity_id | uuid | non | |
| occurred_at | timestamptz | oui | |
| duration_minutes | integer | non | |
| participants | jsonb | non | Liste des participants |
| created_by | uuid | oui | |
| created_at | timestamptz | oui | |

---

### 1.17 Note

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| body | text | oui | Contenu rich text (Markdown ou HTML) |
| entity_type | text | oui | Lien polymorphe |
| entity_id | uuid | oui | |
| created_by | uuid | oui | |
| created_at | timestamptz | oui | |
| updated_at | timestamptz | oui | |
| deleted_at | timestamptz | non | |

---

### 1.18 User

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | = auth.users.id de Supabase |
| tenant_id | uuid | oui | |
| email | text | oui | |
| first_name | text | oui | |
| last_name | text | oui | |
| avatar_url | text | non | |
| role | enum | oui | admin, manager, member |
| is_active | boolean | oui | |
| created_at | timestamptz | oui | |
| updated_at | timestamptz | oui | |

---

### 1.19 Tag

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| name | text | oui | |
| color | text | oui | Code hex |
| created_at | timestamptz | oui | |

**Relations** : N:M vers Contact, Company, Opportunity via tables de jointure dediees (`contact_tags`, `company_tags`, `opportunity_tags`) avec FK strictes. Pas d'arrays bigint[] (anti-pattern Atomic CRM).

---

### 1.20 Tenant

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| name | text | oui | Nom de l'entreprise |
| slug | text | oui | Sous-domaine unique |
| plan | enum | oui | free, pro, business |
| settings | jsonb | oui | Configuration dynamique (pattern Atomic CRM) : pipeline_stages, probability_map, categories, tax_rates, currency, quote_prefix, invoice_prefix... |
| created_at | timestamptz | oui | |

---

### 1.21 EntityLink

**Description** : Liens generiques entre objets (pattern Dolibarr `element_element`). Permet de tracer les conversions devis -> facture sans couplage fort.

| Champ | Type | Obligatoire | Notes |
|-------|------|:-----------:|-------|
| id | uuid | oui | |
| tenant_id | uuid | oui | |
| source_type | text | oui | ex: quote |
| source_id | uuid | oui | |
| target_type | text | oui | ex: invoice |
| target_id | uuid | oui | |
| link_type | text | oui | converted_to, related_to, parent_of |
| created_at | timestamptz | oui | |
| created_by | uuid | oui | |

**Index unique** : (tenant_id, source_type, source_id, target_type, target_id, link_type).

---

## 2. Objets metier secondaires (V2+)

| Objet | Description | Priorite |
|-------|-------------|----------|
| **Lead** | Prospect pre-qualification avec conversion vers Contact + Company + Opportunity (pattern EspoCRM). V1 fusionne Lead et Contact pour simplifier. | V2 |
| **Campaign** | Campagne marketing avec listes de cibles, mass email, tracking ouvertures/clics (pattern EspoCRM) | V2 |
| **TargetList** | Listes de prospection pour les campagnes | V2 |
| **Contract** | Contrats de service avec dates, renouvellement, alertes (pattern SuiteCRM) | V2 |
| **Recurring Invoice** | Factures recurrentes avec generation automatique (pattern Dolibarr) | V2 |
| **Order** | Commande intermediaire entre devis et facture (pattern Dolibarr). Optionnel pour les PME qui facturent directement depuis le devis. | V2 |
| **CalendarEvent** | Evenements calendrier avec sync Google/Microsoft Calendar (pattern Twenty) | V2 |
| **CalendarChannel** | Canal de sync calendrier, meme pattern que EmailChannel | V2 |
| **EmailTemplate** | Templates d'emails avec variables de merge | V2 |
| **Workflow** | Automatisations configurables par l'utilisateur avec trigger/conditions/actions (pattern Twenty simplifie) | V2 |
| **Team** | Equipes pour le scope de permissions own/team/all (pattern EspoCRM) | V2 |
| **Notification** | Notifications in-app et email pour evenements CRM | V2 |
| **Webhook** | Webhooks sortants configurables par tenant | V2+ |
| **AuditLog** | Historique detaille des modifications champ par champ (pattern EspoCRM `audited: true`) | V2+ |
| **CustomField** | Definition de champs personnalises par tenant avec type, validation, position dans les layouts | V2+ |
| **Import** | Jobs d'import CSV/Excel avec mapping, preview, rollback | V2 |

---

## 3. Relations entre objets

### 3.1 Relations structurelles (composition, appartenance)

```
Tenant
  |-- 1:N User
  |-- 1:N Company
  |      |-- 1:N Contact (company_id)
  |      |-- N:1 Company (parent_company_id, hierarchie)
  |-- 1:N Product
  |-- 1:N Tag
  |-- 1:1 Configuration (settings jsonb dans Tenant)

User
  |-- 1:N ConnectedAccount (user_id)
       |-- 1:N EmailChannel (connected_account_id)
            |-- 1:N Email (channel_id)
                 |-- 1:N EmailParticipant (email_id)
```

### 3.2 Relations transactionnelles (workflow commercial)

```
Company -----> Opportunity -----> Quote -----> Invoice -----> Payment
  |              |                  |             |
  |              |                  |             +-- 1:N InvoiceLine
  |              |                  +-- 1:N QuoteLine
  |              |                  |
  |              +-- N:M Contact   +-- 0:1 -> Invoice (via EntityLink, conversion)
  |                  (avec role)
  +-- direct FK sur Quote et Invoice aussi (company_id)
```

**Flux de conversion** (inspire Dolibarr `createFromXxx`) :
```
Quote [signed] --EntityLink(converted_to)--> Invoice [draft]
```
Les lignes du devis sont copiees dans les lignes de facture. L'EntityLink trace la filiation.

### 3.3 Relations polymorphes (activites, notes, taches, documents)

Chaque objet suivant peut se rattacher a N'IMPORTE QUEL objet metier via le couple `(entity_type, entity_id)` :

```
Note         ---> Contact | Company | Opportunity | Quote | Invoice
Task         ---> Contact | Company | Opportunity | Quote | Invoice
Document     ---> Contact | Company | Opportunity | Quote | Invoice | Email
Activity     ---> Contact | Company | Opportunity | Quote | Invoice

Email        ---> Contact (via EmailParticipant.contact_id, matching par adresse)
```

Ce pattern (inspire de Twenty TaskTarget/NoteTarget) evite la multiplication des FK et rend le systeme extensible sans migration.

**Implementation** : Deux colonnes `entity_type text` + `entity_id uuid` sur chaque table polymorphe. Index composite `(tenant_id, entity_type, entity_id)` pour les queries de timeline. Pas de FK stricte (choix delibere -- la verification se fait au niveau applicatif).

### 3.4 Relations de tagging (N:M via tables de jointure)

```
contact_tags      (contact_id, tag_id)       -- FK strictes, cascade delete
company_tags      (company_id, tag_id)       -- FK strictes, cascade delete
opportunity_tags  (opportunity_id, tag_id)    -- FK strictes, cascade delete
```

Tables de jointure dediees avec FK et constraints d'integrite. Pas d'arrays bigint[] (lecon Atomic CRM).

---

## 4. Evenements metier importants

Les evenements domaine qui declenchent des side-effects. Implementation : triggers SQL + Supabase Realtime + Edge Functions.

| Evenement | Declencheur | Side-effects |
|-----------|-------------|-------------|
| `opportunity.stage_changed` | Update de Opportunity.stage | Log activite, recalcul probability, notification assigned_to si stage = won/lost |
| `opportunity.won` | Stage passe a "won" | Proposition de creer une facture (si devis signe lie), update Company.status -> client, log activite |
| `opportunity.lost` | Stage passe a "lost" | Log raison, notification, analytics |
| `quote.validated` | Status passe a validated | Generation reference definitive, gel du contenu, log activite |
| `quote.sent` | Status passe a sent | Generation PDF, log activite |
| `quote.signed` | Status passe a signed | Proposition auto de creer facture (configurable via tenant settings, inspire Dolibarr WorkflowManager), notification, log activite |
| `quote.refused` | Status passe a refused | Log raison, notification, update Opportunity si liee |
| `invoice.validated` | Status passe a validated | Generation reference definitive, gel du contenu (IMMUTABLE legalement), generation PDF, log activite |
| `invoice.sent` | Status passe a sent | Log activite, demarrage du compteur de paiement |
| `payment.created` | Insert Payment | Recalcul Invoice.amount_paid et amount_due, transition auto vers paid si solde = 0 |
| `email.received` | Import depuis provider | Matching participants -> contacts (pattern Twenty match-participant), creation note si contact trouve, creation contact si inconnu + config activee |
| `email.sent` | Envoi via CRM | Log activite sur les contacts participants |
| `contact.created` | Insert Contact | Auto-populate avatar (gravatar), log activite, check doublons (pattern EspoCRM duplicate detection) |
| `company.created` | Insert Company | Auto-populate logo (favicon), log activite, check doublons |
| `task.completed` | Status passe a done | Log activite, notification created_by |
| `task.overdue` | due_date < now() et status != done | Notification assigned_to (via pg_cron ou Edge Function schedulee) |

---

## 5. Etats de cycle de vie

### 5.1 Quote (Devis)

```
        +------------+
        |   draft    |<---------+
        +-----+------+          |
              |                 | (retour possible)
              v                 |
        +-----+------+         |
        | validated  +---------+
        +-----+------+
              |
              v
        +-----+------+
        |    sent    |
        +--+------+--+
           |      |
           v      v
     +-----+--+ +-+--------+
     | signed | | refused  |
     +-----+--+ +----------+
           |
           v
     +-----+----+
     | invoiced |  (terminal -- EntityLink vers Invoice)
     +----------+

     A tout moment depuis draft : -> canceled
```

### 5.2 Invoice (Facture)

```
     +----------+
     |  draft   |
     +-----+----+
           |
           v
     +-----+------+
     | validated  |  (IMMUTABLE a partir d'ici)
     +-----+------+
           |
           v
     +-----+------+
     |    sent    |
     +-----+------+
           |
           v  (paiements partiels)
     +-----+-----------+
     | partially_paid  |
     +-----+-----------+
           |
           v  (amount_due <= 0)
     +-----+------+
     |    paid    |  (terminal)
     +----------+

     Annulation : -> canceled (avec credit_note obligatoire si paiements recus)
```

### 5.3 Opportunity

```
     +---------------+       +----------------+
     | qualification | ----> |  proposition   |
     +---------------+       +-------+--------+
                                      |
                                      v
                              +-------+--------+
                              |  negociation   |
                              +-------+--------+
                                      |
                                      v
                              +-------+--------+
                              |  engagement    |
                              +---+--------+---+
                                  |        |
                                  v        v
                              +---+--+  +--+---+
                              | won  |  | lost |
                              +------+  +------+
```

Configurable par tenant via `settings.pipeline_stages` et `settings.probability_map`.

### 5.4 Task

```
     +------+     +-------------+     +------+
     | todo | --> | in_progress | --> | done |
     +------+     +------+------+     +------+
                         |
                         v
                    +----+-----+
                    | canceled |
                    +----------+
```

---

## 6. Dependances critiques entre domaines

```
                    +--------+
                    | Tenant |  (racine de tout, cle RLS)
                    +---+----+
                        |
          +-------------+-------------+
          |             |             |
     +----+----+  +-----+-----+  +---+-----+
     |  User   |  | Company   |  | Product |
     +----+----+  +-----+-----+  +---------+
          |             |              |
          |        +----+----+         |
          |        | Contact |         |
          |        +----+----+         |
          |             |              |
     +----+---+---------+              |
     |  Opportunity     |              |
     +--------+---------+              |
              |                        |
         +----+----+                   |
         |  Quote  +-------------------+  (QuoteLines referencent Products)
         +----+----+
              |
         +----+----+
         | Invoice +-------------------+  (InvoiceLines referencent Products)
         +----+----+                   |
              |                        |
         +----+----+              +----+----+
         | Payment |              | Product |
         +---------+              +---------+

     Transversal (polymorphe, pas de FK stricte) :
         Note, Task, Activity, Document, Tag --> tout objet
         Email --> Contact (via EmailParticipant)
         ConnectedAccount --> User
```

**Ordre de deploiement des modules** (respecte les dependances) :
1. Tenant + User + Auth (fondation)
2. Company + Contact + Tag (CRM core)
3. Product (catalogue)
4. Opportunity (pipeline)
5. Quote + QuoteLine (devis)
6. Invoice + InvoiceLine + Payment (facturation)
7. Email + ConnectedAccount + EmailChannel (communication)
8. Note + Task + Activity + Document (activites transversales)

---

## 7. Modele recommande

### Emails

Adopter le pattern **ConnectedAccount -> EmailChannel -> Email -> EmailParticipant** de Twenty. C'est la seule architecture qui supporte proprement le multi-boites.

Chaque utilisateur connecte ses comptes email (Gmail OAuth, Microsoft OAuth, IMAP/SMTP). Chaque compte a un ou plusieurs canaux de synchronisation. Les emails importes sont matche avec les contacts CRM via l'adresse email du participant (module `match-participant` de Twenty). Si aucun contact ne correspond, le systeme peut creer automatiquement un contact (configurable par tenant).

La sync se fait via le **driver pattern** de Twenty : un driver par provider (Gmail API, Microsoft Graph, IMAP), meme interface. Le polling se fait via pg_cron (Edge Function schedulee toutes les 5 min). Les webhooks push (Gmail Push, Microsoft Graph subscriptions) sont a ajouter en V2 pour la latence.

**Tranchement** : Pas de sync bidirectionnelle en V1. On commence par l'import des emails recus + envoi via le CRM. La sync complete (drafts, labels, archives) est V2.

### Documents

Stockage via **Supabase Storage** avec un bucket par tenant (isolation). Chaque document a un lien polymorphe `(entity_type, entity_id)` vers l'objet parent. Les PDF de devis/factures sont generes via `@react-pdf/renderer` et stockes dans le meme bucket.

Pas de GED complete en V1. Juste : upload de fichiers, rattachement a un objet, preview inline pour les images et PDF, download. Le versioning de documents est V2+.

### Activites

Double approche :
1. **Vue SQL `activity_log`** (pattern Atomic CRM) : UNION ALL des creations/modifications significatives de tous les objets. Pas de table a maintenir, toujours coherent avec les donnees reelles. Utilisee pour la timeline globale et les timelines par objet.
2. **Table `activities`** : Pour les activites manuelles (appels, reunions, notes de suivi) qui n'ont pas de table source.

La timeline d'un objet = merge des deux sources, triee par date. Supabase Realtime pour les notifications en temps reel.

### Taches

Rattachement polymorphe via `(entity_type, entity_id)` comme dans Twenty (pattern Target). Une tache peut etre rattachee a un Contact, une Company, une Opportunity, un Devis, etc. Pas de table de jointure intermediaire -- le lien direct est suffisant car une tache a un seul parent.

### Devis/Factures

Workflow etat-machine inspire de **Dolibarr** mais simplifie (pas de commande intermediaire en V1). Les statuts et transitions sont codes en dur dans le service TypeScript (pas configurable par tenant -- c'est de la reglementation, pas du metier configurable).

La conversion devis -> facture utilise le pattern **`createFromQuote`** de Dolibarr : copie structuree de toutes les lignes avec montants, TVA, remises. La filiation est tracee via **EntityLink** (pattern `element_element` de Dolibarr).

Les montants sont TOUJOURS en centimes (integers). Pas de float/decimal pour l'argent.

Les references (DEV-2026-0001, FAC-2026-0001) sont auto-generees avec un compteur sequentiel par tenant et par annee. Le format est configurable dans les settings tenant.

### Contacts/Societes

Relations Contact-Company en N:1 avec FK stricte. Multi-email et multi-phone via tables dediees (ContactEmail, ContactPhone) et non via JSONB -- permet la recherche full-text et le matching email pour les participants.

Le **merge de contacts** (pattern Atomic CRM) est critique et doit etre implemente des le premier jour : fusion SQL transactionnelle qui reparente toutes les notes, taches, participations email, opportunites, et deduplique emails/phones.

La **detection de doublons** (pattern EspoCRM) est declarative : a la creation d'un contact, verifier `(first_name + last_name, email)` dans le meme tenant. Alerte non-bloquante, fusion proposee.

### Opportunites

Pipeline configurable par tenant via `settings.pipeline_stages` (array d'objets `{name, probability, color, position}`). Kanban avec drag & drop et persistence optimiste (pattern Atomic CRM avec @hello-pangea/dnd).

Le **probability map** (pattern EspoCRM) est stocke dans les stages. Le **weighted_amount** est une colonne generee (`amount * probability / 100`). Le forecast est une vue SQL qui agregee les `weighted_amount` par mois/trimestre.

Multi-pipeline en V2 (ex: pipeline "vente" et pipeline "partenariat").
