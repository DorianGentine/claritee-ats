# Sprint Change Proposal — Préservation de la navbar existante

**Date :** 2026-02-15  
**Déclencheur :** Correct Course (change-checklist)  
**Mode :** Incrémental  
**Statut :** Soumis à approbation

---

## 1. Résumé du problème

Les stories précédentes (1.4, 1.5) ont déjà mis en place une **navbar** (`SiteNavbar` dans le layout root) avec : logo Claritee, lien « Mon espace », bouton Déconnexion, états auth (connexion / inscription).  
L’objectif est d’**éviter que ce travail soit perdu ou dupliqué** lors du développement des stories suivantes (1.6 Dashboard, 1.7 Base Layout & Navigation Shell). Sans clarification, un développeur pourrait interpréter « enrichir le shell » ou « ajouter header/nav » comme le fait de **créer une nouvelle barre** dans le dashboard et ainsi remplacer ou dupliquer la navbar existante.

---

## 2. Impact sur les epics

- **Epic 1 :** Aucun impact négatif. Les stories 1.6 et 1.7 restent dans le périmètre ; seule la **manière** d’implémenter (étendre l’existant) est précisée.
- **Epics 2–4 :** Aucun impact. Une seule navbar/layout cohérent évite les conflits futurs.
- **Story 1.7 :** À aligner sur la même règle lors de sa rédaction ou de sa prise en charge.

---

## 3. Artefacts impactés

| Artefact        | Action réalisée / proposée |
|-----------------|----------------------------|
| **Story 1.6**   | Modifications appliquées (Task 1 + Dev Notes) : préserver `SiteNavbar`, l’**étendre** (nom cabinet, liens nav, menu user) au lieu de la remplacer ou d’en créer une seconde. |
| **Story 1.7**   | Lors du draft ou de l’implémentation : ajouter en Dev Notes / Task 1 la même règle — **étendre le layout/navbar existant** (sidebar, a11y, 404, etc.) sans remplacer `SiteNavbar` ni dupliquer la barre. |
| PRD             | Aucune modification. |
| Architecture    | Aucune modification. |
| Frontend-arch.  | Optionnel : une phrase du type « Le layout authentifié étend la navbar existante (ex. SiteNavbar) plutôt que d’en créer une nouvelle. » |

---

## 4. Chemin retenu

**Option 1 — Ajustement direct.**  
Aucun rollback, aucun changement de scope MVP. Clarification dans les stories pour guider l’implémentation.

- **Effort :** Faible (texte des stories).
- **Travail perdu :** Aucun.
- **Risque :** Faible.
- **Pérennité :** Les prochaines stories (1.7 et au-delà) s’appuient sur un layout/navbar unique et cohérent.

---

## 5. Modifications proposées (détail)

### 5.1 Story 1.6 — Déjà appliqué

- **Task 1** : Libellé mis à jour pour préciser « **Préserver la navbar existante** (`SiteNavbar`) : ne pas la remplacer ni créer une seconde barre. **Étendre** ce composant (ou le layout dashboard) pour les pages authentifiées : nom du cabinet, liens de navigation, menu utilisateur. »
- **Dev Notes – Previous Story Insights** : Ajout d’un rappel explicite sur `SiteNavbar` (stories 1.4/1.5) et la consigne « ne pas remplacer ni dupliquer ; étendre ».

### 5.2 Story 1.7 — À faire lors du draft / prise en charge

Lors de la rédaction ou de l’implémentation de la story **1.7 (Base Layout & Navigation Shell)** :

- **Task 1 (ou équivalent)** : Inclure la consigne : « Préserver et étendre le layout/navbar existant (ex. `SiteNavbar`, `DashboardShell`). Ne pas remplacer ni recréer une nouvelle barre ; ajouter sidebar / comportement responsive / a11y / 404 sur la base du composant actuel. »
- **Dev Notes** : Rappeler que la navbar et le shell ont été mis en place en 1.4/1.5/1.6 ; la 1.7 affine (sidebar persistante, active state, a11y, 404) sans repartir de zéro.

*(Si un fichier `docs/stories/1.7.*.md` existe déjà, appliquer ces ajouts dedans.)*

---

## 6. Impact sur le MVP PRD

Aucun. Les objectifs et le scope du MVP restent inchangés.

---

## 7. Plan d’action

| Étape | Responsable | Action |
|-------|-------------|--------|
| 1 | Fait | Story 1.6 mise à jour (Task 1 + Dev Notes). |
| 2 | SM / Dev | Lors du draft de la story 1.7 : intégrer la règle « préserver / étendre » dans Task 1 et Dev Notes. |
| 3 | Dev | Implémentation 1.6 : étendre `SiteNavbar` (company name, nav links, user menu) sans la remplacer. |
| 4 | Dev | Implémentation 1.7 : étendre le layout existant (sidebar, a11y, 404) sans recréer la navbar. |

---

## 8. Handoff

- **PO/SM :** Utiliser ce document comme référence pour les prochaines stories (1.7 et au-delà) et pour les revues de story.
- **Dev :** Consulter la story 1.6 (et, le moment venu, la 1.7) pour la consigne « préserver / étendre » avant de toucher au layout ou à la navbar.
- **PM / Architecte :** Pas de handoff requis ; pas de changement de scope ni d’architecture.

---

## 9. Validation du changement

- **Critère de succès :** Après implémentation de la 1.6 (et de la 1.7), une seule navbar/layout cohérent ; le comportement actuel (logo, Mon espace, Déconnexion, états auth) est conservé et enrichi (nom cabinet, liens, menu user, etc.).
- **Revue :** Vérifier en revue de code que `SiteNavbar` (ou son équivalent) n’a pas été supprimé ni dupliqué par une nouvelle barre dans le shell.

---

*Document produit dans le cadre de la tâche Correct Course (change-checklist).*
