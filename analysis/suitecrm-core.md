# Analyse SuiteCRM-Core - Agent D

> Analyse ciblée (budget 10%) du repo `/reference-crm/SuiteCRM-Core/`
> Focus : patterns CRM avancés exploitables pour un SaaS PME

---

## 1. Vue d'ensemble

SuiteCRM-Core est la **reecriture moderne** de SuiteCRM (fork de SugarCRM CE). C'est une couche Symfony + API Platform + Angular posee **par-dessus** le legacy SuiteCRM. Le core moderne ne remplace pas le legacy : il le **wrappe**.

**Stack** : Symfony 5+ / API Platform 3 (REST + GraphQL) / Angular frontend / Legacy PHP (SugarCRM)
**Architecture** : Backend Symfony fait pont vers le legacy via des `LegacyHandler`
**Licence** : AGPL v3

**Verdict rapide** : L'architecture est un anti-pattern interessant a etudier. Le wrapping legacy montre comment NE PAS faire une migration. Mais l'utilisation d'API Platform + GraphQL est instructive pour notre propre API.

---

## 2. Cartographie metier

### Modules CRM (via `core/modules/`)
| Module | Equivalent EspoCRM |
|--------|-------------------|
| Accounts | Account |
| Contacts | Contact |
| Leads | Lead |
| Opportunities | Opportunity |
| Cases | Case |
| Tasks | Task |
| Emails | Email |
| Campaigns | Campaign |
| Events (Meetings/Calls) | Meeting + Call |
| Quotes | - (pas dans EspoCRM core) |
| Invoices | - |
| Contracts | - |
| Prospects | Target |
| ProspectLists | TargetList |

**Modules supplementaires vs EspoCRM** : Quotes, Invoices, Contracts. Ce sont des fonctionnalites classiques CRM que SuiteCRM inclut et qu'EspoCRM garde en extensions payantes.

### Modele de donnees
Le modele de donnees **n'est pas dans le core moderne**. Il vit entierement dans le legacy SugarCRM (table `sugarcrm.*`, fichiers `vardefs.php`). Le core Symfony n'a **aucune entite Doctrine** pour les donnees CRM. Tout passe par `BeanFactory` du legacy.

---

## 3. Architecture

### 3.1 Architecture "Wrapper Legacy" (PATTERN ANTI)

C'est l'aspect le plus frappant. Voici comment ca fonctionne :

```
Angular Frontend
    |
    v
API Platform (REST + GraphQL)
    |
    v
Symfony Controller/DataProvider/DataPersister
    |
    v
LegacyHandler (init/close scope)
    |
    v
chdir() vers legacy/ + require legacy PHP
    |
    v
BeanFactory / SugarQuery / Legacy modules
```

**Fichier cle** : `core/backend/Engine/LegacyHandler/LegacyHandler.php`

```php
public function init(): void {
    chdir($this->legacyDir);        // Change le working directory !
    $this->startSession();
    $this->state->setActiveScope($this->getHandlerKey());
}

public function runLegacyEntryPoint(): bool {
    require_once 'include/MVC/preDispatch.php';  // Bootstrap legacy complet
    require_once 'include/entryPoint.php';
}
```

Chaque operation CRUD fait un `init()` -> operation legacy -> `close()`. C'est un pattern de compatibilite, pas une vraie architecture.

### 3.2 API Platform + GraphQL (PATTERN UTILE)

L'utilisation d'API Platform est bien faite et instructive :

**`core/backend/Data/Entity/Record.php`** : Entite generique API Platform
- Utilise les attributs PHP 8 (#[ApiResource], #[ApiProperty])
- Expose REST (`/record/{id}`) et GraphQL (Query + Mutation) simultanement
- Un seul `Record` generique pour tous les modules (pas un endpoint par module)
- Attributs dynamiques via un array `attributes` (pas des proprietes typees)

```php
#[ApiResource(
    operations: [new Get(provider: RecordStateProvider::class)],
    graphQlOperations: [
        new Query(resolver: RecordItemResolver::class, args: ['module' => ['type' => 'String!']]),
        new Mutation(name: 'save', processor: RecordProcessor::class)
    ]
)]
```

**`core/backend/Process/Entity/Process.php`** : Pattern Command/Process
- Les operations complexes (mass update, merge, delete, etc.) sont modelisees comme des "Process"
- Chaque Process a un type, status, options, data
- Execute via une API unique PUT/Mutation
- Pattern bon pour les operations async

### 3.3 Metadata via API

**`core/backend/Metadata/Entity/AppMetadata.php`** : Endpoint unique qui renvoie toute la config de l'app
- systemConfig, userPreferences, language, navigation, moduleMetadata, adminMetadata
- Le frontend Angular charge tout en un seul appel GraphQL/REST
- Les metadonnees des modules viennent du legacy (pas de vraies entites Doctrine)

### 3.4 Module Name Mapping

**`core/backend/Module/LegacyHandler/ModuleNameMapperHandler.php`** : Convertit les noms legacy (ex: `AOS_Quotes`) vers des noms frontend propres (ex: `quotes`).

Pattern revelateur : le legacy utilise des prefixes (`AOS_`, `AOK_`, `AOD_`) que le core moderne doit nettoyer. Montre l'accumulation de dette technique.

### 3.5 Frontend Angular

`core/app/core/src/lib/` :
- `views/` : list, detail, record, create, kanban, admin, login, etc.
- `store/` : stores NgRx-like pour record, metadata, navigation, language
- `services/` : API, auth, metadata, formatters, modals
- `fields/` : composants de champs dynamiques
- `containers/` : composants conteneurs

Frontend plus moderne qu'EspoCRM mais **toujours couple au legacy** via les metadonnees.

### 3.6 Securite

`core/backend/Security/` :
- `AppJsonLoginAuthenticator.php` : Login JSON
- CSRF protection (cookie + token manager)
- LDAP + SAML support
- Two-Factor Authentication
- `UserChecker.php` : verification utilisateur
- Session management custom

---

## 4. Patterns remarquables

### 4.1 Entite Record Generique + API Platform (7/10)
Un seul endpoint API pour tous les modules CRM. Les attributs sont dynamiques (array, pas des colonnes fixes). C'est le bon pattern pour un CRM ou les entites sont configurables. API Platform genere automatiquement l'OpenAPI spec et le GraphQL schema.

### 4.2 Process Pattern pour operations complexes (7/10)
Les operations comme mass update, merge, lead conversion sont encapsulees dans des `Process` avec type/status/data. Ca permet :
- Execution asynchrone (`async: true`)
- Status tracking
- Interface API unifiee

### 4.3 AppMetadata en single-fetch (6/10)
Tout le metadata de l'app en un seul appel API. Reduit les round-trips au minimum pour le frontend. Pattern utile pour un SPA.

### 4.4 LegacyHandler avec scope isolation (5/10)
Le pattern `init()/close()` avec `LegacyScopeState` pour isoler les operations legacy est malin pour une migration. Mais c'est un pattern de transition, pas une cible.

---

## 5. Faiblesses

### 5.1 Pas de vraie couche de donnees
**C'est la faiblesse majeure.** Le core Symfony n'a AUCUNE entite Doctrine pour Account, Contact, Lead, etc. Tout passe par le legacy `BeanFactory`. Il n'y a pas de migration de donnees. En consequence :
- Pas de type safety
- Pas de migrations Doctrine
- Pas de relations modelisees
- La "modernisation" est cosmetique

### 5.2 chdir() dans le code
Le `LegacyHandler::init()` fait `chdir($this->legacyDir)`. C'est un hack global qui peut casser dans un contexte multi-requetes (workers async, par exemple).

### 5.3 Attributes array non type
Dans `Record.php`, les attributs CRM sont un simple `?array $attributes`. Aucun typage, aucune validation cote API Platform. Le schema GraphQL est `Iterable` (= any).

### 5.4 Double maintenance
Chaque fonctionnalite existe dans le legacy ET dans un LegacyHandler du core. Les Process handlers dans `Process/LegacyHandler/` re-wrappent chaque operation. Cout de maintenance x2.

### 5.5 Pas de test d'integration API
Le pattern LegacyHandler rend les tests difficiles (il faut bootstrapper tout le legacy).

### 5.6 Angular monolithique
Le frontend Angular est un monolithe. Pas de lazy loading par module CRM visible, pas de micro-frontend.

---

## 6. Reutilisation concrete

### Copier tel quel (8-9/10)
| Quoi | Score | Pourquoi |
|------|-------|----------|
| **Pattern API Platform avec Record generique** | 8/10 | L'idee d'un seul endpoint pour tous les modules avec attributs dynamiques est la bonne approche. A reimplementer avec notre propre stack |
| **Couverture fonctionnelle** (Quotes, Invoices, Contracts) | 8/10 | La liste des modules donne la roadmap fonctionnelle d'un CRM complet |

### Adapter (6-7/10)
| Quoi | Score | Pourquoi |
|------|-------|----------|
| **Process pattern** | 7/10 | L'abstraction des operations complexes en Process typees est bonne. A reimplementer avec un job queue (BullMQ, etc.) |
| **AppMetadata single-fetch** | 7/10 | Le pattern de charger toutes les metadonnees en un seul appel est efficace pour un SPA. A adapter avec ISR/RSC en Next.js |
| **Module name mapping** | 6/10 | L'idee d'avoir des noms internes vs noms d'affichage est necessaire. Mais plus simple a gerer avec un mapping statique |
| **Structure frontend** (views/store/services/fields) | 6/10 | L'organisation du code Angular est propre. A transposer en architecture React |

### Ne pas reproduire (< 5/10)
| Quoi | Score | Pourquoi |
|------|-------|----------|
| **LegacyHandler / wrapping** | 1/10 | Anti-pattern par definition. Ne jamais wrapper un legacy. Reecrire proprement |
| **Attributs non types (array)** | 2/10 | Utiliser des schemas validates (Zod, JSON Schema) |
| **chdir() pour le legacy** | 1/10 | Hack absolu |
| **Absence d'entites Doctrine** | 2/10 | Un CRM DOIT avoir un schema de donnees fort. Utiliser Prisma/Drizzle avec des schemas stricts |
| **Double source de verite** (legacy + core) | 1/10 | Une seule source de verite, toujours |

---

## 7. Lecture recommandee

**Priorite haute** (lire en detail) :
1. `core/backend/Data/Entity/Record.php` - Pattern API Platform pour CRM generique
2. `core/backend/Process/Entity/Process.php` - Pattern Process pour operations complexes
3. `core/backend/Metadata/Entity/AppMetadata.php` - Metadata single-fetch

**Priorite moyenne** :
4. `core/backend/Security/` - Vue d'ensemble de la securite (CSRF, LDAP, SAML, 2FA)
5. `core/app/core/src/lib/store/` - Architecture state management frontend
6. `core/modules/` - Liste des modules = roadmap fonctionnelle

**Low-signal** (ne pas perdre de temps) :
- `LegacyHandler` (tous) - Pattern de transition, pas de valeur pour nous
- `core/backend/Install/` - Specifique a l'installation on-premise
- Frontend Angular en detail - On part sur React/Next.js
- Config Symfony/Doctrine - Pas de modele de donnees a y trouver

---

## Comparaison rapide EspoCRM vs SuiteCRM-Core

| Critere | EspoCRM | SuiteCRM-Core |
|---------|---------|---------------|
| **Modele de donnees** | Excellent (JSON declaratif) | Inexistant dans le core (legacy) |
| **Architecture backend** | Monolithe PHP solide | Symfony wrapper sur legacy |
| **API** | Implicite (controllers) | API Platform (REST + GraphQL) |
| **Frontend** | JS vanilla (date) | Angular (moderne mais monolithique) |
| **Metadata system** | Tres mature (10+ types) | Facade sur le legacy |
| **Valeur pour nous** | **Haute** (modele CRM + metadata) | **Moyenne** (API patterns + couverture fonctionnelle) |
| **A fuir** | Frontend, ORM maison | LegacyHandler, absence de schema |
