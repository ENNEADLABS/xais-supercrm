# 03 - Workflows

> Note d'architecture domaine pour ENNEAD Studio Creator
> Derniere mise a jour : 2026-03-25

---

## 1. Workflows V1

### 1.1 Creation/qualification d'un contact ou d'une societe

**Declencheur** : Utilisateur cree un contact/societe manuellement, par import CSV, ou via reception d'email.

**Etapes** :
1. Saisie des informations (formulaire ou import)
2. **Auto-populate** (trigger SQL, pattern Atomic CRM) :
   - Contact : fetch avatar via Gravatar (hash MD5 de l'email)
   - Company : fetch logo via favicon du site web (Google Favicon API)
3. **Detection de doublons** (pattern EspoCRM `duplicateCheckFieldList`) :
   - Contact : check `(first_name + last_name)` OU `email` dans le meme tenant
   - Company : check `name` OU `siren` dans le meme tenant
   - Si doublon detecte : alerte non-bloquante avec proposition de merge ou d'abandon
4. **Merge optionnel** (pattern Atomic CRM `merge_contacts`) :
   - Fusion SQL transactionnelle : reparentage notes, taches, emails, deals
   - Deduplication emails/phones
   - Choix du "winner" (fiche principale conservee)
5. **Rattachement** : Contact lie a une Company (choix ou creation), tags assignes
6. Log activite automatique (`contact.created` ou `company.created`)

**Resultat** : Contact/Societe cree, enrichi, sans doublon, avec activite logguee.

**Automatisable** : Oui pour auto-populate et detection doublons. Non pour le merge (choix humain requis).

---

### 1.2 Pipeline d'opportunite (qualification -> won/lost)

**Declencheur** : Utilisateur cree une opportunite depuis la fiche Company ou le board Kanban.

**Etapes** :
1. Creation avec company_id obligatoire, stage initial = premiere etape du pipeline tenant
2. Attribution a un utilisateur (assigned_to) -- auto-assign au createur par defaut (trigger SQL, pattern Atomic CRM `set_sales_id_default`)
3. Rattachement de contacts avec role (decision_maker, influencer, user)
4. Progression dans le pipeline :
   - Drag & drop sur le kanban (persistence optimiste, pattern Atomic CRM)
   - Chaque changement de stage met a jour `probability` automatiquement via la `probability_map` du tenant (pattern EspoCRM)
   - `weighted_amount` recalcule automatiquement (colonne generee)
5. Evenements terminaux :
   - **Won** : `opportunity.won` -> proposition de creer un devis/facture, Company.status -> client
   - **Lost** : `opportunity.lost` -> saisie obligatoire de `lost_reason`, log activite

**Resultat** : Opportunite tracee de bout en bout, forecast automatique, historique complet.

**Automatisable** : Auto-assign, recalcul probability/weighted_amount, log activite. La progression entre stages est manuelle (decision commerciale).

---

### 1.3 Devis : creation -> validation -> envoi -> signature

**Declencheur** : Utilisateur cree un devis depuis une opportunite, une fiche company, ou depuis zero.

**Etapes** :
1. **Creation** (status = `draft`) :
   - Choix du client (company + contact)
   - Rattachement optionnel a une opportunite
   - Ajout de lignes (depuis le catalogue Product ou en saisie libre)
   - Calcul automatique des totaux (HT, TVA, TTC) a chaque modification de ligne
   - Possibilite de remise globale ou par ligne
2. **Validation** (status = `validated`) :
   - Verification : au moins une ligne, total > 0
   - Generation de la reference definitive (DEV-2026-XXXX, compteur sequentiel par tenant/annee)
   - Le contenu est "gele" (modifications interdites sauf retour a draft)
   - Date d'emission enregistree
3. **Envoi** (status = `sent`) :
   - Generation du PDF (via @react-pdf/renderer, template configurable par tenant)
   - Stockage du PDF dans Supabase Storage
   - Envoi par email au contact (via le CRM ou manuellement)
   - Date d'envoi enregistree
   - Validity_date demarre si configuree
4. **Signature** (status = `signed`) :
   - L'utilisateur marque le devis comme signe
   - `signed_at` enregistre
   - Declenchement de `quote.signed` -> proposition de conversion en facture
5. **Ou refus** (status = `refused`) :
   - L'utilisateur marque le devis comme refuse
   - Raison du refus optionnelle
   - Si lie a une opportunite, notification pour mise a jour du stage

**Resultat** : Devis professionnel PDF, envoye, avec tracking du statut.

**Automatisable** : Calcul totaux, generation reference, generation PDF, envoi email. La validation, l'envoi et la signature sont des actions humaines.

---

### 1.4 Devis signe -> Facture

**Declencheur** : Devis passe au statut `signed`. Le systeme propose la creation d'une facture.

**Etapes** :
1. **Proposition** : Notification a l'utilisateur "Le devis DEV-2026-0042 a ete signe. Creer la facture ?"
2. **Conversion** (pattern Dolibarr `createFromProposal`) :
   - Creation d'une Invoice en status `draft`
   - Copie structuree de toutes les QuoteLines vers des InvoiceLines :
     - Description, quantite, unite, prix unitaire, remise, taux TVA
     - Recalcul des totaux
   - Copie des metadonnees : company_id, contact_id, payment_terms, payment_method, currency
   - Creation d'un EntityLink `(quote -> invoice, type: converted_to)` pour tracer la filiation
3. **Statut du devis** : passe a `invoiced` (terminal)
4. **Suite** : L'utilisateur peut modifier la facture en draft avant de la valider

**Configuration** (pattern Dolibarr WorkflowManager) :
- `auto_create_invoice_on_quote_signed: boolean` dans tenant settings
- Si active, la facture est creee automatiquement sans intervention
- Si desactive, simple notification/proposition

**Resultat** : Facture draft creee avec toutes les donnees du devis, liee par EntityLink.

**Automatisable** : Oui, configurable par tenant. C'est un des workflows les plus precieux car il elimine la double saisie.

---

### 1.5 Reception email -> extraction -> rattachement

**Declencheur** : Email importe depuis un compte connecte (sync periodique ou webhook push).

**Etapes** :
1. **Import** (driver pattern Twenty) :
   - Le driver (Gmail/Microsoft/IMAP) recupere les nouveaux emails depuis le dernier `sync_cursor`
   - Chaque email est deduplicable par `message_id` (header standard)
   - Stockage dans la table `emails`
2. **Extraction des participants** :
   - Parse des champs From, To, CC, BCC
   - Creation des EmailParticipant
3. **Matching contacts** (pattern Twenty `match-participant`) :
   - Pour chaque adresse email de participant :
     - Recherche dans `contact_emails` du tenant
     - Si match : lien `EmailParticipant.contact_id`
     - Si pas de match et config `auto_create_contact_from_email: true` : creation d'un contact minimal (email + nom extrait du display name)
4. **Rattachement a la timeline** :
   - L'email apparait dans la timeline de chaque contact matche
   - Mise a jour du `last_seen` des contacts concernes (trigger SQL)
5. **Extraction intelligente (V1.5/V2)** :
   - Extraction de donnees structurees depuis le corps de l'email (montants, dates, numeros de devis) via LLM
   - Proposition d'enrichissement des fiches contacts/opportunites

**Resultat** : Emails synchronises, rattaches aux bons contacts, visibles dans les timelines.

**Automatisable** : Entierement automatique. L'utilisateur ne fait rien apres avoir connecte son compte.

---

### 1.6 Creation/assignation de tache

**Declencheur** : Utilisateur cree une tache depuis la fiche d'un objet CRM (contact, company, opportunity, quote) ou depuis la vue taches globale.

**Etapes** :
1. Saisie : titre, description, priorite, date d'echeance, assignee
2. Rattachement polymorphe a l'objet source (entity_type + entity_id)
3. Si assignee != createur : notification a l'assignee
4. Log activite automatique sur l'objet parent

**Sous-workflows** :
- **Tache en retard** : pg_cron toutes les heures verifie les taches `due_date < now() AND status != done`. Notification a l'assignee et au manager.
- **Completion** : `task.completed` -> log activite, notification au createur si createur != assignee

**Resultat** : Tache tracee, assignee, avec rappels automatiques.

**Automatisable** : Notifications et detection retard automatiques. La creation et la completion sont manuelles.

---

### 1.7 Log d'activite automatique

**Declencheur** : Toute action significative sur un objet CRM.

**Implementation** (double approche) :

1. **Vue SQL `activity_log`** (pattern Atomic CRM) :
   - UNION ALL des dernieres creations/modifications sur : contacts, companies, opportunities, quotes, invoices, emails
   - Colonnes normalisees : type, entity_type, entity_id, actor_id, metadata (jsonb), occurred_at
   - Pas de table a maintenir, toujours coherent
   - Utilisee pour le dashboard "activite recente" et les timelines d'objets

2. **Table `activities`** :
   - Pour les activites manuelles qui n'ont pas de table source : appels, reunions, notes de suivi
   - Insert via l'UI

3. **Timeline unifiee par objet** :
   - Requete qui merge `activity_log` (filtre par entity_type/entity_id) + `activities` + `notes` + `emails` (via participants)
   - Triee par date descendante
   - Paginee (infinite scroll)

**Resultat** : Historique complet de toutes les interactions sur chaque objet, sans aucune action supplementaire de l'utilisateur.

**Automatisable** : 100% automatique. C'est le point.

---

## 2. Workflows a automatiser (sans intervention humaine)

| Workflow | Implementation | Justification |
|----------|---------------|---------------|
| Auto-populate avatar/logo | Trigger SQL `AFTER INSERT` | Enrichissement gratuit, aucun risque (pattern Atomic CRM) |
| Detection de doublons | Fonction SQL appelee a l'insert | Feedback immediat, non-bloquant |
| Recalcul totaux devis/facture | Trigger SQL `AFTER INSERT/UPDATE/DELETE` sur les lignes | Coherence des montants garantie |
| Recalcul amount_paid/amount_due | Trigger SQL `AFTER INSERT` sur payments | Transition auto vers `paid` |
| Generation reference definitive | Fonction SQL a la validation | Compteur sequentiel atomique |
| Auto-assign sales_id | Trigger SQL `BEFORE INSERT` | Default = utilisateur courant (pattern Atomic CRM) |
| Matching email -> contact | Edge Function post-import | Rattachement automatique a la timeline |
| Log d'activite | Vue SQL UNION ALL | Zero maintenance |
| Sync email periodique | pg_cron toutes les 5 min | Transparente pour l'utilisateur |
| Probability recalcul | Trigger SQL sur Opportunity.stage | Forecast toujours a jour |
| Notification tache en retard | pg_cron toutes les heures | Rappel proactif |

---

## 3. Workflows a validation humaine obligatoire

| Workflow | Raison | Consequence d'une auto |
|----------|--------|----------------------|
| **Validation d'un devis** | Engage l'entreprise commercialement | Devis invalide envoye au client |
| **Envoi d'un devis/facture** | Communication client directe | Spam ou document incorrect |
| **Signature d'un devis** | Confirmation legale d'acceptation | Engagement non desire |
| **Validation d'une facture** | Document comptable IMMUTABLE apres validation (obligation legale FR) | Facture avec erreur impossible a corriger |
| **Envoi d'une facture** | Communication client + declenchement echeance de paiement | Compteur de retard premature |
| **Annulation d'une facture** | Necessite un avoir (credit note) | Incoherence comptable |
| **Merge de contacts** | Perte de donnees possible si mauvais choix | Fusion de 2 personnes differentes |
| **Suppression d'un objet** | Irreversible apres purge | Perte de donnees |
| **Progression d'opportunite vers won/lost** | Decision commerciale | Faux positif dans le forecast |
| **Creation d'un contact depuis email inconnu** | Proposition, pas creation auto en V1 | Pollution du CRM avec des contacts non pertinents |

**Principe** : Tout ce qui engage l'entreprise vis-a-vis d'un tiers, ou tout ce qui est irreversible, necessite une action humaine explicite.

---

## 4. Workflows a differer (V2+)

| Workflow | Raison du report | Priorite |
|----------|-----------------|----------|
| **Lead conversion** (Lead -> Account + Contact + Opportunity avec field mapping declaratif, pattern EspoCRM) | En V1, on fusionne Lead et Contact. La distinction Lead/Contact est utile quand le volume de prospects augmente. | V2 |
| **Sequences email automatiques** (drip campaigns) | Necessite un moteur de workflow, des templates, du tracking ouverture/clic. Complexite elevee. | V2+ |
| **Scoring de contacts/opportunites** (lead scoring) | Necessite des donnees d'interaction suffisantes et un modele de scoring a calibrer. | V2 |
| **Workflow builder visuel** (if/then/else pour les utilisateurs non-tech, inspire Twenty simplifie) | Forte valeur mais complexite de dev enorme. Commencer par des automations codees et configurables. | V2+ |
| **Relance automatique de factures impayees** | Sensible juridiquement (mise en demeure), necessite des templates legaux et des delais configurables. | V2 |
| **Commande intermediaire** (entre devis et facture, pattern Dolibarr complet) | Les PME francaises facturent generalement directement depuis le devis. L'etape commande est utile pour le e-commerce et l'industrie. | V2 |
| **Sync calendrier** (Google/Microsoft Calendar, pattern Twenty) | Utile mais pas critique pour un CRM PME. Les rendez-vous peuvent etre logues manuellement en V1. | V2 |
| **Generation automatique de devis depuis opportunite** | Pre-remplissage des lignes depuis les produits lies a l'opportunite. Necessite d'abord un vrai rattachement produit-opportunite. | V2 |
| **Webhooks sortants configurables** | Integrations tierces (comptabilite, Slack, etc.). API-first suffit en V1. | V2+ |
| **Import/export avance** (CSV/Excel avec mapping, preview, rollback) | Import CSV basique en V1 (pattern Atomic CRM). Import avance avec preview/rollback en V2. | V2 |
| **Factures recurrentes** | Utile pour les abonnements/contrats. Necessite un scheduler et une logique de generation. | V2 |
| **Signature electronique integree** | Aucun CRM open-source ne l'a. Integration avec un service tiers (Yousign, DocuSign) plutot que dev interne. | V2+ |

---

## 5. Points de friction typiques a eviter

### 5.1 Trop de clics pour une action simple (lecon Dolibarr)

Dolibarr necessite souvent 4-5 clics pour valider un devis : ouvrir le devis, cliquer "Valider", confirmer, cliquer "Envoyer", confirmer. Chaque etape recharge la page.

**Notre approche** : Actions groupees et inline. Le bouton "Valider et envoyer" fait les deux en un clic. Les confirmations sont des popovers legers, pas des pages intermediaires. Le status change en temps reel sans rechargement (optimistic update).

### 5.2 Trop de configuration initiale (lecon Twenty)

Twenty demande de configurer les metadata objects, fields, views, filtres, permissions avant d'etre utilisable. Un dirigeant PME veut un outil qui marche "out of the box".

**Notre approche** : Configuration par defaut complete et opinionnee des le premier tenant. Le pipeline a 5 etapes par defaut. Les taux de TVA francais sont pre-configures. Le format de reference devis/facture est pre-configure. L'utilisateur peut personnaliser plus tard, mais il demarre immediatement.

### 5.3 Pas de vue d'ensemble (lecon tous les CRM)

Aucun CRM analyse n'offre un vrai cockpit dirigeant. Ils ont des dashboards de widgets, mais pas une vue synthetique de l'etat de l'entreprise.

**Notre approche** : Le cockpit est la page d'accueil. Il montre en un regard : CA en cours, factures en retard, opportunites par etape, taches urgentes, derniers emails importants, prochaines echeances. Pas de widgets a configurer -- c'est fixe et opinione.

### 5.4 Deconnexion email / CRM (lecon Atomic CRM)

Atomic CRM ne supporte que l'inbound webhook Postmark. L'utilisateur doit envoyer ses emails depuis sa boite mail et esperer que le BCC fonctionne. Les emails ne sont pas dans le CRM.

**Notre approche** : Connexion directe aux boites Gmail/Microsoft/IMAP. Les emails sont dans la timeline de chaque contact, sans action supplementaire. C'est la feature qui differencie un CRM utilisable d'un carnet d'adresses.

### 5.5 Duplication de saisie entre devis et facture (lecon universelle)

Recopier les informations d'un devis dans une facture est une perte de temps et une source d'erreurs.

**Notre approche** : Conversion en un clic (pattern Dolibarr `createFromProposal`). Le devis signe se transforme en facture draft avec toutes les lignes copiees. Zero ressaisie.

### 5.6 Permissions trop simples ou trop complexes

Atomic CRM : 2 roles (admin/user), pas de restrictions. EspoCRM : propre mais complexe. Twenty : 4 niveaux de permissions avec row-level.

**Notre approche** : 3 roles (admin, manager, member) avec scope own/team/all sur les entites sensibles (opportunities, quotes, invoices). Simple a comprendre, suffisant pour une PME de 2-50 personnes. Le systeme d'ACL EspoCRM est la cible a terme (V2), mais en V1, 3 roles couvrent 90% des besoins.

### 5.7 Absence de contexte dans les listes

Les listes de contacts/opportunites sans contexte (dernier email, derniere activite, montant en cours) ne servent a rien.

**Notre approche** : Vues summary enrichies (pattern Atomic CRM `contacts_summary`) qui aggregent les compteurs et dates cles directement dans la vue SQL. Le tableau affiche "derniere interaction il y a 3 jours" et "2 devis en cours pour 15 000 EUR" sans clic supplementaire.

---

## 6. Workflows a plus forte valeur pour un dirigeant PME

### #1 : Devis signe -> Facture en un clic

**Pourquoi c'est le workflow #1** : C'est le point de conversion le plus douloureux pour une PME. Le dirigeant passe ses soirees a recopier des devis en factures sur Excel. Un CRM qui supprime cette friction justifie son abonnement a lui seul.

**Implementation** : Pattern Dolibarr `createFromProposal` adapte en TypeScript. Service `QuoteToInvoiceService` qui copie les lignes, recalcule les totaux, cree l'EntityLink. Declenchable automatiquement (configurable) ou manuellement apres signature.

---

### #2 : Timeline unifiee par contact/societe

**Pourquoi** : Le dirigeant PME veut voir "tout ce qui s'est passe" avec un client en un regard. Emails, devis, factures, notes, taches, rendez-vous. Sans chercher dans 5 onglets differents.

**Implementation** : Vue SQL UNION ALL (pattern Atomic CRM) + merge des tables d'activites, notes, emails. Infinite scroll. Filtrable par type. C'est la fiche client moderne que Dolibarr ne sait pas faire.

---

### #3 : Email -> CRM sans effort

**Pourquoi** : Le dirigeant PME passe 60% de son temps dans sa boite mail. Si les emails ne sont pas dans le CRM, le CRM n'est pas utilise. C'est la raison #1 d'abandon des CRM par les PME.

**Implementation** : Connexion OAuth en 2 clics (Gmail/Microsoft). Sync automatique. Matching contacts transparent. L'email apparait dans la fiche client sans aucune action. Le dirigeant n'a pas besoin de "penser CRM" quand il envoie un email.

---

### #4 : Cockpit "etat de mon entreprise" en un regard

**Pourquoi** : Le dirigeant ne veut pas naviguer dans un CRM. Il veut ouvrir une page et savoir : combien de CA en attente, quelles factures sont en retard, quelles opportunites avancent, quelles taches sont urgentes.

**Implementation** : Dashboard fixe (pas de widgets a configurer). Vues SQL pre-calculees :
- Forecast = SUM(weighted_amount) par mois (vue SQL)
- Factures en retard = invoices WHERE status = sent AND due_date < now()
- Pipeline = COUNT + SUM(amount) par stage
- Activite = 10 dernieres interactions

---

### #5 : Suivi des paiements et alertes retard

**Pourquoi** : Le BFR (besoin en fonds de roulement) est le sujet #1 du dirigeant PME. Savoir quelles factures sont payees, lesquelles sont en retard, et avoir des alertes proactives, c'est critique.

**Implementation** :
- Chaque paiement est enregistre et declenche le recalcul de `amount_due`
- Vue dashboard "factures en retard" avec montant total et age du retard
- Notification automatique quand une facture depasse sa date d'echeance (pg_cron)
- Relance manuelle en V1, automatisee en V2

---

## 7. Resume des priorites d'implementation

| Priorite | Workflow | Effort | Valeur |
|----------|----------|--------|--------|
| **P0** | Log d'activite automatique | Faible (vue SQL) | Haute |
| **P0** | Auto-populate (avatar, logo) | Faible (triggers) | Moyenne |
| **P0** | Recalcul totaux devis/facture | Faible (triggers) | Critique |
| **P0** | Pipeline opportunite + kanban | Moyen | Haute |
| **P0** | Workflow devis (draft -> signed) | Moyen | Haute |
| **P0** | Devis -> Facture (conversion) | Moyen | Tres haute |
| **P0** | Workflow facture + paiements | Moyen | Haute |
| **P1** | Sync email multi-boites | Eleve | Tres haute |
| **P1** | Matching email -> contacts | Moyen | Haute |
| **P1** | Detection doublons | Moyen | Moyenne |
| **P1** | Taches + notifications retard | Faible | Moyenne |
| **P1** | Merge contacts | Moyen | Moyenne |
| **P1** | Cockpit dirigeant | Moyen (vues SQL) | Tres haute |
| **P2** | Import CSV contacts | Moyen | Moyenne |
| **P2** | Generation PDF devis/facture | Moyen | Haute |
| **P2** | Lead conversion (V2) | Eleve | Moyenne |
| **P2** | Relance factures (V2) | Moyen | Haute |
