# 14. Stratégie de tests

- **Périmètre (MVP) :**
  - **Unitaires (Vitest) :** logique métier pure (utils, helpers, validations Zod), et procedures tRPC avec contexte mocké (ctx avec `companyId`, `db` mock ou Prisma mock).
  - **Intégration (Vitest) :** appels tRPC réels contre une base de test (ex. SQLite en mémoire ou PostgreSQL éphémère), pour les parcours critiques (création candidat, liste scopée par company, partage). Isoler les tests (transaction rollback ou DB dédiée par test).
  - **E2E (Playwright, optionnel) :** parcours critiques uniquement : inscription → dashboard, connexion → liste candidats, création candidat, génération lien partage → ouverture page publique. Cibler Chrome ou Chromium pour le MVP.
- **Emplacements :**
  - Fichiers unitaires : `tests/unit/`, miroir du chemin source si utile (ex. `tests/unit/lib/validations/candidate.test.ts`).
  - Fichiers d’intégration : `tests/integration/` (ex. `tests/integration/trpc-candidate.test.ts`).
  - E2E : `tests/e2e/` (ex. `tests/e2e/auth.spec.ts`, `tests/e2e/candidate-share.spec.ts`).
- **Données de test :** seed dédié ou factories (ex. `tests/fixtures/`) pour créer des Company, User, Candidate de test ; ne pas dépendre du seed de dev.
- **CI :** exécuter lint + typecheck + tests unitaires et intégration sur chaque push (voir `.github/workflows/ci.yml`) ; E2E en option ou sur plan déclenché (ex. nightly, ou manuel avant release).
- **Couverture :** pas d’objectif de pourcentage imposé pour le MVP ; prioriser les chemins critiques et les cas d’erreur (validation, unauthorized, not found).
