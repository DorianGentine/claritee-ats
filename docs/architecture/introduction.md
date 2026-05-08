# Introduction

Ce document décrit l'architecture technique complète du projet **Claritee ATS**, application de gestion de candidats et d'offres d'emploi pour cabinets de recrutement. Il sert de référence unique pour le développement fullstack (Next.js, tRPC, Prisma, Supabase) et couvre le multi-tenancy, la sécurité, le schéma de données et le déploiement.

**Références :**
- PRD : `docs/prd.md`
- Brief : `docs/brief.md`

## Change Log

| Date       | Version | Description                    | Author   |
|------------|---------|--------------------------------|----------|
| 2026-02-14 | 1.0     | Création architecture initiale | Architect |
| 2026-02-17 | 1.1     | Ajout principes DRY et composants partagés | - |
| 2026-02-19 | 1.2     | Ajout convention point-virgule (pas de ; si inutile) | - |
| 2026-02-21 | 1.3     | TanStack Query : staleTime 5 minutes, convention isLoading (pas isFetching) pour skeletons | - |

---
