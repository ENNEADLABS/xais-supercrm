# Notes de relecture -- Repos de reference

> Guide de relecture contextuelle. Quand revenir sur chaque repo, pour quel sujet, quels fichiers relire, quoi ignorer.

---

## 1. Atomic CRM

### Quand y revenir
- Au demarrage du projet (schema SQL initial, structure de dossiers, config dynamique)
- A chaque nouvelle entite CRUD (pattern module par feature)
- Pour le kanban pipeline (drag & drop, optimistic updates)
- Pour le dashboard et l'activity log

### Sujets de reference
- Schema declaratif Supabase (convention `01_tables` -> `07_storage`)
- Auto-populate via triggers SQL (avatar, logo, sales_id, last_seen)
- Configuration dynamique (singleton JSONB + Context React + defaults)
- Merge contacts (fusion transactionnelle SQL)
- Kanban drag & drop avec persistence d'index
- Inbound email webhook (parse, match contact, create note)
- Dual data provider (FakeRest dev / Supabase prod)
- PWA offline-first (TanStack Query persistence localStorage)

### Fichiers a relire specifiquement
| Fichier | Sujet |
|---------|-------|
| `supabase/schemas/01_tables.sql` | Modele de donnees complet |
| `supabase/schemas/02_functions.sql` | Merge contacts, auto-populate, is_admin |
| `supabase/schemas/03_views.sql` | Activity log UNION ALL, vues summary |
| `supabase/schemas/04_triggers.sql` | Automatisations DB |
| `supabase/schemas/05_policies.sql` | RLS -- ce qu'il NE faut PAS faire |
| `src/components/atomic-crm/types.ts` | Types metier TypeScript |
| `src/components/atomic-crm/root/ConfigurationContext.tsx` | Config dynamique |
| `src/components/atomic-crm/root/defaultConfiguration.ts` | Valeurs par defaut |
| `src/components/atomic-crm/providers/supabase/dataProvider.ts` | Data layer, lifecycle callbacks |
| `src/components/atomic-crm/deals/DealListContent.tsx` | Kanban drag & drop |
| `src/components/atomic-crm/contacts/ContactShow.tsx` | Layout Show avec aside |
| `supabase/functions/postmark/index.ts` | Webhook email inbound |
| `supabase/functions/users/index.ts` | Edge function admin |

### Ce qu'on peut ignorer definitivement
- `src/components/admin/` -- shadcn-admin-kit copie, pas de logique CRM
- `src/components/ui/` -- composants shadcn standards
- `supabase/migrations/` -- auto-generees, redondantes avec schemas
- `demo/`, `public/`, `scripts/`, `doc/` -- infrastructure
- `src/components/atomic-crm/providers/fakerest/dataGenerator/` -- donnees de test
- Fichiers `*.stories.tsx` -- Storybook stories

---

## 2. Dolibarr

### Quand y revenir
- Quand on construit les devis (statuts, lignes, validation, envoi)
- Quand on construit les factures (createFromOrder, paiements, avoir)
- Quand on construit les commandes (intermediaire devis/facture)
- Quand on implemente le workflow devis -> commande -> facture
- Quand on definit les permissions granulaires par module
- Quand on construit la generation de documents PDF
- Quand on implemente les liens generiques entre objets (element_element)
- Quand on modelise Contact/Societe avec roles et hierarchie

### Sujets de reference
- Workflow commercial complet (statuts, transitions, automations cascadees)
- Pattern createFromXxx (copie structuree lignes + metadonnees)
- WorkflowManager (trigger d'automations configurables par evenements)
- element_element (liens generiques polymorphes entre objets)
- Permissions declaratives par module (CRUD + avancees)
- EmailCollector (collecte IMAP, filtres, creation auto d'objets)
- Modele Societe/Contact (hierarchie parent/child, roles)
- Calculs TVA, remises, marges, multi-devise

### Fichiers a relire specifiquement
| Fichier | Sujet |
|---------|-------|
| `htdocs/core/triggers/interface_20_modWorkflow_WorkflowManager.class.php` | Workflow complet en 300 lignes -- LE fichier |
| `htdocs/comm/propal/class/propal.class.php` | Classe devis (statuts, addline, validate) |
| `htdocs/compta/facture/class/facture.class.php` | Facture, `createFromOrder()` (ligne ~1425) |
| `htdocs/commande/class/commande.class.php` | Commande, `createFromProposal()` (ligne ~1405) |
| `htdocs/societe/class/societe.class.php` | Modele tiers, childtables (lignes 95-131) |
| `htdocs/install/mysql/tables/llx_propal.sql` | Schema SQL devis |
| `htdocs/install/mysql/tables/llx_facture.sql` | Schema SQL facture |
| `htdocs/install/mysql/tables/llx_societe.sql` | Schema SQL tiers |
| `htdocs/core/class/commonobject.class.php` (lignes 4350-4600) | `add_object_linked`, `fetchObjectLinked` |
| `htdocs/emailcollector/class/emailcollector.class.php` | Collecte emails IMAP |
| `htdocs/core/modules/modSociete.class.php` | Declaration permissions (pattern) |
| `htdocs/contact/class/contact.class.php` | Modele Contact |

### Ce qu'on peut ignorer definitivement
- `htdocs/langs/` -- traductions
- `htdocs/theme/` -- themes CSS
- `htdocs/includes/` -- librairies tierces
- `htdocs/install/` (sauf tables SQL)
- `htdocs/accountancy/` -- comptabilite avancee
- `htdocs/hrm/`, `htdocs/holiday/`, `htdocs/expensereport/` -- RH
- `htdocs/adherent/` -- adhesions
- `htdocs/website/`, `htdocs/webportal/` -- CMS
- `htdocs/bom/`, `htdocs/mrp/`, `htdocs/workstation/` -- fabrication
- `htdocs/admin/`, `htdocs/conf/` -- administration systeme
- Tous les `card.php`, `list.php`, `index.php` -- controleurs proceduraux sans valeur architecturale
- Frontend jQuery -- zero valeur

---

## 3. Twenty

### Quand y revenir
- Quand on construit l'integration email multi-boites (Gmail, Outlook, IMAP)
- Quand on construit le matching participants email -> contacts
- Quand on construit les workflows/automatisations
- Quand on reflechit aux permissions avancees (field-level, row-level)
- Quand on construit la command palette (Cmd+K)
- Quand on construit le systeme de vues (table, kanban, calendar avec filtres/tris)
- Quand on evalue le multi-tenant (schema-per-tenant vs RLS)
- Quand on construit les feature flags par workspace

### Sujets de reference
- ConnectedAccount -> Channel -> Message (architecture email multi-boites)
- Driver pattern email (Gmail API, Microsoft Graph, IMAP, SMTP)
- Pattern Target polymorphe (TaskTarget, NoteTarget)
- Workflow versionnne (Workflow -> Version -> Steps -> Actions)
- Systeme de vues (type, filtres composes, tris, groupes, aggregations)
- Record table/board/calendar generiques
- Schema-per-tenant (isolation forte, backup par tenant)
- Permissions RBAC 4 niveaux (role, object, field, row)
- BaseWorkspaceEntity (id, createdAt, updatedAt, deletedAt)
- AtomFamily Jotai pour store de records

### Fichiers a relire specifiquement
| Fichier | Sujet |
|---------|-------|
| `modules/messaging/` (tout le dossier) | Architecture email multi-provider |
| `modules/messaging/message-import-manager/drivers/` | Drivers Gmail, IMAP, Microsoft |
| `modules/match-participant/` | Matching participants -> contacts |
| `modules/contact-creation-manager/` | Auto-creation contacts depuis emails |
| `modules/workflow/workflow-executor/workflow-actions/` | Actions de workflow modulaires |
| `engine/metadata-modules/view/entities/view.entity.ts` | Systeme de vues |
| `engine/metadata-modules/role/role.entity.ts` | Modele de permissions |
| `engine/metadata-modules/object-permission/` | Permissions par objet |
| `modules/*/standard-objects/*.workspace-entity.ts` | Schema CRM (les 30 entities) |
| `engine/core-modules/workspace/workspace.entity.ts` | Modele workspace/tenant |
| `twenty-front/src/modules/object-record/record-table/` | Table generique |
| `twenty-front/src/modules/object-record/record-board/` | Kanban generique |
| `twenty-front/src/modules/command-menu/` | Command palette |

### Ce qu'on peut ignorer definitivement
- `engine/twenty-orm/` -- ORM custom, on ne reproduira pas
- Tous les modules `flat-*` (20+) -- cache par duplication, anti-pattern
- `engine/api/graphql/workspace-resolver-builder/` -- 16 factories, over-engineered
- `engine/api/rest/` et `engine/api/mcp/` -- triple API, on n'en veut qu'une
- `packages/twenty-zapier/`, `twenty-companion/`, `twenty-cli/` -- extensions
- `packages/twenty-website/`, `twenty-docs/` -- marketing/docs
- `twenty-oxlint-rules/` -- regles de lint custom Twenty
- `engine/workspace-manager/workspace-migration/` -- migrations dynamiques complexes

---

## 4. EspoCRM

### Quand y revenir
- Quand on modelise Lead, Account, Contact, Opportunity (schema de reference)
- Quand on implemente la conversion Lead -> Account + Contact + Opportunity
- Quand on construit le pipeline avec probability map et weighted forecast
- Quand on definit le modele de permissions (ACL own/team/all)
- Quand on construit la detection de doublons
- Quand on implemente les champs composites (currency, address, phone)
- Quand on construit l'optimistic concurrency control (multi-utilisateur)

### Sujets de reference
- Modele de donnees CRM complet (entityDefs JSON)
- Lead conversion avec field mapping declaratif
- Pipeline stages + probability map + weighted amount
- ACL multi-niveaux (own/team/all par entite par action CRUD)
- Types de champs composites (currency avec sous-champs, address, phone)
- Duplicate detection declarative
- Optimistic concurrency control
- Metadata merge hierarchique (core -> modules -> custom)
- Layouts declaratifs JSON

### Fichiers a relire specifiquement
| Fichier | Sujet |
|---------|-------|
| `Modules/Crm/Resources/metadata/entityDefs/Lead.json` | Lead avec conversion, field mapping |
| `Modules/Crm/Resources/metadata/entityDefs/Opportunity.json` | Pipeline, probability map, weighted amount |
| `Modules/Crm/Resources/metadata/entityDefs/Account.json` | Schema Account |
| `Modules/Crm/Resources/metadata/entityDefs/Contact.json` | Schema Contact |
| `Resources/metadata/fields/currency.json` | Champs composites |
| `Core/Acl/DefaultAccessChecker.php` | ACL multi-niveaux (implementation) |
| `Modules/Crm/Resources/metadata/scopes/Account.json` | Capacites + duplicate detection |
| `Core/Utils/Metadata.php` + `Metadata/Builder.php` | Architecture metadata |
| `Resources/metadata/entityDefs/Email.json` | Integration email |
| `Modules/Crm/Tools/Lead/ConvertService.php` | Service de conversion Lead |

### Ce qu'on peut ignorer definitivement
- `client/src/` -- frontend JavaScript vanilla Backbone, obsolete
- `Core/ORM/` -- ORM maison non standard
- Scripts d'installation/upgrade
- Traductions, themes
- `Core/Formula/` -- moteur de formules, trop specifique a EspoCRM
- `Core/Controllers/Record.php` -- controller generique unique, pas notre pattern

---

## 5. SuiteCRM-Core

### Quand y revenir
- Quand on definit la roadmap fonctionnelle (liste exhaustive des modules CRM)
- Quand on evalue API Platform comme pattern d'API generique
- Quand on construit des operations async complexes (pattern Process)

### Sujets de reference
- Liste des modules comme checklist fonctionnelle (Quotes, Invoices, Contracts, Campaigns)
- Pattern Record generique + API Platform
- Pattern Process pour operations complexes (mass update, merge, lead conversion)
- AppMetadata single-fetch (charger toute la config en un appel)

### Fichiers a relire specifiquement
| Fichier | Sujet |
|---------|-------|
| `core/backend/Data/Entity/Record.php` | Pattern API Platform, Record generique |
| `core/backend/Process/Entity/Process.php` | Pattern Process (operations async) |
| `core/backend/Metadata/Entity/AppMetadata.php` | Metadata single-fetch |
| `core/modules/` | Liste des modules = roadmap fonctionnelle |

### Ce qu'on peut ignorer definitivement
- Tous les `LegacyHandler` -- anti-pattern, zero valeur
- `core/backend/Install/` -- installation on-premise
- Frontend Angular en detail -- on part sur React/Next.js
- Config Symfony/Doctrine -- pas de modele de donnees exploitable
- `core/backend/Engine/LegacyHandler/` -- wrapping legacy, a fuir
- Legacy SugarCRM code -- hors scope total

---

## 6. Ordre de relecture par besoin futur

### "Je construis le schema de base de donnees initial"
1. **Atomic CRM** -- `supabase/schemas/01_tables.sql` (structure de reference)
2. **EspoCRM** -- `entityDefs/*.json` (modele CRM complet)
3. **Dolibarr** -- `install/mysql/tables/llx_*.sql` (schema commercial)

### "Je construis le pipeline commercial (opportunites/deals)"
1. **EspoCRM** -- `entityDefs/Opportunity.json` (probability map, weighted amount)
2. **Atomic CRM** -- `deals/DealListContent.tsx` (kanban drag & drop)
3. **Atomic CRM** -- `root/ConfigurationContext.tsx` (etapes configurables)

### "Je construis les devis et factures"
1. **Dolibarr** -- `propal.class.php` + `facture.class.php` (statuts, lignes, transitions)
2. **Dolibarr** -- `WorkflowManager.class.php` (automations devis -> commande -> facture)
3. **Dolibarr** -- `llx_propal.sql` + `llx_facture.sql` (schema SQL)
4. **SuiteCRM-Core** -- `core/modules/` (liste des modules Quotes/Invoices pour la checklist)

### "Je construis l'integration email multi-boites"
1. **Twenty** -- `modules/messaging/` (architecture ConnectedAccount -> Channel -> Message)
2. **Twenty** -- `modules/messaging/message-import-manager/drivers/` (drivers Gmail, IMAP, Microsoft)
3. **Twenty** -- `modules/match-participant/` (matching email -> contact)
4. **Dolibarr** -- `emailcollector.class.php` (collecte IMAP, filtres, actions auto)
5. **Atomic CRM** -- `supabase/functions/postmark/` (webhook inbound simple)

### "Je construis les permissions et le multi-tenant"
1. **EspoCRM** -- `Core/Acl/DefaultAccessChecker.php` (ACL own/team/all)
2. **Dolibarr** -- `modSociete.class.php` (permissions declaratives par module)
3. **Twenty** -- `engine/metadata-modules/role/` + `object-permission/` (RBAC complet)
4. **Atomic CRM** -- `05_policies.sql` (ce qu'il NE faut PAS faire en RLS)

### "Je construis la conversion de leads"
1. **EspoCRM** -- `entityDefs/Lead.json` (convertEntityList, convertFields)
2. **EspoCRM** -- `Crm/Tools/Lead/ConvertService.php` (service de conversion)
3. **Dolibarr** -- `commande.class.php` methode `createFromProposal()` (pattern de copie)

### "Je construis le merge de contacts/doublons"
1. **Atomic CRM** -- `02_functions.sql` fonction `merge_contacts` (fusion transactionnelle)
2. **EspoCRM** -- `scopes/Account.json` (duplicate detection declarative)

### "Je construis les workflows/automatisations"
1. **Dolibarr** -- `WorkflowManager.class.php` (automations par evenements business)
2. **Twenty** -- `modules/workflow/` (moteur de workflow avec actions modulaires)
3. **SuiteCRM-Core** -- `Process/Entity/Process.php` (pattern Process async)

### "Je construis le dashboard et l'activite"
1. **Atomic CRM** -- `03_views.sql` (vue activity_log UNION ALL)
2. **Atomic CRM** -- `dashboard/` (widgets DealsChart, HotContacts, TasksList)
3. **Twenty** -- `modules/timeline/` (timeline polymorphe)

### "Je construis la generation de documents PDF"
1. **Dolibarr** -- `htdocs/core/modules/facture/doc/` (generateurs PDF, templates)
2. **Dolibarr** -- `propal.class.php` methode `generateDocument()` (pattern)

### "Je construis les champs personnalises"
1. **EspoCRM** -- `Resources/metadata/fields/` (types de champs composites)
2. **Dolibarr** -- pattern extrafields (tables `*_extrafields`)
3. **Twenty** -- `engine/metadata-modules/field-metadata/` (champs dynamiques)

### "Je construis le systeme de vues (filtres, tris, groupes)"
1. **Twenty** -- `engine/metadata-modules/view/` (systeme de vues complet)
2. **Twenty** -- `twenty-front/src/modules/views/` (composants frontend)
3. **EspoCRM** -- layouts declaratifs JSON

### "Je construis la config dynamique par tenant"
1. **Atomic CRM** -- `ConfigurationContext.tsx` + `defaultConfiguration.ts` (pattern complet)
2. **EspoCRM** -- `Core/Utils/Metadata.php` (merge hierarchique core -> modules -> custom)
