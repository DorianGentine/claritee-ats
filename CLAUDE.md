# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Claritee ATS** — lightweight recruitment management platform for small French recruitment agencies. Centralises candidates, job offers, clients, and collaboration. Built solo, deployed free (Supabase + Vercel). All UI text is in **French**.

4 epics, 39 stories. Fully specified in `docs/prd.md`. Current progress: stories 1.1 → 4.6 implemented.

## Commands

```bash
pnpm dev          # Start dev server (clears .next cache first)
pnpm build        # Production build
pnpm test         # Run tests once
pnpm test:watch   # Run tests in watch mode
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier write
pnpm format:check # Prettier check

# Database
pnpm db:generate  # Regenerate Prisma client
pnpm db:migrate   # Run migrations (dev)
pnpm db:push      # Push schema without migration
pnpm db:seed      # Seed test data
```

Run a single test file: `pnpm vitest run src/__tests__/path/to/file.test.ts`

## Architecture

**Stack:** Next.js App Router + tRPC v11 + Prisma 7 + PostgreSQL (Supabase) + TanStack Query + shadcn/ui + Tailwind CSS 4 + Zod 4

### Multi-tenancy

Every user belongs to a `Company`. All data tables include `companyId`. Row Level Security (RLS) on PostgreSQL enforces tenant isolation at the database level. The tRPC `protectedProcedure` additionally checks `ctx.companyId` resolved from the Supabase JWT.

### Request flow

```
Browser → Supabase Auth (JWT cookie)
       → tRPC client → /api/trpc/[...trpc]
       → context.ts resolves user + companyId
       → Prisma queries filtered by companyId + RLS
       → TanStack Query caches (staleTime: 5min default)
```

### Key directories

- `src/app/(auth)/` — Login, register, invite flows
- `src/app/(dashboard)/` — All protected routes (candidates, offers, clients, settings, search)
- `src/app/share/[token]/` — Public shareable candidate profiles
- `src/server/trpc/routers/` — All tRPC domain routers, aggregated in `_app.ts`
- `src/server/db.ts` — Prisma singleton with PgBouncer pooling
- `src/components/ui/` — shadcn/ui components (auto-generated, don't hand-edit)
- `src/components/shared/` — Reusable cross-domain components
- `src/lib/validations/` — Zod schemas shared between client and server
- `src/lib/trpc/` — tRPC client setup for browser use
- `src/lib/supabase/` — Separate browser and server Supabase clients

### tRPC conventions

- Use `protectedProcedure` for all authenticated endpoints; it injects `ctx.session`, `ctx.user`, and `ctx.companyId`
- Filter every Prisma query with `companyId: ctx.companyId` for tenant isolation
- After mutations, invalidate related queries: `utils.<router>.<procedure>.invalidate()`

### Data model (Prisma, 16 entities)

`Company` → `User`, `Candidate`, `JobOffer`, `ClientCompany`, `Tag`, `Note`, `Invitation`
`Candidate` ↔ `JobOffer` via `Candidature` (with status)
`Candidate` has: `Experience`, `Formation`, `Language`, `CandidateTag`, `Note`, `ShareLink`
`JobOffer` has: `OfferTag`, `Note`, `Candidature`
`ClientCompany` has: `ClientContact`, `JobOffer`

### Frontend patterns

- Forms use **React Hook Form** + **Zod** resolver from `src/lib/validations/`
- Rich text fields use **BlockNote**
- Toast notifications via **Sonner** (`toast.success`, `toast.error`)
- Loading states use skeleton loaders, not spinners
- Shared components extracted to `src/components/shared/` after the 2nd usage

## Code style

- **Prettier config:** `semi: true`, `singleQuote: false`, `tabWidth: 2`, `trailingComma: "es5"`
- **Zod v4 APIs:** use `z.uuid()`, `z.email()` — not `z.string().uuid()`
- **No `^` or `~`** in package.json — exact versions only
- ESLint warns on `console.log`; `console.warn` and `console.error` are allowed
- Unused variables prefixed with `_` are ignored by ESLint
- Path alias `@/` maps to `src/`
- **TypeScript strict:** `strict: true` — no untyped `any`; use `unknown` then narrow
- **Arrow functions** preferred over `function` declarations
- **CSS variables:** use short Tailwind syntax `w-(--radix-popover-trigger-width)` not `w-[var(--radix-popover-trigger-width)]`
- **JSX text:** use `'` and `"` directly — do not use `&apos;` or `&quot;`
- **Optimistic mutations:** always add `networkMode: "always"` when using `onMutate` (avoids silent queue on offline DevTools)
- **Loading skeletons:** use `isLoading`, not `isFetching`
- **Toasts:** always use `sonner` (`import { toast } from "sonner"`) — never shadcn `useToast` or `window.alert`

### Design system (palette)

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#F5F0E8` | Page background (beige) |
| Primary | `#B85A3B` | CTA, links (terracotta) |
| Secondary | `#5A7A6E` | Accents (sage green) |

Use Tailwind tokens (`bg-primary`, `text-muted-foreground`) — no raw hex in class attributes.

## Docs

In-repo documentation lives in `/docs/`:
- `prd.md` — Full product requirements (4 epics, 39 stories, acceptance criteria)
- `architecture.md` — Full technical design and RLS policies
- `architecture/coding-standards.md` — Naming conventions, tRPC templates, pitfalls table
- `architecture/source-tree.md` — Where to place new files
- `frontend-architecture.md` — Routing, state management, component patterns
- `design-system.md` — Design tokens, colors, typography
- `stories/` — One story file per feature with tasks, dev notes, and completion status
