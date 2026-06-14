# Epic 5: Villes Structurées

**Réf. architecture :** ADR 0005 (`docs/architecture/adr/0005-villes-structurees-table-city-api-photon.md`) — table `City`, flux hybride local/Photon, extensions `unaccent` + `pg_trgm`.

## Epic Goal

Remplacer les champs texte libres `Candidate.city` et `JobOffer.location` par une table `City` partagée et des relations structurées (`CandidateCity`, `ClientCompanyCity`, `JobOffer.cityId`), avec autocomplétion hybride (seed local + fallback API Photon). À la fin de cet epic, les villes sont des données structurées, filtrables et cohérentes sur l'ensemble de l'application — candidats, offres d'emploi et entreprises clientes.

**Stratégie de migration des données :** table rase — les valeurs texte existantes (`Candidate.city`, `JobOffer.location`) sont abandonnées. Le faible nombre de candidats en base rend la ressaisie acceptable.

---

## Story 5.1: Infrastructure DB — Table City & Migration

**As a** developer,
**I want** the database to have a structured `City` model with all required relations,
**so that** the rest of the epic can build on a clean data foundation.

**Acceptance Criteria:**

1. Modèle Prisma `City` créé : `id`, `name`, `region?`, `country`, `latitude`, `longitude`, `createdAt` — table `cities` sans `companyId` (données de référence globales)
2. Modèle `CandidateCity` créé : `id`, `candidateId`, `cityId`, `order` — contrainte `@@unique([candidateId, cityId])`
3. Modèle `ClientCompanyCity` créé : `@@id([clientCompanyId, cityId])` (pas d'ordre)
4. `Candidate.city` (String?) supprimé ; relation `cities CandidateCity[]` ajoutée
5. `JobOffer.location` (String?) supprimé ; `cityId String?` (FK vers `City`) ajouté
6. `@@index` sur `Candidate` mis à jour (retrait du champ `city` devenu inexistant)
7. Migration Prisma générée (`pnpm db:migrate`) et appliquée sans erreur
8. Extensions PostgreSQL activées via migration SQL brute : `unaccent`, `pg_trgm`
9. Index GIN créé : `CREATE INDEX idx_cities_name_trgm ON cities USING gin (unaccent(name) gin_trgm_ops)`
10. Script `scripts/seed-cities.ts` créé, appelle Photon pour ~250 grandes villes européennes avec délai 200ms entre appels
11. `pnpm db:seed` exécute le seed sans erreur ; idempotent (skip si la ville existe déjà)

**Réf.** ADR 0005 §2 (structure table), §3 (seed), `prisma/schema.prisma`.

---

## Story 5.2: Procédure tRPC city.autocomplete

**As a** developer,
**I want** a `city.autocomplete` tRPC procedure,
**so that** the frontend can search cities with local-first, Photon fallback logic.

**Acceptance Criteria:**

1. Router `city` créé (`src/server/trpc/routers/city.ts`) et enregistré dans `_app.ts`
2. Procédure `city.autocomplete` : `publicProcedure`, input `{ q: string }`, output `{ id, name, region, country }[]`
3. Si `q.length < 3` → retourne `[]` immédiatement sans requête DB
4. Recherche locale : `$queryRaw` avec `unaccent(name) ILIKE unaccent($1) || '%'`, `ORDER BY name ASC`, `LIMIT 5`
5. Si résultats locaux → retourne sans appel externe
6. Si aucun résultat local → appel Photon (`lang=fr`, `limit=5`, `layer=city`, `bbox=-10,35,40,72`)
7. Résultats Photon non présents en DB → créés à la volée via `upsert` sur `(name, country)`
8. Si Photon inaccessible (timeout ou erreur réseau) → retourne `[]` sans faire planter la procédure
9. Coordonnées `latitude`/`longitude` non exposées dans l'output client
10. Tests unitaires : q < 3 → [] ; DB locale trouvée → retour direct ; DB vide + Photon mocké → upsert + retour ; DB vide + Photon KO → []

**Réf.** ADR 0005 §4 (flux), §5 (SQL), §6 (tRPC), `docs/architecture/coding-standards.md` §3.1.

---

## Story 5.3: Composant partagé CityAutocomplete

**As a** developer,
**I want** a shared `CityAutocomplete` component,
**so that** all forms can pick cities consistently without duplicating logic.

**Acceptance Criteria:**

1. Composant `src/components/shared/CityAutocomplete.tsx` créé
2. Props : `value: CityOption | CityOption[] | null`, `onChange`, `mode: "single" | "multi"`, `placeholder?`, `disabled?`  
   (`CityOption = { id: string; name: string; region?: string | null; country: string }`)
3. Basé sur `Popover` + `Command` (shadcn Combobox pattern), debounce 300ms via `useDebounce`
4. Minimum 3 caractères pour déclencher la recherche — affiche "Saisir au moins 3 caractères" sinon
5. État chargement pendant la query (`isLoading` → skeleton ou spinner dans la liste)
6. `mode="single"` : ville sélectionnée affichée comme badge clearable ; re-clic sur le badge → efface
7. `mode="multi"` : chaque ville sélectionnée apparaît comme chip ordonné avec boutons ↑, ↓ et × ; ↑ sur index=0 désactivé, ↓ sur dernier index désactivé
8. Chaque option de la liste : `Nom de la ville` (texte principal) + `Région · Pays` (texte muted sous-jacent)
9. Ville déjà sélectionnée : non affichée dans les suggestions (filtre côté client)
10. État vide : "Aucune ville trouvée pour [query]"
11. Tests unitaires : mode single sélection/clear ; mode multi ajout/suppression/↑↓

**Réf.** `docs/design-system.md` (palette, shadcn), `src/components/shared/` (convention après 2e réutilisation).

---

## Story 5.4: Formulaire candidat — Villes (multi, ordonné)

**As a** recruiter,
**I want** to associate multiple ordered cities to a candidate,
**so that** I can reflect geographic preferences on the profile.

**Acceptance Criteria:**

1. Formulaire création candidat (`/candidates/new`) : champ `city` (texte) remplacé par `CityAutocomplete` en `mode="multi"`
2. Formulaire édition candidat (`/candidates/[id]/edit`) : même remplacement ; villes actuelles pré-chargées dans le bon ordre
3. Procédure `candidate.create` : accepte `cities: { cityId: string; order: number }[]` (peut être vide)
4. Procédure `candidate.update` : remplace toutes les `CandidateCity` existantes (`deleteMany` + `createMany`)
5. Schéma Zod mis à jour : `city` retiré, `cities` ajouté (`z.array(z.object({ cityId: z.uuid(), order: z.number().int().min(0) })).default([])`)
6. Fiche candidat (`/candidates/[id]`) : villes affichées dans l'ordre (ex. "Paris · Lyon")
7. Liste candidats (`/candidates`) : affiche la ville `order=0` du candidat, ou vide si aucune
8. Tests : create avec 2 villes + vérification ordre en base ; update remplace correctement ; create sans villes fonctionne

**Réf.** `src/server/trpc/routers/candidate.ts`, `src/lib/validations/candidate.ts`, `prisma/schema.prisma` CandidateCity.

---

## Story 5.5: Formulaire offre d'emploi — Ville unique

**As a** recruiter,
**I want** to associate a single structured city to a job offer,
**so that** offers have consistent, filterable locations.

**Acceptance Criteria:**

1. Formulaire création offre (`/offers/new`) : champ `location` (texte) remplacé par `CityAutocomplete` en `mode="single"`
2. Formulaire édition offre (`/offers/[id]/edit`) : même remplacement ; ville actuelle pré-chargée si définie
3. Procédure `jobOffer.create` : `location` retiré, `cityId: string | null` ajouté
4. Procédure `jobOffer.update` : même changement
5. Schéma Zod mis à jour : `location` retiré, `cityId` ajouté (`z.uuid().optional().nullable()`)
6. Détail offre (`/offers/[id]`) : affiche "Nom de la ville, Région" ou rien si cityId null
7. Liste offres : affiche la ville de l'offre si définie
8. Include `city` dans les queries Prisma `jobOffer.list` et `jobOffer.getById`
9. Tests : create avec cityId ; update cityId → null efface la ville

**Réf.** `src/server/trpc/routers/jobOffer.ts`, `src/lib/validations/jobOffer.ts`.

---

## Story 5.6: Formulaire entreprise cliente — Villes (multi, sans ordre)

**As a** recruiter,
**I want** to associate multiple cities to a client company,
**so that** I know which locations a client operates in.

**Acceptance Criteria:**

1. Formulaire création entreprise cliente : `CityAutocomplete` en `mode="multi"` ajouté (les boutons ↑↓ ne s'affichent pas — pas d'ordre pour `ClientCompanyCity`)
2. Formulaire édition entreprise cliente : même ajout ; villes actuelles pré-chargées
3. Procédure `clientCompany.create` : accepte `cityIds: string[]` (peut être vide)
4. Procédure `clientCompany.update` : remplace toutes les `ClientCompanyCity` (`deleteMany` + `createMany`)
5. Schéma Zod mis à jour : `cityIds` ajouté (`z.array(z.uuid()).default([])`)
6. Fiche entreprise cliente : villes affichées comme badges (sans ordre imposé)
7. Include `cities { city: true }` dans `clientCompany.getById`
8. Tests : create avec villes ; update remplace les villes

**Réf.** `src/server/trpc/routers/clientCompany.ts`, `src/lib/validations/clientCompany.ts`, `prisma/schema.prisma` ClientCompanyCity.

---

## Story 5.7: Filtres par ville — Candidats & Offres

**As a** recruiter,
**I want** to filter candidates and job offers by structured city,
**so that** I can narrow down results to specific locations.

**Acceptance Criteria:**

1. Filtre ville sur liste candidats : champ texte libre remplacé par `CityAutocomplete` (`mode="multi"`)
2. Procédure `candidate.list` : paramètre `city: string` remplacé par `cityIds: string[]`
3. Filtre `cityIds` en OR : `candidate.cities.some({ cityId: { in: cityIds } })`
4. Procédure `candidate.listCities` (renvoyait des strings distinctes) supprimée
5. Filtre ville sur liste offres : champ texte libre remplacé par `CityAutocomplete` (`mode="single"`)
6. Procédure `jobOffer.list` : paramètre `location: string` remplacé par `cityId: string | null`
7. URL query params mis à jour : `cityIds` contient des UUIDs (pas des noms)
8. Chips actifs affichent le nom résolu de la ville (lookup depuis le state local)
9. Tests : `candidate.list({ cityIds: [idParis] })` retourne uniquement les candidats avec Paris

**Réf.** `src/server/trpc/routers/candidate.ts` (procedure list), `src/app/(dashboard)/candidates/page.tsx` (filtres).

---

## Story 5.8: Drag & Drop villes candidat (dnd-kit)

**As a** recruiter,
**I want** to reorder candidate cities by drag & drop,
**so that** city prioritization feels natural and fast.

**Acceptance Criteria:**

1. Packages installés en versions exactes : `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
2. `CityAutocomplete` en `mode="multi"` : chips deviennent draggables via `SortableContext` + `useSortable`
3. Handle de drag visible (icône grip ⠿) à gauche de chaque chip
4. Boutons ↑↓ de la story 5.3 retirés — remplacés par le drag & drop
5. Ordre mis à jour localement (optimiste) dès le drop, puis persisté via `candidate.update`
6. Accessible au clavier : espace pour saisir, flèches pour déplacer, espace pour déposer (comportement natif dnd-kit)
7. Tests : réordonnancement via simulateur dnd-kit → état mis à jour + mutation appelée avec le bon ordre

**Réf.** ADR 0005 §1 (décision finale sur l'UX), `src/components/shared/CityAutocomplete.tsx`, `src/server/trpc/routers/candidate.ts`.

---
