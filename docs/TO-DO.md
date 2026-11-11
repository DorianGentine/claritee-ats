# TO-DO — Claritee ATS

Source de vérité pour les prochaines actions de développement, par urgence puis par thème. Les épics 1 à 6 (MVP, villes structurées, import LinkedIn) sont livrés — voir `prd.md`. L'historique complet des stories, rétros et rapports QA est dans le tag git `docs-archive-2026-10`.

Dernière mise à jour : 2026-11-11

Cocher `[x]` une tâche livrée ; les tâches cochées sont retirées à la mise à jour suivante.

---

## 🔥 Urgent — bugs et sécurité

_Aucun sujet ouvert._

---

## 🏗️ Infrastructure & DevOps

- [ ] **Vérifier la connexion DB avant le build Vercel** _(optionnel)_
  `scripts/vercel-build.sh` rejette les formats d'URL connus comme invalides, mais un mauvais mot de passe ou un projet en pause n'échoue qu'après `next build`. Piste : `echo "select 1" | bun run prisma db execute --stdin` avant le build (teste la connexion sans dépendre de l'état des migrations ; `prisma migrate status` ne convient pas, il échoue dès qu'une migration est en attente).

- [ ] **Base de staging dédiée (Supabase)**
  Les migrations ont déjà été testées contre la prod (coupure de service). Créer un projet Supabase de staging (`DATABASE_URL` / `DIRECT_DATABASE_URL` dans `.env.local`, prod uniquement dans Vercel).
  - _Déjà en place :_ Supabase local (`bun run db:local:start`), migrations rejouables from scratch, job CI qui rejoue migrations + tests.

- [ ] **Script `dev:prod`** _(à créer)_
  Lancer l'app locale sur la DB de prod (wrapper shell, ou `dotenv -e .env.prod.local -- next dev` après ajout de `dotenv-cli`, non installé) sans toucher `.env.local`. ⚠️ Toute écriture impacte la prod : debug lecture uniquement, avertissement visible dans le terminal.

- [ ] **Rate limiter en mémoire, par instance**
  `src/lib/rate-limit.ts` stocke les compteurs en mémoire : sur Vercel chaque instance a sa propre limite. Passer à un store distribué (ex. Upstash) si le trafic augmente.

- [ ] **Script `db-pull-prod.sh` : mot de passe tronqué**
  `tr -d '"'` supprime tous les guillemets, ce qui casse un mot de passe qui en contient. Idem `check-local-services.sh`, sensible à un commentaire en fin de ligne dans `.env`.

---

## 🧪 Tests

_Aucun sujet ouvert._

---

## 🧹 Dette technique — code

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
  - [ ] Deux confirmations d'upload simultanées pour un même candidat (double envoi, deux onglets) : si le nettoyage de l'une passe entre la vérification et la mise à jour de la fiche de l'autre, la fiche peut pointer vers un fichier supprimé (fenêtre de quelques millisecondes). Corriger demanderait de sérialiser les confirmations par candidat.
  - [ ] Notes d'un membre supprimé (auteur `null`, « Ancien membre ») : plus personne ne peut les modifier ni les supprimer (`note.update` / `delete` exigent l'auteur).
  - [ ] Page `/settings/team` en doublon de `TeamSettings` (onglet Équipe de `/settings`) : liée nulle part, sans suppression de membre. La supprimer.
  - [ ] Route `/search` non protégée par `src/proxy.ts` (les procédures tRPC restent protégées : pas de fuite, mais pas de redirection vers `/login`).
  - [ ] Fiche anonyme : UUIDs d'expériences/formations présents dans le DTO ; CTA « Contactez [cabinet] » sans `mailto` (pas d'email sur `Company`).
  - [ ] Schémas Zod contraires aux standards : `z.string().email()` (forme Zod 3) dans `src/lib/validations/auth.ts`, et pas de `.max()` sur les chaînes du schéma public `register`.
  - [ ] `&apos;` dans du JSX (2 fichiers : `register/page.tsx`, `settings/team/page.tsx`) au lieu d'une apostrophe typographique.
  - [ ] Commentaire faux dans `src/server/trpc/routers/city.ts` : les bbox de repli ne sont pas interrogées « seulement si l'Europe ne renvoie rien », les 3 le sont en parallèle.

- [ ] **Questionner React Hook Form sur les formulaires candidat** _(story 5.4)_
  `candidates/new` et `CandidateIdentityDialog` (modale « Modifier le profil » de la fiche) mélangent RHF (champs scalaires) et `useState` (villes, photo, préchargement). Évaluer un simple `useState` + `safeParse(candidateSchema)` au submit. Regarder offre/client avant de généraliser.

- [ ] **Dépendances transitives dépréciées** _(signalées le 2026-10-11)_
  - `basic-ftp@5.1.0` (dev, via `pa11y` → `puppeteer`) — ⚠️ vulnérabilité corrigée en `5.2.1+`
  - _Pistes :_ monter le parent (`pa11y`) ; sinon `overrides` (package.json) ciblé en version exacte. Vérifier la chaîne avec `bun why <pkg>`.

---

## 📦 Post-MVP — Fonctionnalités différées

- [ ] **Export RGPD (NFR9)** — prévu par le PRD, aucun export de données candidat n'existe dans le code.
- [ ] **Rôles et permissions** — champ `role: "ADMIN" | "MEMBER"` sur `User`, migration, `adminProcedure` tRPC ; restreindre l'équipe et les invitations aux admins. En attendant, le créateur du cabinet (son premier membre) est seul à pouvoir retirer un membre ou supprimer le cabinet.
- [ ] **Changement d'adresse email** — l'email est en lecture seule dans le profil ; implémenter le flow de confirmation Supabase vers la nouvelle adresse.
- [ ] **Historique de recherche (style Notion)** — recherches récentes dans la modal Cmd+K avant saisie (table `SearchHistory`, API par utilisateur/cabinet).
- [ ] **Import LinkedIn : photo** — l'URL `photo` renvoyée par Apify (media.licdn.com) expire ; la télécharger côté serveur vers le bucket `photos` à la création.
- [ ] **Import LinkedIn : doublon non détecté si l'URL enregistrée est encodée** (`/in/j%C3%A9r%C3%B4me`) : le pré-filtre `contains` compare l'identifiant décodé.
- **Exclusions MVP** (Kanban, parsing CV, emails, IA, API publique, extension) — voir `prd.md`.
