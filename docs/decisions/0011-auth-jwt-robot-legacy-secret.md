# 0011 — Auth des bots API par JWT robot signé avec le legacy JWT secret

- **Statut** : Accepté
- **Date** : 2026-07-02
- **Décideurs** : mainteneur du projet (+ review PR #24 / fix/bot-api-review-findings)

## Contexte

L'API bot externe (`/api/v1/*`, spec 024) doit écrire dans le CRM avec la RLS
pleinement appliquée, sans session navigateur. Chaque clé API est rattachée à
un compte robot `auth.users` ; à chaque requête, le serveur signe à la volée un
JWT court (`sub` = robot, `role` = authenticated, HS256, 5 min) avec le
**legacy JWT secret** Supabase (`SUPABASE_JWT_SECRET`), et PostgREST applique
la RLS comme pour n'importe quelle session. Aucun secret par robot n'est
stocké, le service-role ne touche jamais le chemin d'écriture.

Contrainte structurante : Supabase migre vers des **signing keys asymétriques**
(ES256/RS256, JWKS) ; le secret HS256 legacy est en voie de dépréciation. La
stack locale récente du CLI peut déjà être en asymétrique (le helper de tests
`getJwtSecret()` renvoie alors `null` et les suites bot sont inopérantes —
limite documentée dans les tests).

## Options considérées

- **A — JWT signé avec le legacy secret (HS256)** : zéro état par robot,
  révocation par `resolve_api_key` (hash), simple. Dépend d'un secret partagé
  de plus dans l'env applicatif, et du maintien du legacy secret par Supabase.
- **B — Sessions GoTrue réelles par robot (email + mot de passe stocké)** :
  pas de dépendance au legacy secret, mais un credential par robot à chiffrer
  et stocker, refresh tokens à gérer — plus d'état et de surface.
- **C — Service-role + filtrage applicatif** : contourne la RLS, violation de
  la règle projet n°1/2 (multi-tenant day 0, defense in depth). Rejeté d'office.

## Décision

**Option A.** L'argument décisif : aucun secret par robot à stocker et la RLS
reste l'unique autorité d'isolation, y compris sur le chemin bot. Le risque
« legacy secret » est accepté et borné : fail-closed (si le secret n'est plus
accepté, les bots reçoivent des 401/500, aucune écriture indue), JWT jamais
renvoyé au client, expiration 5 min, algorithme HS256 épinglé dans le code.

## Conséquences

- Positives : chemin d'écriture 100 % RLS ; révocation immédiate (la
  résolution de clé filtre `revoked_at`, et la membership du robot est
  supprimée à la révocation) ; pas de credential robot persisté.
- Négatives / dette acceptée : `SUPABASE_JWT_SECRET` requis dans l'env Vercel
  (surface de compromission accrue — rotation à prévoir avec celle du projet) ;
  incompatible avec les signing keys asymétriques : si le projet Supabase
  migre, **tous les appels bot cassent** (fail-closed, pas de faille).
- À revisiter si : Supabase annonce la fin du legacy secret sur les projets
  existants, ou si la stack locale/CI ne fournit plus de `JWT_SECRET` (les
  tests d'intégration bot le signalent déjà par un échec explicite). Piste de
  sortie : mint de tokens via l'API Admin GoTrue ou sessions robot réelles (B).

## Amendement 2026-07-04 — constat prod : la migration signing keys ne casse pas le flux

Le projet Supabase prod a **déjà migré** vers les JWT Signing Keys (current
key asymétrique + « previously used key » = legacy secret importé dans le
keyring). Contrairement à la crainte formulée dans les Conséquences
(« si le projet migre, tous les appels bot cassent »), le flux bot fonctionne :
le legacy secret reste une clé de **vérification** valide tant qu'il n'est pas
révoqué. Le dashboard l'affiche comme « Legacy JWT secret (still used) — Used
only to verify JWTs ».

Preuve end-to-end en prod (2026-07-04) : `GET /api/v1/contacts?email=…` avec
une clé API fraîche → HTTP 200. Chaîne traversée : `resolve_api_key` (RPC via
anon key legacy, elle-même JWT HS256), JWT robot signé HS256 avec
`SUPABASE_JWT_SECRET`, accepté par PostgREST, RLS appliquée.

Contraintes opérationnelles qui en découlent (dashboard Supabase) :

1. **Ne jamais révoquer** la « previously used key » (legacy) dans
   JWT Signing Keys : tous les appels bot casseraient (fail-closed).
2. **Ne pas désactiver** les legacy API keys `anon`/`service_role` malgré la
   suggestion du dashboard : le code serveur utilise encore l'anon key legacy
   (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) sur le chemin bot.

Le vrai déclencheur de sortie n'est donc pas « la migration » mais **toute
rotation/révocation de la clé legacy**. Avant d'y toucher : implémenter la
piste de sortie (mint via API Admin GoTrue ou option B), et basculer l'app
sur les clés `sb_publishable_`/`sb_secret_`.
