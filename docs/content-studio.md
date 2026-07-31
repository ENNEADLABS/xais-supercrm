# Content Studio — Guide d'utilisation

> Module de production éditoriale intégré au CRM.
> Chaîne : idées → contenus → scripts → assets → livrables dérivés → publication.
> Multi-tenant (isolation par organisation), réutilise les modules CRM
> existants (tâches, documents, activités).

## Accès

- Entrée **Studio** (icône clap) dans la sidebar, ou `/studio`.
- `/studio` ouvre le **cockpit quotidien**.
- Le cockpit donne accès au board, aux idées, au calendrier, aux templates et
  aux publications.

## Routes

| Route                     | Écran                                  |
| ------------------------- | -------------------------------------- |
| `/studio`                 | Cockpit quotidien                      |
| `/studio/board`           | Kanban éditorial (9 colonnes)          |
| `/studio/ideas`           | Liste des idées                        |
| `/studio/ideas/new`       | Création d'une idée                    |
| `/studio/content/[id]`    | Fiche détaillée d'un contenu           |
| `/studio/calendar`        | Calendrier éditorial mensuel           |
| `/studio/templates`       | Liste des templates                    |
| `/studio/templates/new`   | Création d'un template                 |
| `/studio/templates/[id]`  | Édition d'un template                  |
| `/studio/publications`    | Livrables groupés par canal et semaine |

---

## Fonctionnalités

### 1. Cockpit — `/studio`

Quatre listes opérationnelles dérivées des contenus, assets, checklists et tâches :
contenus en retard, à valider, à produire cette semaine et bloqués.

### 2. Idées — `/studio/ideas`

Capturer une intention avant de produire.

- **Créer** : « Nouvelle idée » → titre (obligatoire), format envisagé,
  priorité, cible, date de publication souhaitée, angle, promesse, accroche,
  notes.
- **Convertir en contenu** : bouton « Convertir » sur une carte → choix du
  format → crée un Content Piece et redirige vers sa fiche. L'idée passe en
  `archivée` (elle a accompli son rôle).
- **Supprimer** : icône corbeille (réservé admin).

### 3. Kanban éditorial — `/studio/board`

Vue centrale de production.

- **9 colonnes** (cycle de vie) : Idée → Recherche → Script → Tournage →
  Montage → Relecture → Planifié → Publié → Archivé.
- **Déplacer** : glisser-déposer une carte entre colonnes → le statut est mis
  à jour immédiatement (optimistic update, persisté). Toutes les transitions
  sont libres.
- **Créer un contenu** : bouton « Nouveau contenu » (statut Idée par défaut)
  ou le `+` en tête de colonne (statut pré-rempli).
- **Carte** : titre (→ fiche), format, priorité (couleur), date planifiée
  (rouge si en retard), **barre d'avancement de la checklist**.

### 4. Fiche contenu — `/studio/content/[id]`

En-tête : titre, format, priorité, date + **sélecteur de statut** (changer le
statut sans passer par le board). 7 onglets :

- **Script** : éditeur structuré (accroche, intro, structure, points clés,
  CTA, notes de tournage, version courte, version longue). « Enregistrer le
  script » (un script par contenu).
- **Assets** : « Ajouter un asset » → rôle (miniature, vidéo brute/finale,
  clip, audio, transcript, doc script, asset de marque, référence) + source
  (**lien externe** Loom/Cap/Figma/Drive… **ou document GED** déjà attaché) +
  libellé de version + marqueur **finale** (★).
- **Livrables** : sorties dérivées (3 Shorts, post Skool, newsletter…) avec
  titre, format et statut modifiable inline. En dessous, la **matrice de
  repurposing** (tableau format × statut).
- **Checklist** : checklist de production (ajouter, cocher, supprimer). Alimente
  la barre d'avancement des cartes du board.
- **Tâches** : module Tasks réutilisé (créer/compléter/supprimer).
- **Documents** : GED rattachée au contenu (téléverser ici, puis référençable
  comme asset).
- **Activité** : journal des principales mutations métier, avec l'auteur.

### 5. Calendrier éditorial — `/studio/calendar`

- Grille mensuelle, navigation mois précédent/suivant, jour courant surligné.
- Affiche tout ce qui a une **date planifiée** : contenus (pastille pleine) et
  livrables (préfixe `↳`).
- **Retards** en rouge (date passée, statut ni publié ni archivé).
- Clic sur une entrée → fiche du contenu.

### 6. Templates — `/studio/templates`

- CRUD de gabarits réutilisables : format, priorité, cible, squelette de script,
  checklist et livrables attendus.
- Création d'un contenu depuis un template avec préremplissage transactionnel du
  script, de la checklist et des livrables.

### 7. Publications — `/studio/publications`

- Livrables regroupés par canal puis par semaine.
- Affichage du statut, des retards, du contenu parent et du lien publié lorsqu'il existe.

---

## Permissions

| Rôle     | Droits                                                              |
| -------- | ----------------------------------------------------------------- |
| `admin`  | Tout, y compris suppression (corbeille) idées/contenus/livrables.  |
| `member` | Créer/modifier tout ; supprimer les enfants (assets, checklist).   |
| `viewer` | Lecture seule (écritures bloquées côté serveur).                   |

Isolation multi-tenant par `organization_id` sur chaque table (RLS + filtre
applicatif). Les mutations métier principales alimentent le journal d'activité ;
les changements techniques fins, comme chaque case de checklist, ne sont pas tous
journalisés individuellement.

## Modèle de données

Tables dédiées : `content_ideas`, `content_pieces`, `content_scripts`,
`deliverables`, `content_assets`, `content_checklist_items`, `content_templates`.
L'enum partagé `entity_type` est étendu (`content_idea`, `content_piece`,
`deliverable`) pour brancher tâches/documents/activités sans modifier leur schéma.

## Flux type

Capturer une idée → la convertir en contenu → rédiger le script → cocher la
checklist en avançant les colonnes du kanban → attacher les assets (miniature,
montage) → créer les livrables dérivés et suivre la matrice → planifier la date
→ la voir apparaître au calendrier.

## Limite connue

Le revert-on-error du kanban (rollback du cache si la mutation serveur échoue)
n'a pas d'assertion unitaire dédiée : faire échouer la mutation via React Query
fait fuiter une *unhandled rejection* interne que Vitest signale, sans moyen de
la capturer proprement sans désactiver la détection globale d'erreurs. Le
comportement reste couvert par le snapshot `previous` capturé en `onMutate`
(testé) et la vérification manuelle.
