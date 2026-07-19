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
