# Claritee ATS — Architecture technique

> Référence technique (flux, multi-tenancy, auth, API, données, déploiement, tests, décisions). Dernière mise à jour : 2026-10-17.

Conventions de code, nommage et pièges : `docs/coding-standards.md`. Exigences produit : `docs/prd.md`. En cas de contradiction avec le code, **le code fait foi**.

---

## 1. Vue d'ensemble

Monolithe fullstack Next.js (App Router) : pages React et API tRPC dans le même déploiement Vercel, avec Supabase pour PostgreSQL, l'authentification et le stockage de fichiers. Pas de microservices, pas d'API REST publique.

### Flux d'une requête

```
Navigateur
  │  cookie de session Supabase (JWT)
  ▼
src/proxy.ts (proxy Next.js, ex-middleware)
  │  rate limit /login, /register · rafraîchit la session · redirige vers /login si route protégée sans user
  ▼
Page App Router (RSC / client) ──► client tRPC (TanStack Query, staleTime 5 min)
  │
  ▼
/api/trpc/[...trpc]  →  createContext : supabase.auth.getUser() → User.companyId
  │
  ▼
protectedProcedure (UNAUTHORIZED si pas de user ou de companyId)
  │  validation Zod (src/lib/validations)
  ▼
Prisma (adapter pg) — chaque requête filtrée par companyId
  │
  ▼
PostgreSQL Supabase (RLS activée, API REST fermée)          Supabase Storage (service role)
```

### Contraintes structurantes

| Contrainte                     | Conséquence                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Développeur solo               | Un seul repo, un seul package, un seul déploiement ; outillage minimal (pas de monorepo tooling, pas d'observabilité dédiée)                            |
| Budget zéro (offres gratuites) | Supabase Free : 500 Mo DB, 1 Go Storage, **pause de la DB après 7 j d'inactivité** (→ keep-alive §9) ; Vercel Hobby : fonctions serverless, 1 cron/jour |
| Serverless                     | Pas d'état partagé entre instances : le rate limiting in-memory est **par instance** ; cold starts possibles                                            |
| Données personnelles (RGPD)    | Projet Supabase en région EU ; CV en bucket privé avec URLs signées                                                                                     |
| Cibles de performance          | Premier chargement < 3 s, réponse API < 500 ms (P95)                                                                                                    |

---

## 2. Stack

Versions exactes dans `package.json` (pas de `^`/`~`). Gestionnaire de paquets et lanceur de scripts : **bun** (lockfile `bun.lock`, `exact = true` dans `bunfig.toml`) ; runtime : **Node** (20 en CI ; version de Vercel réglée dans le dashboard, aucun `engines` ni `.nvmrc` versionné).

| Techno                                                   | Rôle                                                  | Version majeure                           |
| -------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| Next.js (App Router, Turbopack en dev)                   | Routing, SSR, proxy, API routes                       | 16                                        |
| React                                                    | UI                                                    | 19                                        |
| TypeScript (strict)                                      | Typage front + back                                   | 5                                         |
| tRPC (`server`, `client`, `react-query`, `next`)         | API type-safe                                         | 11                                        |
| TanStack Query                                           | Cache serveur côté client, mutations, invalidation    | 5                                         |
| Prisma (+ `@prisma/adapter-pg`, `pg`)                    | ORM, migrations versionnées                           | 7                                         |
| PostgreSQL (Supabase)                                    | Base relationnelle ; extensions `unaccent`, `pg_trgm` | 17 (config locale `supabase/config.toml`) |
| Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) | Identité, sessions JWT, emails de confirmation        | ssr 0.8 / js 2                            |
| Supabase Storage                                         | Photos et CV                                          | —                                         |
| Zod                                                      | Validation partagée client/serveur                    | 4                                         |
| React Hook Form (+ `@hookform/resolvers`)                | Formulaires                                           | 7                                         |
| shadcn/ui (Radix, packages individuels) + Tailwind CSS   | Composants et styles                                  | Tailwind 4                                |
| BlockNote                                                | Éditeur riche des notes (contenu stocké en JSON)      | 0.46                                      |
| dnd-kit                                                  | Glisser-déposer (ordre des villes du candidat)        | 6                                         |
| Sonner                                                   | Toasts                                                | 1                                         |
| Vitest (+ Testing Library, jsdom, vitest-axe)            | Tests unitaires, composants, DB                       | 4                                         |
| pa11y                                                    | Audit accessibilité WCAG AA (manuel, `bun run a11y`)     | 9                                         |
| Vercel (+ Speed Insights)                                | Hébergement front + API serverless                    | —                                         |
| Supabase CLI (Docker)                                    | Stack locale dev + tests + CI                         | —                                         |
| Photon (Komoot)                                          | API externe d'autocomplétion de villes (fallback)     | —                                         |

---

## 3. Arborescence `src/`

Alias `@/` → `src/`. Tests sous `__tests__/` à la racine (voir §10).

| Dossier                        | Contenu / quoi y placer                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/proxy.ts`                 | Proxy Next.js : rate limit auth, refresh de session, protection des routes du dashboard                                                                   |
| `src/app/(auth)/`              | Pages publiques d'entrée : `login`, `register`, `invite/[token]`                                                                                          |
| `src/app/(dashboard)/`         | Pages authentifiées : `dashboard`, `candidates`, `offers`, `clients` (avec `new`, `[id]`, `[id]/edit`), `notes`, `search`, `settings` (+ `settings/team`) |
| `src/app/share/[token]/`       | Fiche candidat partagée publique (SSR, Prisma direct avec `publicCandidateSelect`)                                                                        |
| `src/app/api/`                 | Route handlers non-tRPC : `health`, `keep-alive`, et le handler `trpc/[...trpc]`                                                                          |
| `src/server/db.ts`             | Singleton PrismaClient (adapter pg ; logs `error`/`warn` en dev, `error` en prod)                                                                         |
| `src/server/trpc/`             | `context.ts` (session + companyId), `trpc.ts` (`router`, `publicProcedure`, `protectedProcedure`), `index.ts`                                             |
| `src/server/trpc/routers/`     | Un router par domaine, agrégés dans `_app.ts`                                                                                                             |
| `src/server/*.ts`              | Code serveur partagé entre routers et pages SSR (ex. `publicCandidateSelect.ts`)                                                                          |
| `src/lib/validations/`         | Schémas Zod par domaine, partagés formulaires ↔ inputs tRPC                                                                                               |
| `src/lib/supabase/`            | `client.ts` (navigateur), `server.ts` (cookies, RSC/tRPC), `admin.ts` (secret key, serveur uniquement)                                                    |
| `src/lib/trpc/`                | Client tRPC React (`api`) et fabrique du client HTTP                                                                                                      |
| `src/lib/*.ts`                 | Utilitaires purs (format, fichiers, styles de statut, `rate-limit.ts`…)                                                                                   |
| `src/hooks/`                   | Hooks React réutilisables (ex. mutation optimiste de statut, URL signée de CV, debounce)                                                                  |
| `src/components/ui/`           | Composants shadcn générés — ne pas éditer à la main                                                                                                       |
| `src/components/shared/`       | Composants transverses (extraits dès la 2ᵉ utilisation)                                                                                                   |
| `src/components/<domaine>/`    | Composants métier : `candidates`, `offers`, `clients`, `dashboard`, `settings`, `share`, `layout`                                                         |
| `src/components/providers.tsx` | QueryClient + provider tRPC + Toaster                                                                                                                     |
| `src/styles/`                  | CSS global / tokens Tailwind                                                                                                                              |

Hors `src/` : `prisma/` (schéma, migrations, seed), `supabase/` (config de la stack locale), `scripts/` (scripts shell/TS d'exploitation), `.github/workflows/` (CI, keep-alive).

---

## 4. Multi-tenancy et RLS

### Principe

| Règle                                     | Détail                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant                                    | `Company` (le cabinet). Chaque `User` appartient à exactement une `Company`.                                                                                                                                                                                                        |
| Première ligne de défense : l'application | `protectedProcedure` injecte `ctx.companyId` (résolu via `User` à partir de l'id Supabase) ; **toute** requête Prisma filtre par `companyId`, et l'appartenance est vérifiée avant update/delete (`findFirst({ id, companyId })`).                                                  |
| RLS PostgreSQL : activée, sans policy     | RLS activée sur **toutes** les tables `public`, **aucune policy** : tout accès d'un rôle non propriétaire est refusé. Prisma se connecte avec le rôle propriétaire (`postgres`), qui contourne la RLS : elle ne rattrape donc pas un oubli de filtre dans un router, le filtre applicatif est la seule isolation entre cabinets. |
| API REST Supabase fermée                  | L'app n'utilise pas la Data API sur `public` (Prisma pour les tables, `service_role` pour le Storage). `anon`/`authenticated` n'ont aucun droit sur les tables et séquences `public`, ni sur les tables, séquences et fonctions **créées par `postgres`** à l'avenir (privilèges par défaut révoqués, `EXECUTE` à `PUBLIC` compris). Hors de portée de `postgres` : les objets de `supabase_admin` (fonctions des extensions `pg_trgm` / `unaccent`, sans accès aux données). |
| Tables enfants                            | Pas de `companyId` : accès uniquement via Prisma en passant par le parent filtré (ex. `candidate: { companyId }`).                                                                                                                                                                  |
| Données globales                          | `cities` est une table de référence partagée entre cabinets (pas de `companyId`).                                                                                                                                                                                                  |

### Migrations RLS / droits

| Migration                                 | Effet                                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `20300101000000_add_rls_policies`         | Historique : activation RLS et 31 policies tenant (supprimées depuis, migration conservée car déjà appliquée).               |
| `20300102000000_revoke_data_api_access`   | Révoque les droits `anon`/`authenticated` (actuels et par défaut) et active la RLS sur les autres tables.                     |
| `20300103000000_drop_unused_rls_policies` | Supprime les 31 policies : jamais appliquées à un accès réel (Prisma les contourne, Data API fermée) et cassées (récursion). |

Pour une nouvelle table : `ENABLE ROW LEVEL SECURITY` dans sa migration, aucune policy, jamais de `GRANT` à `anon`/`authenticated`. Les shadow DB et la base de test reçoivent un stub `auth.uid()` (référencé par l'ancienne migration ; voir `prisma.config.ts`, `scripts/test-db.sh`).

**Si un jour la Data API doit servir** (Supabase Realtime, requêtes directes depuis le navigateur, policies Storage lisant des tables) : rouvrir les droits table par table et écrire des policies qui obtiennent le cabinet courant via une fonction `SECURITY DEFINER` (ex. `current_company_id()`), jamais par une sous-requête sur `User` depuis une policy de `User` (récursion infinie).

---

## 5. Authentification

### Flux

| Flux                            | Mécanisme                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inscription                     | `auth.register` (publicProcedure, rate limit IP) → `admin.createUser` avec `email_confirm: false` → `auth.resend({ type: "signup" })` → transaction Prisma `Company` + `User`.                                                                                                                                                                                                                                                                 |
| Confirmation email              | Envoyée par Supabase via le **SMTP custom configuré dans le dashboard** (pas de nodemailer ni de config SMTP dans l'app). `admin.createUser` seul n'envoie jamais d'email, d'où l'appel explicite à `resend`. Un échec de `resend` est logué (`console.warn`) sans bloquer l'inscription. Prérequis dashboard : « Confirm email » activé, Site URL / Redirect URLs corrects. En local, les emails arrivent dans Inbucket/Mailpit (port 54324). |
| Connexion                       | `signInWithPassword` côté client (Supabase) → cookie de session JWT.                                                                                                                                                                                                                                                                                                                                                                           |
| Résolution serveur              | `createContext` : `supabase.auth.getUser()` (valide le JWT auprès de Supabase) puis lecture de `User.companyId`.                                                                                                                                                                                                                                                                                                                               |
| Affichage client de l'état auth | `getSession()` (lecture locale, sans appel réseau) dans la navbar ; `getUser()` côté serveur, et côté client pour l'id courant dans les sections de notes.                                                                                                                                                                                                                                                                                                                                        |
| Protection des pages            | `src/proxy.ts` redirige vers `/login` sans user pour `/dashboard`, `/candidates`, `/offers`, `/clients`, `/settings`, `/notes`. Les procédures tRPC restent protégées indépendamment.                                                                                                                                                                                                                                                          |
| Invitation                      | `invitation.create` (token, expiration 7 j) → page `/invite/[token]` → `invitation.getByToken` puis `invitation.accept` (publicProcedure) : vérifie usedAt / revokedAt / expiresAt, crée le compte Auth avec `email_confirm: true` (pas d'email : l'invitation fait foi), puis transaction `User` (companyId de l'invitation) + `usedAt`.                                                                                                      |
| Profil                          | `auth.updateProfile` met à jour `User` et les métadonnées Supabase via l'Admin API.                                                                                                                                                                                                                                                                                                                                                            |

### Clés Supabase

| Variable                                                           | Usage                                                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clients navigateur, serveur (cookies) et proxy                                                       |
| `SUPABASE_SECRET_KEY`                                              | Client admin (`src/lib/supabase/admin.ts`) : création de comptes, Storage. Jamais exposée au client. |

**Config manuelle Supabase (non versionnée)** : SMTP custom obligatoire en prod (sans lui, Supabase plafonne à 2 emails/h ; prod = SMTP OVH) ; template « Confirm signup » dans Auth → Email Templates ; Redirect URLs incluant l'URL de prod et `http://localhost:3000/**` ; diagnostic des envois dans Dashboard → Logs → Auth.

### Rate limiting

Implémentation : `src/lib/rate-limit.ts`, store **in-memory par instance** (non partagé entre fonctions serverless — limite « best effort »). Dépassement : `TOO_MANY_REQUESTS` tRPC avec message générique, ou redirection `/login?error=rate_limit` côté proxy.

| Périmètre                                  | Clé                   | Limite   | Branché dans                                            |
| ------------------------------------------ | --------------------- | -------- | ------------------------------------------------------- |
| Pages login / register                     | `auth:<ip>`           | 10 / min | `src/proxy.ts`                                          |
| Inscription                                | `auth:<ip>`           | 10 / min | `auth.register`                                         |
| Création de lien de partage                | `share-link:<userId>` | 20 / h   | `shareLink.create`                                      |
| Upload photo / CV                          | `upload:<userId>`     | 30 / h   | `candidate.uploadPhoto`, `candidate.uploadCv`           |
| Téléchargement CV depuis une page partagée | `cv-share:<ip>`       | 30 / min | `candidate.getCvDownloadUrlByShareToken`                |
| Mutations métier générales                 | `mutation:<userId>`   | 60 / min | `checkMutationRateLimit` : appliqué à 17 mutations sur 41 (candidate, note, offer, client, candidature) ; absent d'`auth`, `company` et `invitation` (voir `TO-DO.md`) |

Évolution si besoin d'une limite globale : store externe (Upstash Redis / Vercel KV).

---

## 6. API tRPC

### Organisation

Un router par domaine dans `src/server/trpc/routers/`, enregistré dans `_app.ts` (type `AppRouter` exporté pour le client). Handler unique : `/api/trpc/[...trpc]`.

| Clé dans `appRouter` | Fichier          | Périmètre                                                                                        | Procédures publiques           |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------ |
| `auth`               | `auth.ts`        | Inscription, profil courant                                                                      | `register`                     |
| `company`            | `company.ts`     | Cabinet, liste des membres                                                                       | —                              |
| `invitation`         | `invitation.ts`  | Invitations collaborateurs                                                                       | `getByToken`, `accept`         |
| `candidate`          | `candidate.ts`   | Candidats + sous-entités (expériences, formations, langues, tags), upload photo/CV, URLs signées | `getCvDownloadUrlByShareToken` |
| `candidature`        | `candidature.ts` | Statut / suppression d'une candidature                                                           | —                              |
| `offer`              | `offer.ts`       | Offres, tags d'offre, ajout de candidats                                                         | —                              |
| `clientCompany`      | `client.ts`      | Entreprises clientes et contacts (attention : clé ≠ nom de fichier)                              | —                              |
| `note`               | `note.ts`        | Notes candidat / offre / libres, déplacement entre entités                                       | —                              |
| `shareLink`          | `shareLink.ts`   | Liens de partage                                                                                 | `getPublicByToken`             |
| `tag`                | `tag.ts`         | Tags du cabinet                                                                                  | —                              |
| `search`             | `search.ts`      | Recherche globale (ilike/contains, cf. ADR 0004)                                                 | —                              |
| `dashboard`          | `dashboard.ts`   | Statistiques d'accueil                                                                           | —                              |
| `city`               | `city.ts`        | Autocomplétion de villes (local puis Photon, cf. ADR 0005). Procédure **publique** : les résultats Photon sont persistés (upsert) dans `cities`, partagée entre cabinets | `autocomplete`, `getByIds`     |

### Règles

| Règle                           | Détail                                                                                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protectedProcedure` par défaut | Garantit `ctx.user` et `ctx.companyId` non nuls. `publicProcedure` uniquement pour l'onboarding (register, invitation), le partage public (validation token + expiration) et les données de référence (villes). |
| Contexte                        | `ctx.db` (Prisma), `ctx.user` (Supabase), `ctx.companyId`, `ctx.headers` (IP pour le rate limit).                                                                                                               |
| Inputs                          | Schémas Zod de `src/lib/validations/<domaine>.ts`.                                                                                                                                                              |
| Erreurs                         | Codes tRPC standards (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, `TOO_MANY_REQUESTS`)  ; pas d'`errorFormatter` : une erreur Prisma non interceptée remonte en 500 brut au client (voir `TO-DO.md`).                     |
| Notes                           | Modification / suppression réservées à l'auteur (`FORBIDDEN` sinon).                                                                                                                                            |
| Partage public                  | Projection limitée (`publicCandidateSelect`) ; mode anonyme mappé côté serveur.                                                                                                                                 |

### Données côté client

| Sujet                | Règle                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source de vérité     | TanStack Query (via hooks tRPC `api.<router>.<proc>.useQuery/useMutation`) ; pas de store global. État de formulaire : React Hook Form ; filtres : URL ou état local. |
| Cache                | `staleTime` global 5 min (`providers.tsx`), surcharge possible par query.                                                                                             |
| Invalidation         | Après chaque mutation : `utils.<router>.<proc>.invalidate()` sur les queries impactées.                                                                               |
| Mutations optimistes | `onMutate` / `onError` (rollback) / `onSettled` (invalidate) + **`networkMode: "always"`** obligatoire.                                                               |
| Chargement           | Skeleton sur `isLoading`, jamais `isFetching`.                                                                                                                        |

---

## 7. Modèle de données

Source : `prisma/schema.prisma` (20 modèles). Toutes les FK vers le tenant sont en `onDelete: Cascade` (supprimer une `Company` supprime tout le cabinet).

| Entité                           | Rôle                                                                       | Rattachement tenant      | Relations clés                                                                             |
| -------------------------------- | -------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `Company`                        | Cabinet (tenant), SIREN unique                                             | —                        | Parent de User, Invitation, Candidate, Tag, ClientCompany, JobOffer, Note                  |
| `User`                           | Membre du cabinet ; `id` = id Supabase Auth                                | `companyId`              | Auteur de Note                                                                             |
| `Invitation`                     | Invitation par email (token, expiration, usedAt, revokedAt)                | `companyId`              | —                                                                                          |
| `Candidate`                      | Fiche candidat (photo, CV, résumé)                                         | `companyId`              | Experience, Formation, Language, CandidateTag, CandidateCity, Candidature, Note, ShareLink |
| `Experience` / `Formation`       | Parcours du candidat (ordonnés)                                            | via Candidate            | —                                                                                          |
| `Language`                       | Langue + niveau (enum)                                                     | via Candidate            | —                                                                                          |
| `Tag`                            | Tag coloré, partagé candidats/offres                                       | `companyId`              | CandidateTag, OfferTag                                                                     |
| `CandidateTag` / `OfferTag`      | Liaisons N-N avec Tag                                                      | via Candidate / JobOffer | —                                                                                          |
| `ClientCompany`                  | Entreprise cliente                                                         | `companyId`              | ClientContact, JobOffer, ClientCompanyCity                                                 |
| `ClientContact`                  | Contact chez le client                                                     | via ClientCompany        | Référencé par JobOffer (optionnel)                                                         |
| `JobOffer`                       | Offre (statut TODO / IN_PROGRESS / DONE, salaire, ville)                   | `companyId`              | ClientCompany, ClientContact, City (optionnels, SetNull), OfferTag, Candidature, Note      |
| `Candidature`                    | Lien candidat ↔ offre + statut de pipeline (unique par paire)              | via Candidate / JobOffer | —                                                                                          |
| `Note`                           | Note BlockNote (JSON), liée à un candidat, une offre, ou libre             | `companyId`              | Auteur User                                                                                |
| `ShareLink`                      | Lien public NORMAL / ANONYMOUS, expiration optionnelle                     | via Candidate            | —                                                                                          |
| `City` (table `cities`)          | Référentiel de villes (nom, région, pays, coordonnées), unique (nom, pays) | Global                   | CandidateCity, ClientCompanyCity, JobOffer                                                 |
| `CandidateCity`                  | Villes d'un candidat (N-N ordonnée)                                        | via Candidate            | City en `Restrict`                                                                         |
| `ClientCompanyCity`              | Villes d'un client (N-N)                                                   | via ClientCompany        | City en `Restrict`                                                                         |
| `KeepAlive` (table `_keepalive`) | Ligne unique mise à jour par le cron keep-alive                            | Système                  | —                                                                                          |

Index notables : `Candidate(companyId, firstName, lastName, title)`, `JobOffer(companyId, title)`. Extensions `unaccent` et `pg_trgm` installées, mais **aucun index sur `cities.name`** (supprimé par `city_drift_fix`, voir TO-DO).

---

## 8. Stockage de fichiers (Supabase Storage)

| Bucket   | Contenu                                                                  | Visibilité | Accès                                                                               |
| -------- | ------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------- |
| `photos` | Photos candidat (JPG, PNG, WebP ; 2 Mo max ; signature binaire vérifiée) | Public     | URL publique stockée dans `Candidate.photoUrl`, affichée directement                |
| `cvs`    | CV (PDF, DOC, DOCX ; 5 Mo max)                                           | Privé      | URL signée générée à la demande (15 min) ; cache client 14 min (`useCvDownloadUrl`) |

| Sujet                  | Règle                                                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chemins                | `{companyId}/candidates/{candidateId}/photo.{ext}` et `.../cv.{ext}` — préfixe tenant ; un nouvel upload écrase le fichier de même extension, mais une extension différente laisse l'ancien en place (voir `TO-DO.md`).                                                                                                          |
| Écriture / suppression | Uniquement côté serveur, via le client admin (secret key) dans les procédures `candidate.uploadPhoto`, `uploadCv`, `deleteCv` ; fichier envoyé en base64 dans l'input tRPC. Les policies Storage sont donc contournées par conception. |
| Lecture CV             | `candidate.getCvDownloadUrl` (authentifié) ou `candidate.getCvDownloadUrlByShareToken` (page publique : token + expiration validés, rate limit IP).                                                                                    |
| `Candidate.cvUrl`      | URL de référence non exploitable directement (bucket privé) ; `cvFileName` conserve le nom d'origine.                                                                                                                                  |
| Provisionnement        | Buckets `photos` (public) et `cvs` (privé) créés manuellement dans le dashboard Supabase **et dans le Studio local** (http://127.0.0.1:54323) : non déclarés dans `supabase/config.toml` ni dans les migrations, une stack locale neuve ne les a pas.                                                                                                             |

---

## 9. Déploiement, environnements, CI, migrations

### Environnements

| Environnement | Base / Auth / Storage                                                               | Config                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Local (dev)   | Stack Supabase CLI (Docker) : API 54321, Postgres 54322, Studio 54323, emails 54324 | `.env.local` (prioritaire), `.env` en repli ; `bun run dev` vérifie d'abord que Supabase local répond (`scripts/check-local-services.sh`) |
| Tests DB      | Base dédiée `claritee_test` recréée à chaque run sur l'instance locale              | `scripts/test-db.sh`                                                                                                                   |
| CI            | `supabase start` dans GitHub Actions                                                | `.github/workflows/ci.yml`                                                                                                             |
| Production    | Projet Supabase cloud (EU) + Vercel                                                 | Variables Vercel ; copie locale des identifiants prod dans `.env.prod.local` (non versionné)                                           |
| Staging       | **Inexistant** (backlog `docs/TO-DO.md`)                                            | —                                                                                                                                      |

### Variables d'environnement

Modèle : `.env.example`.

| Variable                                                                                  | Rôle                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                            | Runtime : pooler Supabase en mode transaction (port 6543, `pgbouncer=true`)                                                                                                                                   |
| `DIRECT_DATABASE_URL`                                                                     | Migrations (`prisma.config.ts`, dont `migrate deploy` au build Vercel) : pooler Supabase en mode **session**, `postgresql://postgres.<ref>:<mdp>@aws-…pooler.supabase.com:5432/postgres` — soit `DATABASE_URL` avec le port 5432 et sans `pgbouncer`. La connexion directe `db.<ref>.supabase.co` (IPv6 uniquement, injoignable depuis Vercel) et le pooler transaction (6543) ne conviennent pas : en production, `scripts/vercel-build.sh` les refuse (sans tenir compte de la casse), ainsi que `pgbouncer=` et, sur le pooler Supabase, un utilisateur sans `.<ref>`. Repli sur `DATABASE_URL` si absente |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Supabase (§5)                                                                                                                                                                                                 |
| `KEEPALIVE_SECRET`                                                                        | Bearer protégeant `/api/keep-alive` (même valeur sur Vercel et dans les secrets GitHub). Si vide, l'endpoint n'est **pas** protégé.                                                                           |
| `KEEPALIVE_URL` (secret GitHub uniquement)                                                | URL appelée par `keep-alive.yml`                                                                                                                                                                              |

### Base locale

| Commande                                | Effet                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `bun run db:local:start` / `db:local:stop` | Démarre / arrête la stack Supabase locale (données conservées)                                                                             |
| `bun run db:local:reset`                   | Base locale vierge puis `prisma migrate deploy` (sans données)                                                                             |
| `bun run db:pull:prod`                     | Copie les données prod (`public` + `auth.users`/`auth.identities`) vers la base locale, après confirmation ; refuse toute cible non locale |
| `bun run prisma db seed`                | Seed de dev (`prisma/seed.ts`) : cabinet, utilisateur et invitation de démo, puis pré-remplissage de `cities` via Photon (`scripts/seed-cities.ts`, réseau) |

### Migrations

| Règle    | Détail                                                                                                                                                                                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Outil    | `prisma migrate dev` en local, `prisma migrate deploy` ailleurs ; config dans `prisma.config.ts` (externalTables, stub `auth.uid()` pour la shadow DB).                                                                                                                                       |
| SQL brut | Extensions, RLS, `_keepalive` : migrations SQL éditées à la main.                                                                                                                                                                                                                             |
| Ordre    | Les migrations RLS / droits sont datées 2030 (`20300101…` à `20300103…`) pour rester les dernières sur une base vierge. `prisma migrate dev` génère un horodatage du jour, qui trie avant les migrations 2030 : **renommer le dossier** pour le dater après la dernière migration existante. Une nouvelle migration doit être datée **après la dernière migration existante** (donc après `20300103000000`), sinon l'ordre diffère entre base vierge et prod. |
| Prod     | `vercel.json` (versionné, prime sur le dashboard) appelle `scripts/vercel-build.sh` : `next build` puis `prisma migrate deploy`, **en production uniquement** (`VERCEL_ENV`) ; les previews ne migrent jamais. Un build en échec ne touche pas la base ; une migration en échec fait échouer le déploiement. `VERCEL_ENV` absent, ou `DIRECT_DATABASE_URL` absente ou mal ciblée en production (voir variables d'environnement) → échec avant le build. Limite : la migration est appliquée avant la promotion du nouveau code, l'ancien code tourne brièvement sur le nouveau schéma — une migration destructive doit rester compatible avec le code en ligne (expand / contract). |

### CI (`.github/workflows/ci.yml`, push / PR sur `main` et `master`)

| Job                  | Contenu                                       |
| -------------------- | --------------------------------------------- |
| `lint-typecheck`     | `bun run lint` + `tsc --noEmit`                  |
| `test` (après lint)  | `supabase start` puis `bun run test` (unit + DB) |
| `build` (après lint) | `bun run build` avec variables factices          |

Node 20 (runtime) et bun (`oven-sh/setup-bun`, version lue dans `packageManager`) ; dépendances installées en `bun install --frozen-lockfile`.

### Keep-alive et supervision

| Élément                            | Rôle                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/keep-alive.yml` | Cron quotidien (~06:17 UTC) qui appelle `GET /api/keep-alive` avec le bearer : upsert de la ligne `_keepalive` → empêche la pause de la DB Supabase gratuite. `_keepalive.lastPingAt` permet de vérifier que le cron tourne encore. Limite connue : GitHub désactive les crons après 60 j sans activité sur le repo. |
| `GET /api/health`                  | `SELECT 1` → 200 `{ ok, db }` ou 503 ; public, sans donnée sensible.                                                                                                                                                                                                                                                 |
| Logs                               | stdout/stderr récupérés par Vercel ; jamais de mot de passe, token ni donnée personnelle. Vercel Speed Insights pour les métriques front.                                                                                                                                                                            |
| Sauvegardes                        | Pas de backup garanti en offre gratuite : `pg_dump` manuel avant changement important ; fichiers Storage à exporter séparément.                                                                                                                                                                                      |

---

## 10. Stratégie de tests

| Suite            | Commande                                       | Périmètre                                                                                                                                                                                                       | Environnement                                                                                                                                                                                                  |
| ---------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitaires        | `bun run test:unit` (`vitest run __tests__/unit`) | Logique pure, schémas Zod, rate limit, routers tRPC avec contexte/Prisma mockés, composants React (Testing Library, jsdom via directive de fichier), contrôle statique de la migration RLS et de `package.json` | `vitest.config.ts`, sans DB                                                                                                                                                                                    |
| DB / intégration | `bun run test:db` (`scripts/test-db.sh`)          | Routers tRPC contre une vraie base Postgres, seed                                                                                                                                                               | `claritee_test` recréée à chaque run + `migrate deploy` ; fichiers en `describe.runIf(DATABASE_URL)` (skippés en silence sans URL, voir TO-DO) ; `vitest.config.db.ts` en **série** (`fileParallelism: false`) |
| Tout             | `bun run test`                                    | unit puis DB                                                                                                                                                                                                    | Requiert la stack locale démarrée                                                                                                                                                                              |
| Watch            | `bun run test:watch`                              | Unitaires                                                                                                                                                                                                       | —                                                                                                                                                                                                              |
| Accessibilité    | `bun run a11y`                                    | pa11y WCAG2AA sur `/dashboard` et `/settings/team` — pages protégées sans session dans pa11y : redirigées vers `/login`, seule page réellement auditée (voir `TO-DO.md`) | Serveur local lancé                                                                                                                                                                                            |

Arborescence : `__tests__/unit/**` et `__tests__/db/**`, chacune calquée sur `src/`. Les tests DB créent leurs propres données (pas de seed réseau). Pas d'E2E (Playwright non installé) ni d'objectif de couverture : priorité aux chemins critiques et aux cas d'erreur (validation, non autorisé, introuvable, isolation tenant).

---

## 11. Décisions d'architecture

Une décision ne se supprime pas : une nouvelle ligne la remplace explicitement. Les ADR détaillées d'origine (0001 à 0005) sont dans le tag git `docs-archive-2026-10`.

| ADR  | Décision                                                                                 | Raison                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 0001 | Monolithe fullstack Next.js en serverless sur Vercel + Supabase                          | Budget zéro et développeur solo : un repo, un déploiement, aucune infra à gérer                           |
| 0002 | Multi-tenancy par ligne : `companyId` + RLS dans une base unique                         | Une seule base à migrer, avec défense en profondeur côté PostgreSQL                                       |
| 0003 | tRPC v11 + Zod plutôt que REST/GraphQL                                                   | Contrat type-safe de bout en bout sans génération de client ; aucun besoin d'API publique                 |
| 0004 | Recherche par `ilike`/`contains` Prisma, `tsvector` + GIN reporté                        | Volume par cabinet faible : simplicité et typage Prisma préférés à la pertinence et aux triggers SQL      |
| 0005 | Villes structurées : table `cities` locale (unaccent + pg_trgm) avec fallback API Photon | Autocomplétion cohérente et gratuite (sans clé, couverture Europe) avec un référentiel local réutilisable |
| 0006 | Remplace 0002 pour la RLS : isolation par `companyId` dans l'application seule ; RLS activée sans policy et API REST Supabase fermée | Prisma contourne la RLS et l'app n'utilise pas la Data API : des policies ne protégeaient rien (et étaient cassées) |
| 0007 | Précise 0005 : recherche de villes par préfixe `unaccent(name) ILIKE 'x%'` ; `pg_trgm` installé mais inutilisé | Le préfixe suffit à l'autocomplétion ; index fonctionnel à créer (voir `TO-DO.md`) |
