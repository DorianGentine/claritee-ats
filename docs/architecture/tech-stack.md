# Claritee ATS — Stack technique

> Référentiel unique des technologies et versions cibles. Document parent : `docs/architecture.md` §2.

---

## Tableau de référence

Versions cibles **pinnées** pour éviter les dérives ; mettre à jour explicitement après tests (compatibilité, régressions).

| Catégorie        | Technologie    | Version cible | Rôle / justification |
|------------------|----------------|---------------|-----------------------|
| Langage          | TypeScript     | 5.9           | Typage strict front + back |
| Frontend         | React          | 19.2          | UI composants         |
| Framework        | Next.js        | 16.1.6        | App Router, SSR, déploiement Vercel |
| API              | tRPC           | 11.0          | API type-safe, partage de types |
| ORM              | Prisma         | 7.4.0         | Typage, migrations    |
| Base de données  | PostgreSQL     | 15 (Supabase) | Données relationnelles |
| Auth             | Supabase Auth  | -             | Inscription, login, JWT |
| Stockage fichiers | Supabase Storage | -          | Photos, CVs           |
| Hébergement      | Vercel         | -             | Front + API serverless |
| UI               | shadcn/ui      | -             | Composants Radix + Tailwind |
| CSS              | Tailwind CSS   | 4.1           | Styles                 |
| Validation       | Zod            | 4.3.6         | Partagé front/back     |
| State / Data     | TanStack Query | 5.59          | Cache, mutations       |
| Formulaires      | React Hook Form| 7.53          | Forms + Zod            |
| Dates            | date-fns       | 2.30          | Formatage / calculs    |
| Tests unitaires / intégration | Vitest | 2.1    | Logique + API          |
| E2E (optionnel)  | Playwright     | 1.49          | Parcours critiques     |

---

## Contraintes cibles (rappel)

| Composant    | Technologie              | Contrainte / objectif        |
|-------------|--------------------------|------------------------------|
| Runtime     | Node.js (Vercel serverless) | Free tier                 |
| Framework   | Next.js 16 App Router    | TypeScript strict            |
| API         | tRPC v11                 | Type-safe E2E                |
| ORM         | Prisma                   | Migrations versionnées       |
| DB          | Supabase PostgreSQL     | 500 Mo max                   |
| Auth        | Supabase Auth            | Sessions JWT                  |
| Storage     | Supabase Storage         | 1 Go max                     |
| Multi-tenancy | RLS Policies           | `companyId` sur tables métier |

---

*Dernière mise à jour : 2026-02-14. Aligné avec `docs/architecture.md`.*
