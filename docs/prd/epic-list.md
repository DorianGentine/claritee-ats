# Epic List

## Références livrables UX & Architecture

Les epics et stories s’appuient sur les livrables suivants ; les critères d’acceptation doivent être alignés avec ces références :

| Livrable | Fichier | Contenu clé |
|----------|---------|-------------|
| **Architecture** | `docs/architecture.md` | Stack (Next.js, tRPC v11, Prisma, Supabase), multi-tenancy RLS, schéma de données, structure monorepo `src/`, routers tRPC, Auth, Storage (buckets `photos` / `cvs`), déploiement Vercel |
| **Architecture Frontend** | `docs/frontend-architecture.md` | Stack frontend, état (TanStack Query), routing (tableau routes), composants (props/events §4.2), intégration API, accessibilité |
| **Rate Limiting** | `docs/architecture/rate-limiting.md` | Seuils (auth IP, share userId, upload userId), où brancher, guide d'intégration `src/lib/rate-limit.ts` |
| **Coding Standards** | `docs/architecture/coding-standards.md` | Pièges courants §5.1, template router §3.1, outils a11y (jest-axe, Pa11y) §7 |
| **Source Tree** | `docs/architecture/source-tree.md` | Structure dossiers, « où placer quoi » pour nouveaux composants/routers |
| **Tech Stack** | `docs/architecture/tech-stack.md` | Versions pinnées des dépendances |
| **Wireframes** | `docs/wireframes.md` | Layout global (shell), 8 écrans (Dashboard, Liste/Fiche Candidats, …), modals (note rapide, partager, recherche Cmd+K) |
| **Design System** | `docs/design-system.md` | Palette (background, primary terracotta, secondary sauge), typo (DM Sans), composants shadcn/ui, WCAG AA |

| # | Epic | Goal Statement |
|---|------|----------------|
| **Epic 1** | Foundation & Authentification | Établir l'infrastructure projet (Next.js, Prisma, Supabase) et implémenter l'authentification complète avec création de cabinet et invitation de collaborateurs |
| **Epic 2** | Gestion des Candidats | Permettre la création, consultation et gestion complète des fiches candidats avec expériences, formations, CV, tags et layout professionnel type CV |
| **Epic 3** | Offres, Clients & Pipeline | Gérer les offres d'emploi et entreprises clientes, et permettre le suivi des candidats par offre avec statuts et notes partagées |
| **Epic 4** | Recherche, Filtres & Partage | Implémenter la recherche/filtrage des candidats et offres, et permettre le partage de fiches candidats (normales et anonymisées) via URLs publiques |
| **Epic 5** | Villes Structurées | Remplacer les champs texte libres ville/localisation par une table `City` partagée avec autocomplétion hybride (seed local + API Photon), et des relations structurées sur candidats, offres et entreprises clientes |

## Ordre de priorités de développement

L'ordre de développement recommandé privilégie la **recherche** et la **gestion des notes** avant les onglets Offres et Clients :

| Phase | Focus | Stories |
|-------|-------|---------|
| **1** | Foundation | Epic 1 (1.1 → 1.7) |
| **2** | Candidats | Epic 2 (2.1 → 2.10) |
| **3** | **Recherche & Notes** | 4.1 Barre de recherche globale, 4.2 Filtres liste candidats, 3.9 Notes sur candidats, 3.11 Widget note rapide (chat), 3.12 Page Mes notes |
| **4** | Offres, Clients & Pipeline | Epic 3 (3.1 → 3.8, 3.10) + 4.3 Filtres offres |
| **5** | Partage & finalisation | 4.4 → 4.8 (Partage, Dashboard final, Paramètres) |

*Les onglets Offres et Clients (3.1–3.8) peuvent être désactivés ou masqués en navigation tant que la phase 4 n’est pas engagée.*

---
