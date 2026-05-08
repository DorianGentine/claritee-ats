# 12. Fichiers de référence à créer/maintenir

- **`prisma/schema.prisma`** : schéma complet (voir fichier dédié dans le repo).
- **`docs/architecture/rls-policies.sql`** : référence documentée des policies RLS (version exécutée : `prisma/migrations/20300101000000_add_rls_policies/migration.sql`).
- **`docs/architecture/adr/`** : Architecture Decision Records (décisions clés : monolithe serverless, RLS, tRPC). Voir `adr/README.md`.
- **`docs/frontend-architecture.md`** : architecture frontend (routing, état, composants, intégration API, accessibilité). Complément à ce document pour la partie UI.
- **`docs/architecture/rate-limiting.md`** : intégration du rate limiting (seuils, où brancher). Code : `src/lib/rate-limit.ts`.
- **`.env.example`** : liste des variables (DATABASE_URL, SUPABASE_URL, Publishable key, Secret key).

---
