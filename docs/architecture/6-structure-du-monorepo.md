# 6. Structure du monorepo

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
│   ├── architecture.md       # Ce document
│   └── architecture/         # Optionnel : shards (rls-policies.sql, etc.)
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
│   │   │   ├── layout.tsx    # Shell + sidebar
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
│   │   ├── ui/               # shadcn/ui
│   │   ├── layout/           # Sidebar, header, FAB
│   │   └── ...               # Composants métier
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
│   │   ├── validations/      # Schémas Zod partagés
│   │   │   ├── candidate.ts
│   │   │   ├── offer.ts
│   │   │   ├── company.ts
│   │   │   └── ...
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
