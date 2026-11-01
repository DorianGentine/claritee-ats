# TO-DO — Claritee ATS

Source de vérité pour les prochaines actions de développement, par urgence puis par thème. Les épics 1 à 5 (MVP + villes structurées) sont livrés — voir `prd.md`. L'historique complet des stories, rétros et rapports QA est dans le tag git `docs-archive-2026-10`.

Dernière mise à jour : 2026-11-01

Cocher `[x]` une tâche livrée ; les tâches cochées sont retirées à la mise à jour suivante.

---

## 🔥 Urgent — bugs et sécurité

- [ ] **Limite de débit absente sur des procédures publiques et des mutations**
  `checkMutationRateLimit` ne couvre que 17 mutations sur 41 (NFR14). Les cas exposés sans authentification :
  - `invitation.accept` (`publicProcedure`) crée des comptes Supabase Auth, sans limite ;
  - `city.autocomplete` (`publicProcedure`) appelle Photon 3 fois en parallèle et **persiste les résultats dans `cities`** : un anonyme peut écrire dans la base en boucle.

  Également sans limite : `auth.updateProfile`, `company.updateCompany`, `invitation.create` / `revoke`.

- [ ] **Upload de CV probablement refusé au-delà d'environ 3,3 Mo en prod**
  Les fichiers transitent en base64 dans l'input tRPC (+33 %) : un CV de 5 Mo (limite NFR15) fait environ 6,7 Mo de corps de requête, au-delà de la limite de 4,5 Mo des fonctions Vercel. À confirmer en prod ; piste : URL d'upload signée Supabase (upload direct depuis le navigateur).

- [ ] **Suppression de données incomplète (RGPD, NFR9)**
  Aucune procédure de suppression pour un client, un lien de partage, un utilisateur ou un cabinet. La suppression d'un cabinet devra aussi vider son préfixe `{companyId}/` dans les buckets `photos` et `cvs` (la cascade Prisma ne touche pas le Storage) et supprimer les comptes Supabase Auth de ses utilisateurs.

---

## ⭐ Prioritaire

- [ ] **Import LinkedIn (épic 6) : valider puis mettre en production**
  - Tester l'import sur quelques profils de candidats réels (acteur `supreme_coder`).
  - Prod : `APIFY_TOKEN` sur Vercel ; secrets GitHub `APIFY_TOKEN`, `ADMIN_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` pour `linkedin-import-check.yml` ; lancer le workflow à la main une fois (y compris un échec simulé pour recevoir l'email).
  - RGPD : un profil importé n'est pas collecté auprès du candidat (art. 14) ; prévoir l'information du candidat et citer Apify comme sous-traitant.

---

## 🏗️ Infrastructure & DevOps

- [ ] **Vérifier la connexion DB avant le build Vercel** _(optionnel)_
  `scripts/vercel-build.sh` rejette les formats d'URL connus comme invalides, mais un mauvais mot de passe ou un projet en pause n'échoue qu'après `next build`. Piste : `echo "select 1" | bun run prisma db execute --stdin` avant le build (teste la connexion sans dépendre de l'état des migrations ; `prisma migrate status` ne convient pas, il échoue dès qu'une migration est en attente).

- [ ] **Fiabiliser le keep-alive DB (cron GitHub Actions)**
  `.github/workflows/keep-alive.yml` ping `/api/keep-alive` 1×/jour pour éviter la pause hebdomadaire de Supabase (plan gratuit). GitHub désactive les workflows planifiés après **60 jours sans activité** sur le repo, et les crons peuvent être retardés/sautés.
  - _Pistes :_ Vercel Cron (Hobby : 1 exécution/jour, suffisant), UptimeRobot ou cron-job.org ; à défaut une 2ᵉ ligne `cron`.
  - _Observabilité :_ `_keepalive.lastPingAt` en base indique le dernier ping réel.

- [ ] **Base de staging dédiée (Supabase)**
  Les migrations ont déjà été testées contre la prod (coupure de service). Créer un projet Supabase de staging (`DATABASE_URL` / `DIRECT_DATABASE_URL` dans `.env.local`, prod uniquement dans Vercel).
  - _Déjà en place :_ Supabase local (`bun run db:local:start`), migrations rejouables from scratch, job CI qui rejoue migrations + tests.

- [ ] **Script `dev:prod`** _(à créer)_
  Lancer l'app locale sur la DB de prod (wrapper shell, ou `dotenv -e .env.prod.local -- next dev` après ajout de `dotenv-cli`, non installé) sans toucher `.env.local`. ⚠️ Toute écriture impacte la prod : debug lecture uniquement, avertissement visible dans le terminal.

- [ ] **Rate limiter en mémoire, par instance**
  `src/lib/rate-limit.ts` stocke les compteurs en mémoire : sur Vercel chaque instance a sa propre limite. Passer à un store distribué (ex. Upstash) si le trafic augmente.

- [ ] **Buckets Storage non provisionnés en local**
  `photos` et `cvs` ne sont pas déclarés dans `supabase/config.toml` : sur une stack locale neuve, upload et téléchargement échouent tant qu'on ne les crée pas à la main dans le Studio local. Les déclarer (`[storage.buckets.*]`).

- [ ] **Supabase CLI non figée en CI**
  `supabase/setup-cli` en `version: latest` dans `ci.yml`, contrairement à la règle des versions exactes. Fixer la version.

- [ ] **Script `db-pull-prod.sh` : mot de passe tronqué**
  `tr -d '"'` supprime tous les guillemets, ce qui casse un mot de passe qui en contient. Idem `check-local-services.sh`, sensible à un commentaire en fin de ligne dans `.env`.

---

## 🧪 Tests

- [ ] **Dé-skipper les tests DB en dette** (tag `TODO(db-test-debt)`)
  9 tests `it.skip` échouent ou sont flaky sur base fraîche (isolation, setup, tri non déterministe) : `dashboard` (×2 `recentNotes`), `candidate` (pagination), `client` (tri `createdAt`), `company` (`getMyCompany`), `invitation` (list other company), `offer` (×2 tri), `prisma/seed`.
  - _Pistes :_ données uniques par test (`randomUUID`, pas `Date.now()` en `Promise.all`), cleanup ciblé en `try/finally`, tiebreaker ou `createdAt` espacés pour les tris, seed exécuté avant `seed.test.ts`.
  - _Trous de couverture connus :_ `cityId` invalide à la création d'offre, `cityName: null` côté router (couvert seulement dans `JobOfferCard`), interaction `CityAutocomplete` dans `JobOfferForm`.

- [ ] **Aucun test ne vérifie que l'API REST Supabase reste fermée**
  Les tests DB tournent en propriétaire. Ajouter un test DB qui vérifie, pour chaque table `public`, `has_table_privilege('anon' | 'authenticated', …) = false` et `relrowsecurity = true` : une future migration qui rouvrirait un droit serait détectée.

- [ ] **pa11y n'audite que `/login`**
  `bun run a11y` cible `/dashboard` et `/settings/team`, pages protégées : sans session, `proxy.ts` redirige vers `/login`. Ajouter une page publique (`/`, `/register`, une fiche `/share`) ou authentifier pa11y (actions de login).

- [ ] **Faux vert possible sur les tests DB**
  `describe.runIf` skippe silencieusement les 14 fichiers de `__tests__/db` si `DATABASE_URL` est absent. `bun run test:db` le définit toujours (`scripts/test-db.sh`) ; le risque ne concerne qu'un `bun run vitest` lancé directement. Faire échouer ces fichiers au lieu de les ignorer.

- [ ] **Avertissements « not wrapped in act » restants**
  15 avertissements, sans échec : `OfferNotesSection` (×6) met à jour son état après un `supabase.auth.getUser()` asynchrone, hors `act` → attendre cet état dans ses tests (`findBy*` / `waitFor`) ; `AppSidebar.a11y` (×9) vient de l'état interne de `next/link` (`LinkComponent`) → attendre la fin du rendu ou mocker `next/link`.

---

## 🧹 Dette technique — code

- [ ] **Formatage : `;` incohérents**
  `.prettierrc` impose `semi: true` mais ~45 % des fichiers n'ont pas de `;` ; `bun run format:check` échoue sur ~185 fichiers et tout `prettier --write` reformate des fichiers entiers (diffs illisibles). Faire un commit de reformatage global unique (`bun run format`), puis ajouter `format:check` à la CI.

- [ ] **Erreurs Prisma brutes côté client**
  Pas d'`errorFormatter` tRPC : un `connect` sur un `cityId` invalide (offres) ou un `createMany` de `CandidateCity` / `ClientCompanyCity` en erreur remonte en 500 brut. Ajouter un `errorFormatter` qui mappe P2002/P2003/P2025 vers des codes tRPC et des messages génériques.

- [ ] **Recherche de villes sans index**
  `unaccent(name) ILIKE 'x%'` fait un scan complet de la table `cities` à chaque frappe (l'index trigram a été supprimé par la migration `city_drift_fix`). Créer un index fonctionnel adapté (ex. `unaccent` immutable + `text_pattern_ops`, ou trigram).

- [ ] **Petits défauts vérifiés dans le code**
  - [ ] `candidate.list` : `filter(Boolean)` sans effet — la longueur est testée sur le tableau filtré mais c'est le tableau d'origine qui est passé (`src/server/trpc/routers/candidate.ts`).
  - [ ] `cityIds` / `tagIds` lus dans l'URL et `city.getByIds` ne sont pas dédoublonnés avant `.slice(0, 20)`.
  - [ ] `CityAutocomplete.handleSelect` ne déduplique pas : une `value` en double donne des clés React dupliquées.
  - [ ] `JobOfferForm` n'est pas resynchronisé (`reset()`) si `initialOffer` change après un refetch.
  - [ ] Liste candidats : « X candidats trouvés » affiche `items.length` (plafonné à la page, 20) et non le total.
  - [ ] Filtres offres en state local (non présents dans l'URL, perdus au retour arrière), contrairement aux candidats.
  - [ ] `CvDownloadLink` appelle `window.open` après un `await` : bloqué par Safari sans message à l'utilisateur.
  - [ ] Téléchargement de CV en 404 si le nom d'origine n'a pas l'extension du type MIME (`CV` ou `cv.txt` envoyé en DOCX) : le fichier est stocké en `cv.{ext du MIME}` mais `createCvSignedUrl` déduit l'extension de `cvFileName`. Dériver le chemin de `cvUrl`, ou refuser un `fileName` incohérent dans `uploadCvSchema`.
  - [ ] Deux uploads de photo (ou de CV) d'extensions différentes qui se chevauchent pour un même candidat (double envoi, deux onglets) : le nettoyage du premier peut supprimer le fichier du second, auquel la base pointe alors. Corriger demande de sérialiser les uploads par candidat ou un nom de fichier unique par upload.
  - [ ] 15 assertions `ctx.user!` restantes (`client.ts` ×5, `offer.ts` ×4, `candidate.ts` ×3, `candidature.ts` ×2, `shareLink.ts` ×1) alors que `protectedProcedure` type déjà `ctx.user`.
  - [ ] Route `/search` non protégée par `src/proxy.ts` (les procédures tRPC restent protégées : pas de fuite, mais pas de redirection vers `/login`).
  - [ ] Fiche anonyme : UUIDs d'expériences/formations présents dans le DTO ; CTA « Contactez [cabinet] » sans `mailto` (pas d'email sur `Company`).
  - [ ] Schémas Zod contraires aux standards : `z.string().email()` (forme Zod 3) dans `src/lib/validations/auth.ts`, et pas de `.max()` sur les chaînes du schéma public `register`.
  - [ ] `&apos;` dans du JSX (4 fichiers, dont `src/app/page.tsx`) au lieu d'une apostrophe typographique.
  - [ ] Commentaire faux dans `src/server/trpc/routers/city.ts` : les bbox de repli ne sont pas interrogées « seulement si l'Europe ne renvoie rien », les 3 le sont en parallèle.

- [ ] **Questionner React Hook Form sur les formulaires candidat** _(story 5.4)_
  `candidates/new` et `CandidateIdentityDialog` (modale « Modifier le profil » de la fiche) mélangent RHF (champs scalaires) et `useState` (villes, photo, préchargement). Évaluer un simple `useState` + `safeParse(candidateSchema)` au submit. Regarder offre/client avant de généraliser.

- [ ] **Dépendances transitives dépréciées** _(signalées le 2026-10-11)_
  - `basic-ftp@5.1.0` (dev, via `pa11y` → `puppeteer`) — ⚠️ vulnérabilité corrigée en `5.2.1+`
  - _Pistes :_ monter le parent (`pa11y`) ; sinon `overrides` (package.json) ciblé en version exacte. Vérifier la chaîne avec `bun why <pkg>`.

---

## 📦 Post-MVP — Fonctionnalités différées

- [ ] **Export RGPD (NFR9)** — prévu par le PRD, aucun export de données candidat n'existe dans le code.
- [ ] **Rôles et permissions** — champ `role: "ADMIN" | "MEMBER"` sur `User`, migration, `adminProcedure` tRPC ; restreindre `/settings/team` et les invitations aux admins.
- [ ] **Changement d'adresse email** — l'email est en lecture seule dans le profil ; implémenter le flow de confirmation Supabase vers la nouvelle adresse.
- [ ] **Historique de recherche (style Notion)** — recherches récentes dans la modal Cmd+K avant saisie (table `SearchHistory`, API par utilisateur/cabinet).
- [ ] **Import LinkedIn : photo** — l'URL `photo` renvoyée par Apify (media.licdn.com) expire ; la télécharger côté serveur vers le bucket `photos` à la création.
- [ ] **Import LinkedIn : doublon non détecté si l'URL enregistrée est encodée** (`/in/j%C3%A9r%C3%B4me`) : le pré-filtre `contains` compare l'identifiant décodé.
- **Exclusions MVP** (Kanban, parsing CV, emails, IA, API publique, extension) — voir `prd.md`.
