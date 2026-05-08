# 1. Résumé technique et contraintes

## 1.1 Style architectural

- **Style :** Monolithe fullstack (Next.js App Router + tRPC + Prisma), déployé en serverless sur Vercel.
- **Frontend :** Next.js 16 (App Router), React 19.2, TypeScript, shadcn/ui, TanStack Query.
- **Backend :** tRPC v11 dans les API Routes Next.js, Prisma comme ORM, PostgreSQL (Supabase).
- **Auth / Stockage :** Supabase Auth (JWT), Supabase Storage (fichiers).
- **Objectifs :** Budget zéro (free tiers), développeur solo, temps de chargement < 3 s, réponse API < 500 ms.

## 1.2 Contraintes cibles

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
