# API bot `/api/v1`

Cette API expérimentale permet à un bot ou à une automatisation de manipuler un
sous-ensemble du CRM sans session navigateur. Elle reste isolée par organisation :
la clé API détermine le compte robot et le tenant, jamais le corps de la requête.

## Préparation locale

1. Renseigne `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_JWT_SECRET` dans `.env.local`.
2. Dans **Paramètres → Clés API**, crée une clé et copie-la immédiatement ; sa valeur
   complète n'est plus affichée ensuite.
3. Envoie-la comme bearer token :

```bash
curl --fail \
  --header "Authorization: Bearer $ENNEAD_API_KEY" \
  "http://localhost:3000/api/v1/contacts?email=alice@example.com"
```

N'inscris jamais une vraie clé dans un script versionné, une issue ou un log partagé.
La limite applicative est de 30 requêtes par minute et par clé.

## Contrat commun

- succès JSON : `{ "data": ... }`, avec `count` pour les listes paginées ;
- erreur JSON : `{ "error": { "code": "...", "message": "..." } }` ;
- codes usuels : `400 BAD_REQUEST`, `401 UNAUTHORIZED`, `404 NOT_FOUND`,
  `409 INVALID_TRANSITION`, `429 RATE_LIMITED`, `500 INTERNAL` ;
- une ressource inexistante et une ressource d'un autre tenant renvoient le même `404`.

## Routes disponibles

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/api/v1/contacts?email=…&phone=…` | Recherche exacte ; au moins un filtre requis |
| `POST` | `/api/v1/contacts` | Crée un contact |
| `PATCH` | `/api/v1/contacts/:id` | Modifie les champs fournis |
| `POST` | `/api/v1/contacts/:id/notes` | Ajoute une note au contact |
| `GET` | `/api/v1/contacts/:id/quotes` | Liste ses devis ; filtres `status`, `page`, `per_page` |
| `POST` | `/api/v1/contacts/:id/quotes` | Crée et valide un devis transactionnel |
| `GET` | `/api/v1/quotes/:id` | Retourne le devis et ses lignes |
| `PATCH` | `/api/v1/quotes/:id` | Applique une transition de statut autorisée |
| `GET` | `/api/v1/quotes/:id/pdf` | Télécharge le PDF |

## Exemples de corps

Créer un contact :

```json
{
  "first_name": "Alice",
  "last_name": "Martin",
  "email": "alice@example.com"
}
```

Créer un devis pour un contact :

```json
{
  "subject": "Accompagnement CRM",
  "validity_days": 30,
  "lines": [
    {
      "description": "Audit et recommandations",
      "quantity": 1,
      "unit": "forfait",
      "unit_price": 150000,
      "vat_rate": 2000,
      "discount_percent": 0
    }
  ]
}
```

Les montants sont exprimés en centimes et les taux en basis points (`2000` = 20 %).
Les champs inconnus des payloads de devis sont rejetés.

Appliquer une transition :

```json
{ "status": "sent" }
```

Statuts acceptés par l'API : `validated`, `sent`, `signed`, `refused`, `cancelled`.
La machine à états métier peut refuser une transition pourtant syntaxiquement valide.
