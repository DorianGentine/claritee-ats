# ADR 0002 — Multi-tenancy par ligne (RLS + companyId)

## Contexte

Plusieurs cabinets (tenants) utilisent la même application. Les données d’un cabinet ne doivent jamais être visibles ou modifiables par un autre. Il faut choisir une stratégie d’isolation : base par tenant, schéma par tenant, ou **une base unique avec isolation par ligne** (row-level).

## Décision

Nous retenons le **multi-tenancy par ligne** : une seule base PostgreSQL (Supabase), avec une colonne **`companyId`** sur toutes les tables métier (Candidate, JobOffer, ClientCompany, Note, Tag, ShareLink, etc.). L’isolation est garantie par des **politiques Row Level Security (RLS)** qui restreignent chaque requête aux lignes dont le `companyId` correspond au cabinet de l’utilisateur connecté. Le `companyId` de l’utilisateur est dérivé de la table `User` à partir de `auth.uid()` (Supabase).

## Conséquences

- **Positives :** une seule base à gérer, déploiement et migrations simples, pas de multiplication des projets Supabase. RLS assure une défense en profondeur même en cas d’erreur applicative (requête sans filtre `companyId`).
- **Négatives :** toute requête doit être scopée (via `ctx.companyId` en tRPC et RLS en base). Les tables sans `companyId` direct (ex. Experience, Formation) sont protégées par l’application en passant toujours par une entité parente (Candidate) déjà filtrée.
- **Contraintes :** ne jamais désactiver RLS en prod pour les tables métier ; toute nouvelle table métier doit avoir `companyId` et des policies RLS, ou un accès strictement contrôlé via des procédures qui filtrent par parent.

---

*Référence : `docs/architecture.md` §4 ; `docs/architecture/rls-policies.sql`.*
