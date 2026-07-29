# Analyse EspoCRM - Agent D

> Analyse ciblée (budget 10%) du repo `/reference-crm/espocrm/`
> Focus : patterns CRM avancés exploitables pour un SaaS PME

---

## 1. Vue d'ensemble

EspoCRM est un CRM PHP monolithique bien architecturé, orienté **metadata-driven**. Toute la logique metier (entites, champs, layouts, ACL, relations) est declaree en JSON et interpretee au runtime. Le frontend est un SPA JavaScript vanilla (Backbone-like, pas de framework moderne).

**Stack** : PHP 8+ custom framework / ORM maison / Frontend JS vanilla (Backbone pattern)
**Taille estimee** : ~100k LOC backend, ~50k LOC frontend
**Licence** : AGPL v3

**Verdict rapide** : Architecture metadata-driven remarquable, ideal comme reference pour la couche "entites dynamiques" d'un CRM SaaS. Le frontend est date mais le backend est solide.

---

## 2. Cartographie metier

### Entites CRM core (module `Espo/Modules/Crm`)
| Entite | Role | Fichier cle |
|--------|------|-------------|
| Account | Entreprise cliente | `Modules/Crm/Resources/metadata/entityDefs/Account.json` |
| Contact | Personne physique liee a un Account | `entityDefs/Contact.json` |
| Lead | Prospect pre-qualification | `entityDefs/Lead.json` |
| Opportunity | Deal / pipeline de vente | `entityDefs/Opportunity.json` |
| Meeting / Call | Activites de suivi | `entityDefs/Meeting.json`, `Call.json` |
| Task | Actions a faire | `entityDefs/Task.json` |
| Case | Tickets support | `entityDefs/Case.json` |
| Campaign | Marketing / mass email | `entityDefs/Campaign.json` |
| Email | Emails integres | `Resources/metadata/entityDefs/Email.json` (core) |
| Document | Fichiers joints | `entityDefs/Document.json` |
| KnowledgeBaseArticle | Base de connaissances | `entityDefs/KnowledgeBaseArticle.json` |
| TargetList | Listes de prospection | `entityDefs/TargetList.json` |

### Relations cles
- **Lead -> Account + Contact + Opportunity** : conversion avec mapping de champs (`convertEntityList`, `convertFields` dans Lead.json)
- **Account -> Contact** : relation many-to-many avec colonnes supplementaires (`role`, `isInactive`)
- **Opportunity -> Contact** : many-to-many avec `role` (Decision Maker, etc.)
- **Activites polymorphiques** : Meeting/Call/Task/Email lies via `hasChildren` (relation polymorphique `parent`)
- **Campaign -> TargetList -> Account/Contact/Lead** : chaine complete de marketing

---

## 3. Architecture

### 3.1 Systeme Metadata-Driven (PATTERN CLE)

C'est le coeur d'EspoCRM. Tout est declare en JSON dans `Resources/metadata/` :

```
metadata/
  entityDefs/    -> Schema des entites (champs, liens, indexes)
  scopes/        -> Capacites par entite (ACL, stream, import, etc.)
  clientDefs/    -> Config frontend (vues, menus, panels)
  fields/        -> Definition des types de champs (currency, address, email, etc.)
  recordDefs/    -> Hooks, duplicate checking, config record-level
  aclDefs/       -> Classes ACL custom par entite
  selectDefs/    -> Config requetes / filtres
  layouts/       -> Layouts JSON (detail, list, filters, etc.)
```

**Fichier cle** : `application/Espo/Core/Utils/Metadata.php` (450 LOC)
- Merge hierarchique : core -> modules -> custom
- Cache avec invalidation
- API `get(['entityDefs', 'Account', 'fields', 'name'])` pour navigation profonde
- Builder pattern (`Espo/Core/Utils/Metadata/Builder.php`) pour assembler les layers

### 3.2 Architecture Service / Controller

```
Request -> Route -> Controller -> Record Service -> ORM Repository -> DB
                                     |
                                  ACL check
                                  Field validation
                                  Formula processing
                                  Hook execution
                                  Duplicate detection
```

**Fichiers cles** :
- `Core/Controllers/Record.php` : Controller generique CRUD, 80 LOC seulement
- `Core/Controllers/RecordBase.php` : Base avec search params parsing
- `Core/Record/Service.php` : **1800 LOC** - le coeur metier (create, read, update, delete, findLinked)
- `Core/Record/Crud.php` : Interface CRUD generique avec generics PHP

**Pattern remarquable** : Un seul `Record` controller + un seul `Record\Service` pour TOUTES les entites. La specialisation se fait via metadata, pas via heritage.

### 3.3 Systeme ACL multi-niveaux

**Fichiers cles** : `Core/Acl/`

Modele de permissions :
- **Scope-level** : CRUD + Stream par entite (Account: create=yes, read=team, edit=own, delete=no)
- **Entity-level** : Verification fine par record (ownership, team membership, shared access)
- **Niveaux** : `all` > `team` > `own` > `no`
- **Delete protege** : suppression permise pour le createur pendant 24h si `aclAllowDeleteCreated`

Pattern : `DefaultAccessChecker.php` utilise des closures lazy pour les checks ownership/team (performance).

Custom ACL par entite : declare dans `aclDefs/Email.json` avec des classes specifiques (`AccessChecker`, `OwnershipChecker`, `LinkChecker`).

### 3.4 Systeme de Layouts

Layouts declares en JSON, interpretables par le frontend :

```json
// layouts/Account/detail.json
[
  {
    "label": "Overview",
    "rows": [
      [{"name":"name"}, {"name":"website"}],
      [{"name":"emailAddress"}, {"name":"phoneNumber"}]
    ]
  }
]
```

Types de layouts : `detail`, `list`, `filters`, `massUpdate`, `bottomPanelsDetail`, `sidePanels`, `detailSmall`, `listSmall`.

### 3.5 Systeme de Types de Champs

Chaque type de champ (`currency`, `address`, `email`, `phone`, `enum`, `link`, etc.) est defini dans `metadata/fields/`.

**Exemple `currency.json`** : definit les sous-champs generes (currency code, converted value), la validation, le converter ORM, la factory de valeur objet. C'est un systeme de champs composites tres complet.

### 3.6 Formula Engine

`Core/Formula/Evaluator.php` : moteur de scripts/formules integre.
- Expression language custom (pas du PHP)
- Evaluable sur une entite
- Utilise pour l'automatisation (before-save formulas, workflow conditions)
- Extensible via `FunctionFactory` + class map

### 3.7 Email Integration

`Core/Mail/` : couche complete d'integration email
- `EmailSender.php` / `Sender.php` : envoi SMTP
- `Importer.php` : import IMAP
- `FiltersMatcher.php` : regles de filtrage
- `Parser.php` : parsing MIME
- Entites : `Email`, `EmailAccount`, `InboundEmail`, `EmailFilter`, `EmailFolder`, `GroupEmailFolder`

### 3.8 Outils metier avances

`Tools/` et `Modules/Crm/Tools/` :
- **Lead Conversion** : `Crm/Tools/Lead/ConvertService.php` + mapping de champs declaratif
- **Stream/Activity Feed** : `Tools/Stream/Service.php`
- **Lead Capture** : `Tools/LeadCapture/` (web-to-lead)
- **Mass Email / Campaign** : `Crm/Tools/Campaign/`, `MassEmail/`
- **Calendar** : `Crm/Tools/Calendar/`
- **PDF generation** : `Tools/Pdf/`
- **Working Time** : `Tools/WorkingTime/`

---

## 4. Patterns remarquables

### 4.1 Metadata-Driven Everything (9/10)
Le pattern le plus fort. Toute nouvelle entite se cree en ajoutant des fichiers JSON. Zero code pour un CRUD standard. C'est exactement ce qu'il faut pour un SaaS CRM ou les clients veulent personnaliser.

### 4.2 Lead Conversion avec Field Mapping (8/10)
Dans `entityDefs/Lead.json` :
```json
"convertEntityList": ["Account", "Contact", "Opportunity"],
"convertFields": {
  "Account": { "name": "accountName", "billingAddressStreet": "addressStreet" },
  "Opportunity": { "amount": "opportunityAmount", "leadSource": "source" }
}
```
Declaratif, zero code. Pattern a reprendre absolument.

### 4.3 Opportunity Stage + Probability Map (8/10)
```json
"probabilityMap": {
  "Prospecting": 10, "Qualification": 20, "Proposal": 50,
  "Negotiation": 80, "Closed Won": 100, "Closed Lost": 0
}
```
Pipeline de vente avec weighted forecast integre. Le champ calcule `amountWeightedConverted` fait le calcul directement en SQL (jointure Currency + formule).

### 4.4 Champs polymorphiques (7/10)
Les relations `hasChildren` permettent de lier Meeting/Call/Task/Email a n'importe quelle entite parente via un champ `parentType` + `parentId`. Pattern standard CRM mais bien implemente.

### 4.5 Optimistic Concurrency Control (7/10)
`"optimisticConcurrencyControl": true` dans entityDefs + `Record/ConcurrencyControl/`. Empech les conflits d'edition en multi-utilisateur.

### 4.6 Duplicate Detection Declarative (7/10)
`scopes/Account.json` : `"duplicateCheckFieldList": ["name", "emailAddress"]`
Detection automatique des doublons a la creation.

### 4.7 Field-level audit trail (7/10)
`"audited": true` sur les champs individuels. Historique des changements granulaire.

---

## 5. Faiblesses

### 5.1 Frontend obsolete
JavaScript vanilla avec pattern Backbone. Pas de TypeScript, pas de composants reactifs, pas de state management moderne. Le `clientDefs` couple fortement frontend et backend.

### 5.2 Pas de BPM/Workflow dans le core open-source
Le workflow engine n'est pas dans le repo open-source (c'est un add-on payant "Advanced Pack"). On ne peut pas l'analyser.

### 5.3 ORM maison
Pas Doctrine, pas d'ORM standard. L'ORM custom dans `Core/ORM/` est fonctionnel mais non standard, ce qui rend le code harder a comprendre pour de nouveaux devs.

### 5.4 Record Service monolithique
`Service.php` a 1800 LOC. Meme si le "extending is not recommended", c'est un god class. La composition via metadata aide mais le fichier reste massif.

### 5.5 Pas d'API REST structuree
L'API est implicite (routes generees depuis les controllers). Pas d'OpenAPI spec auto-generee, pas de versioning API explicite.

### 5.6 Single-tenant only
Aucune notion de multi-tenancy. Chaque client = une instance separee.

---

## 6. Reutilisation concrete

### Copier tel quel (8-9/10)
| Quoi | Score | Pourquoi |
|------|-------|----------|
| **Modele de donnees CRM** (entityDefs JSON) | 9/10 | Schema parfait pour Account, Contact, Lead, Opportunity. Le mapping Lead -> Account/Contact/Opportunity est un must-have |
| **Systeme de types de champs** (fields/*.json) | 8/10 | Le concept de champs composites (currency, address, phone) avec sous-champs generes est excellent |
| **ACL multi-niveaux** (own/team/all) | 8/10 | Modele de permissions CRM standard, bien pense |

### Adapter (6-7/10)
| Quoi | Score | Pourquoi |
|------|-------|----------|
| **Architecture metadata-driven** | 7/10 | Le concept est parfait mais l'implementation PHP/JSON doit etre reimaginee en TypeScript/Prisma |
| **Systeme de layouts** | 7/10 | Le principe de layouts declaratifs JSON est bon, mais a reimplementer avec un framework frontend moderne (React/Vue) |
| **Formula Engine** | 6/10 | Le concept d'automatisation no-code est bon. A reimplementer avec un DSL plus moderne ou JavaScript sandboxe |
| **Lead Conversion** | 7/10 | Le pattern declaratif est parfait, a adapter en API TypeScript |
| **Pipeline stages + probability** | 7/10 | Le concept est classique mais l'implementation declarative est elegante |

### Ne pas reproduire (< 5/10)
| Quoi | Score | Pourquoi |
|------|-------|----------|
| **Frontend Backbone** | 2/10 | Completement date. Utiliser React/Next.js |
| **ORM maison** | 3/10 | Utiliser Prisma ou Drizzle |
| **Architecture monolithique PHP** | 3/10 | Partir sur une archi API-first (Next.js API routes ou FastAPI) |
| **Controller generique unique** | 4/10 | L'approche "un controller pour tout" est elegante mais fragile. Preferer des routes typees |

---

## 7. Lecture recommandee

**Priorite haute** (lire en detail) :
1. `application/Espo/Modules/Crm/Resources/metadata/entityDefs/Lead.json` - Le modele Lead avec conversion
2. `application/Espo/Modules/Crm/Resources/metadata/entityDefs/Opportunity.json` - Pipeline + weighted amount
3. `application/Espo/Resources/metadata/fields/currency.json` - Systeme de champs composites
4. `application/Espo/Core/Acl/DefaultAccessChecker.php` - ACL multi-niveaux

**Priorite moyenne** :
5. `application/Espo/Core/Utils/Metadata.php` + `Metadata/Builder.php` - Architecture metadata
6. `application/Espo/Core/Record/Service.php` - Record service generique (parcourir, pas lire en entier)
7. `application/Espo/Modules/Crm/Resources/metadata/scopes/Account.json` - Capacites par entite
8. `application/Espo/Resources/metadata/entityDefs/Email.json` - Integration email

**Low-signal** (ne pas perdre de temps) :
- Frontend JS (`client/src/`) - obsolete
- ORM interne (`Core/ORM/`) - non standard
- Installation/upgrade scripts
- Traductions, themes
