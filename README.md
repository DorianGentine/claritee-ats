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

- **Node.js** 18+ (recommandé : LTS)
- Compte **Supabase** (gratuit) et projet créé (région EU recommandée pour RGPD)
- **Git**

### Installation

```bash
# Cloner le dépôt
git clone <url-du-repo>
cd claritee-ats

# Installer les dépendances
pnpm install
```

### Variables d’environnement

1. Copier le fichier d’exemple :  
   `cp .env.example .env.local`
2. **Ne pas committer `.env.local`** — ce fichier est une copie de `.env.example` et doit rester local (il est ignoré par Git).
3. Renseigner les variables dans `.env.local` (voir `.env.example` pour la liste) :
   - **DATABASE_URL** : connection string PostgreSQL du projet Supabase (Settings → Database)
   - **NEXT_PUBLIC_SUPABASE_URL** : URL du projet (ex. `https://xxx.supabase.co`)
   - **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY** : clé publique (API Keys → Publishable key)
   - **SUPABASE_SECRET_KEY** : clé secrète (serveur uniquement, jamais exposer au client)

### Base de données

```bash
# Appliquer les migrations (schéma + RLS)
npx prisma migrate deploy

# (Optionnel) Alimenter la base avec des données de dev
npx prisma db seed
```

### Lancer l’application

```bash
npm run dev
# ou
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Vérifier le health check : [http://localhost:3000/api/health](http://localhost:3000/api/health) (200 OK).

### Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | Lint (ESLint) |
| `npx prisma studio` | Interface d’édition de la base (Prisma Studio) |
| `npx prisma migrate dev` | Créer / appliquer une migration en dev |

### Documentation

| Document | Contenu |
|----------|---------|
| [docs/prd.md](docs/prd.md) | Product Requirements Document (fonctionnel, NFR) |
| [docs/brief.md](docs/brief.md) | Brief projet, positionnement, proposition de valeur |
| [docs/architecture.md](docs/architecture.md) | Architecture technique (stack, RLS, API, déploiement) |
| [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md) | Versions pinnées des dépendances |
| [docs/architecture/source-tree.md](docs/architecture/source-tree.md) | Arborescence du repo et où placer le code |
| [docs/architecture/coding-standards.md](docs/architecture/coding-standards.md) | Conventions de code (nommage, tRPC, tests) |
| [docs/design-system.md](docs/design-system.md) | Design system (couleurs, typo, composants, accessibilité) |
| [docs/architecture/adr/](docs/architecture/adr/) | Architecture Decision Records (décisions clés) |

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
