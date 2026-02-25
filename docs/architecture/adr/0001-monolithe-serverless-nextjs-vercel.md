# ADR 0001 — Monolithe serverless (Next.js + Vercel)

## Contexte

Claritee ATS doit être déployé avec un **budget zéro** (free tiers) et maintenu par un développeur solo. Il faut choisir un style d’architecture : microservices, monolithe traditionnel (VPS), ou monolithe serverless.

## Décision

Nous retenons un **monolithe fullstack déployé en serverless** : une seule application Next.js (frontend + API tRPC) hébergée sur **Vercel**, avec base de données et auth gérées par **Supabase** (PostgreSQL, Auth, Storage). Pas de microservices, pas de serveur dédié (VPS).

## Conséquences

- **Positives :** un seul repo, un seul déploiement, pas de coût d’infra (free tiers Vercel + Supabase), scaling automatique, pas de gestion de serveur. Next.js App Router permet SSR et API dans le même projet.
- **Négatives :** cold starts possibles (limités par le health check toutes les 10 min), limites des free tiers (bande passante, invocations, DB 500 Mo). Si le produit grossit, migration vers des offres payantes ou découpage futur possible.
- **Contraintes :** toute la logique métier et l’API vivent dans le même déploiement ; les dépendances et la taille du bundle doivent rester maîtrisées.

---

_Référence : `docs/architecture.md` §1.1, §3.2._
