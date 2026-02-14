# Documentation Claritee ATS

Index des documents du projet. Point d’entrée : [PRD](prd.md) (fonctionnel) et [Architecture](architecture.md) (technique).

---

## Produit & Contexte

| Document | Description |
|----------|-------------|
| [prd.md](prd.md) | **Product Requirements Document** — objectifs, exigences fonctionnelles (FR) et non fonctionnelles (NFR), epics, stories, critères d’acceptation. |
| [brief.md](brief.md) | **Brief projet** — résumé exécutif, problème adressé, proposition de valeur, positionnement, différenciateurs. |
| [wireframes.md](wireframes.md) | **Wireframes** — maquettes et parcours UI (écrans, flux). |
| [brainstorming-session-results.md](brainstorming-session-results.md) | Résultats de session(s) de brainstorming (idéation, priorités). |

---

## Technique

| Document | Description |
|----------|-------------|
| [architecture.md](architecture.md) | **Architecture technique** — stack, multi-tenancy (RLS), schéma, structure du repo, auth, API tRPC, sécurité, observabilité, RGPD, résilience, rate limiting, déploiement, backup, stratégie de tests. |
| [design-system.md](design-system.md) | **Design system** — palette, typo, espacement, composants (shadcn/ui), accessibilité (WCAG AA), responsive, icônes, états. |

### architecture/ (shards)

| Fichier | Description |
|---------|-------------|
| [tech-stack.md](architecture/tech-stack.md) | Versions pinnées des dépendances (TypeScript, React, Next.js, Prisma, etc.). |
| [source-tree.md](architecture/source-tree.md) | Arborescence du repo et « où placer quoi » (pages, composants, routers, tests). |
| [coding-standards.md](architecture/coding-standards.md) | Conventions de code (nommage, tRPC, Zod, tests, multi-tenancy). |
| [rls-policies.sql](architecture/rls-policies.sql) | Référence documentée des politiques RLS (version exécutée : `prisma/migrations/.../migration.sql`). |
| [adr/](architecture/adr/) | **Architecture Decision Records** — décisions clés (monolithe serverless, RLS, tRPC). Voir [adr/README.md](architecture/adr/README.md). |

---

*Pour l’onboarding développeur et le glossaire, voir le [README racine](../README.md).*
