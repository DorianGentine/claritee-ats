# Claritee ATS — Standards de code

> Règles à suivre pour écrire du code dans ce repo (humains et agents) : style, nommage, API, frontend, tests, pièges connus. Dernière mise à jour : 2026-10-18.

Architecture (flux, RLS, auth, routers, modèle de données, déploiement) : `docs/architecture.md`. Exigences produit : `docs/prd.md`. En cas de contradiction avec la config ou le code, **le code fait foi**.

---

## 1. Langage & formatage

| Règle                        | Détail                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript strict            | `strict: true` (`tsconfig.json`). Pas de `any` non typé : `unknown` puis affinage.                                                                                                                                                                                                                                          |
| Fonctions                    | Fonctions fléchées (`const handler = () => {}`). Exception : composants de page/layout Next.js exportés par défaut (`export default function Page()`).                                                                                                                                                                      |
| Alias                        | `@/` → `src/`. Imports absolus via l'alias plutôt que des `../../`.                                                                                                                                                                                                                                                         |
| Prettier (`.prettierrc`)     | `semi: true`, `singleQuote: false`, `tabWidth: 2`, `trailingComma: "es5"`. Le nouveau code suit cette config (points-virgules, guillemets doubles). Une partie du code existant n'a pas de `;` : formater les fichiers qu'on touche, pas de reformatage massif dans une PR fonctionnelle. Prettier n'est pas vérifié en CI. |
| ESLint (`eslint.config.mjs`) | `next/core-web-vitals` + `next/typescript` + `eslint-config-prettier`. `no-console` en warn (`console.warn` / `console.error` autorisés). Variables / arguments inutilisés tolérés s'ils sont préfixés `_`. `react/no-unescaped-entities` limité à `>` et `}`.                                                              |
| Logs                         | Pas de `console.log`. `console.warn` / `console.error` côté serveur pour les erreurs ; jamais de mot de passe, token ni donnée personnelle.                                                                                                                                                                                 |
| JSX                          | Écrire `'` et `"` directement dans le texte ; pas de `&apos;` / `&quot;`.                                                                                                                                                                                                                                                   |
| Définition de « terminé »    | `bun run lint` et `tsc --noEmit` sans erreur, `bun run test:unit` vert (+ `bun run test:db` si routers/DB touchés).                                                                                                                                                                                                                  |

---

## 2. Dépendances

- **Versions exactes** : toutes les entrées de `package.json` (`dependencies`, `devDependencies`, `optionalDependencies`) sont en `MAJEUR.MINEUR.PATCH` exact (pré-release autorisée, ex. `1.0.0-beta.2`). Interdits : `^`, `~`, version partielle (`"19.2"`), intervalle (`">=1.0.0"`), `"latest"`, `"*"`. Toute montée de version est explicite (diff, review, tests).
- **Ajout / mise à jour** : `bunfig.toml` contient `exact = true`, donc `bun add <pkg>` et `bun update <pkg> --latest` écrivent une version exacte. Relire quand même le diff de `package.json`.
- **Garde-fou** : `__tests__/unit/package-json.test.ts` (lancé par `bun run test:unit` et la CI) échoue en listant chaque dépendance non exacte.
- **Gestionnaire** : bun uniquement (lockfile `bun.lock`, CI en `--frozen-lockfile`) ; Node reste le runtime de Next et de Vitest. Scripts via `bun run <script>` (`bun test` lancerait le testeur de bun), binaires locaux via `bun run <bin>` (ex. `bun run prisma …`), jamais `bunx` : si le binaire local manque, il télécharge en silence la dernière version (ex. un Prisma majeur plus récent lancé sur la prod).
- Avant d'ajouter une dépendance : vérifier qu'une lib déjà présente ne couvre pas le besoin (date-fns, Radix, dnd-kit, sonner…). Pas de package « umbrella » (voir §6).

---

## 3. Nommage

| Élément                 | Convention                                                                              | Exemple                                              |
| ----------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Fichiers composants     | PascalCase, un composant par fichier                                                    | `CandidateCard.tsx`, `ConfirmDialog.tsx`             |
| Hooks                   | `useXxx.ts` en camelCase                                                                | `useCandidatureUpdateStatus.ts`                      |
| Utilitaires `src/lib`   | kebab-case                                                                              | `tag-colors.ts`, `candidature-status-style.ts`       |
| Routers tRPC            | camelCase, nom du domaine                                                               | `shareLink.ts`, `candidature.ts`                     |
| Dossiers                | minuscules                                                                              | `components/shared`, `server/trpc/routers`           |
| Procédures tRPC         | camelCase, verbe d'abord                                                                | `getById`, `list`, `listByCandidate`, `updateStatus` |
| Variables / fonctions   | camelCase, noms explicites (pas de variable à une lettre, y compris dans les callbacks) | `companyId`, `candidates.map((candidate) => …)`      |
| Constantes              | `UPPER_SNAKE_CASE` pour les constantes de module                                        | `TAG_PALETTE`, `MAX_FILE_SIZE`                       |
| Types / props           | PascalCase ; props suffixées `Props`                                                    | `CandidateCardProps`, `CreateOfferInput`             |
| Événements de composant | `onAction`                                                                              | `onShare`, `onEdit`                                  |
| Textes UI               | Français                                                                                | « Une erreur est survenue. »                         |

---

## 4. API & backend (tRPC + Prisma)

- **Validation** : chaque input tRPC est un schéma Zod de `src/lib/validations/<domaine>.ts`, réutilisé côté formulaire. Valider côté serveur même si le client valide déjà.
- **Zod v4** : APIs top-level `z.uuid()`, `z.email()`, `z.url()` (`z.guid()` pour un identifiant plus permissif) ; jamais `z.string().uuid()` & co (dépréciés).
- **Procédures** : `protectedProcedure` pour toute donnée métier ; `publicProcedure` seulement pour les cas listés dans `docs/architecture.md` §6.
- **Tenant** : chaque requête Prisma filtre par `companyId: ctx.companyId` ; `companyId` injecté dans les `data` de `create` ; ownership vérifié (`findFirst({ where: { id, companyId } })`) avant update/delete. Tables enfants sans `companyId` (`Experience`, `ShareLink`, `Candidature`…) : passer par le parent (`candidate: { companyId: ctx.companyId }`).
- **Erreurs** : codes `TRPCError` standards, messages génériques en français côté client (« Une erreur est survenue. », « Identifiants invalides »). Détails techniques uniquement dans les logs serveur.
- **Mots de passe** : jamais en base applicative ni dans les logs ; Supabase Auth uniquement.
- **Rate limit** : appeler `checkMutationRateLimit` dans les nouvelles mutations métier (voir `docs/architecture.md` §5).

### Template de router

Créer `src/server/trpc/routers/<domaine>.ts` puis l'enregistrer dans `_app.ts`.

```ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  createExampleSchema,
  updateExampleSchema,
} from "@/lib/validations/example";

export const exampleRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.example.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" },
    })
  ),

  create: protectedProcedure
    .input(createExampleSchema)
    .mutation(({ ctx, input }) =>
      ctx.db.example.create({ data: { ...input, companyId: ctx.companyId } })
    ),

  update: protectedProcedure
    .input(updateExampleSchema.extend({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.db.example.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.example.update({ where: { id }, data });
    }),
});
```

---

## 5. Frontend

### Composants

- `src/components/ui/` : composants shadcn générés — **ne pas éditer à la main** (sauf remplacement d'import `radix-ui` → package individuel, §6). Ajout via la CLI shadcn.
- `src/components/shared/` : composants transverses (`ConfirmDialog`, `CityAutocomplete`, `TagsSection`, `NotesSection`, `NoteEditor`…). `src/components/<domaine>/` : composants métier ; `layout/` : menu latéral repliable de l'espace connecté (`AppSidebar`, état replié dans le cookie `sidebar_collapsed`, lu par `DashboardShell`), en-tête des pages publiques (`PublicHeader`), `Logo`, FAB.
- **DRY** : dès la 2ᵉ occurrence d'un bloc JSX ou d'une logique, extraire en composant partagé ou en hook (`src/hooks/`). Helpers purs dans `src/lib/`. Pas de copier-coller de patterns loading / erreur / empty state.
- Props typées (type exporté `XxxProps`), état interne limité à l'UI (ouverture de modal, onglet). Pas de données serveur recopiées en state local.
- `Note.content` est un document Tiptap sérialisé (`{ "type": "doc", … }`) : ne jamais l'afficher brut ; l'éditer via `NoteEditor`, l'afficher en lecture via `NoteContent` (rendu statique, liens limités à http(s)/mailto/tel ; pas d'éditeur ProseMirror par note affichée), en extraire le texte via `src/lib/note-utils.ts`.
- Navigation interne : `next/link`. Images : `<img>` / `AvatarImage` (Radix) ; `next/image` n'est pas utilisé (aucun `remotePatterns` dans `next.config.ts` pour les URL Supabase).

### Styles et tokens

- **Tailwind CSS 4 + tokens** définis dans `src/styles/globals.css` (`:root` + `@theme inline`, pas de `tailwind.config.js`). Pas de hex brut ni de couleur en style inline dans les classes ; utiliser les tokens (`bg-primary`, `text-muted-foreground`, `border-border`). Exception : couleurs de tag dynamiques via `getTagBadgeStyle` (`src/lib/tag-colors.ts`).
- Variables CSS en syntaxe courte : `w-(--radix-popover-trigger-width)`, pas `w-[var(--radix-popover-trigger-width)]`.
- Pas de règle `@apply` dupliquée dans `globals.css`.

| Token (classe)                      | Valeur                            | Usage                                          |
| ----------------------------------- | --------------------------------- | ---------------------------------------------- |
| `background`                        | `#FAF6F1`                         | Fond de page (crème)                           |
| `card` / `popover`                  | `#FEFBF7`                         | Cards, surfaces, popovers                      |
| `foreground`                        | `#1C1917`                         | Texte principal                                |
| `muted` / `muted-foreground`        | `#F1EAE1` / `#554D46`             | Fonds neutres / texte secondaire, labels       |
| `primary` (+ `-foreground` blanc)   | `#BE5334`                         | CTA principaux, liens, focus ring (terracotta) |
| `secondary` (+ `-foreground` blanc) | `#587A6B`                         | Actions secondaires, chips (vert sauge)        |
| `accent` / `accent-foreground`      | `#E3EAE5` / `#2E4A42`             | Hover, surbrillance                            |
| `success` / `success-foreground`    | `#E8F5EC` / `#2E6B3E`             | Statuts positifs (fond + texte)                |
| `destructive`                       | `#C44B37`                         | Erreurs, actions destructives                  |
| `border` / `input` / `ring`         | `#E5DCD1` / `#D3C7B8` / `#BE5334` | Bordures, champs, focus                        |
| `sidebar` / `sidebar-accent`        | `#F1EAE1` / `#E9E0D4`             | Menu latéral, survol de ses liens              |

- **Statuts** : utiliser les mappings existants (`src/lib/candidature-status-style.ts`, `src/lib/offer-status-style.ts`) plutôt que redéfinir des couleurs.
- **Tags** : couleur auto-assignée `getTagColor(name)` (palette de 8 couleurs, `hash % 8`), rendu en pill (`rounded-full`), 20 tags max par élément.
- **Charte** : reprise de claritee.fr (crème, terracotta, sauge ; titres Clash Grotesk, texte Inter).
- **Typographie** : polices auto-hébergées dans `src/fonts/`, chargées par `next/font/local` (`src/app/fonts.ts`). `font-sans` = Inter (défaut du `body`) ; `font-display` = Clash Grotesk, appliquée d'office à `h1`–`h3`. Titre de page `text-2xl font-semibold tracking-tight` ; section `text-lg font-semibold` ; texte courant `text-sm`/`text-base` ; métadonnées `text-xs text-muted-foreground`.
- **Rayons** : `--radius` = 0.75rem (12 px, cards = `rounded-lg`) ; inputs et boutons `rounded-md` (10 px) ; tags, badges, liens du menu et CTA des pages publiques `rounded-full`.
- **Champs posés directement sur le fond quadrillé** (hors card) : `SelectTrigger`, `Input` et assimilés sont transparents par défaut → ajouter `bg-card`.
- **Fond de l'espace connecté** : utilitaire `bg-grid` (quadrillage 32 px, couleur `border`, fixe au défilement) posé par `DashboardShell` ; les `<main>` des pages n'ont donc pas de `bg-background`.
- **Espacements** : échelle Tailwind (multiples de 4 px) ; `gap-2`/`p-2` serré, `p-4` sections, `gap-6` entre blocs. Desktop-first, breakpoints Tailwind par défaut (`lg` = cible principale).
- **Icônes** : `lucide-react`, `size-4` par défaut ; `aria-hidden` si un texte accompagne l'icône.

### État et données

- **TanStack Query** (via `api.<router>.<proc>.useQuery/useMutation`, client `@/lib/trpc/client`) est la seule source de vérité des données serveur ; pas de store global. Pas de `fetch` direct vers des endpoints métier.
- `staleTime` global 5 min (`src/components/providers.tsx`), surchargeable par query.
- Après chaque mutation : `utils.<router>.<proc>.invalidate()` sur les queries impactées.
- Skeleton (`@/components/ui/skeleton`) sur **`isLoading`**, jamais `isFetching` (sinon flash à chaque refetch en arrière-plan). Exception : quand l'élément attendu manque d'une liste déjà en cache mais en cours de rechargement (`isLoading` reste faux), ex. la note sélectionnée dans `NoteChatWidget`.
- Filtres de liste : URL (query params) si la vue doit être partageable, sinon état local.

### Mutations optimistes

Toute mutation dont `onMutate` modifie le cache **doit** déclarer `networkMode: "always"`. Avec le mode par défaut `"online"`, une mutation lancée hors ligne (ex. Offline DevTools) est mise en file : `onMutate` applique l'UI optimiste mais `onError` ne s'exécute jamais, l'UI ment silencieusement. Sans `onMutate`, le défaut est acceptable.

```ts
api.someResource.update.useMutation({
  networkMode: "always",
  onMutate: async (input) => {
    await utils.someResource.getById.cancel({ id: input.id });
    const snapshot = utils.someResource.getById.getData({ id: input.id });
    utils.someResource.getById.setData({ id: input.id }, (old) =>
      old ? { ...old, ...input } : old
    );
    return { snapshot };
  },
  onError: (_error, input, context) => {
    if (context?.snapshot)
      utils.someResource.getById.setData({ id: input.id }, context.snapshot);
    toast.error("Une erreur est survenue.");
  },
  onSettled: (_data, _error, input) => {
    void utils.someResource.getById.invalidate({ id: input.id });
  },
});
```

Pattern réutilisé : extraire un hook (modèle : `src/hooks/useCandidatureUpdateStatus.ts`).

### Formulaires

- **React Hook Form** + `zodResolver` avec les schémas de `src/lib/validations/` ; pas de duplication de l'état du formulaire dans `useState`.
- Lire une valeur réactive avec `useWatch({ control, name })`, pas `watch()`.
- Mutation appelée dans `onSubmit` ; en cas de succès : invalidation, puis redirection ou fermeture du modal.
- Messages d'erreur en français, alignés sur le PRD (« [Champ] est requis »).
- Champs texte : même `maxLength` que le `.max()` du schéma Zod.

### Toasts

- **`sonner` uniquement** : `import { toast } from "sonner"` dans un composant client. `toast.success` (création / mise à jour / suppression), `toast.error` (échec récupérable), `toast.message` (info neutre).
- Interdits : `useToast` shadcn, `window.alert`, modal dédiée à la notification.
- Messages génériques, sans détail technique.

### Accessibilité (WCAG 2.1 AA)

- HTML sémantique (`nav`, `main`, `button`, `label`) ; les primitives Radix fournissent focus trap et `Escape` pour les modals.
- Chaque champ a un `<label>` ou `aria-label` ; erreurs reliées via `aria-describedby` ; boutons icône seule avec `aria-label`.
- Focus visible sur tout élément interactif (ring `primary`) ; jamais `outline-none` sans alternative.
- Contraste ≥ 4.5:1 pour le texte (les tokens ci-dessus le respectent sur `background`/`card`).
- Annonces dynamiques (`aria-live`, annonces dnd-kit) en français.
- Vérifications : tests `vitest-axe` sur les composants critiques (§7), `bun run a11y` (pa11y WCAG2AA, serveur local lancé) avant release, passage clavier manuel.

---

## 6. Performance du serveur de dev (Turbopack)

| Règle                                                                                                                                                                                                                                    | Pourquoi                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Radix : packages individuels uniquement** (`@radix-ui/react-dialog`, `@radix-ui/react-popover`…). Jamais le package umbrella `radix-ui`. Si la CLI shadcn génère `from "radix-ui"`, remplacer immédiatement par le package individuel. | L'umbrella charge ~30 primitives en mémoire : fuites mémoire et boucle de recompilation Turbopack. |
| Prisma (`src/server/db.ts`) : `log` = `["error", "warn"]` en dev, `["error"]` en prod. Jamais `"query"`.                                                                                                                                 | Les logs de requêtes s'accumulent en mémoire.                                                      |
| Ne pas modifier `jsx` dans `tsconfig.json`.                                                                                                                                                                                              | Next 16 impose `"react-jsx"` et le réécrit au démarrage.                                           |
| Éviter les imports lourds dans le layout racine.                                                                                                                                                                                         | Temps de compilation et bundle initial.                                                            |

Diagnostic si CPU/mémoire excessifs ou « Compiling… » en boucle : `bun run dev` (vide déjà `.next`) ; vérifier qu'aucun package umbrella n'a été ajouté ; regarder l'onglet Network (polling / retry en boucle) ; en dernier recours `bun run next dev --webpack`.

---

## 7. Tests

### Suites et commandes

| Suite               | Emplacement                                   | Commande                                           | Config                          |
| ------------------- | --------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| Unitaires (sans DB) | `__tests__/unit/**` (arbo calquée sur `src/`) | `bun run test:unit`                                   | `vitest.config.ts` (env `node`) |
| DB / intégration    | `__tests__/db/**`                             | `bun run test:db` (base `claritee_test` recréée)      | `vitest.config.db.ts`, en série |
| Tout                | —                                             | `bun run test` (stack Supabase locale démarrée)       | —                               |
| Un fichier          | —                                             | `bun run vitest run __tests__/unit/path/file.test.ts` | —                               |
| Watch               | —                                             | `bun run test:watch`                                  | —                               |

### Patterns

- **Composants (Testing Library)** : directive `/** @vitest-environment jsdom */` en tête de fichier. `cleanup()`, le vidage du scheduler React et `IS_REACT_ACT_ENVIRONMENT` sont gérés globalement par `__tests__/setup/react-dom.ts` (inutile de les répéter). Attendre un effet asynchrone avec `waitFor` / `findBy*`, jamais un `setTimeout`.
- Texte présent plusieurs fois : `getAllByText`, pas `getByText`.
- Mock tRPC : `vi.mock("@/lib/trpc/client", () => ({ api: { … } }))`.
- Routers tRPC unitaires : contexte et `ctx.db` mockés ; routers en DB : `appRouter.createCaller(ctx)` avec données créées par le test.
- Cas à couvrir en priorité : validation, `UNAUTHORIZED`, `NOT_FOUND`, isolation tenant (un autre cabinet ne voit rien), chemins critiques.
- **Accessibilité** : `const results = await axe(container, { rules: { "color-contrast": { enabled: false } } }); expect(results.violations).toEqual([]);` (modèle : `__tests__/unit/components/layout/AppSidebar.a11y.test.tsx`).
- Pas d'E2E (Playwright non installé) ni d'objectif de couverture.

---

## 8. Pièges connus

Leçons tirées des stories passées, vérifiées contre le code actuel. Sécurité tenant de base (`companyId`, `protectedProcedure`, tables enfants) : §4.

| Domaine        | Piège                                                                                                  | Règle                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma/DB      | Prisma 7 : l'URL n'est plus dans `schema.prisma`, `directUrl` n'existe plus                            | URL dans `prisma.config.ts` (`DIRECT_DATABASE_URL ?? DATABASE_URL`) ; `@prisma/adapter-pg` obligatoire dans `db.ts`.                                                                               |
| Prisma/DB      | Mélanger FK scalaire (`cityId`) et relation `connect` dans un même `data` → TS2322 (Checked/Unchecked) | Tout en `connect` / `disconnect`.                                                                                                                                                                  |
| Prisma/DB      | `deleteMany` + `createMany` de relations hors transaction                                              | `$transaction` (seul `groupBy` y est incompatible → `Promise.all`).                                                                                                                                |
| Prisma/DB      | Objet créé à la main en prod → rejeu des migrations cassé sur base fraîche                             | Aucun DDL manuel en prod ; `DROP … IF EXISTS` dans les migrations correctives ; `bun run db:local:reset` OK avant merge.                                                                              |
| Prisma/DB      | `$queryRaw` avec `ILIKE` : `%` et `_` non échappés                                                     | Échapper puis `ESCAPE '\'`.                                                                                                                                                                        |
| RLS/Supabase   | `User.id` / `authorId` sont `TEXT`, `auth.uid()` est `UUID` → `operator does not exist: text = uuid`   | Caster la colonne : `"id"::uuid = auth.uid()`, jamais `auth.uid()::text`.                                                                                                                          |
| RLS/Supabase   | Le menu latéral lit `user_metadata`, pas la table `User`                                                     | Toute MAJ de profil appelle aussi `auth.admin.updateUserById(id, { user_metadata })`.                                                                                                              |
| RLS/Supabase   | Un `$` dans le mot de passe de `DATABASE_URL` est corrompu par dotenv-expand côté Next                 | Échapper `\$` ou encoder `%24`.                                                                                                                                                                    |
| tRPC/API       | Pas d'`errorFormatter` : P2002 / P2003 remontent en 500 brut                                           | Valider en amont : `.refine` d'unicité Zod, `findFirst` avant `connect`, `skipDuplicates`.                                                                                                         |
| tRPC/API       | Schéma d'update avec tableau de relations `.default([])` → tout est effacé si le champ est absent      | `.optional()` sans défaut ; ne remplacer que si `!== undefined`.                                                                                                                                   |
| tRPC/API       | Schéma d'update : champ texte optionnel transformé en `null` quand il est absent → effacé à chaque mise à jour partielle | Patch-semantics (`trimToClearable` dans `candidate.ts`) : absent → `undefined` (inchangé), chaîne vide → `null` (effacé). Le client envoie `""` pour effacer. |
| tRPC/API       | Endpoint public : `z.string()` sans borne                                                              | `.max()` sur tout `z.string()` public, même `maxLength` côté UI.                                                                                                                                   |
| tRPC/API       | Fichier Storage lié à une ligne (photo, CV) : supprimer la ligne laisse le fichier (la cascade Prisma ne touche pas le Storage) | Supprimer le fichier dans la même procédure, avant la ligne, via les helpers de `src/server/candidateStorage.ts` (toutes extensions). |
| tRPC/API       | Fetch externe : `response.json()` sans vérifier `ok` ni timeout                                        | Vérifier `response.ok`, `AbortSignal.timeout(…)`, logger et renvoyer un résultat vide en cas d'échec.                                                                                              |
| tRPC/API       | Sortie d'un acteur Apify : format non contractuel, qui change sans prévenir                           | Un schéma Zod tolérant par acteur (`.nullish().catch(null)` champ par champ, `lenientArray`) qui produit un `NormalizedProfile`, nettoyé ensuite par `buildDraft` dans `src/lib/linkedin/profile.ts` ; ignorer les entrées incomplètes plutôt qu'échouer. La vérification quotidienne détecte une casse globale. |
| TanStack Query | Reset de l'état UI avant la fin de la mutation → saisie perdue en cas d'erreur                         | `mutate(input, { onSuccess })` (s'ajoute aux callbacks du hook).                                                                                                                                   |
| TanStack Query | `placeholderData: keepPreviousData` renvoie les anciennes données même avec `enabled: false`           | Vider explicitement quand la saisie repasse sous le seuil.                                                                                                                                         |
| Notes (Tiptap) | `useEditor` ne relit pas `initialContent` après le montage : remonter l'éditeur en cours de frappe (nouvelle `key` après une création) perd la saisie ; le monter avant que la note soit chargée l'affiche vide | Changer la `key` pour afficher une autre note, ou pour rafraîchir une note en lecture seule (`key={note.content}`) ; attendre la note avant de monter l'éditeur ; mettre le cache à jour dès l'envoi d'une modification (`setData`) pour ne pas rouvrir sur l'ancien contenu. Dans `NoteChatWidget`, une nouvelle note vit en brouillon local (`src/lib/note-draft.ts`, vidé à la déconnexion) et n'est créée qu'à la fermeture du widget, une création à la fois. |
| React/forms    | `react-hooks/set-state-in-effect` interdit `setState` dans `useEffect` pour dériver / précharger       | `useMemo` pour dériver ; ajustement pendant le rendu avec garde (ex. `loadedForId`).                                                                                                               |
| React/forms    | React Compiler + RHF : `watch()` émet un warning                                                       | `useWatch({ control, name })`.                                                                                                                                                                     |
| React/forms    | dnd-kit : annonces en anglais par défaut ; chips en `flex-wrap` mal triées ; drag déclenché au clic    | Annonces FR ; `rectSortingStrategy` ; `PointerSensor` avec activation à 5 px.                                                                                                                      |
| Next.js        | Next 16 : le middleware s'appelle `src/proxy.ts`                                                       | Toute nouvelle route protégée → liste de `proxy.ts`, et page sous `src/app/(dashboard)/` (menu latéral via `DashboardShell`). Nouvelle entrée de menu → `AppSidebar`.                              |
| Next.js        | Pages publiques `/share` : risque de fuite                                                             | Server Component + Prisma direct, `select` unique `publicCandidateSelect`, anonymisation côté serveur, même erreur pour token inconnu / mauvais type, `generateMetadata` sans nom en mode anonyme. |
| tests          | jsdom sans `scrollIntoView`, `ResizeObserver`, `*PointerCapture` (Radix, cmdk)                         | Polyfills dans le fichier de test (modèle : `__tests__/unit/components/shared/CityAutocomplete.test.tsx`).                                                                                         |
| tests          | Contenu Dialog / AlertDialog rendu en portail, hors `container`                                        | `screen.*` ou `within(document.body)`.                                                                                                                                                             |
| tests          | Travail planifié par le scheduler React (popovers…) → `window is not defined` au teardown jsdom, run en échec même si tous les tests passent | Géré par le setup global `__tests__/setup/react-dom.ts` (`cleanup()` puis `act` + `setTimeout(0)` en `afterEach`). |
| tests          | Matcher `vitest-axe` = typage seul ; `color-contrast` exige canvas                                     | `expect(results.violations).toEqual([])` ; désactiver `color-contrast` en jsdom.                                                                                                                   |
| tests          | dnd-kit en jsdom : pas de layout                                                                       | Tests clavier (espace / flèche / espace) avec `getBoundingClientRect` mocké.                                                                                                                       |
| tests          | `await caller.x()` avant `expect` lève trop tôt ; fixtures partagées entre fichiers en série           | `await expect(caller.x()).rejects.toMatchObject({ code })` ; noms uniques (`randomUUID()`) ; nettoyage ciblé en `try/finally`.                                                                     |

---

## 9. Documentation

| Fichier                    | Contenu                                                                                      | Quand le mettre à jour                                           |
| -------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `docs/prd.md`              | Vision, exigences (FR/NFR), objectifs UI, épics et stories en une ligne                      | Changement de périmètre ou de comportement attendu               |
| `docs/architecture.md`     | Flux, multi-tenancy/RLS, auth, routers, modèle de données, stockage, déploiement, tests, ADR | Nouveau router, table, variable d'env, décision structurante     |
| `docs/coding-standards.md` | Ce document : conventions et pièges                                                          | Nouvelle convention ou piège rencontré (une ligne au tableau §8) |
| `docs/TO-DO.md`            | Prochaines actions, backlog, dette, fonctionnalités reportées                                | Au fil de l'eau                                                  |

- Décision à impact long terme : nouvelle ligne dans le tableau `docs/architecture.md` §11 (décision + raison). On ne supprime pas une ligne : une nouvelle décision la remplace explicitement.
- Pas de nouveau fichier dans `docs/` (story, rapport, rétro) : on met à jour ces 4 fichiers. L'historique est dans git (tag `docs-archive-2026-10`).
- **Commentaires dans le code** : uniquement quand la raison n'est pas évidente (contournement, contrainte externe, piège ci-dessus). Pas de commentaire qui paraphrase le code, pas de JSDoc systématique. Un en-tête bref est accepté sur un router ou un helper partagé dont la responsabilité n'est pas évidente.
