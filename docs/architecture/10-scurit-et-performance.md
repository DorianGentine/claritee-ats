# 10. Sécurité et performance

## 10.1 Sécurité

- **Auth :** Supabase Auth uniquement ; pas de mot de passe en base applicative.
- **HTTPS :** imposé par Vercel/Supabase.
- **Validation :** Zod sur tous les inputs tRPC.
- **Multi-tenant :** chaque requête métier filtrée par `companyId` (+ RLS en base).
- **Messages d’erreur :** génériques côté client (ex. « Identifiants invalides ») ; détails en logs serveur.

## 10.2 Performance

- **Cible :** premier chargement < 3 s, réponse API < 500 ms (P95).
- **DB :** index sur `(companyId, createdAt)` (ou id) pour listes ; index sur `Candidate` (recherche nom, titre, résumé) si recherche full-text ou LIKE.
- **Frontend :** TanStack Query (staleTime 5 minutes par défaut, voir `docs/frontend-architecture.md` §3.1.1), lazy loading des routes, images optimisées (Next.js Image + URLs Supabase). Skeleton : utiliser `isLoading` uniquement, pas `isFetching` (évite les flashes lors de la navigation).
- **Vercel :** utiliser les régions proches du projet Supabase (ex. EU).

### 10.2.1 Performance du serveur de développement (Turbopack)

Le serveur Next.js 16 utilise **Turbopack** par défaut en `next dev`. Il est sensible à la taille du graphe de modules chargé en mémoire. Les règles suivantes ont été établies après un incident de consommation CPU/mémoire excessive (260-350 % CPU, OOM) sur un projet de ~33 fichiers.

**Règles à respecter :**

1. **Dépendances Radix UI — packages individuels uniquement.** Ne jamais installer le package monolithique `radix-ui` (umbrella). Utiliser les packages individuels correspondant aux composants réellement utilisés (ex. `@radix-ui/react-slot`, `@radix-ui/react-label`). Le package umbrella charge l'intégralité des primitives Radix en mémoire en dev (tree-shaking limité avec Turbopack), ce qui peut provoquer des fuites mémoire et une boucle de recompilation.
2. **Prisma — pas de log `"query"` en dev.** Le logging de chaque requête SQL (`log: ["query", ...]`) accumule des strings en mémoire sur la durée d'une session dev. Utiliser `["error", "warn"]` en développement, `["error"]` en production.
3. **Cache `.next/` — nettoyer régulièrement.** En cas de comportement anormal (compilation infinie, CPU élevé au repos, OOM), supprimer le dossier `.next/` et relancer : `rm -rf .next && pnpm dev`.
4. **CSS — éviter les doublons.** Les règles `@apply` dupliquées dans `globals.css` causent du travail PostCSS inutile à chaque recompilation.
5. **tsconfig.json — ne pas modifier `"jsx"`.** Next.js 16 impose `"jsx": "react-jsx"` au démarrage. Ne pas le changer ; c'est le réglage correct pour React 19 (automatic JSX runtime).

**Diagnostic si le problème réapparaît :**

- Vérifier le FAB Next.js dans le navigateur : un « Compiling… » permanent indique une boucle de recompilation.
- Vérifier l'onglet Network du navigateur : des requêtes en boucle (polling, retry tRPC sur erreur 401) peuvent bombarder le proxy/middleware.
- En dernier recours, tester sans Turbopack : `pnpm next dev --no-turbopack`.

## 10.3 Observabilité (MVP)

Pour le MVP, pas d’outil de monitoring dédié ; on s’appuie sur les logs Vercel et un health check minimal.

**Logging**

- **Où :** sortie standard (stdout / stderr), récupérée par Vercel dans les logs de fonction et de build.
- **Quoi logger (serveur uniquement, jamais en client) :**
  - Erreurs tRPC : code (UNAUTHORIZED, NOT_FOUND, BAD_REQUEST, INTERNAL_SERVER_ERROR), message technique, et éventuellement procédure concernée ; pas de données utilisateur ni de stack en production si exposée.
  - Échecs d’auth : tentative de connexion invalide (sans détail sur le mot de passe ou l’email exact si sensible).
  - Création de lien de partage : type (normal / anonyme), `candidateId` et `companyId` si utile pour le debug ; pas d’URL complète ni de token dans les logs.
- **À ne pas logger :** mots de passe, tokens, données personnelles (email en clair en volume), corps de requête complets.
- Implémentation : `console.error` structuré (ex. objet `{ level, message, code, procedure }`) ou petit helper logger qui formate puis envoie vers stdout.

**Health check**

- **Route :** `GET /api/health` (voir `src/app/api/health/`).
- **Rôle :**
  - Vérifier qu’un déploiement répond (200 OK).
  - Optionnel : ping rapide de la DB (Prisma `$queryRaw('SELECT 1')`) pour confirmer que l’app peut joindre Supabase ; en cas d’échec, retourner 503 avec un corps explicite (ex. `{ ok: false, db: 'unavailable' }`).
- Pas d’authentification sur cette route ; pas d’informations sensibles dans la réponse. Utilisable par Vercel (Health Check) ou un monitoring externe basique.
- **Fréquence recommandée :** 10 minutes. Configurer un cron (Vercel Cron Jobs) ou un service externe (ex. UptimeRobot, cron-job.org) pour appeler `GET /api/health` toutes les 10 minutes. Cela permet de garder l’instance serverless « chaude » et de limiter les cold starts pour les utilisateurs.

## 10.4 Données personnelles et RGPD

Pour respecter le NFR9 (conformité RGPD) et les droits des personnes concernées, l’architecture prévoit les flux suivants. L’hébergement Supabase en région EU couvre la localisation des données.

**Droit d’accès et à la portabilité (export)**

- **Utilisateur (recruteur) :** possibilité d’exporter les données du compte (profil User, Company) et, au choix, l’ensemble des données du cabinet (candidats, offres, clients, notes, etc.) dans un format structuré (ex. JSON ou CSV par entité).
- **Implémentation :** procédure tRPC dédiée (ex. `settings.exportMyData`), réservée à l’utilisateur connecté, qui agrège les données scopées par `companyId` et renvoie un fichier téléchargeable ou un blob. Ne pas inclure les mots de passe (gérés par Supabase) ni les tokens de partage en clair si non nécessaire.
- **Candidat (données en base) :** les candidats sont des données métier du cabinet ; l’export « mes données » côté recruteur inclut les fiches candidats. Pour un candidat qui demanderait son propre export, traiter manuellement ou prévoir un flux dédié (hors scope MVP si non prévu au PRD).

**Droit à l’effacement (suppression)**

- **Suppression d’un candidat :** soft delete non exigé pour le MVP ; suppression en base (DELETE) avec suppression des fichiers associés (photo, CV) dans Supabase Storage. Invalider ou supprimer les `ShareLink` liés à ce candidat.
- **Suppression d’une offre, d’un client, d’une note :** DELETE en base, scopé par `companyId`. Pas de rétention obligatoire pour le MVP.
- **Suppression du compte utilisateur :** (1) suppression ou anonymisation du `User` en base, (2) désinscription ou suppression du compte côté Supabase Auth (selon API Supabase). Si le cabinet n’a plus d’utilisateur, décider si la `Company` et toutes les données du cabinet sont supprimées (effacement complet) ou conservées pour reprise ultérieure ; pour le MVP, documenter le choix (ex. « suppression en cascade du cabinet si dernier utilisateur »).
- **Suppression d’un cabinet (Company) :** supprimer toutes les données scopées par ce `companyId` (candidats, offres, clients, notes, partages, invitations, puis users, puis company) et les fichiers Storage du bucket associé. Ordre des suppressions à respecter (contraintes FK et policies).

**Rétention**

- **Données métier :** pas de purge automatique imposée pour le MVP ; les données restent tant qu’elles ne sont pas supprimées par l’utilisateur ou par le flux d’effacement ci-dessus.
- **Liens de partage :** respecter `expiresAt` ; les liens expirés ne doivent plus donner accès aux données (vérification côté `shareLink.getByToken`). Optionnel : job ou cron qui nettoie les lignes `ShareLink` expirées pour alléger la base.
- **Invitations :** après utilisation ou expiration, les lignes peuvent être conservées pour traçabilité ou supprimées ; documenter le choix (ex. « conserver 90 jours après expiration »).

**Traçabilité et responsabilité**

- Les opérations d’export et de suppression définitives peuvent être loguées (qui, quand, type d’action) en stdout pour audit, sans stocker le contenu des données exportées. Pas d’obligation de journal dédié pour le MVP si les logs Vercel suffisent.

## 10.5 Résilience

- **Timeouts :** côté client (TanStack Query, fetch tRPC), définir un timeout raisonnable (ex. 15–30 s) pour les requêtes ; au-delà, considérer la requête en échec et afficher un message utilisateur (ex. « Le serveur met trop de temps à répondre. Réessayez. »).
- **Retry :** pour les mutations (create, update, delete), pas de retry automatique par défaut (risque de doublon). Pour les queries en lecture, TanStack Query peut retenter 1–2 fois en cas d’échec réseau ; garder un délai court pour ne pas bloquer l’UI.
- **Dégradation :** si Supabase (auth ou DB) est indisponible, les pages qui en dépendent affichent un message générique (ex. « Service temporairement indisponible ») et, si possible, un bouton « Réessayer ». Ne pas exposer de détail technique à l’utilisateur. Les erreurs tRPC (INTERNAL_SERVER_ERROR, connexion DB) sont loguées côté serveur comme en §10.3.
- **Pas de circuit breaker** pour le MVP ; l’app reste stateless et chaque requête est indépendante.

## 10.6 Rate limiting

- **Objectif :** limiter les abus et rester dans les quotas des free tiers (Supabase, Vercel).
- **Périmètre recommandé (MVP) :**
  - **Auth :** limiter les tentatives de connexion / inscription par IP (ex. 10 req/min) pour limiter le brute-force et les inscriptions abusives. À implémenter dans le proxy Next.js (`src/proxy.ts`) ou via une route API dédiée qui compte en mémoire ou via un store externe (ex. Vercel KV si disponible).
  - **Génération de liens de partage :** limiter par utilisateur (ex. 20 créations/heure) pour éviter le spam.
  - **Upload (photo, CV) :** limiter par utilisateur (ex. 30 uploads/heure) ou par taille cumulée sur une fenêtre glissante.
- **Implémentation :** pour le MVP, une approche simple suffit (compteur en mémoire par IP pour l’auth en dev ; en production, envisager Vercel Edge Config, Upstash Redis, ou un package type `@upstash/ratelimit`). Si aucun rate limit n’est en place au premier déploiement, documenter la cible (seuils ci-dessus) et l’ajouter dès que possible.
- **Réponse en cas de dépassement :** HTTP 429 (Too Many Requests) ou erreur tRPC équivalente, avec message générique côté client (ex. « Trop de requêtes. Réessayez dans quelques minutes. »).

---
