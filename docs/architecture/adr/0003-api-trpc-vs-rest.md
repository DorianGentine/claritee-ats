# ADR 0003 — API : tRPC plutôt que REST

## Contexte

L’application a besoin d’une API type-safe entre le frontend (React/Next.js) et le backend (logique métier, Prisma, Supabase). Les options envisagées : API REST (Next.js Route Handlers ou séparée), GraphQL, ou **tRPC**.

## Décision

Nous retenons **tRPC v11** : les procedures sont définies en TypeScript côté serveur, et le client génère automatiquement des types et des appels typés. Pas d’API REST publique pour le MVP ; Next.js expose le handler tRPC sous `/api/trpc/[...trpc]`. Les schémas d’entrée sont validés avec **Zod** (partagés entre client et serveur).

## Conséquences

- **Positives :** pas de génération de client séparée, pas de dérive entre contrat et implémentation ; refactors (renommage, ajout de champs) propagés par le type-check. Validation Zod réutilisable dans les formulaires (React Hook Form). Bonne DX pour un projet solo ou petite équipe.
- **Négatives :** tRPC est couplé à TypeScript/Node ; pas d’API consommable par un client non-TypeScript (mobile natif, partenaire externe) sans adapter. Pour le MVP, aucun besoin d’API publique.
- **Contraintes :** toute nouvelle opération métier est exposée via une procedure tRPC (router dédié ou existant) ; les erreurs suivent les codes tRPC (UNAUTHORIZED, NOT_FOUND, BAD_REQUEST, etc.) et les messages côté client restent génériques (voir §10.1 architecture).

---

_Référence : `docs/architecture.md` §9, §10.1 ; `docs/architecture/coding-standards.md` §3._
