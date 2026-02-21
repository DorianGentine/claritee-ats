# Claritee ATS — Standards de code

> Référence pour la cohérence du code et le chargement par les agents (voir `core-config.yaml`).  
> Document parent : `docs/architecture.md`.

---

## 1. Langage et style

### TypeScript

- **Mode strict** : `strict: true` dans `tsconfig.json`. Pas de `any` non typé ; utiliser `unknown` si nécessaire puis affiner.
- **Fonctions** : privilégier les **fonctions fléchées** pour les fonctions (ex. `const handler = () => {}`). Éviter `function fn() {}` sauf pour les déclarations de top-level si besoin de hoisting.

### Formatage et lint

- **Point-virgule :** ne pas mettre de `;` en fin de ligne lorsqu'il n'est pas nécessaire. En JavaScript/TypeScript, l'ASI permet de s'en passer dans la plupart des cas ; privilégier un style cohérent sans point-virgule superflus.
- Suivre les règles ESLint/Prettier du projet. Pas de console.log en prod ; utiliser un logger structuré si besoin (voir observabilité dans `architecture.md`).
- Corriger toutes les erreurs de lint et TypeScript avant de considérer une tâche ou une story terminée.

---

## 2. Nommage

| Élément | Convention | Exemple |
|--------|------------|--------|
| **Fichiers composants React** | PascalCase | `CandidateCard.tsx`, `ShareLinkDialog.tsx` |
| **Fichiers non-composants** (utils, hooks, routes) | camelCase ou kebab-case selon usage projet | `useCompanyId.ts`, `context.ts` |
| **Dossiers** | minuscules, regroupement logique | `components/ui`, `server/trpc/routers` |
| **Composants** | PascalCase | `CandidateCard`, `Sidebar` |
| **Procedures tRPC** | camelCase | `getById`, `create`, `listByCandidate` |
| **Variables / fonctions** | camelCase | `companyId`, `getCandidateById` |
| **Constantes** | UPPER_SNAKE ou camelCase selon portée | `MAX_FILE_SIZE`, `defaultStaleTime` |
| **Types / interfaces** | PascalCase | `CandidateWithTags`, `CreateOfferInput` |

---

## 3. API et backend (tRPC + Prisma)

- **Validation** : tous les inputs tRPC passent par des schémas **Zod** définis dans `src/lib/validations/` (ex. `candidate.ts`, `offer.ts`). Réutiliser ces schémas côté formulaires (React Hook Form) quand c'est pertinent.
- **Procédures métier** : utiliser **`protectedProcedure`** et s'appuyer sur **`ctx.companyId`** pour toutes les queries/mutations candidats, offres, clients, notes, partages. Ne jamais exposer de données d'un autre cabinet.
- **Erreurs** : côté client, afficher des **messages génériques** (ex. « Identifiants invalides », « Une erreur est survenue »). Détails techniques uniquement en logs serveur (voir `docs/architecture.md` §10.1).
- **Mots de passe** : jamais stockés en base applicative ; auth via **Supabase Auth** uniquement.

### 3.1 Template : nouveau router tRPC

Pour ajouter un router métier, créer `src/server/trpc/routers/<domaine>.ts` et l'enregistrer dans `_app.ts`.

**Fichier router (squelette) :**

```ts
// src/server/trpc/routers/example.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { createExampleSchema } from "@/lib/validations/example";

export const exampleRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.example.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.example.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  create: protectedProcedure
    .input(createExampleSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.example.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(createExampleSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.db.example.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.example.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.example.deleteMany({
        where: { id: input.id, companyId: ctx.companyId },
      });
      return { success: true };
    }),
});
```

**Schéma Zod** dans `src/lib/validations/example.ts` :

```ts
import { z } from "zod";

export const createExampleSchema = z.object({
  name: z.string().min(1),
  // ... autres champs
});
```

**Enregistrement** dans `src/server/trpc/routers/_app.ts` : ajouter `example: exampleRouter` dans l'objet passé à `router()`.

---

## 4. Frontend (React + Next.js)

- **Composants UI** : shadcn/ui dans `src/components/ui/` ; ne pas modifier le code généré sans raison. Composants métier et layout dans `src/components/` (sous-dossiers par domaine si besoin).
- **DRY — composants partagés** : éviter la duplication. Dès qu'un bloc de JSX ou une logique est réutilisé (2ᵉ occurrence), l'extraire dans un composant partagé (`components/shared/` ou domaine) ou un hook (`hooks/`). Ne pas copier-coller des patterns de loading/erreur/empty state entre pages. Détail : `docs/frontend-architecture.md` §4.4.
- **Apostrophes en JSX/HTML** : ne pas utiliser `&apos;` inutilement ; utiliser directement `'` (apostrophe droite). L'entité HTML n'est pas nécessaire dans les chaînes JSX ni dans la plupart des attributs.
- **Styles** : **Tailwind CSS** + variables CSS du design-system (`docs/design-system.md`). Pas de CSS inline arbitraire pour les couleurs ; utiliser les tokens (e.g. `bg-primary`, `text-muted-foreground`).
- **Variables CSS dans Tailwind** : utiliser la syntaxe courte pour les variables CSS. Par ex. `w-(--radix-popover-trigger-width)` plutôt que `w-[var(--radix-popover-trigger-width)]`. S’applique à toute propriété utilisant `var(--...)`.
- **État serveur** : **TanStack Query** (v5) pour cache et mutations. Stale time et invalidation cohérentes avec l'usage (listes vs détail).
- **Formulaires** : **React Hook Form** + Zod pour la validation partagée.

---

## 5. Multi-tenancy et sécurité

- Toute donnée métier est scopée par **`companyId`** (obtenu depuis `ctx.companyId` dans tRPC). Les politiques **RLS** en base sont une seconde ligne de défense ; ne pas s'y fier seules pour la logique métier.
- Tables sans `companyId` direct (ex. `Experience`, `Formation`) : accès **uniquement** via des procedures qui passent par une entité déjà filtrée (ex. `Candidate`). Voir `docs/architecture.md` §4.

### 5.1 Pièges courants (pour agents / développeurs)

| Piège | Solution |
|-------|----------|
| Oublier `companyId` dans une requête (findMany, create, update, delete) | Toujours filtrer par `ctx.companyId` ; utiliser `protectedProcedure` ; inclure `companyId` dans les `data` de create. |
| Exposer une erreur technique au client (stack, message Zod, etc.) | Afficher des messages génériques (voir PRD « Standard Error Messages ») ; garder les détails en logs serveur uniquement. |
| Utiliser `procedure` au lieu de `protectedProcedure` pour des données métier | Les candidats, offres, clients, notes, partages doivent passer par `protectedProcedure`. |
| Requêtes sur des tables sans `companyId` (Experience, Formation, etc.) sans passer par le parent | Accéder via une entité filtrée (ex. `Candidate`) ; ne jamais requêter directement une table enfant sans vérifier que le parent appartient au cabinet. |
| Stocker ou logger un mot de passe | Jamais ; auth via Supabase Auth uniquement. |
| Valider uniquement côté client | Toujours valider côté tRPC avec Zod ; le client peut réutiliser les mêmes schémas. |

---

## 6. Tests

- **Unitaires / intégration** : **Vitest**. Couvrir la logique métier et les procedures tRPC (avec contexte mocké).
- **E2E** : **Playwright** (optionnel pour le MVP), sur les parcours critiques (inscription, création candidat, partage).
- Pas d'exigence formelle de couverture pour le MVP ; viser les chemins critiques et les cas d'erreur importants.

---

## 7. Accessibilité — tests et workflow

- **Cible** : WCAG AA (PRD).
- **Outils** :
  - **jest-axe** : tests automatisés dans les tests de composants (Vitest + React Testing Library). Exécuter `expect(await axe(container)).toHaveNoViolations()` sur les composants critiques (formulaires, modals, layout).
  - **Pa11y** : vérification automatisée des pages (CI ou script npm). Exécuter `pa11y --standard WCAG2AA <url>` sur les écrans clés (login, dashboard, fiche candidat, page partage).
  - **axe DevTools** (extension navigateur) : vérifications manuelles ponctuelles en dev.
- **Intégration** :
  - **CI** : ajouter une étape Pa11y sur les URLs de preview (ex. après build Vercel) ou sur un serveur local. Optionnel pour le MVP.
  - **Manuel** : avant une release, exécuter `npm run a11y` (script Pa11y sur localhost) et/ou vérifier clavier + lecteur d'écran sur les écrans critiques.
- **Écrans à prioriser** : login, register, dashboard, liste candidats, fiche candidat, formulaire création candidat, page partage publique, modals (note rapide, partager).

---

## 8. Documentation du code

- **Fichiers publics** (routers tRPC, helpers partagés) : commentaire bref en tête si la responsabilité n'est pas évidente. Pas de JSDoc exhaustif pour le MVP.
- **Décisions d'architecture** : documenter dans `docs/architecture.md` ou un ADR si impact long terme.

---

*Dernière mise à jour : 2026-02-21. Aligné avec `docs/architecture.md`, `docs/design-system.md` et `docs/frontend-architecture.md`.*
