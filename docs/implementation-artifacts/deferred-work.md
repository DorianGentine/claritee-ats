# Deferred Work

Travaux réels mais reportés, remontés lors des revues. À reprendre quand pertinent.

## Deferred from: code review of story-5.2 (2026-07-12)

- **Aucun index ne sert `unaccent(name) ILIKE 'prefix%'`** — la recherche locale fait un seq scan de `cities` à chaque frappe. Sur base fraîche/CI il n'existe que l'unique `(name, country)` ; l'index trgm n'existe qu'en prod (créé hors-migration, ADR 0005) et est droppé par `city_drift_fix`. Décider d'une stratégie d'index fonctionnel `unaccent(name)` gérée par migration. Pré-existant (infra story 5.1). [src/server/trpc/routers/city.ts:44]
- **`test-db.sh` stub `auth.uid()`=NULL** — les tests tournent en propriétaire (RLS bypassée) et `auth.uid()` renvoie NULL, donc les policies RLS ne sont pas exercées par le harnais de test. Fidélité de test à améliorer. [scripts/test-db.sh]
- **`describe.runIf(!!connectionString)` → faux vert** — si `DATABASE_URL` est absent, toute la suite d'intégration DB est skippée et la CI passe au vert. Envisager une garde qui échoue quand la suite DB est attendue mais absente. S'applique à tous les tests DB, pas seulement `city`. [__tests__/db/server/trpc/routers/city.test.ts]
- **`db-pull-prod.sh` `tr -d '"'`** — supprime toutes les doubles-quotes de l'URL prod, ce qui corromprait un mot de passe contenant un `"`. Ne retirer que les quotes englobantes. Script dev only. [scripts/db-pull-prod.sh]

## Deferred from: code review of story-5.3 (2026-07-19)

- **Clé React dupliquée si `value` contient des villes en double** — `props.value.map((city) => <li key={city.id}>)` casse si le parent fournit deux fois la même ville (warning React + les handlers ↑/↓/× par index visent le mauvais chip). `handleSelect` ne déduplique pas non plus ; la protection repose entièrement sur le filtre des suggestions. Défensif, dépend d'un mauvais usage parent. [src/components/shared/CityAutocomplete.tsx:125]
- **Cosmétique de la fenêtre de debounce** — pendant les ~300ms du debounce : (1) après la 3e frappe, `hasMinQuery` reste false → flash « Saisir au moins 3 caractères » ; (2) en repassant sous le seuil, les anciennes suggestions restent visibles jusqu'au déclenchement. Inhérent au debounce, faible impact. [src/components/shared/CityAutocomplete.tsx:70]

## Deferred from: code review of story-5.5 (2026-08-15)

- **Aucune vérification d'existence de `cityId` avant `connect` (create + update)** — contrairement à `clientCompanyId`/`clientContactId` (vérifiés via `findFirst` avant connect), `cityId` est connecté directement sans vérification. Confirmé : aucun error formatter global ne catch les erreurs Prisma (`PrismaClientKnownRequestError` P2025/P2003) dans la stack tRPC — un `cityId` invalide/périmé remonte en `INTERNAL_SERVER_ERROR` brut plutôt qu'un message propre. Même gap déjà présent pour `CandidateCity` (story 5.4, `candidate.ts`) — à traiter dans un ticket commun aux deux. [src/server/trpc/routers/offer.ts:259-260,371-372]
- **`selectedCity` (et les autres champs `initialOffer`) non resynchronisés si les props changent après le montage** — `JobOfferForm` initialise `selectedCity` via `useState` et les autres champs via `useForm({ defaultValues })`, sans resynchronisation sur changement de props (ex. refetch en arrière-plan pendant l'édition). Limitation architecturale de tout le formulaire, pas spécifique à `cityId` ; AC2 respecté au chargement initial. [src/components/offers/JobOfferForm.tsx:76-78]
- **Lacunes de couverture de tests mineures** — `OfferDetailView` avec ville sans région jamais testé ; `offer.list` sans assertion `cityName: null` dans le même appel `list()` ; aucun test d'interaction `CityAutocomplete` dans `JobOfferForm` ; aucun test de `cityId` invalide/inexistant sur `create`. [__tests__/unit/components/offers/OfferDetailView.test.tsx, __tests__/db/server/trpc/routers/offer.test.ts]

## Deferred from: code review of story-5.7 (2026-08-29)

- **Filtrage défensif `.filter(Boolean).length` incohérent** — calcule un compte sur le tableau filtré mais assigne le tableau original non filtré ; ne sanitize donc rien en pratique. Déjà présent pour `tagIds`/`languageNames`, `cityIds` suit juste le même pattern. [src/server/trpc/routers/candidate.ts:114-119]
- **Cleanup de test sans `try/finally`** — les nouveaux tests `cityIds` (comme tous les autres tests du fichier, ex. le test `tagIds`) suppriment leurs fixtures en fin de `it()` sans `try/finally` ni `afterEach` ; une assertion qui échoue avant le cleanup laisse des lignes `City`/`CandidateCity` orphelines dans la base de test partagée. Pattern préexistant, pas propre à cette story. [__tests__/db/server/trpc/routers/candidate.test.ts]
- **Risque de collision `Date.now()` sur noms de fixtures créées en `Promise.all`** — `FilterParis-${Date.now()}`/`FilterLyon-${Date.now()}` générés en parallèle pourraient collisionner sous CI rapide. Même pattern déjà utilisé pour les fixtures `tags` du même fichier. [__tests__/db/server/trpc/routers/candidate.test.ts]
- **Pas de dédoublonnage des `cityIds` parsés depuis l'URL avant le `.slice(0, 20)`** — un même id répété 20+ fois dans l'URL passe le plafond tout en ne représentant qu'une seule ville distincte, contournant silencieusement la limite voulue. Même lacune déjà présente pour `tagIds`. [src/app/(dashboard)/candidates/page.tsx]
