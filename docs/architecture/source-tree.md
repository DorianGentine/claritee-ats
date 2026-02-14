# Claritee ATS — Arborescence des sources

> Où placer les fichiers et comment le monorepo est structuré. Document parent : `docs/architecture.md` §6.

---

## 1. Arborescence complète

Pas de Turborepo/Nx pour le MVP ; un seul package Next.js avec dossiers clairs et partage de types via le même projet.

```
claritee-ats/
├── .env.local                 # Ignoré ; copie de .env.example
├── .env.example               # Template variables d'environnement
├── .github/
│   └── workflows/
│       └── ci.yml            # Lint, typecheck, tests (optionnel)
├── docs/
│   ├── prd.md
│   ├── brief.md
│   ├── architecture.md       # Document d'architecture principal
│   ├── design-system.md
│   ├── wireframes.md
│   └── architecture/         # Shards (rls-policies.sql, coding-standards.md, etc.)
├── prisma/
│   ├── schema.prisma         # Schéma complet (16 entités)
│   ├── migrations/           # Migrations versionnées
│   └── seed.ts               # Données de dev
├── public/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Landing / redirect
│   │   ├── (auth)/           # Groupe : login, register, invite
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── invite/[token]/
│   │   ├── (dashboard)/      # Groupe : app authentifiée
│   │   │   ├── layout.tsx   # Shell + sidebar
│   │   │   ├── dashboard/
│   │   │   ├── candidates/
│   │   │   ├── offers/
│   │   │   ├── clients/
│   │   │   └── settings/
│   │   ├── share/[token]/    # Page publique (sans auth)
│   │   ├── api/
│   │   │   ├── health/       # GET /api/health
│   │   │   └── trpc/[...trpc]/  # tRPC handler
│   │   └── ...
│   ├── components/
│   │   ├── ui/               # shadcn/ui (ne pas modifier sans raison)
│   │   ├── layout/           # Sidebar, header, FAB
│   │   └── ...               # Composants métier (par domaine si besoin)
│   ├── server/
│   │   ├── db.ts             # PrismaClient singleton
│   │   ├── trpc/
│   │   │   ├── context.ts   # Contexte tRPC (session, companyId)
│   │   │   ├── trpc.ts      # Procédure base (public, protected)
│   │   │   ├── routers/
│   │   │   │   ├── _app.ts  # Agrégation routers
│   │   │   │   ├── auth.ts
│   │   │   │   ├── company.ts
│   │   │   │   ├── candidate.ts
│   │   │   │   ├── offer.ts
│   │   │   │   ├── client.ts
│   │   │   │   ├── note.ts
│   │   │   │   └── shareLink.ts
│   │   │   └── index.ts
│   │   └── auth.ts           # Helpers Supabase Auth (server)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts     # Client navigateur
│   │   │   └── server.ts     # Client serveur (cookies)
│   │   ├── validations/      # Schémas Zod partagés (candidate, offer, company, etc.)
│   │   └── utils.ts
│   ├── hooks/                # useAuth, useCompanyId, etc.
│   └── styles/
├── tests/
│   ├── unit/
│   ├── integration/         # tRPC + Prisma
│   └── e2e/                 # Playwright (optionnel)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── README.md
```

Partage de types : les types métier viennent de Prisma (`Prisma.Candidate`, etc.) et des schémas Zod (inputs tRPC). Pas de package `shared` séparé pour le MVP.

---

## 2. Où placer quoi

| À ajouter | Emplacement |
|-----------|-------------|
| **Nouvelle page (route)** | `src/app/(dashboard)/<section>/page.tsx` ou sous-dossier avec `layout.tsx` si besoin |
| **Composant UI réutilisable (shadcn)** | `src/components/ui/` (via CLI shadcn) |
| **Composant métier / layout** | `src/components/` (ex. `CandidateCard.tsx`, ou `candidates/CandidateCard.tsx` si beaucoup de composants) |
| **Nouvelle procedure tRPC** | Router correspondant dans `src/server/trpc/routers/` (ex. `candidate.ts`) ; si nouveau domaine, créer un nouveau router et l’enregistrer dans `_app.ts` |
| **Schéma de validation (input)** | `src/lib/validations/<domaine>.ts` (ex. `candidate.ts`, `offer.ts`) |
| **Hook React réutilisable** | `src/hooks/` (ex. `useCompanyId.ts`) |
| **Helper Supabase** | `src/lib/supabase/` (client ou server selon usage) |
| **Test unitaire / intégration** | `tests/unit/` ou `tests/integration/` ; miroir du chemin source si utile |
| **Test E2E** | `tests/e2e/` (par parcours ou par écran) |
| **Migration DB** | `prisma/migrations/` (générée par `prisma migrate dev`) |
| **Documentation technique** | `docs/` ou `docs/architecture/` |

---

*Dernière mise à jour : 2026-02-14. Aligné avec `docs/architecture.md` et `docs/architecture/coding-standards.md`.*
