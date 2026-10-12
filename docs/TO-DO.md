# TO-DO — Claritee ATS

Source de vérité pour les prochaines actions de développement, par urgence puis par thème. Les épics 1 à 5 (MVP + villes structurées) sont livrés — voir `prd.md`. L'historique complet des stories, rétros et rapports QA est dans le tag git `docs-archive-2026-10`.

Dernière mise à jour : 2026-10-12

---

## 🔥 Urgent — bugs et sécurité

- **Page publique `/share/[token]` probablement cassée en prod**
  `src/server/publicCandidateSelect.ts` sélectionne encore `city: true`, colonne supprimée par la migration `20260614000000_city_structured`. `tsc` ne le détecte pas (l'objet n'est pas typé `satisfies Prisma.CandidateSelect`) et les 5 tests DB `getPublicByToken` sont skippés (voir dette tests DB). À l'exécution, Prisma rejette le champ inconnu → la page et `shareLink.getPublicByToken` échouent.
  - _Correctif :_ remplacer `city` par `cities` (ordonnées, avec le nom de la ville), typer le select `satisfies Prisma.CandidateSelect`, adapter le DTO public/anonyme, dé-skipper les tests `getPublicByToken`.

- **RLS absente sur plusieurs tables exposées par l'API REST Supabase**
  Pas de policy sur `City`, `CandidateCity`, `ClientCompanyCity` (épic 5), ni sur `Experience`, `Formation`, `Language`, `CandidateTag`, `OfferTag`, `Candidature`, `ClientContact` (justifié à l'époque par « accès contrôlé côté app »). Or ces tables restent accessibles via l'API REST Supabase avec la clé anon. Rappel : Prisma se connecte en propriétaire et contourne la RLS, qui ne protège que l'accès Supabase direct.
  - _À faire :_ vérifier l'exposition réelle (RLS activée sans policy = deny, RLS désactivée = ouvert), puis activer la RLS ou révoquer les droits `anon`/`authenticated` sur ces tables.

- **Build command Vercel à vérifier**
  La doc se contredisait (« à faire » vs « déjà ajouté ») et rien n'est versionné (pas de `vercel.json`). Vérifier dans le dashboard Vercel que la commande est `prisma migrate deploy && next build` ; sinon la mettre à jour avant la prochaine migration.

---

## 🏗️ Infrastructure & DevOps

- **Fiabiliser le keep-alive DB (cron GitHub Actions)**
  `.github/workflows/keep-alive.yml` ping `/api/keep-alive` 1×/jour pour éviter la pause hebdomadaire de Supabase (plan gratuit). GitHub désactive les workflows planifiés après **60 jours sans activité** sur le repo, et les crons peuvent être retardés/sautés.
  - _Pistes :_ Vercel Cron (Hobby : 1 exécution/jour, suffisant), UptimeRobot ou cron-job.org ; à défaut une 2ᵉ ligne `cron`.
  - _Observabilité :_ `_keepalive.lastPingAt` en base indique le dernier ping réel.

- **Base de staging dédiée (Supabase)**
  Les migrations ont déjà été testées contre la prod (coupure de service). Créer un projet Supabase de staging (`DATABASE_URL` / `DIRECT_DATABASE_URL` dans `.env.local`, prod uniquement dans Vercel).
  - _Déjà en place :_ Supabase local (`pnpm db:local:start`), migrations rejouables from scratch, job CI qui rejoue migrations + tests.

- **Script `dev:prod`** _(à créer)_
  Lancer l'app locale sur la DB de prod (`dotenv -e .env.prod.local -- next dev` ou wrapper shell) sans toucher `.env.local`. ⚠️ Toute écriture impacte la prod : debug lecture uniquement, avertissement visible dans le terminal.

- **Rate limiter en mémoire, par instance**
  `src/lib/rate-limit.ts` stocke les compteurs en mémoire : sur Vercel chaque instance a sa propre limite. Passer à un store distribué (ex. Upstash) si le trafic augmente.

- **Script `db-pull-prod.sh` : mot de passe tronqué**
  `tr -d '"'` supprime tous les guillemets, ce qui casse un mot de passe qui en contient. Idem `check-local-services.sh`, sensible à un commentaire en fin de ligne dans `.env`.

---

## 🧪 Tests

- **Dé-skipper les tests DB en dette** (tag `TODO(db-test-debt)`)
  14 tests `it.skip` échouent ou sont flaky sur base fraîche (isolation, setup, tri non déterministe) : `shareLink` (×5 `getPublicByToken` — cf. bug urgent), `dashboard` (×2 `recentNotes`), `candidate` (pagination), `client` (tri `createdAt`), `company` (`getMyCompany`), `invitation` (list other company), `offer` (×2 tri), `prisma/seed`.
  - _Pistes :_ données uniques par test (`randomUUID`, pas `Date.now()` en `Promise.all`), cleanup ciblé en `try/finally`, tiebreaker ou `createdAt` espacés pour les tris, seed exécuté avant `seed.test.ts`.
  - _Trous de couverture connus :_ `cityId` invalide à la création d'offre, `cityName: null`, interaction `CityAutocomplete` dans `JobOfferForm`.

- **La RLS n'est jamais exercée par les tests**
  `scripts/test-db.sh` stubbe `auth.uid()` à `NULL` et les tests tournent en propriétaire. Ajouter quelques tests qui se connectent avec un rôle `authenticated` et un JWT simulé.

- **Faux vert possible sur les tests DB**
  `describe.runIf` skippe silencieusement les 14 fichiers de `__tests__/db` si `DATABASE_URL` est absent. Faire échouer la CI dans ce cas.

- **Tests composants flaky (React 19 + jsdom)**
  `pnpm test:unit` remonte parfois `ReferenceError: window is not defined` (tâche du scheduler React après le teardown jsdom). _Pistes :_ séparer jsdom et node (vitest `projects`), ou généraliser le flush en `afterEach` (voir `coding-standards.md`, pièges tests).

---

## 🧹 Dette technique — code

- **Formatage : `;` incohérents**
  `.prettierrc` impose `semi: true` mais ~45 % des fichiers n'ont pas de `;` ; `pnpm format:check` échoue sur ~185 fichiers et tout `prettier --write` reformate des fichiers entiers (diffs illisibles). Faire un commit de reformatage global unique (`pnpm format`), puis ajouter `format:check` à la CI.

- **Erreurs Prisma brutes côté client**
  Pas d'`errorFormatter` tRPC : un `connect` sur un `cityId` invalide (offres) ou un `createMany` de `CandidateCity` en erreur remonte en 500 brut. Ajouter un `errorFormatter` qui mappe P2002/P2003/P2025 vers des codes tRPC et des messages génériques.

- **Recherche de villes sans index**
  `unaccent(name) ILIKE 'x%'` fait un scan complet de la table `City` à chaque frappe (l'index trigram a été supprimé par la migration `city_drift_fix`). Créer un index fonctionnel adapté (ex. `unaccent` immutable + `text_pattern_ops`, ou trigram).

- **Petits défauts vérifiés dans le code**
  - `candidate.list` : `filter(Boolean)` sans effet — la longueur est testée sur le tableau filtré mais c'est le tableau d'origine qui est passé (`src/server/trpc/routers/candidate.ts`).
  - `cityIds` / `tagIds` lus dans l'URL et `city.getByIds` ne sont pas dédoublonnés avant `.slice(0, 20)`.
  - `CityAutocomplete.handleSelect` ne déduplique pas : une `value` en double donne des clés React dupliquées.
  - `JobOfferForm` n'est pas resynchronisé (`reset()`) si `initialOffer` change après un refetch.
  - Liste candidats : « X candidats trouvés » affiche `items.length` (plafonné à la page, 20) et non le total.
  - Filtres offres en state local (non présents dans l'URL, perdus au retour arrière), contrairement aux candidats.
  - `CvDownloadLink` appelle `window.open` après un `await` : bloqué par Safari sans message à l'utilisateur.
  - 15 assertions `ctx.user!` restantes (`client.ts` ×5, `offer.ts` ×4, `candidate.ts` ×3, `candidature.ts` ×2, `shareLink.ts` ×1) alors que `protectedProcedure` type déjà `ctx.user`.
  - Route `/search` non protégée par `src/proxy.ts` (les procédures tRPC restent protégées : pas de fuite, mais pas de redirection vers `/login`).
  - Fiche anonyme : UUIDs d'expériences/formations présents dans le DTO ; CTA « Contactez [cabinet] » sans `mailto` (pas d'email sur `Company`).

- **Questionner React Hook Form sur les formulaires candidat** _(story 5.4)_
  `candidates/new` et `candidates/[id]/edit` mélangent RHF (champs scalaires) et `useState` (villes, photo, préchargement). Évaluer un simple `useState` + `safeParse(candidateSchema)` au submit. Regarder offre/client avant de généraliser.

- **Dépendances transitives dépréciées** _(signalées par pnpm le 2026-10-11)_
  - `@ungap/structured-clone@1.3.0` (prod, via `@blocknote/core` → `rehype-remark`) — ⚠️ _Potential CWE-502_, corrigé en `1.3.1+`
  - `basic-ftp@5.1.0` (dev, via `pa11y` → `puppeteer`) — ⚠️ vulnérabilité corrigée en `5.2.1+`
  - `uuid@8.3.2` — plus maintenu
  - _Pistes :_ monter le parent (`@blocknote/*`, `pa11y`) ; sinon `pnpm.overrides` ciblé en version exacte. Vérifier la chaîne avec `pnpm why <pkg>`.

---

## 📦 Post-MVP — Fonctionnalités différées

- **Export RGPD (NFR9)** — prévu par le PRD, aucun export de données candidat n'existe dans le code.
- **Rôles et permissions** — champ `role: "ADMIN" | "MEMBER"` sur `User`, migration, `adminProcedure` tRPC ; restreindre `/settings/team` et les invitations aux admins.
- **Changement d'adresse email** — l'email est en lecture seule dans le profil ; implémenter le flow de confirmation Supabase vers la nouvelle adresse.
- **Historique de recherche (style Notion)** — recherches récentes dans la modal Cmd+K avant saisie (table `SearchHistory`, API par utilisateur/cabinet).
- **Exclusions MVP** (Kanban, parsing CV/LinkedIn, emails, IA, API publique, extension) — voir `prd.md`.
