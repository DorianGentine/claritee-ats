# TO-DO — Claritee ATS

Source de vérité pour les prochaines actions de développement. Organisé par urgence et thématique.

---

## 🚧 Epic 5 : Villes Structurées (en cours)

La migration DB (story 5.1) est appliquée en production. Les 7 stories suivantes restent à implémenter dans l'ordre indiqué ci-dessous.

| Story | Titre | Statut | Dépendances |
|-------|-------|--------|-------------|
| **5.1** | Infrastructure DB — Table City & Migration | ✅ DONE | — |
| **5.2** | Procédure tRPC `city.autocomplete` | TODO | 5.1 |
| **5.3** | Composant `CityAutocomplete` | TODO | 5.2 |
| **5.4** | Formulaire candidat — Villes (multi, ordonné) | TODO | 5.3 |
| **5.5** | Formulaire offre d'emploi — Ville | TODO | 5.3 |
| **5.6** | Formulaire entreprise cliente — Villes | TODO | 5.3 |
| **5.7** | Filtres par ville — Candidats & Offres | TODO | 5.4, 5.5 |
| **5.8** | Drag & drop villes candidat | TODO | 5.4 |

**Prochaine étape :** démarrer la story 5.2 (`city.autocomplete`).

---

## 🔜 Actions ponctuelles à ne pas oublier

- **Mettre à jour le build command Vercel** : remplacer `next build` par `prisma migrate deploy && next build` pour rendre migration et déploiement atomiques — à faire avant la prochaine migration.

---

## 🏗️ Infrastructure & DevOps

- **Fiabiliser le keep-alive DB (cron GitHub Actions)**
  Le workflow `.github/workflows/keep-alive.yml` empêche la mise en pause hebdomadaire de la DB Supabase (plan gratuit) en pingant `/api/keep-alive` 1×/jour. **Limite connue :** GitHub désactive automatiquement les workflows planifiés après **60 jours sans activité sur le repo** → le cron s'arrête silencieusement et la DB re-pause. Aussi : les crons planifiés peuvent être retardés/sautés sous charge.
  - *Pistes :* déplacer le déclencheur vers un planificateur externe sans cette limite (2ᵉ monitor UptimeRobot, cron-job.org) ou **Vercel Cron** (le plan Hobby autorise justement 1 exécution/jour, ce qui suffit ici) ; à défaut, ajouter une 2ᵉ ligne `cron` pour la marge.
  - *Observabilité :* la colonne `_keepalive.lastPingAt` permet de vérifier en base quand le dernier ping a réellement eu lieu (donc si le cron tourne encore).

- **Base de données de staging dédiée (Supabase)**
  Actuellement, les migrations Prisma sont testées directement contre la DB de production, ce qui a provoqué une coupure de service (migration appliquée avant le déploiement du code). Créer un projet Supabase séparé pour le développement/staging.
  - *Prérequis :* nouveau projet Supabase, variables `DATABASE_URL` / `DIRECT_URL` de staging dans `.env.local`, variable de prod uniquement dans Vercel.
  - *Mitigation partielle déjà en place :* `prisma migrate deploy` ajouté au build command Vercel.

---

## 📦 Post-MVP — Fonctionnalités différées

Ces fonctionnalités sont hors périmètre du MVP mais documentées pour les évolutions futures.

### Historique de recherche (style Notion)

Afficher les recherches récentes dans la modal de recherche globale (Cmd+K) lorsque l'utilisateur n'a pas encore saisi de requête.
- *Prérequis :* table `SearchHistory` (ou similaire), API pour récupérer l'historique par utilisateur/cabinet, affichage dans la modal avant les résultats live.

### Rôles et permissions

Restreindre la page `/settings/team` et les actions d'invitation aux administrateurs du cabinet.
- *Prérequis :* champ `role: "ADMIN" | "MEMBER"` sur le modèle `User`, migration Prisma, `adminProcedure` tRPC.

### Changement d'adresse email (story 4.8)

Le champ email est actuellement affiché en lecture seule dans le profil. Implémenter le flow de confirmation Supabase (email envoyé à la nouvelle adresse) pour permettre le changement.

---

## ✅ Référence — Stories terminées

Épics 1–4 : **36 stories DONE** (1.1 → 4.9).
Épic 5 : 1 story en review (5.1), 7 stories TODO (5.2 → 5.8).
