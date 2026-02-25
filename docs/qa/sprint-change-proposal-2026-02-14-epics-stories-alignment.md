# Sprint Change Proposal — Alignement Epics/Stories avec la documentation Architecture

**Date :** 2026-02-14  
**Auteur :** John (PM)  
**Contexte :** Repasse des epics et stories suite aux livrables architecturaux (architect-checklist-report-2026-02-14).

---

## 1. Analysis Summary

### Contexte

La documentation architecture a été significativement complétée suite au travail avec l'architecte :

- **frontend-architecture.md** : stack, état, routing (tableau §2), composants (convention props/events §4.2), intégration API, accessibilité
- **rate-limiting.md** + **src/lib/rate-limit.ts** : guide d'intégration et code prêts ; **branchement manquant** dans auth, shareLink, upload
- **coding-standards.md** : pièges courants (§5.1), template router complet (§3.1), outils a11y (jest-axe, Pa11y) §7
- **source-tree.md** : structure dossiers, « où placer quoi »
- **tech-stack.md** : versions pinnées détaillées

Le rapport architecte identifie un **risque majeur** : le rate limiting n'est pas branché dans les procédures tRPC concernées. Les stories actuelles ne mentionnent pas explicitement cette exigence pour les zones à risque (auth, partage, upload).

### Objectif

S'assurer que les epics et stories du PRD reflètent les exigences et références de la documentation architecture, en particulier :

1. **Rate limiting** : ajout de critères d'acceptation dans les stories concernées
2. **Références livrables** : mise à jour de la table pour inclure les nouveaux documents
3. **Accessibilité** : référence explicite aux outils de test (coding-standards §7)

---

## 2. Epic Impact Summary

| Epic   | Impact | Nature des changements                                             |
| ------ | ------ | ------------------------------------------------------------------ |
| Epic 1 | Modéré | Story 1.3 : +1 AC rate limiting (auth par IP) ; Réf. élargies      |
| Epic 2 | Modéré | Stories 2.3, 2.9 : +1 AC rate limiting (upload par user)           |
| Epic 3 | Aucun  | -                                                                  |
| Epic 4 | Modéré | Story 4.4 : +1 AC rate limiting (partage par user) ; Réf. élargies |

---

## 3. Proposed Edits — Détail

### 3.1 Table des références livrables (Section Epic List)

**Fichier :** `docs/prd.md`  
**Emplacement :** Lignes 503–510 (tableau « Références livrables UX & Architecture »)

**Modification proposée :**

Remplacer la table actuelle par :

```markdown
| Livrable                  | Fichier                                 | Contenu clé                                                                                                                                                                              |
| ------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture**          | `docs/architecture.md`                  | Stack (Next.js, tRPC v11, Prisma, Supabase), multi-tenancy RLS, schéma de données, structure monorepo `src/`, routers tRPC, Auth, Storage (buckets `photos` / `cvs`), déploiement Vercel |
| **Architecture Frontend** | `docs/frontend-architecture.md`         | Stack frontend, état (TanStack Query), routing (tableau routes), composants (props/events §4.2), intégration API, accessibilité                                                          |
| **Rate Limiting**         | `docs/architecture/rate-limiting.md`    | Seuils (auth IP, share userId, upload userId), où brancher, guide d'intégration `src/lib/rate-limit.ts`                                                                                  |
| **Coding Standards**      | `docs/architecture/coding-standards.md` | Pièges courants §5.1, template router §3.1, outils a11y (jest-axe, Pa11y) §7                                                                                                             |
| **Source Tree**           | `docs/architecture/source-tree.md`      | Structure dossiers, « où placer quoi » pour nouveaux composants/routers                                                                                                                  |
| **Tech Stack**            | `docs/architecture/tech-stack.md`       | Versions pinnées des dépendances                                                                                                                                                         |
| **Wireframes**            | `docs/wireframes.md`                    | Layout global (shell), 8 écrans (Dashboard, Liste/Fiche Candidats, …), modals (note rapide, partager, recherche Cmd+K)                                                                   |
| **Design System**         | `docs/design-system.md`                 | Palette (background, primary terracotta, secondary sauge), typo (DM Sans), composants shadcn/ui, WCAG AA                                                                                 |
```

---

### 3.2 Story 1.3: User Registration & Company Creation

**Fichier :** `docs/prd.md`

**Ajout d'un critère d'acceptation :**

Dans la liste des Acceptance Criteria, après l'AC 9 (ou intégré comme AC 10, décalant les suivants) :

- **Nouvel AC 10 :** Rate limiting appliqué sur l'inscription : max 10 requêtes par IP par minute ; en cas de dépassement, afficher le message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `docs/architecture/rate-limiting.md` §3.1, `src/lib/rate-limit.ts`).

**Mise à jour de la ligne Réf. :**

- **De :** `**Réf.** Architecture §7 (flux inscription, création Company + User), validations Zod (SIREN, email).`
- **À :** `**Réf.** Architecture §7 (flux inscription, création Company + User), validations Zod (SIREN, email) ; rate-limiting.md §3.1 (auth par IP).`

---

### 3.3 Story 1.4: User Login & Logout

**Fichier :** `docs/prd.md`

**Modification de l'AC 9 :**

- **De :** `9. Rate limiting on login attempts (Supabase built-in)`
- **À :** `9. Rate limiting : Supabase Auth applique des limites côté service ; l'app peut compléter par un rate limit par IP sur les routes auth (login/register) via le proxy Next.js si souhaité — sinon couvert par Story 1.3 pour l'inscription.`

**Mise à jour de la ligne Réf. :**

- **De :** `**Réf.** Architecture §7 (connexion Supabase Auth, proxy Next.js sur routes protégées).`
- **À :** `**Réf.** Architecture §7 (connexion Supabase Auth, proxy Next.js sur routes protégées) ; rate-limiting.md §3.1 (auth par IP, inscription prioritaire).`

---

### 3.4 Story 2.3: Candidate Profile Photo Upload

**Fichier :** `docs/prd.md`

**Ajout d'un critère d'acceptation :**

- **Nouvel AC 11 :** Rate limiting sur les uploads : max 30 uploads (photo + CV combinés) par utilisateur par heure ; en cas de dépassement, message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `rate-limiting.md` §3.3).

**Mise à jour de la ligne Réf. :**

- **De :** `**Réf.** Architecture §8 bucket `photos`, path `{companyId}/candidates/{candidateId}/`, max 2 Mo ; wireframes §3.`
- **À :** `**Réf.** Architecture §8 bucket `photos`, path `{companyId}/candidates/{candidateId}/`, max 2 Mo ; rate-limiting.md §3.3 (upload par userId) ; wireframes §3.`

---

### 3.5 Story 2.9: Candidate CV File Upload

**Fichier :** `docs/prd.md`

**Ajout d'un critère d'acceptation :**

- **Nouvel AC 11 :** Rate limiting sur les uploads : max 30 uploads (photo + CV combinés) par utilisateur par heure ; en cas de dépassement, message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `rate-limiting.md` §3.3).

**Mise à jour de la ligne Réf. :**

- **De :** `**Réf.** Architecture §8 bucket `cvs`, path `{companyId}/candidates/{candidateId}/`, max 5 Mo ; wireframes §3 « CV: doc.pdf 📥 ».`
- **À :** `**Réf.** Architecture §8 bucket `cvs`, path `{companyId}/candidates/{candidateId}/`, max 5 Mo ; rate-limiting.md §3.3 (upload par userId) ; wireframes §3 « CV: doc.pdf 📥 ».`

---

### 3.6 Story 4.4: Candidate Sharing - URL Generation

**Fichier :** `docs/prd.md`

**Ajout d'un critère d'acceptation :**

- **Nouvel AC 11 :** Rate limiting sur la création de liens : max 20 liens de partage créés par utilisateur par heure ; en cas de dépassement, message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `rate-limiting.md` §3.2).

**Mise à jour de la ligne Réf. :**

- **De :** `**Réf.** Wireframes « Modal Partager » (fiche complète / anonymisée, expiration, lien généré, Copier) ; Architecture router `shareLink`, modèle ShareLink.`
- **À :** `**Réf.** Wireframes « Modal Partager » ; Architecture router `shareLink`, modèle ShareLink ; rate-limiting.md §3.2 (partage par userId).`

---

### 3.7 Epic 1 — Ligne Réf. wireframes / architecture

**Fichier :** `docs/prd.md`  
**Ligne ~525 :** `**Réf. wireframes :** Layout global (shell), §1 Dashboard, §9 Paramètres — **Réf. architecture :** §1–4, §6 (structure `src/app/(auth)`, `(dashboard)`), §7 (Auth), §9 (routers auth, company, invitation).`

**Modification proposée :**

- **À :** `**Réf. wireframes :** Layout global (shell), §1 Dashboard, §9 Paramètres — **Réf. architecture :** §1–4, §6 (structure `src/app/(auth)`, `(dashboard)`), §7 (Auth), §9 (routers auth, company, invitation) ; frontend-architecture (routing §2, état §3) ; rate-limiting.md ; coding-standards (template router §3.1, pièges §5.1).`

---

### 3.8 Epic 4 — Ligne Réf. wireframes / architecture

**Fichier :** `docs/prd.md`  
**Ligne ~1135 :** `**Réf. wireframes :** §8 Page Partage Public, §9 Paramètres, « Barre de recherche (Cmd+K) », « Modal Partager » — **Réf. architecture :** §9 (routers shareLink, search), route publique `src/app/share/[token]/`.`

**Modification proposée :**

- **À :** `**Réf. wireframes :** §8 Page Partage Public, §9 Paramètres, « Barre de recherche (Cmd+K) », « Modal Partager » — **Réf. architecture :** §9 (routers shareLink, search), route publique `src/app/share/[token]/` ; rate-limiting.md §3.2 (partage).`

---

### 3.9 Story 1.7: Base Layout & Navigation Shell — Accessibilité

**Fichier :** `docs/prd.md`

**Ajout d'un critère d'acceptation (optionnel mais recommandé) :**

- **Nouvel AC 11 :** Les composants du layout (sidebar, header, navigation) doivent être testés pour l'accessibilité selon `coding-standards.md` §7 (jest-axe, Pa11y sur écrans critiques). Les violations WCAG AA doivent être corrigées.

**Mise à jour de la ligne Réf. :**

- **De :** `**Réf.** Wireframes « Layout global (shell) » : header (Logo, recherche Cmd+K, avatar + menu user), sidebar (Dashboard, Candidats, Offres, Clients, Paramètres), FAB bas-droite ; Design System (typo, couleurs, composants layout).`
- **À :** `**Réf.** Wireframes « Layout global (shell) » ; Design System (typo, couleurs, composants layout) ; coding-standards §7 (a11y : jest-axe, Pa11y).`

---

### 3.10 Next Steps — Critères d'acceptation

**Fichier :** `docs/prd.md`  
**Ligne ~1336 :** `2. **Critères d'acceptation** : Pour chaque story, vérifier la cohérence avec les sections « Réf. » (wireframes, design-system, architecture).`

**Modification proposée :**

- **À :** `2. **Critères d'acceptation** : Pour chaque story, vérifier la cohérence avec les sections « Réf. » (wireframes, design-system, architecture, frontend-architecture, rate-limiting, coding-standards).`

---

### 3.11 Change Log PRD

**Fichier :** `docs/prd.md`

**Ajout d'une ligne dans le Change Log :**

```markdown
| 2026-02-14 | 1.3 | Alignement epics/stories avec doc architecture : rate limiting (Stories 1.3, 1.4, 2.3, 2.9, 4.4), références frontend-architecture, rate-limiting, coding-standards, source-tree, tech-stack ; a11y (Story 1.7) | John (PM) |
```

---

## 4. Recommended Path Forward

- **Option retenue :** Direct Adjustment — intégrer les modifications directement dans le PRD sans rollback.
- **Effort estimé :** Faible (mises à jour documentaires uniquement).
- **Risque :** Nul.
- **Bénéfice :** Les développeurs et agents disposeront d'exigences explicites pour le rate limiting et des références correctes vers la doc architecture.

---

## 5. PRD MVP Impact

- **Aucune réduction de scope.**
- **Ajouts :** Critères d'acceptation pour le rate limiting et références renforcées.
- Les seuils (10 req/min auth, 20 req/h share, 30 req/h upload) sont déjà documentés dans `rate-limiting.md` ; les stories les rendent désormais traçables.

---

## 6. High-Level Action Plan

1. **PM** : Appliquer les modifications du Sprint Change Proposal dans `docs/prd.md`.
2. **Développeur / Agent** : Lors de l'implémentation des Stories 1.3, 2.3, 2.9, 4.4, suivre `rate-limiting.md` §3 et brancher `checkRateLimit` aux emplacements indiqués.
3. **Développeur / Agent** : Pour les composants layout (Story 1.7), intégrer les tests a11y (jest-axe, Pa11y) selon `coding-standards.md` §7.

---

## 7. Agent Handoff

- **PM (John)** : Valide et applique les edits du PRD.
- **Architect** : Pas de replan ; la documentation est à jour.
- **Dev / Agent** : Implémentation des AC rate limiting et a11y lors des stories concernées.

---

_Document généré par l'agent PM (John) dans le cadre de l'alignement epics/stories avec la documentation architecture. Pour validation avant application dans `docs/prd.md`._
