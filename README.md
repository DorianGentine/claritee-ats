# Claritee ATS

**Plateforme de gestion de candidats et d’offres d’emploi pour cabinets de recrutement.** Centralisation des candidats, offres et clients, fiches partageables (normales ou anonymisées), multi-utilisateurs par cabinet. Conçu pour les petits et moyens cabinets en France.

---

## Résumé du projet

Claritee ATS est un ATS/CMS qui permet aux recruteurs de :

- Gérer **candidats**, **offres d’emploi** et **clients** sur une seule interface
- Créer des **fiches candidats** type CV et les **partager** (version normale pour les clients, version anonymisée pour la prospection)
- Travailler à **plusieurs** (multi-utilisateurs par cabinet) avec notes partagées et suivi des statuts pour éviter les doublons

Stack : **Next.js 16** (App Router), **React 19.2**, **TypeScript**, **tRPC**, **Prisma**, **Supabase** (PostgreSQL, Auth, Storage), **Tailwind CSS 4**, **shadcn/ui**. Déploiement sur **Vercel**.

---

## Onboarding développeur

### Prérequis

- **Node.js 20.9+** (requis par Next 16) et **pnpm** (version fixée par `packageManager` dans `package.json` ; `corepack enable`)
- **Docker** + **Supabase CLI** (base locale) et un client **PostgreSQL** (`psql`, `pg_dump`, utilisés par les scripts de test et `db:pull:prod`)

### Installation

```bash
git clone <url-du-repo>
cd claritee-ats
pnpm install
cp .env.example .env.local   # ne jamais committer .env.local
```

### Base locale

```bash
pnpm db:local:start   # stack Supabase locale (Docker) — affiche les URLs et clés
pnpm db:local:reset   # base à neuf + migrations (schéma + RLS)
```

Renseigner `.env.local` avec les valeurs affichées par `supabase status` (`DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`). Données de dev : `pnpm prisma db seed`, ou copie de la prod avec `pnpm db:pull:prod`.

### Lancer l'application

```bash
pnpm dev   # vérifie d'abord que la stack locale répond
```

Ouvrir [http://localhost:3000](http://localhost:3000) ; health check : [http://localhost:3000/api/health](http://localhost:3000/api/health).

### Commandes utiles

| Commande | Description |
|----------|-------------|
| `pnpm dev` / `pnpm build` | Serveur de dev / build de production |
| `pnpm lint` | ESLint |
| `pnpm test:unit` / `pnpm test:db` | Tests unitaires / tests DB (stack locale démarrée) |
| `pnpm db:migrate` | Créer / appliquer une migration en dev |
| `pnpm prisma studio` | Interface d'édition de la base |

### Documentation

| Document | Contenu |
|----------|---------|
| [docs/TO-DO.md](docs/TO-DO.md) | Prochaines actions : bugs, infra, tests, dette technique, post-MVP |
| [docs/prd.md](docs/prd.md) | Vision produit, exigences fonctionnelles et non fonctionnelles, épics |
| [docs/architecture.md](docs/architecture.md) | Stack, arborescence, multi-tenancy/RLS, auth, API, modèle de données, déploiement, décisions (ADR) |
| [docs/coding-standards.md](docs/coding-standards.md) | Conventions de code, design tokens, tests, pièges connus |

L'historique (stories, rétros, rapports QA, ADR détaillés) est conservé dans le tag git `docs-archive-2026-10`.

---

## Glossaire

| Terme | Définition |
|-------|-------------|
| **ATS** | *Applicant Tracking System* — outil de suivi des candidatures et de gestion des candidats. |
| **Cabinet** | Entreprise de recrutement (tenant). Dans l’app, une **Company** ; les données sont isolées par cabinet (multi-tenancy). |
| **Candidat** | Personne dont le cabinet suit le profil (fiche avec coordonnées, expériences, formations, tags, CV, photo). |
| **Candidature** | Association entre un **candidat** et une **offre d’emploi**, avec un statut (ex. Contacté sur LinkedIn, Postulé, Accepté, Refusé). |
| **Client** | Entreprise cliente du cabinet ( **ClientCompany** ) pour laquelle le cabinet recrute ; on peut y associer des **contacts** ( **ClientContact** ). |
| **Fiche partageable** | Fiche candidat affichée sous forme de page type CV, accessible via un **lien de partage**. |
| **Lien de partage (normal)** | URL publique permettant d’afficher la fiche candidat complète (nom, photo, coordonnées, etc.) sans être connecté. |
| **Lien de partage (anonymisé)** | URL publique affichant une version anonymisée de la fiche (sans nom, prénom, photo, contacts, noms d’entreprises/écoles), pour la prospection. |
| **Offre d’emploi** | Offre de poste gérée par le cabinet ( **JobOffer** : titre, description, localisation, rémunération, statut, tags). |
| **RLS** | *Row Level Security* — politiques PostgreSQL qui limitent l’accès aux lignes selon l’utilisateur (ici : par `companyId` = cabinet). |
| **Tag** | Étiquette réutilisable pour classer des **candidats** et/ou des **offres** (ex. « Java », « Paris », « Senior »). |
| **Tenant** | Locataire du système ; dans Claritee ATS = un **cabinet** (Company). Les données sont scopées par tenant. |

---

*Claritee ATS — MVP, free tier. Voir [docs/architecture.md](docs/architecture.md) pour le déploiement et les limites.*
