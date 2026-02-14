# Claritee ATS — Architecture Frontend

Document de référence pour l’interface utilisateur : stack, état, routing, composants, intégration API et accessibilité. À lire en complément de `docs/architecture.md` (stack global, tRPC, auth) et `docs/prd.md` (UX, wireframes, design-system).

---

## 1. Stack et cadre technique

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| Framework | Next.js (App Router) | 16.1.6 | Routing, SSR, layout |
| UI | React | 19.2 | Composants |
| Langage | TypeScript | 5.9 | Typage strict |
| Composants | shadcn/ui (Radix + Tailwind) | - | Boutons, formulaires, modals, etc. |
| Styles | Tailwind CSS | 4.1 | Tokens design-system |
| Données serveur | TanStack Query | 5.59 | Cache, mutations, invalidation |
| Formulaires | React Hook Form | 7.53 | Champs + validation |
| Validation | Zod | 4.3.6 | Schémas partagés avec tRPC |
| API | tRPC client | 11.0 | Appels type-safe (pas de fetch brut) |
| Dates | date-fns | 2.30 | Formatage / calculs |

Référentiel détaillé : `docs/architecture/tech-stack.md` et `docs/architecture.md` §2.

---

## 2. Routing et tableau des routes

Next.js App Router avec groupes de routes : `(auth)` pour login/register/invite, `(dashboard)` pour l’app authentifiée, `share/[token]` publique.

| Route | Groupe | Protection | Rôle |
|-------|--------|------------|------|
| `/` | - | Redirect | Redirection vers dashboard ou login |
| `/login` | (auth) | Publique | Connexion |
| `/register` | (auth) | Publique | Inscription + création cabinet |
| `/invite/[token]` | (auth) | Publique | Inscription via invitation |
| `/dashboard` | (dashboard) | Protégée | Accueil, métriques |
| `/candidates` | (dashboard) | Protégée | Liste candidats |
| `/candidates/[id]` | (dashboard) | Protégée | Fiche candidat (layout CV) |
| `/offers` | (dashboard) | Protégée | Liste offres |
| `/offers/[id]` | (dashboard) | Protégée | Fiche offre |
| `/clients` | (dashboard) | Protégée | Liste clients |
| `/clients/[id]` | (dashboard) | Protégée | Fiche client |
| `/settings` | (dashboard) | Protégée | Paramètres cabinet, équipe, profil |
| `/share/[token]` | - | Publique | Fiche candidat partagée (normale ou anonyme) |
| `/api/health` | api | Publique | Health check |
| `/api/trpc/[...trpc]` | api | Selon procédure | API tRPC |

Protection : middleware Next.js vérifie la session Supabase sur `(dashboard)/**` ; absence de session → redirect `/login`. `/share/[token]` et `(auth)/**` restent accessibles sans auth.

Référence structure : `docs/architecture/source-tree.md` et `docs/architecture.md` §6.

---

## 3. État et flux de données

### 3.1 État serveur (données métier)

- **TanStack Query** est la seule source de vérité pour les données venant de tRPC.
- Pas de store global type Redux pour le métier ; le cache Query + l’URL (filtres, page) suffisent.
- **Stale time** : adapter par type (ex. listes 30–60 s, détail candidat 1–2 min) ; invalidation après mutations (create/update/delete).
- Les mutations utilisent les hooks tRPC (`useMutation`) et invalident les queries concernées (ex. `utils.candidate.list.invalidate()`).

### 3.2 État local UI

- État de formulaire : **React Hook Form** (pas de duplication dans React state).
- Modals (note rapide, partager, etc.) : état local (useState) ou composant contrôlé ; pas de store global dédié.
- Filtres listes (tags, ville, statut) : reflétés dans l’URL (query params) quand c’est pertinent pour le partage de vue ; sinon état local.

### 3.3 Auth côté client

- Session Supabase gérée par le client Supabase (`src/lib/supabase/client.ts`) ; persistance via cookies ou storage selon config Supabase.
- Hooks dédiés : `useAuth`, `useCompanyId` (lecture session + companyId si besoin depuis une query tRPC `auth.me` ou équivalent).
- Le contexte tRPC côté serveur résout `companyId` ; le front n’a pas besoin de le stocker ailleurs que pour affichage (ex. en-tête).

---

## 4. Organisation des composants

### 4.1 Structure des dossiers

```
src/components/
├── ui/           # shadcn/ui (Button, Input, Dialog, etc.) — ne pas modifier sans raison
├── layout/       # Sidebar, Header, FAB (note rapide)
└── ...           # Composants métier (CandidateCard, ShareLinkDialog, etc.)
                  # Option : sous-dossiers par domaine (candidates/, offers/, clients/)
```

- **Nouveau composant métier** : `src/components/NomComposant.tsx` ou `src/components/candidates/CandidateCard.tsx` si le domaine grossit.
- **Nouveau composant UI générique** : ajout via CLI shadcn dans `ui/`.

### 4.2 Convention de spécification (props / events)

Pour qu’un composant soit réutilisable et prévisible (développeurs et agents) :

- **Fichier** : un composant par fichier, nom en PascalCase (`CandidateCard.tsx`).
- **Props** : typées avec une interface exportée (ex. `CandidateCardProps`) ; props obligatoires sans défaut, optionnelles avec défaut si besoin.
- **Événements** : nommer en `onAction` (ex. `onShare`, `onEdit`) ; signature `(payload?) => void` ou type d’événement explicite.
- **État interne** : limiter au strict nécessaire (ouvert/fermé modal, index accordéon) ; pas de données métier en state local si elles viennent du serveur.

Exemple de signature à viser :

```ts
// Exemple (à adapter selon le composant)
export type CandidateCardProps = {
  candidate: { id: string; firstName: string; lastName: string; title?: string | null; photoUrl?: string | null };
  onSelect?: (id: string) => void;
  className?: string;
};
```

Référence nommage et style : `docs/architecture/coding-standards.md`.

### 4.3 Composants partagés / fondations

- **Layout** : Sidebar (nav Dashboard, Candidats, Offres, Clients, Paramètres), Header (recherche Cmd+K, avatar + menu user), FAB (note rapide).
- **UI** : tout ce qui vient de shadcn (Button, Card, Input, Dialog, etc.) ; couleurs et espacements via variables CSS du design-system (`docs/design-system.md`).
- Pas de bibliothèque de composants métier formalisée pour le MVP ; les composants métier réutilisables (ex. badge statut, tag) peuvent être centralisés dans `components/` au fil de l’eau.

---

## 5. Intégration API (tRPC)

- **Couche unique** : tous les appels métier passent par le client tRPC (pas de `fetch` direct vers des endpoints métier).
- **Hooks** : `trpc.candidate.list.useQuery()`, `trpc.candidate.create.useMutation()`, etc. ; types inférés automatiquement.
- **Erreurs** : afficher les messages génériques côté UI (voir PRD « Standard Error Messages ») ; ne pas exposer le détail technique (aligné avec `docs/architecture.md` §10.1).
- **Loading / erreur** : gérer `isLoading` / `isError` et `error.message` dans chaque page ou composant de liste/détail ; toasts pour les erreurs de mutation.
- **Contexte** : le client tRPC envoie les cookies ; le serveur résout la session et `companyId`. Aucune clé API à gérer côté front.

Configuration du client tRPC : typiquement dans un Provider (React Query + tRPC) au root layout ; voir exemples officiels tRPC + Next.js App Router.

---

## 6. Formulaires et validation

- **React Hook Form** pour tous les formulaires (création candidat, offre, client, note, partage, etc.).
- **Zod** : réutiliser les schémas définis dans `src/lib/validations/` (candidate, offer, company, etc.) avec `@hookform/resolvers/zod` pour la validation côté client.
- **Messages d’erreur** : alignés sur le PRD (ex. « [Nom du champ] est requis », « Le SIREN doit contenir exactement 9 chiffres »).
- **Envoi** : appeler la mutation tRPC dans `onSubmit` ; en cas de succès, invalider les queries et rediriger ou fermer le modal.

---

## 7. Routing côté client et navigation

- **Liens** : `next/link` pour toute navigation interne ; pas de `window.location` pour les parcours standards.
- **Protection** : les routes `(dashboard)/**` sont protégées par le middleware ; si la session est absente, l’utilisateur est redirigé vers `/login`.
- **Deep linking** : la page `/share/[token]` est conçue pour être ouverte par lien direct (mail, message) ; pas de dépendance à un état en mémoire.
- **Raccourcis** : Cmd+K pour la recherche globale, Cmd+N pour la note rapide (FAB) — à implémenter dans le layout (keyboard listener).

---

## 8. Performance frontend

- **Images** : `next/image` avec URLs Supabase (photo candidat, etc.) ; formats et tailles selon `docs/architecture.md` §10.2.
- **Code splitting** : lazy loading des routes (Next.js par défaut) ; éviter les imports lourds dans le layout racine.
- **Listes longues** : pagination ou infinite scroll (ex. 20 candidats par page) pour éviter le rendu massif.
- **TanStack Query** : `staleTime` adapté pour limiter les refetch inutiles ; invalidation ciblée après mutations.

---

## 9. Accessibilité (WCAG AA)

- **Cible** : conformité WCAG AA (PRD).
- **HTML sémantique** : utiliser les balises adaptées (nav, main, section, button, label) ; les composants Radix/shadcn fournissent une base accessible.
- **Labels et champs** : associer chaque champ de formulaire à un label (visible ou aria-label) ; messages d’erreur liés au champ (aria-describedby si besoin).
- **Clavier** : navigation complète au clavier ; focus visible sur les éléments interactifs (style `:focus-visible`).
- **Contraste** : respecter la palette du design-system (fond beige/crème, primaire terracotta, secondaire sauge) pour un contraste suffisant.
- **Tests** : intégrer un outil automatisé (ex. axe-core, jest-axe dans les tests composants, ou Pa11y en CI) et prévoir des vérifications manuelles (clavier, lecteur d’écran) sur les écrans clés.

Référence visuelle et tokens : `docs/design-system.md`.

---

## 10. Build et outils

- **Build** : `npm run build` (ou pnpm) ; framework Next.js détecté par Vercel.
- **Lint / format** : ESLint + Prettier selon la config projet ; pas de `console.log` en production (voir `docs/architecture/coding-standards.md`).
- **Tests** : unitaires et intégration (Vitest) pour la logique et les appels tRPC ; E2E (Playwright) optionnel sur les parcours critiques. Pas de convention imposée pour les tests de composants React au MVP ; on peut ajouter Vitest + React Testing Library + jest-axe pour les composants critiques et l’accessibilité.

---

## 11. Fichiers de référence

| Document | Contenu |
|----------|---------|
| `docs/architecture.md` | Stack globale, tRPC, RLS, auth, storage, déploiement |
| `docs/architecture/tech-stack.md` | Versions pinnées |
| `docs/architecture/source-tree.md` | Où placer composants, pages, hooks, validations |
| `docs/architecture/coding-standards.md` | TypeScript, nommage, tRPC, multi-tenancy, tests |
| `docs/prd.md` | UX, wireframes, design-system, epics/stories |
| `docs/design-system.md` | Palette, typo, composants, statuts, WCAG |
| `docs/wireframes.md` | 8 écrans + layout + modals |

---

*Dernière mise à jour : 2026-02-14. Aligné avec le rapport de checklist architect et `docs/architecture.md`.*
