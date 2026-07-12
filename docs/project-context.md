---
project_name: claritee-ats
user_name: Dorian
date: '2026-05-08'
sections_completed: [technology_stack, typescript_zod, trpc_prisma, frontend, tests, anti_patterns]
---

# Project Context for AI Agents

_Règles critiques et non-évidentes que les agents IA doivent suivre lors de l'implémentation. Ne contient pas les généralités — uniquement ce qu'un LLM rate en pratique._

---

## Stack technique

- Next.js 16 / React 19.2 / TypeScript 5.9 (strict)
- tRPC v11 + TanStack Query v5 (staleTime global: 5 min)
- Prisma 7 + PostgreSQL via Supabase (PgBouncer pooling)
- Zod v4 · React Hook Form v7 · shadcn/ui · Tailwind CSS v4
- Vitest v4 + Testing Library · pnpm 10.4.1
- Déploiement: Vercel (Next.js) + Supabase (DB + Auth + Storage)

---

## TypeScript / Zod

- `strict: true` — pas de `any`; utiliser `unknown` puis narrowing
- Zod v4: `z.uuid()`, `z.email()`, `z.url()` — PAS `z.string().uuid()`
- Arrow functions partout — pas de `function fn() {}`
- Path alias `@/` → `src/` (tsconfig baseUrl)
- Versions exactes dans package.json — jamais `^` ni `~`
- Prettier: `semi: true`, `singleQuote: false`, `tabWidth: 2`, `trailingComma: "es5"`
- ESLint: `console.log` interdit en prod; `console.warn`/`console.error` OK
- Variables inutilisées tolérées si préfixées `_`

---

## tRPC / Prisma

- Toujours `protectedProcedure` pour les endpoints authentifiés
- CHAQUE query Prisma filtrée par `companyId: ctx.companyId` — sans exception
- Vérifier ownership avant update/delete: `findFirst({ where: { id, companyId } })`
- `groupBy` Prisma incompatible avec `$transaction` — utiliser `Promise.all`
- `ShareLink` n'a pas de `companyId` direct — filtrer via relation: `candidate: { companyId: ctx.companyId }`
- Après chaque mutation: invalider les queries liées `utils.<router>.<proc>.invalidate()`
- Mutations optimistes: ajouter `networkMode: "always"` quand `onMutate` est utilisé

---

## Frontend

- Toasts: `import { toast } from "sonner"` uniquement — jamais shadcn `useToast`
- Skeletons: utiliser `isLoading` (pas `isFetching`) + composant `Skeleton` de `@/components/ui/skeleton`
- Composants shadcn/ui dans `src/components/ui/` — ne jamais éditer manuellement
- `Note.content` est du JSON BlockNote — ne jamais afficher brut; utiliser `NoteBlockNoteEditor`
- JSX: `'` et `"` directement dans le texte — pas d'`&apos;` ni `&quot;`
- CSS variables: `w-(--radix-var)` pas `w-[var(--radix-var)]`
- Composants partagés dans `src/components/shared/` après la 2e réutilisation

---

## Tests

- Tests RTL: `/** @vitest-environment jsdom */` en tête de fichier
- `afterEach(() => cleanup())` dans tous les fichiers RTL
- Si un texte apparaît plusieurs fois dans le DOM: `getAllByText` pas `getByText`
- Arbo des tests sous `src/__tests__/`, calquée sur `/src`, splittée par dépendance à la DB :
  - `src/__tests__/db/**` — tests avec Prisma réel (`pnpm test:db`, base `claritee_test`, en série)
  - `src/__tests__/unit/**` — tests sans DB (`pnpm test:unit`), dont les composants sous `unit/components/<domaine>/`
- `isLoading` dans les tests pour les états skeleton, pas `isFetching`

---

## À ne jamais faire

- Ne pas exposer des données sans filtre `companyId` — risque de fuite cross-tenant
- Ne pas utiliser `window.alert` ou `useToast` shadcn — toujours `sonner`
- Ne pas mettre de `console.log` en prod (ESLint warn)
- Ne pas éditer les fichiers `src/components/ui/` (auto-générés par shadcn)
- Ne pas oublier `networkMode: "always"` sur les mutations optimistes
- Ne pas afficher `Note.content` (JSON BlockNote) sans éditeur dédié
- Ne pas utiliser `$transaction` avec `groupBy` Prisma
