# Epic 1: Foundation & Authentification

**Réf. wireframes :** Layout global (shell), §1 Dashboard, §9 Paramètres — **Réf. architecture :** §1–4, §6 (structure `src/app/(auth)`, `(dashboard)`), §7 (Auth), §9 (routers auth, company, invitation) ; frontend-architecture (routing §2, état §3) ; rate-limiting.md ; coding-standards (template router §3.1, pièges §5.1).

## Epic Goal

Établir l'infrastructure technique du projet (Next.js, Prisma, Supabase, CI/CD) et implémenter l'authentification complète avec création de cabinet, invitation de collaborateurs, et un Dashboard d'accueil fonctionnel. À la fin de cet epic, un cabinet peut être créé, des collaborateurs invités, et tous les utilisateurs voient un Dashboard (même vide).

## Story 1.1: Project Setup & Infrastructure

**As a** developer,  
**I want** a fully configured Next.js monorepo with Prisma, Supabase, and deployment pipeline,  
**so that** I have a solid foundation to build features upon.

**Acceptance Criteria:**

1. Next.js 16 App Router project with React 19.2, initialized with TypeScript strict mode
2. Prisma configured with Supabase PostgreSQL connection
3. tRPC configured with Next.js API routes
4. Supabase client SDK configured (auth + storage)
5. Tailwind CSS + shadcn/ui base components installed
6. ESLint + Prettier configured with strict rules
7. Environment variables properly configured (.env.local, .env.example)
8. Project deployable to Vercel with successful build
9. Basic health check route (`/api/health`) returns 200 OK
10. Git repository initialized with proper .gitignore

**Réf.** Architecture §1–2 (stack), §6 (structure monorepo `src/app`, `src/server`, `src/lib`).

## Story 1.2: Database Schema & Multi-tenancy Foundation

**As a** developer,  
**I want** the core database schema with multi-tenancy support,  
**so that** each cabinet's data is properly isolated.

**Acceptance Criteria:**

1. Prisma schema defines `Company` model (id, name, siren, createdAt, updatedAt)
2. Prisma schema defines `User` model (id, email, firstName, lastName, password, companyId, createdAt)
3. Prisma schema defines `Invitation` model (id, email, companyId, token, expiresAt, usedAt)
4. SIREN field has unique constraint on Company
5. Foreign key relationship User → Company established
6. Supabase Row Level Security (RLS) policies configured for Company isolation
7. Database migrations created and applied successfully
8. Seed script available for development data

**Réf.** Architecture §4 (RLS, companyId), §5 (schéma Prisma Company, User, Invitation), `prisma/schema.prisma` et `docs/architecture/rls-policies.sql`.

## Story 1.3: User Registration & Company Creation

**As a** new user,  
**I want** to register with my information and create my company,  
**so that** I can start using the platform.

**Acceptance Criteria:**

1. Registration page with form: firstName, lastName, email, password, companyName, siren
2. Email format validation (client + server)
3. Password minimum requirements enforced (8+ chars)
4. SIREN format validation (9 digits)
5. SIREN uniqueness check with clear error message if already taken
6. Successful registration creates User + Company in single transaction
7. User automatically logged in after registration
8. Redirect to Dashboard after successful registration
9. Form shows loading state during submission
10. Error messages displayed clearly for all validation failures
11. Rate limiting appliqué sur l'inscription : max 10 requêtes par IP par minute ; en cas de dépassement, afficher le message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `docs/architecture/rate-limiting.md` §3.1, `src/lib/rate-limit.ts`)

**Réf.** Architecture §7 (flux inscription, création Company + User), validations Zod (SIREN, email) ; rate-limiting.md §3.1 (auth par IP).

## Story 1.4: User Login & Logout

**As a** registered user,  
**I want** to login and logout securely,  
**so that** I can access my cabinet's data.

**Acceptance Criteria:**

1. Login page with email + password form
2. Supabase Auth used for session management
3. Invalid credentials show generic error message (security)
4. Successful login redirects to Dashboard
5. Session persisted across browser refresh
6. Logout button accessible from any authenticated page
7. Logout clears session and redirects to login page
8. Protected routes redirect to login if not authenticated
9. Rate limiting : Supabase Auth applique des limites côté service ; l'app peut compléter par un rate limit par IP sur les routes auth (login/register) via le proxy Next.js (`src/proxy.ts`) si souhaité — sinon couvert par Story 1.3 pour l'inscription.

**Réf.** Architecture §7 (connexion Supabase Auth, proxy Next.js sur routes protégées) ; rate-limiting.md §3.1 (auth par IP, inscription prioritaire).

## Story 1.5: Collaborator Invitation System

**As a** cabinet admin,  
**I want** to invite collaborators via a dedicated URL,  
**so that** my team can access our shared data.

**Acceptance Criteria:**

1. "Invite Collaborator" button on settings/team page
2. Invitation creates unique token URL (e.g., `/invite/[token]`)
3. Invitation email field required, stored in Invitation table
4. Invitation expires after 7 days
5. Invitation URL displays registration form (pre-filled email)
6. Invited user creates account and is auto-assigned to the inviting Company
7. Invitation marked as used after successful registration
8. Expired/used invitations show appropriate error message
9. Admin can see list of pending invitations
10. Admin can revoke pending invitations

*Note: Email sending not included - URL generation only (admin shares manually)*

**Réf.** Architecture §7.3 (Invitation), router `invitation` ; wireframes §9 Paramètres (équipe, invitations).

## Story 1.6: Dashboard Home Page

**As a** logged-in user,  
**I want** to see a Dashboard with key metrics and quick actions,  
**so that** I have an overview of my cabinet's activity.

**Acceptance Criteria:**

1. Dashboard is the default page after login
2. Displays company name in header/navigation
3. Shows placeholder cards for future metrics: "Candidats", "Offres actives", "Clients"
4. Cards show "0" count initially (empty state)
5. Quick action buttons: "Nouveau candidat", "Nouvelle offre" (disabled/coming soon for now)
6. Navigation sidebar/header with links: Dashboard, Candidats, Offres, Clients (Candidats/Offres/Clients disabled for now)
7. User menu with: profile info, logout button
8. Responsive layout (desktop-first, basic tablet support)
9. Applies the branding color palette (beige background, terracotta accents, sage green secondary)
10. Empty state message encouraging user to start adding data

**Réf.** Wireframes §1 Dashboard (métriques, actions rapides, candidats récents, notes récentes) ; Design System §2 (palette, cards `--card`), §4 (espacement).

## Story 1.7: Base Layout & Navigation Shell

**As a** user,  
**I want** a consistent navigation and layout across all pages,  
**so that** I can easily navigate the application.

**Acceptance Criteria:**

1. Persistent sidebar or top navigation on all authenticated pages
2. Navigation items: Dashboard, Candidats, Offres, Clients, Paramètres
3. Active page highlighted in navigation
4. Company name displayed in navigation area
5. User avatar/initials + name in navigation
6. Logout accessible from user menu
7. Layout applies consistent spacing, typography, colors from brand palette
8. Mobile-responsive navigation (hamburger menu or collapsible sidebar)
9. Loading states for page transitions
10. 404 page styled consistently with app design
11. Les composants du layout (sidebar, header, navigation) sont testés pour l'accessibilité selon `coding-standards.md` §7 (jest-axe, Pa11y sur écrans critiques) ; violations WCAG AA corrigées.

**Réf.** Wireframes « Layout global (shell) » ; Design System (typo, couleurs, composants layout) ; coding-standards §7 (a11y : jest-axe, Pa11y).

---
