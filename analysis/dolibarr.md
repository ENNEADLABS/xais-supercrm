# Analyse Dolibarr - Repo de reference CRM/ERP

> Analyse effectuee le 2026-03-25 sur le repo `dolibarr/` (~16000 fichiers PHP)
> Focus : modules CRM (societes, contacts, devis, commandes, factures, projets, agenda, documents, emails)

---

# 1. Vue d'ensemble

**Positionnement** : ERP/CRM open-source generaliste pour TPE/PME. Couvre la gestion commerciale complete : tiers, contacts, devis, commandes, factures, projets, agenda, documents, stock, comptabilite. Ecrit en PHP pur (pas de framework), architecture modulaire maison.

**Cible utilisateur** : TPE/PME francophones principalement, mais internationalise. Multi-societe, multi-devise.

**Niveau de maturite** : Tres eleve. 20+ ans de developpement, code actif jusqu'en 2026. Codebase massive mais bien structuree malgre l'age. Communaute large.

**Impression generale** : Le meilleur reference gratuit pour comprendre un workflow commercial complet (devis -> commande -> facture). La couverture metier est exhaustive. L'architecture est datee (PHP procedural + OOP hybride, pas d'ORM, pas de framework) mais les patterns metier sont matures et eprouves. Le code est verbeux mais lisible.

**Pourquoi lire ce repo** : C'est la reference incontournable pour les regles metier de gestion commerciale. Le workflow devis/commande/facture est complet, le systeme de permissions est granulaire, la gestion documentaire est solide. On n'y trouvera PAS de bonnes pratiques d'architecture moderne, mais on y trouvera les regles metier qu'on ne veut pas reinventer.

---

# 2. Cartographie metier

## Objets metier principaux

| Objet | Classe | Table SQL | Fichier cle |
|-------|--------|-----------|-------------|
| Tiers (Societe) | `Societe extends CommonObject` | `llx_societe` | `htdocs/societe/class/societe.class.php` (6082 lignes) |
| Contact | `Contact extends CommonObject` | `llx_socpeople` | `htdocs/contact/class/contact.class.php` (2299 lignes) |
| Devis (Proposal) | `Propal extends CommonObject` | `llx_propal` + `llx_propaldet` | `htdocs/comm/propal/class/propal.class.php` (4131 lignes) |
| Commande | `Commande extends CommonOrder` | `llx_commande` + `llx_commandedet` | `htdocs/commande/class/commande.class.php` (4483 lignes) |
| Facture | `Facture extends CommonInvoice` | `llx_facture` + `llx_facturedet` | `htdocs/compta/facture/class/facture.class.php` (6607 lignes) |
| Projet | `Project extends CommonObject` | `llx_projet` + `llx_projet_task` | `htdocs/projet/class/project.class.php` (2827 lignes) |
| Evenement/Action | `ActionComm extends CommonObject` | `llx_actioncomm` | `htdocs/comm/action/class/actioncomm.class.php` |
| Produit | `Product extends CommonObject` | `llx_product` | `htdocs/product/class/product.class.php` |
| Document ECM | `EcmFiles extends CommonObject` | `llx_ecm_files` | `htdocs/ecm/class/ecmfiles.class.php` |
| Email Collector | `EmailCollector extends CommonObject` | `llx_emailcollector_emailcollector` | `htdocs/emailcollector/class/emailcollector.class.php` |
| Utilisateur | `User extends CommonObject` | `llx_user` | `htdocs/user/class/user.class.php` |
| Groupe utilisateur | `UserGroup` | `llx_usergroup` | `htdocs/user/class/usergroup.class.php` |

## Relations entre objets

```
Societe (tiers)
  |-- 1:N --> Contact (socpeople, via fk_soc)
  |-- 1:N --> Propal (devis, via fk_soc)
  |-- 1:N --> Commande (via fk_soc)
  |-- 1:N --> Facture (via fk_soc)
  |-- 1:N --> Projet (via fk_soc)
  |-- 1:N --> ActionComm (agenda, via fk_soc)
  |-- parent/child --> Societe (hierarchie via parent)

Propal --> Commande --> Facture  (workflow principal, via element_element)
  |          |            |
  +----------+------------+----> Projet (fk_projet)
  +----------+------------+----> Contact (contacts associes par role)
```

Les liens entre objets (propal -> commande -> facture) utilisent une **table pivot generique `llx_element_element`** geree par `fetchObjectLinked()` et `add_object_linked()` dans `CommonObject`. C'est un pattern tres puissant : n'importe quel objet peut etre lie a n'importe quel autre.

## Couverture CRM

| Fonctionnalite | Present | Qualite |
|----------------|---------|---------|
| Devis (proposals) | Oui | Excellent - statuts complets, validite, signature en ligne |
| Factures | Oui | Excellent - standard, avoir, acompte, recurrente |
| Commandes | Oui | Excellent - intermediaire devis/facture |
| Emails (collecte) | Oui | Bon - EmailCollector via IMAP, creation auto d'objets |
| Documents | Oui | Bon - ECM, generation PDF, templates ODT |
| Taches | Oui | Bon - via module projet, taches avec temps passe |
| Activites/Agenda | Oui | Bon - ActionComm, rappels, lien multi-objets |
| Roles/Permissions | Oui | Excellent - granulaire par module, CRUD + avance |
| Pipeline/Opportunites | Partiel | Via statut prospect + graphe opportunites projets |

## Workflow devis -> commande -> facture (DETAIL)

### Statuts du devis (Propal)
- `STATUS_DRAFT` (0) : Brouillon
- `STATUS_VALIDATED` (1) : Valide, envoye au client
- `STATUS_SIGNED` (2) : Signe/accepte par le client
- `STATUS_NOTSIGNED` (3) : Refuse
- `STATUS_BILLED` (4) : Facture (clos)
- `STATUS_CANCELED` (-1) : Annule

### Statuts de la commande (Commande)
- `STATUS_DRAFT` (0) : Brouillon
- `STATUS_VALIDATED` (1) : Validee
- `STATUS_SHIPMENTONPROCESS` / `STATUS_ACCEPTED` (2) : En cours d'expedition
- `STATUS_CLOSED` (3) : Livree/fermee
- `STATUS_CANCELED` (-1) : Annulee

### Statuts de la facture (Facture)
- `STATUS_DRAFT` (0) : Brouillon
- `STATUS_VALIDATED` (1) : Validee
- `STATUS_CLOSED` (2) : Payee (+ close_code pour paiement partiel)
- `STATUS_ABANDONED` (3) : Abandonnee

### Mecanisme de conversion

**Propal -> Commande** :
- Fichier cle : `htdocs/commande/class/commande.class.php` methode `createFromProposal()`
- Copie toutes les lignes (produits, quantites, prix, TVA, extrafields)
- Copie les metadonnees (conditions de paiement, mode de reglement, projet, incoterms)
- Automatisable via le WorkflowManager : quand `PROPAL_CLOSE_SIGNED`, creation auto de commande si `WORKFLOW_PROPAL_AUTOCREATE_ORDER`

**Commande -> Facture** :
- Fichier cle : `htdocs/compta/facture/class/facture.class.php` methode `createFromOrder()`
- Meme logique de copie ligne par ligne
- Automatisable : quand `ORDER_CLOSE`, creation auto de facture si `WORKFLOW_ORDER_AUTOCREATE_INVOICE`

**Classification en cascade (WorkflowManager)** :
- Fichier cle : `htdocs/core/triggers/interface_20_modWorkflow_WorkflowManager.class.php`
- Quand facture validee (`BILL_VALIDATE`), peut automatiquement classifier la commande comme "facturee"
- Quand commande classifiee "facturee", peut automatiquement classifier le devis comme "facture"
- Comparaison des montants HT pour valider la coherence

Ce mecanisme est tres bien pense : chaque etape est independante (on peut sauter la commande), mais le workflow complet est supporte avec automation configurable.

---

# 3. Architecture

## Stack technique
- **Langage** : PHP 7.4+ (probablement 8.x supporte)
- **Base** : MySQL/MariaDB (via classe `DoliDB`)
- **Frontend** : PHP/HTML + jQuery (pas de framework JS moderne)
- **API REST** : Luracast Restler (classes `api_*.class.php` dans chaque module)
- **PDF** : Generation via classes `pdf_*.modules.php` et templates ODT
- **Email** : IMAP via `webklex/php-imap`, envoi via `CMailFile.class.php`
- **Pas de framework PHP** : Architecture maison 100%

## Organisation globale

```
htdocs/
  core/
    class/
      commonobject.class.php     # 11884 lignes - classe mere de TOUT
      commoninvoice.class.php    # classe intermediaire pour factures
      commonorder.class.php      # classe intermediaire pour commandes
      interfaces.class.php       # systeme de hooks
      CMailFile.class.php        # envoi d'emails
    modules/
      DolibarrModules.class.php  # classe mere de chaque module
      mod*.class.php             # descripteurs de modules
      facture/doc/               # generateurs PDF facture
    triggers/                    # triggers (evenements business)
  societe/class/                 # Tiers
  contact/class/                 # Contacts
  comm/propal/class/             # Devis
  commande/class/                # Commandes
  compta/facture/class/          # Factures
  projet/class/                  # Projets
  product/class/                 # Produits
  ecm/class/                     # GED
  emailcollector/class/          # Collecte d'emails
  user/class/                    # Utilisateurs et groupes
  api/                           # API REST
  install/mysql/tables/          # Schemas SQL
```

## Domain Logic

Toute la logique metier est dans les classes PHP. Chaque classe herite de `CommonObject` (11884 lignes) qui fournit :
- CRUD generique (`create`, `fetch`, `update`, `delete`)
- Gestion des lignes (`addline`, `updateLine`, `deleteLine`)
- Liens entre objets (`add_object_linked`, `fetchObjectLinked`)
- Extrafields (champs personnalises dynamiques)
- Generation de documents (`generateDocument`)
- Triggers (evenements)
- Gestion des statuts
- Notes publiques/privees
- Contacts associes par role

Chaque objet metier definit un array `$fields` declaratif qui decrit tous ses champs avec type, label, visibilite, position, etc. C'est un mini-ORM declaratif maison.

## Patterns d'extensibilite

### 1. Modules (DolibarrModules)
Chaque fonctionnalite est un module activable/desactivable. Le descripteur (`modXxx.class.php`) declare :
- Permissions (rights)
- Tables SQL a creer
- Menus
- Boxes (widgets dashboard)
- Triggers
- Constantes de configuration

### 2. Triggers
Les triggers sont des classes dans `htdocs/core/triggers/` ou `htdocs/<module>/core/triggers/`. Ils reagissent aux evenements business (PROPAL_CLOSE_SIGNED, BILL_VALIDATE, etc.) via la methode `runTrigger($action, $object, $user, $langs, $conf)`.

### 3. Hooks
Le hookmanager permet d'injecter du code a des points precis de l'execution. Les modules peuvent s'enregistrer sur des hooks.

### 4. Extrafields
Tout objet peut avoir des champs supplementaires definis dynamiquement. Tables `llx_*_extrafields`, gestion via `fetch_optionals()` et `insertExtraFields()`.

### 5. Canvas
Systeme (peu utilise) pour changer completement l'affichage d'un objet.

## Tests
- Repertoire `test/` avec phpunit, tests selenium, tests acceptance
- Structure basique mais existante

---

# 4. Patterns remarquables

## 4.1 Pattern "CommonObject" (classe mere universelle)
Toute entite metier herite de `CommonObject`. Cela donne un comportement uniforme : CRUD, triggers, extrafields, liens, documents, notes. C'est le pattern le plus puissant de Dolibarr.

**Pour notre SaaS** : Equivalent a un `BaseEntity` ou `BaseModel` en TypeScript. On peut reproduire ce pattern avec une classe/interface de base qui gere : audit (created_at, updated_at, user_id), soft delete, custom fields, liens entre entites, historique d'activite.

## 4.2 Pattern "element_element" (liens generiques entre objets)
La table `llx_element_element` lie n'importe quel objet a n'importe quel autre via `(sourcetype, fk_source, targettype, fk_target)`. Les methodes `add_object_linked` et `fetchObjectLinked` sont dans CommonObject.

**Pour notre SaaS** : Pattern directement reutilisable. Une table `entity_links(source_type, source_id, target_type, target_id)` permet de gerer devis->commande->facture sans couplage fort.

## 4.3 Pattern "WorkflowManager" (automation configurable)
Le `WorkflowManager` est un trigger qui ecoute les evenements business et enchaine les actions (creation auto de commande quand devis signe, etc.). Chaque action est controlable par une constante de configuration.

**Pour notre SaaS** : Modele excellent pour un systeme d'automations. Chaque transition du pipeline peut declencher des actions configurables.

## 4.4 Pattern "$fields" declaratif
Chaque classe definit ses champs via un array `$fields` qui specifie type, label, visibilite, validation, position. C'est un schema de metadonnees embarque dans la classe.

**Pour notre SaaS** : Approche similaire a Prisma ou Drizzle schema mais au runtime. Utile pour la generation automatique de formulaires, listes, exports.

## 4.5 Pattern "createFromXxx" (conversion entre objets)
`createFromProposal()`, `createFromOrder()` : copie structuree de toutes les lignes et metadonnees d'un objet a l'autre. Gere les extrafields, les marges, le multi-devise.

**Pour notre SaaS** : Pattern critique pour devis -> facture. La copie ligne par ligne avec preservation des montants, TVA et marges est un excellent modele.

## 4.6 Pattern "EmailCollector" (collecte d'emails IMAP)
Le module emailcollector se connecte via IMAP, filtre les emails, et peut creer automatiquement des objets (tiers, contacts, projets, tickets) a partir des emails recus.

**Pour notre SaaS** : Reference directe pour notre feature "emails multi-boites + extraction d'info".

## 4.7 Pattern "Generation de documents"
Chaque objet peut generer son document PDF via `generateDocument()`. Les templates sont des classes PHP (`pdf_azur.modules.php`) ou des fichiers ODT. Le document genere est stocke et trackable (`last_main_doc`).

## 4.8 Pattern de permissions granulaires
Les permissions sont declarees par module dans `modXxx.class.php` sous forme de tuples `[id, libelle, type, default, module, action]`. Verifiees via `$user->rights->module->action`. Supporte des permissions "avancees" optionnelles.

---

# 5. Faiblesses

## 5.1 CommonObject god-class
`CommonObject` fait 11884 lignes. C'est une god-class massive qui contient TOUT. Persistance, validation, UI helpers, generation de documents, gestion des extrafields, liens. Impossible a tester unitairement, impossible a composer proprement.

**A eviter** : Ne pas recreer un BaseEntity monolithique. Decoumper en concerns (persistence, audit, linking, documents) via composition/traits/mixins.

## 5.2 Pas de separation couches
Les classes metier font directement les requetes SQL (`$this->db->query()`). Il n'y a ni Repository pattern, ni Service layer, ni DTO. La logique metier, la persistance et parfois meme l'affichage sont melanges.

## 5.3 PHP procedural + OOP hybride
Les fichiers controleur (`card.php`, `list.php`) sont des scripts PHP proceduraux massifs qui gerent GET, POST, affichage dans le meme fichier. Pas de routing, pas de controlleurs au sens MVC.

## 5.4 Nommage inconsistant
Melange francais/anglais dans les noms de tables et champs : `llx_societe`, `llx_propal`, `fk_soc`, `datec`, `datep`, `fin_validite`, `fk_pays`. Champs deprecated jamais supprimes (`$statut` vs `$status`, `$nom` vs `$name`).

## 5.5 Pas d'ORM
Toutes les requetes sont ecrites a la main en SQL. Pas de query builder, pas de migrations propres (scripts SQL manuels). Les jointures sont ecrites dans chaque methode.

## 5.6 API REST sous-optimale
L'API REST utilise Luracast Restler, un framework REST peu connu et peu maintenu. Chaque module expose ses propres endpoints, mais la documentation est generee automatiquement.

## 5.7 Frontend date
jQuery + PHP rendus cote serveur. Pas de composants reactifs. L'UX est fonctionnelle mais datee. Non applicable pour un SaaS moderne.

## 5.8 Tests insuffisants
Malgre un repertoire `test/`, la couverture est faible pour un projet de cette taille. Pas de CI/CD visible dans le repo.

---

# 6. Reutilisation concrete

## Copier tel quel
- **Le schema metier du workflow devis -> commande -> facture** : les statuts, les transitions, les regles de calcul de montants (HT, TVA, TTC, remises). C'est la partie la plus precieuse.
- **La structure de la table llx_propal et llx_facture** : colonnes, types, commentaires. C'est un excellent point de depart pour notre schema Supabase/Postgres.
- **Le systeme de permissions par module** : la granularite (lire/creer/modifier/supprimer/exporter par module) est exactement ce qu'il faut pour un SaaS multi-utilisateurs.
- **Le modele Contact/Societe** : la relation N contacts pour 1 societe, avec les champs metier (civilite, poste, multi-phones, reseaux sociaux).

## Adapter
- **Le pattern element_element** (liens generiques entre objets) : a reimplementer en TypeScript/Postgres avec des foreign keys typees plutot que des strings.
- **Le pattern WorkflowManager** (automations declenchees par evenements) : a reimplementer avec un event bus moderne (pub/sub, webhooks).
- **Le pattern createFromXxx** (conversion devis->facture) : a reimplementer comme un service de transformation avec mapping explicite plutot que copie champ par champ.
- **L'EmailCollector** : le concept est bon (connexion IMAP, filtres, actions automatiques), mais a reimplementer avec une stack moderne (OAuth2, webhooks Gmail/Outlook plutot que polling IMAP).
- **Les extrafields** : le concept de champs personnalises dynamiques est utile mais a implementer avec JSON columns Postgres + validation Zod plutot que des tables *_extrafields.
- **La generation de documents PDF** : garder le concept (templates configurables par objet) mais utiliser des librairies modernes (react-pdf, puppeteer) plutot que des classes PHP.

## Ne pas reproduire
- **L'architecture god-class CommonObject** : 11884 lignes, tout dans une classe. Utiliser composition et separation des concerns.
- **Le SQL inline dans les classes metier** : utiliser un ORM (Prisma/Drizzle) ou au minimum un query builder.
- **Le routing/controleur procedural** : fichiers PHP monolithiques `card.php`, `list.php`. Utiliser Next.js App Router.
- **Le melange francais/anglais dans le code** : adopter l'anglais partout pour le code, le francais pour les labels/UI.
- **Le systeme de modules filesystem-based** : Dolibarr scanne des repertoires pour decouvrir les modules. Pas adapte a un SaaS moderne.
- **Luracast Restler** pour l'API : utiliser les API routes Next.js ou tRPC.
- **Le frontend jQuery + server-rendered PHP** : aucune valeur pour un SaaS React.

## Scores

| Critere | Score |
|---------|-------|
| Pertinence metier | **9/10** - Couverture commerciale exhaustive, workflow matur |
| Architecture | **4/10** - Datee, monolithique, pas de separation des couches |
| Note globale | **7/10** - Reference metier excellente malgre une architecture vieillissante |

---

# 7. Lecture recommandee

## Priorite haute (lire en premier)
1. `htdocs/core/triggers/interface_20_modWorkflow_WorkflowManager.class.php` - Le workflow complet devis->commande->facture en 300 lignes. LE fichier a lire.
2. `htdocs/comm/propal/class/propal.class.php` - Classe devis : statuts, addline, create, validate, generateDocument.
3. `htdocs/compta/facture/class/facture.class.php` - Classe facture : createFromOrder (ligne 1425), statuts, paiements.
4. `htdocs/commande/class/commande.class.php` - Classe commande : createFromProposal (ligne 1405).
5. `htdocs/societe/class/societe.class.php` - Classe tiers : modele de donnees, childtables (ligne 95-131).

## Priorite moyenne
6. `htdocs/install/mysql/tables/llx_propal.sql` - Schema SQL du devis.
7. `htdocs/install/mysql/tables/llx_facture.sql` - Schema SQL de la facture.
8. `htdocs/install/mysql/tables/llx_societe.sql` - Schema SQL des tiers.
9. `htdocs/core/class/commonobject.class.php` (lignes 4350-4600 seulement) - Les methodes `add_object_linked` et `fetchObjectLinked`.
10. `htdocs/emailcollector/class/emailcollector.class.php` - Collecte d'emails IMAP, actions automatiques.
11. `htdocs/core/modules/modSociete.class.php` - Declaration des permissions (pattern a reproduire).
12. `htdocs/contact/class/contact.class.php` - Modele Contact.
13. `htdocs/comm/action/class/actioncomm.class.php` - Modele Activite/Agenda.

## Priorite basse
14. `htdocs/ecm/class/ecmfiles.class.php` - GED.
15. `htdocs/core/modules/facture/doc/` - Generateurs PDF.
16. `htdocs/projet/class/project.class.php` - Projets.
17. `htdocs/core/class/commoninvoice.class.php` - Classe intermediaire factures.

## A ignorer completement
- `htdocs/langs/` - Traductions (milliers de fichiers)
- `htdocs/theme/` - Themes CSS
- `htdocs/includes/` - Librairies tierces
- `htdocs/install/` (sauf tables SQL)
- `htdocs/accountancy/` - Comptabilite avancee
- `htdocs/hrm/`, `htdocs/holiday/`, `htdocs/expensereport/` - RH
- `htdocs/adherent/` - Adhesions
- `htdocs/website/`, `htdocs/webportal/` - CMS
- `htdocs/bom/`, `htdocs/mrp/`, `htdocs/workstation/` - Fabrication
- `htdocs/admin/` - Administration systeme
- `htdocs/conf/` - Configuration
- Tous les fichiers `card.php`, `list.php`, `index.php` (controleurs proceduraux, pas de valeur architecturale)

## Ordre conseille de lecture
1. WorkflowManager (comprendre le flux global)
2. Schema SQL propal + facture (comprendre le modele de donnees)
3. Propal.class.php (comprendre la structure d'un objet metier Dolibarr)
4. Facture.class.php methode createFromOrder (comprendre la conversion)
5. Societe.class.php (comprendre les relations tiers/child tables)
6. modSociete.class.php (comprendre les permissions)
7. EmailCollector (comprendre la collecte d'emails)
