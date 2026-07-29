# 01 — Product Core Blueprint

---

## 1. Categorie produit

**Cockpit de pilotage commercial pour dirigeants de PME**, avec moteur CRM integre.

Ni un CRM pur (trop centre sur les commerciaux), ni un ERP (trop large, trop lourd), ni un simple outil de gestion. C'est un **systeme de pilotage d'activite commerciale** qui place le dirigeant au centre et integre les briques essentielles qu'il utilise au quotidien : contacts, emails, devis, factures, taches, pipeline.

Le positionnement se resume en une phrase : **"Tout ce qu'un dirigeant de PME ouvre dans 5 onglets differents, dans une seule interface."**

---

## 2. Positionnement fonctionnel

Le produit se differencie des solutions analysees sur 3 axes :

| Axe | Position | Justification |
|-----|----------|---------------|
| **Couche primaire** | Dashboard dirigeant (chiffre d'affaires, pipeline, tresorerie, taches, activite) | Aucun CRM analyse ne propose un cockpit dirigeant. Atomic CRM a un dashboard basique. Twenty a des dashboards configurables mais vides de contenu metier. Dolibarr a des statistiques eparpillees. |
| **Couche secondaire** | CRM commercial (contacts, societes, pipeline, emails) | C'est le noyau de tous les CRM analyses. On reprend les meilleurs patterns (Atomic CRM pour l'UX, EspoCRM pour le modele metier, Twenty pour l'email). |
| **Couche tertiaire** | Gestion commerciale (devis, factures, paiements) | Seul Dolibarr couvre ce perimetre. Les CRM modernes (Atomic CRM, Twenty) l'ignorent totalement. C'est notre plus grosse opportunite de differenciation. |

**Ce qui n'existe nulle part** : un produit qui combine les 3 couches avec une UX moderne, une stack TypeScript/Supabase, et une intelligence contextuelle (extraction d'info depuis les emails, suggestions automatiques).

---

## 3. Noyau fonctionnel (sans ca, le produit n'existe pas)

### Tier 0 — Fondations (pre-requis technique)
- Multi-tenant RLS avec `tenant_id` sur chaque table (lecon Atomic CRM : ne jamais livrer `authenticated using (true)`)
- Auth Supabase (email/password + OAuth Google/Microsoft)
- RBAC 3 niveaux : role -> permissions CRUD par entite -> scope own/team/all (synthese EspoCRM + Dolibarr)
- Schema declaratif Supabase (`01_tables` -> `07_storage`, pattern Atomic CRM)
- Configuration dynamique par tenant (singleton JSONB, pattern Atomic CRM)

### Tier 1 — CRM (le coeur relationnel)
- **Societes** : fiche entreprise, logo auto (favicon), hierarchie parent/enfant, champs metier (SIRET, secteur, taille). Source : Atomic CRM + Dolibarr.
- **Contacts** : personne physique, multi-email, multi-phone (tables de jointure, pas d'arrays `bigint[]`), avatar auto (gravatar), liaison societe. Source : Atomic CRM (adapte).
- **Pipeline / Opportunites** : kanban drag & drop avec optimistic updates, etapes configurables par tenant, montant + probabilite par etape, forecast pondere. Source : Atomic CRM (UX) + EspoCRM (probability map).
- **Notes & Activite** : notes avec statut, timeline polymorphe, log d'activite via vue SQL UNION ALL. Source : Atomic CRM.
- **Taches** : assignation, echeance, types configurables, liaison polymorphe (contact, societe, deal, devis). Source : Atomic CRM + Twenty (TaskTarget).

### Tier 2 — Gestion commerciale (la differenciation)
- **Devis** : brouillon -> valide -> envoye -> signe/refuse -> facture. Lignes avec produit, quantite, prix unitaire, TVA, remise. Source : Dolibarr (statuts et transitions eprouves sur 20 ans).
- **Factures** : creation depuis devis (`createFromQuote`), statuts (brouillon -> validee -> payee/abandonnee). Source : Dolibarr.
- **Catalogue produits/services** : reference, designation, prix, unite, TVA par defaut. Necessaire pour composer les lignes de devis/factures. Source : Dolibarr.
- **Liens generiques entre objets** : table `entity_links(source_type, source_id, target_type, target_id)` pour tracer devis -> facture, deal -> devis, etc. Source : Dolibarr (element_element).

### Tier 3 — Communication (le liant)
- **Emails multi-boites** : ConnectedAccount -> Channel -> Message. Sync Gmail API + Microsoft Graph. Matching automatique participants -> contacts CRM. Source : Twenty (architecture) + Atomic CRM (webhook inbound comme fallback).
- **Inbound email -> note** : email recu -> matching contact -> creation note avec contenu. Source : Atomic CRM (webhook Postmark).

### Tier 4 — Cockpit dirigeant (la valeur ajoutee)
- **Dashboard temps reel** : CA mensuel, pipeline en cours, forecast pondere, devis en attente, factures impayees, taches en retard.
- **Activite recente** : flux temps reel des evenements (Supabase Realtime).
- **KPI essentiels** : taux de conversion pipeline, delai moyen de signature, CA par commercial, top clients.

---

## 4. Hors perimetre initial (avec justification)

| Fonctionnalite | Raison de l'exclusion | Quand l'envisager |
|---|---|---|
| **Leads distincts des contacts** | Ajoute de la complexite conceptuelle (lead vs contact vs prospect). Le pattern EspoCRM (Lead -> conversion Account+Contact+Opportunity) est puissant mais surdimensionne pour une V1 PME. Un contact avec un champ `status: lead/prospect/client` suffit. | V2, quand le volume de prospection le justifie |
| **Campagnes marketing / mass email** | Hors scope dirigeant. Les PME utilisent Brevo, Mailchimp. Ne pas reinventer. | Jamais — integrer plutot |
| **Workflow engine visuel** | Twenty a un moteur complet mais oriente developpeurs. Dolibarr a le WorkflowManager configurable. Construire ca correctement prend des mois. | V3, apres stabilisation du noyau |
| **Champs personnalises par tenant** | Colonne JSONB `custom_fields` + validation Zod est suffisante en V1. Ne pas reproduire les 60+ metadata modules de Twenty ni les extrafields tables de Dolibarr. | V2, avec un builder de formulaires |
| **Objets custom** | Le metadata-driven complet de Twenty (objets + champs + API auto-generes) est un projet en soi. Fixer les entites en code TypeScript pour la V1. | V3+ |
| **Stock / Inventaire** | Dolibarr le couvre mais c'est de l'ERP, pas du CRM. | Hors scope permanent |
| **Comptabilite** | Idem. Les PME ont un expert-comptable et un logiciel dedie. | Hors scope permanent — export vers compta |
| **Signatures electroniques** | Aucun CRM analyse ne l'integre. Integrer un service tiers (Yousign, DocuSign) est plus pertinent. | V2, via API tierce |
| **IA generative / agents** | Twenty integre des agents IA. Premature en V1. L'extraction d'info depuis les emails (structuration automatique) est le seul usage IA justifie au lancement. | V2, commencer par l'extraction |
| **Multi-devise** | Dolibarr et EspoCRM le supportent. Complexifie enormement le calcul des montants. EUR uniquement en V1. | V2, si expansion internationale |
| **Calendrier integre** | Twenty sync Google/Microsoft Calendar. Utile mais pas critique pour la valeur core. | V2 |

---

## 5. Principes produit structurants

### P1 — Le dirigeant d'abord, le commercial ensuite
Le dashboard est la page d'accueil. Pas une liste de contacts, pas un pipeline kanban. Le dirigeant veut voir son chiffre, ses risques, ses actions. Le CRM sert cette vision, il ne la remplace pas.

### P2 — Donees au bon niveau d'abstraction
La logique critique (merge contacts, conversion devis -> facture, calcul de montants, permissions) vit dans PostgreSQL (fonctions SQL, triggers, vues, RLS). La logique UI (upload, search transform, optimistic updates) vit dans le frontend. La logique admin (operations service_role) vit dans les Edge Functions. Lecon validee par Atomic CRM.

### P3 — Multi-tenant des le jour 0, pas en retrofit
`tenant_id` sur chaque table, RLS `tenant_id = (auth.jwt()->>'tenant_id')::uuid` sur chaque policy. Pas de `authenticated using (true)` (erreur Atomic CRM). Pas de schema-per-tenant (complexite Twenty). Le RLS row-level est le bon compromis pour des PME.

### P4 — Tables de jointure, jamais d'arrays
Les `contact_ids bigint[]` et `tags bigint[]` d'Atomic CRM sont un raccourci qui empeche l'integrite referentielle, les metadonnees sur la relation, et les JOINs standards. Toujours utiliser des tables de jointure avec FK.

### P5 — Opinione mais configurable
Les etapes du pipeline, les categories, les types de taches, la devise, les statuts des devis sont des valeurs par defaut intelligentes, modifiables par tenant via la table `configuration` (pattern Atomic CRM). Pas de builder generique de champs/objets en V1.

### P6 — Composition, pas heritage
Ne pas creer un `CommonObject` de 11k lignes (Dolibarr) ni un `WorkspaceEntity` de 350 lignes (Twenty). Separer les concerns : `Auditable`, `SoftDeletable`, `Linkable`, `Taggable` comme interfaces/types TypeScript composes. Chaque entite assemble les traits dont elle a besoin.

### P7 — Anglais dans le code, francais dans l'UI
Dolibarr melange `$nom` et `$name`, `llx_societe` et `fk_soc`, `$statut` et `$status`. Le code (variables, tables, colonnes, fonctions) est en anglais. L'interface utilisateur est en francais via i18n (`next-intl`). Pas de negociation sur ce point.

### P8 — Supprimer plutot qu'accumuler
Twenty a des champs `addressOld`, des commentaires "if we are in December 2025 you can remove this" encore presents en 2026, et 20+ modules `flat-*` de cache. Dolibarr a `$statut` et `$status` en parallele. La dette technique commence par les choses qu'on n'ose pas supprimer. Supprimer agressivement le code mort.

---

## 6. Tensions arbitrees

### T1 — CRM vs systeme de pilotage
**Arbitrage : systeme de pilotage avec CRM integre.**

Les CRM purs (Atomic CRM, Twenty, EspoCRM) sont centres sur le commercial. Le dirigeant de PME n'est pas un commercial — il veut une vue synthetique de son activite, pas un pipeline kanban en plein ecran. Le pipeline est un outil parmi d'autres dans le cockpit.

Dolibarr est le seul a proposer une vision plus large (ERP), mais son interface est eclatee en dizaines de modules sans coherence UX. Notre produit prend le parti inverse : une interface unifiee, centree sur le dirigeant, avec le CRM comme moteur sous-jacent.

**Consequence concrete** : la route `/` est un dashboard, pas `/contacts`. Le pipeline est accessible en 1 clic mais n'est pas la vue par defaut.

### T2 — Profondeur metier vs simplicite
**Arbitrage : profondeur sur le workflow commercial, simplicite partout ailleurs.**

Dolibarr prouve qu'un workflow devis -> commande -> facture mature est indispensable. 20 ans de regles metier eprouvees. On ne peut pas proposer un CRM PME sans facturation serieuse — c'est la qu'est la valeur.

En revanche, on ne reproduit pas la profondeur de Dolibarr sur la comptabilite, le stock, les expeditions, la RH. On ne reproduit pas les 60+ metadata modules de Twenty. La profondeur est concentree sur le chemin critique : prospect -> deal -> devis -> facture -> paiement.

**Consequence concrete** : on saute l'entite "Commande" en V1. Pour une PME de services, le workflow devis -> facture directe est suffisant. La commande est un intermediaire utile dans l'industrie/negoce, pas dans les services.

### T3 — Automation vs controle humain
**Arbitrage : automations implicites legeres, pas de workflow engine explicite.**

Le WorkflowManager de Dolibarr (devis signe -> commande auto) est configurable mais reserve aux admins techniques. Le workflow engine de Twenty est puissant mais oriente developpeurs. Les PME n'ont ni admin technique ni developpeur.

Notre approche : des **automations implicites** qui font gagner du temps sans demander de configuration :
- Devis signe -> proposition de creer la facture (pas auto, mais suggere)
- Email recu d'un contact connu -> note creee automatiquement sur la fiche
- Avatar/logo auto-fetches (trigger SQL, pattern Atomic CRM)
- `last_seen` mis a jour automatiquement
- Duplication detection a la creation (pattern EspoCRM)

**Consequence concrete** : pas de builder de workflows en V1. Les automations sont codees dans les triggers SQL et les Edge Functions. Un builder viendra en V3 quand le produit sera stable.

### T4 — Configurabilite vs opinion forte
**Arbitrage : opinion forte avec des soupapes de configuration.**

EspoCRM pousse la configurabilite a l'extreme : tout est metadata JSON, tout est personnalisable. Twenty va encore plus loin avec les objets custom. Le cout est la complexite (Record Service de 1800 lignes chez EspoCRM, 60+ metadata modules chez Twenty).

Notre approche : les entites sont fixees en code TypeScript (pas d'objets custom). Les **valeurs** sont configurables par tenant (etapes pipeline, categories, types de taches, devise, via le singleton JSONB). Les champs custom sont possibles via une colonne JSONB `custom_fields` avec validation Zod, mais pas de builder de champs en V1.

**Consequence concrete** : un dirigeant peut personnaliser ses etapes de pipeline et ses categories en 2 minutes dans les settings. Il ne peut pas creer un nouvel objet metier.

### T5 — Richesse fonctionnelle vs maintenabilite
**Arbitrage : maintenabilite, sans compromis.**

Dolibarr a une couverture fonctionnelle exhaustive (devis, commandes, factures, stock, compta, RH, projets, adherents...) au prix d'une codebase de 16000 fichiers PHP avec des god-classes de 11k lignes et du SQL inline partout. SuiteCRM a tente de moderniser avec un wrapper legacy (`chdir()` + `LegacyHandler`) qui double le cout de maintenance.

Atomic CRM prend le parti inverse : ~15k LOC, 219 fichiers metier, code lisible et hackable. C'est notre modele de taille.

**Regle concrete** : chaque module ajoute au noyau doit justifier son cout en complexite. Si un module ne peut pas etre implemente en moins de 2000 LOC (code metier hors UI), il doit etre redecoupe ou reporte. Le produit entier (hors `node_modules`, UI kit, migrations) ne devrait pas depasser 30k LOC en V1.

**Consequence concrete** : on commence avec 10 entites metier (Company, Contact, Opportunity, Quote, QuoteLine, Invoice, InvoiceLine, Product, Task, Note) au lieu des 32 workspace entities de Twenty ou des 40+ objets de Dolibarr.
