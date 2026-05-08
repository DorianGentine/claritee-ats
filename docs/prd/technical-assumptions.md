# Technical Assumptions

## Repository Structure: Monorepo

Le projet utilisera une structure **Monorepo** avec frontend et backend dans le même repository.

**Rationale :**
- Partage facilité des types TypeScript entre frontend et backend
- Déploiement simplifié sur Vercel (un seul repo)
- Cohérence des versions et dépendances
- Adapté à une équipe d'un seul développeur

## Service Architecture

**Architecture Monolithique** avec les composants suivants :

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Frontend** | React + TypeScript + Next.js | Framework moderne, SSR/SSG, déploiement Vercel natif |
| **Backend/API** | tRPC | API type-safe de bout en bout, intégré à Next.js |
| **ORM** | Prisma | Typage TypeScript natif, migrations déclaratives |
| **Database** | PostgreSQL (Supabase) | Instance dédiée gratuite, 500 Mo |
| **Auth** | Supabase Auth | Intégré à Supabase, gratuit, sessions sécurisées |
| **Storage** | Supabase Storage | Stockage fichiers (CVs, photos), 1 Go gratuit |
| **Hosting** | Vercel | Déploiement automatique, serverless, gratuit |

**Rationale :**
- Pas de microservices → complexité inutile pour un MVP avec un seul développeur
- tRPC intégré dans Next.js API routes → un seul déploiement
- Supabase Auth choisi car il unifie auth, DB et storage sous un même écosystème

## Testing Requirements

**Stratégie de test pour le MVP :**

| Type | Scope | Outils suggérés |
|------|-------|-----------------|
| **Unit Tests** | Fonctions utilitaires, logique métier | Vitest |
| **Integration Tests** | API tRPC, interactions DB | Vitest + Prisma test utils |
| **E2E Tests** | Parcours utilisateur critiques (optionnel) | Playwright |

**Priorité MVP :**
1. Tests unitaires sur la logique métier critique (validation SIREN, génération URLs partage)
2. Tests d'intégration sur les endpoints tRPC principaux
3. E2E optionnel - focus sur les happy paths critiques si temps disponible

**Testing Strategy Matrix:**

| Priorité | Type | Scope | Exemples |
|----------|------|-------|----------|
| **P1** | Unit | Logique métier critique | Validation SIREN (9 digits), génération tokens partage (UUID), formatage dates, calcul expiration |
| **P1** | Integration | Auth flow complet | Register, login, logout, session persistence, protected routes |
| **P1** | Integration | CRUD Candidats | Create, read, update, delete, RLS isolation |
| **P2** | Integration | CRUD Offres | Create, read, update, delete, association client |
| **P2** | Integration | Candidatures | Association candidat-offre, changement statut, dissociation |
| **P2** | Integration | Notes | Create, read, update (own), delete (own), association |
| **P3** | E2E | Happy path principal | Inscription → Création candidat → Ajout expérience → Partage → Vérification page publique |
| **P3** | E2E | Pipeline recrutement | Création offre → Association candidats → Changement statuts |

## Additional Technical Assumptions and Requests

- **UI Components** : shadcn/ui (composants Radix + Tailwind)
- **Styling** : Tailwind CSS
- **State Management** : React Query (TanStack Query) intégré avec tRPC
- **Forms** : React Hook Form + Zod pour la validation côté client
- **Validation** : Zod partagé entre frontend (forms) et backend (tRPC inputs)
- **Icons** : Lucide React
- **Date Handling** : date-fns
- **Notes (éditeur riche)** : BlockNote ([blocknotejs.org](https://www.blocknotejs.org/docs)) — éditeur bloc-based type Notion pour les notes candidats/offres (texte, listes, titres). Contenu stocké en JSON en base. Intégré dans Story 3.9.
- **File Upload** : Upload direct vers Supabase Storage via SDK client
- **Environment** : Variables d'environnement pour les clés Supabase
- **Code Quality** : ESLint + Prettier, TypeScript strict mode
- **Git Workflow** : Main branch protégée, feature branches

## Observability Requirements

| Métrique | Seuil d'alerte | Action |
|----------|----------------|--------|
| Temps de réponse API | > 500ms (P95) | Alert → Investigation |
| Taux d'erreurs 5xx | > 1% sur 5 min | Alert → Investigation immédiate |
| Taux d'erreurs 4xx | > 10% sur 5 min | Warning → Review logs |
| Espace DB utilisé | > 400 Mo | Warning (limite free tier: 500 Mo) |
| Espace Storage utilisé | > 800 Mo | Warning (limite free tier: 1 Go) |
| Bandwidth Vercel | > 80 Go/mois | Warning (limite: 100 Go) |

**Outils de monitoring (gratuits) :**
- Vercel Analytics : Performance frontend, Core Web Vitals
- Supabase Dashboard : Métriques DB, requêtes lentes, storage
- Vercel Logs : Logs serverless functions, erreurs

**Métriques business à tracker :**
- Cabinets actifs (connexion < 7 jours)
- Candidats créés / cabinet
- Offres créées / cabinet
- Fiches partagées / mois
- Taux de rétention J7

---
