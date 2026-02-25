# Claritee ATS - Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- **Centraliser la gestion des candidats** : Permettre aux recruteurs de gérer tous leurs candidats depuis une seule plateforme, éliminant la fragmentation des outils (Excel, emails, notes papier)
- **Professionnaliser la communication client** : Offrir des fiches candidats partageables avec un layout professionnel type CV, en version normale et anonymisée
- **Accélérer le travail quotidien** : Réduire le temps de saisie et de recherche de candidats grâce à un système de tags et une interface fluide
- **Éviter les doublons de contact** : Permettre la collaboration multi-utilisateurs avec suivi des statuts pour coordonner les actions de l'équipe
- **Valider le concept sans investissement** : Créer un MVP fonctionnel avec budget zéro (Supabase, Vercel gratuits) pour tester l'adoption

### Background Context

Les cabinets de recrutement de petite et moyenne taille en France utilisent souvent une multitude d'outils fragmentés pour gérer leurs candidats et offres d'emploi. Cette fragmentation entraîne une perte de temps considérable, des candidats oubliés dans la masse, et des doublons de contact qui nuisent à l'image professionnelle du cabinet.

Les ATS existants sur le marché sont généralement trop chers, trop complexes ou non adaptés aux pratiques spécifiques des cabinets français (SIREN, fiches anonymisées pour prospection). Claritee ATS répond à ce besoin avec une solution gratuite, simple et professionnelle, conçue spécifiquement pour ce marché.

### Change Log

| Date       | Version | Description                                                                                                                                                                                                     | Author    |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 2026-01-24 | 1.0     | Initial PRD creation                                                                                                                                                                                            | John (PM) |
| 2026-01-24 | 1.1     | Added Data Model, User Flows, Testing Matrix, Observability, Error Messages                                                                                                                                     | John (PM) |
| 2026-02-14 | 1.2     | Repasse epics/stories : intégration livrables UX (wireframes, design-system) et Architecture ; références par epic et story ; Next Steps mis à jour                                                             | John (PM) |
| 2026-02-14 | 1.3     | Alignement epics/stories avec doc architecture : rate limiting (Stories 1.3, 1.4, 2.3, 2.9, 4.4), références frontend-architecture, rate-limiting, coding-standards, source-tree, tech-stack ; a11y (Story 1.7) | John (PM) |
| 2026-02-21 | 1.4     | Association offre d'emploi à un contact client (FR16b, modèle JobOffer + clientContactId, Stories 3.4 & 3.6)                                                                                                    | John (PM) |
| 2026-02-21 | 1.5     | Priorisation : Recherche (4.1, 4.2) et Notes (3.9, 3.11) avant Offres/Clients ; section Ordre de priorités, Next Steps                                                                                          | John (PM) |
| 2026-02-21 | 1.6     | Éditeur BlockNote pour les notes (Story 3.9) — retiré de Out of Scope                                                                                                                                           | John (PM) |

---

## Requirements

### Functional Requirements

**FR1:** Le système doit permettre l'inscription d'un utilisateur avec nom, prénom, email et mot de passe

**FR2:** Le système doit permettre la connexion/déconnexion sécurisée des utilisateurs

**FR3:** Le système doit permettre la création d'une entreprise (cabinet) avec raison sociale et SIREN unique

**FR4:** Le système doit permettre l'invitation de collaborateurs au cabinet via URL dédiée

**FR5:** Le système doit permettre la création de fiches candidats avec : nom, prénom, email, téléphone, LinkedIn, photo, titre, résumé, ville, langues

**FR6:** Le système doit permettre l'ajout d'expériences professionnelles sur une fiche candidat (titre, entreprise, dates début/fin, description)

**FR7:** Le système doit permettre l'ajout de formations sur une fiche candidat (intitulé, domaine, école, dates)

**FR8:** Le système doit permettre l'upload et le stockage d'un CV (fichier) associé à un candidat

**FR9:** Le système doit afficher les fiches candidats avec un layout type CV (header + 2 colonnes + section métier)

**FR10:** Le système doit permettre l'ajout de tags sur les candidats

**FR11:** Le système doit permettre la création d'offres d'emploi avec : titre, description, localisation, fourchette de salaire (min/max)

**FR12:** Le système doit permettre de définir un statut sur une offre d'emploi : "À faire", "En cours", "Terminé"

**FR13:** Le système doit permettre l'ajout de tags sur les offres d'emploi

**FR14:** Le système doit permettre la création d'entreprises clientes avec raison sociale et SIREN

**FR15:** Le système doit permettre l'ajout de contacts clients : nom, prénom, email, téléphone, poste, LinkedIn

**FR16:** Le système doit permettre l'association d'une offre d'emploi à une entreprise cliente

**FR16b:** Le système doit permettre l'association d'une offre d'emploi à un contact du client (optionnel)

**FR17:** Le système doit permettre l'association candidat + offre d'emploi avec un statut parmi : "Contacté sur LinkedIn", "Contact téléphonique", "Postulé", "Accepté", "Refusé par l'employeur", "Rejeté par le candidat"

**FR18:** Le système doit permettre l'ajout de notes partagées sur les fiches candidats

**FR19:** Le système doit permettre l'ajout de notes partagées sur les offres d'emploi

**FR20:** Le système doit offrir un mécanisme de prise de notes rapide accessible depuis n'importe quelle page (widget type chat, non bloquant)

**FR21:** Le système doit permettre les notes libres (non associées) et une page « Mes notes » pour les organiser et les déplacer vers candidats/offres

**FR22:** Le système doit permettre la recherche de candidats par nom, prénom, titre, résumé

**FR23:** Le système doit permettre la recherche d'offres par titre

**FR24:** Le système doit permettre le filtrage des offres par rémunération min/max, ville, tags

**FR25:** Le système doit permettre le filtrage des candidats et offres par tags

**FR26:** Le système doit permettre la génération d'une URL de partage pour une fiche candidat (version normale)

**FR27:** Le système doit permettre la génération d'une URL de partage anonymisée (sans nom, prénom, photo, contacts, noms d'entreprises et d'écoles)

**FR28:** Le système doit afficher les fiches partagées sur une page publique accessible sans connexion

### Non-Functional Requirements

**NFR1:** L'application doit utiliser exclusivement des services gratuits (Supabase free tier, Vercel free tier)

**NFR2:** Les données doivent être isolées par cabinet (multi-tenancy) - un cabinet ne peut voir que ses propres données

**NFR3:** Le temps de chargement initial de l'application doit être inférieur à 3 secondes

**NFR4:** Le temps de réponse des actions utilisateur doit être inférieur à 500ms

**NFR5:** L'application doit supporter au minimum 100 utilisateurs simultanés

**NFR6:** L'application doit être responsive sur desktop (Chrome, Firefox, Safari, Edge versions récentes)

**NFR7:** Les mots de passe doivent être hashés, jamais stockés en clair

**NFR8:** Toutes les communications doivent être en HTTPS

**NFR9:** L'application doit être conforme RGPD (données hébergées en EU, possibilité de suppression/export)

**NFR10:** Un nouveau cabinet doit pouvoir être créé et opérationnel en moins de 5 minutes

**NFR11:** Une fiche candidat complète doit pouvoir être créée en moins de 3 minutes

**NFR12:** Un candidat doit pouvoir être retrouvé via recherche/tags en moins de 30 secondes

**NFR13:** Une fiche candidat partageable doit pouvoir être générée en moins de 1 minute

### Standard Error Messages

| Situation                                 | Message utilisateur                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Inscription : email ou SIREN indisponible | "Cette combinaison n'est pas disponible. Utilisez un autre email ou un autre numéro SIREN."  |
| Identifiants invalides                    | "Email ou mot de passe incorrect."                                                           |
| Invitation expirée                        | "Cette invitation a expiré. Demandez une nouvelle invitation à votre administrateur."        |
| Invitation déjà utilisée                  | "Cette invitation a déjà été utilisée."                                                      |
| Lien partage expiré                       | "Ce lien de partage a expiré. Contactez le cabinet pour obtenir un nouveau lien."            |
| Lien partage invalide                     | "Ce lien de partage n'existe pas ou a été supprimé."                                         |
| Limite tags atteinte                      | "Maximum 20 tags par élément. Supprimez un tag existant pour en ajouter un nouveau."         |
| Fichier trop volumineux                   | "Le fichier dépasse la taille maximale autorisée (2 Mo pour les photos, 5 Mo pour les CVs)." |
| Format fichier invalide                   | "Format de fichier non supporté. Formats acceptés : [liste]."                                |
| Candidat déjà associé                     | "Ce candidat est déjà associé à cette offre."                                                |
| Champ requis manquant                     | "[Nom du champ] est requis."                                                                 |
| Format email invalide                     | "Veuillez entrer une adresse email valide."                                                  |
| Format SIREN invalide                     | "Le SIREN doit contenir exactement 9 chiffres."                                              |
| Trop de requêtes (rate limit)             | "Trop de requêtes. Réessayez dans quelques minutes."                                         |

### Out of Scope (MVP)

- Scraping/parsing automatique de CV
- Scraping/parsing LinkedIn
- Vue Kanban pour le suivi des candidats
- Envoi d'emails depuis la plateforme
- Système de compétences structurées (remplacement des tags)
- Timeline unifiée notes/statuts
- Matching intelligent basé sur NLP/IA
- Extension navigateur pour import LinkedIn
- API publique pour intégrations
- Gestion des rôles/permissions différenciés

---

## User Interface Design Goals

### Overall UX Vision

Claritee ATS vise une expérience utilisateur **simple, rapide et professionnelle**. L'interface doit être épurée et focalisée sur l'essentiel, évitant la surcharge fonctionnelle des ATS traditionnels. L'utilisateur (recruteur) doit pouvoir accomplir ses tâches quotidiennes en un minimum de clics, avec une courbe d'apprentissage quasi nulle.

L'application doit donner une impression de **"centre de contrôle"** où tout est accessible rapidement, permettant au recruteur de se concentrer sur son cœur de métier plutôt que sur l'outil.

### Key Interaction Paradigms

- **Navigation directe** : Accès rapide aux entités principales (Candidats, Offres, Clients) via une sidebar ou navigation principale permanente
- **Création fluide** : Formulaires de création optimisés avec validation en temps réel et autocomplétion où possible
- **Recherche omniprésente** : Barre de recherche globale accessible depuis toutes les pages
- **Notes rapides** : Bouton flottant (FAB) ou raccourci clavier pour créer une note depuis n'importe où sans quitter le contexte actuel
- **Tags visuels** : Système de tags colorés (couleurs auto-assignées) pour identifier rapidement les candidats et offres
- **Statuts clairs** : Indicateurs visuels de statut (badges, couleurs) pour suivre l'avancement des candidats par offre

### Core Screens and Views

1. **Dashboard** : Vue d'ensemble avec métriques clés (candidats récents, offres actives, actions en attente)
2. **Liste Candidats** : Vue tabulaire/cards avec recherche, filtres par tags, et accès rapide aux fiches
3. **Fiche Candidat** : Layout type CV avec header (photo, infos contact), 2 colonnes (expériences/formations), section notes et statuts par offre
4. **Liste Offres** : Vue avec statuts visuels (À faire/En cours/Terminé), filtres par rémunération, ville, tags
5. **Fiche Offre** : Détails de l'offre, client associé, liste des candidats liés avec leurs statuts
6. **Liste Clients** : Entreprises clientes avec leurs contacts et offres associées
7. **Page Partage Public** : Fiche candidat accessible sans connexion (version normale ou anonymisée)
8. **Gestion Cabinet** : Paramètres, invitation de collaborateurs, liste des membres

### Accessibility: WCAG AA

L'application doit respecter les standards WCAG AA pour garantir une accessibilité de base :

- Contraste suffisant entre texte et fond
- Navigation au clavier possible
- Labels et alt-text appropriés
- Focus visible sur les éléments interactifs

### Branding

L'application adoptera une identité visuelle **chaleureuse et professionnelle** basée sur l'illustration de référence fournie :

- **Palette de couleurs** :
  - **Fond** : Beige/crème chaleureux (#F5F0E8 approx.)
  - **Primaire / CTAs principaux** : Terracotta/rouille (#B85A3B approx.) - boutons d'action, liens importants, états actifs
  - **Secondaire / CTAs secondaires** : Vert sauge/teal (#5A7A6E approx.) - boutons secondaires, navigation, éléments de structure
  - **Surfaces** : Blanc cassé (#FDFCFA approx.) pour les cards et contenus
  - **Texte** : Noir/gris foncé pour lisibilité

- **Typographie** : Sans-serif moderne et lisible
- **Style** : Look & feel chaleureux, humain, inspiré de l'illustration (formes organiques, tons naturels)
- **Différenciation** : Cette palette se distingue des ATS traditionnels (bleus froids corporates) et renforce le positionnement "simple et humain" de Claritee

_Note: L'illustration de référence servira de base pour le Design System à créer par le UX Expert._

### Target Device and Platforms: Web Responsive (Desktop-first)

- **Priorité Desktop** : L'interface est conçue principalement pour une utilisation sur ordinateur (écrans >= 1024px)
- **Responsive de base** : L'application doit rester utilisable sur tablette, mais l'expérience mobile n'est pas prioritaire pour le MVP
- **Navigateurs supportés** : Chrome, Firefox, Safari, Edge (versions récentes)

### Key User Flows

**Flow 1: Onboarding Cabinet**

```
Landing Page → Inscription (form) → Création Company + User → Dashboard (vide) → Paramètres → Invitation collaborateurs → Copier URL
```

**Flow 2: Ajout et partage candidat**

```
Dashboard → Liste Candidats → Nouveau Candidat (form) → Fiche Candidat (création) → Ajout expériences → Ajout formations → Ajout tags → Partager → Choisir type (normal/anonyme) → Copier URL → Envoi au client
```

**Flow 3: Pipeline recrutement**

```
Liste Offres → Nouvelle Offre (form + client) → Fiche Offre → Associer Candidats (sélection multiple) → Modifier statuts candidats → Ajouter notes → Suivi pipeline
```

**Flow 4: Recherche et découverte**

```
N'importe quelle page → Barre recherche (Cmd+K) → Saisie requête → Résultats dropdown → Clic résultat → Fiche détail
                      → Liste Candidats → Filtres (tags, ville) → Liste filtrée → Fiche candidat
```

**Flow 5: Note rapide**

```
N'importe quelle page → FAB (ou Cmd+N) → Modal note → Saisie contenu → Association optionnelle (candidat/offre) → Enregistrer → Toast confirmation
```

---

## Technical Assumptions

### Repository Structure: Monorepo

Le projet utilisera une structure **Monorepo** avec frontend et backend dans le même repository.

**Rationale :**

- Partage facilité des types TypeScript entre frontend et backend
- Déploiement simplifié sur Vercel (un seul repo)
- Cohérence des versions et dépendances
- Adapté à une équipe d'un seul développeur

### Service Architecture

**Architecture Monolithique** avec les composants suivants :

| Composant       | Technologie                  | Justification                                        |
| --------------- | ---------------------------- | ---------------------------------------------------- |
| **Frontend**    | React + TypeScript + Next.js | Framework moderne, SSR/SSG, déploiement Vercel natif |
| **Backend/API** | tRPC                         | API type-safe de bout en bout, intégré à Next.js     |
| **ORM**         | Prisma                       | Typage TypeScript natif, migrations déclaratives     |
| **Database**    | PostgreSQL (Supabase)        | Instance dédiée gratuite, 500 Mo                     |
| **Auth**        | Supabase Auth                | Intégré à Supabase, gratuit, sessions sécurisées     |
| **Storage**     | Supabase Storage             | Stockage fichiers (CVs, photos), 1 Go gratuit        |
| **Hosting**     | Vercel                       | Déploiement automatique, serverless, gratuit         |

**Rationale :**

- Pas de microservices → complexité inutile pour un MVP avec un seul développeur
- tRPC intégré dans Next.js API routes → un seul déploiement
- Supabase Auth choisi car il unifie auth, DB et storage sous un même écosystème

### Testing Requirements

**Stratégie de test pour le MVP :**

| Type                  | Scope                                      | Outils suggérés            |
| --------------------- | ------------------------------------------ | -------------------------- |
| **Unit Tests**        | Fonctions utilitaires, logique métier      | Vitest                     |
| **Integration Tests** | API tRPC, interactions DB                  | Vitest + Prisma test utils |
| **E2E Tests**         | Parcours utilisateur critiques (optionnel) | Playwright                 |

**Priorité MVP :**

1. Tests unitaires sur la logique métier critique (validation SIREN, génération URLs partage)
2. Tests d'intégration sur les endpoints tRPC principaux
3. E2E optionnel - focus sur les happy paths critiques si temps disponible

**Testing Strategy Matrix:**

| Priorité | Type        | Scope                   | Exemples                                                                                          |
| -------- | ----------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| **P1**   | Unit        | Logique métier critique | Validation SIREN (9 digits), génération tokens partage (UUID), formatage dates, calcul expiration |
| **P1**   | Integration | Auth flow complet       | Register, login, logout, session persistence, protected routes                                    |
| **P1**   | Integration | CRUD Candidats          | Create, read, update, delete, RLS isolation                                                       |
| **P2**   | Integration | CRUD Offres             | Create, read, update, delete, association client                                                  |
| **P2**   | Integration | Candidatures            | Association candidat-offre, changement statut, dissociation                                       |
| **P2**   | Integration | Notes                   | Create, read, update (own), delete (own), association                                             |
| **P3**   | E2E         | Happy path principal    | Inscription → Création candidat → Ajout expérience → Partage → Vérification page publique         |
| **P3**   | E2E         | Pipeline recrutement    | Création offre → Association candidats → Changement statuts                                       |

### Additional Technical Assumptions and Requests

- **UI Components** : shadcn/ui (composants Radix + Tailwind)
- **Styling** : Tailwind CSS
- **State Management** : React Query (TanStack Query) intégré avec tRPC
- **Forms** : React Hook Form + Zod pour la validation côté client
- **Validation** : Zod partagé entre frontend (forms) et backend (tRPC inputs)
- **Icons** : Lucide React
- **Date Handling** : date-fns
- **Notes (éditeur riche)** : BlockNote ([blocknotejs.org](https://www.blocknotejs.org/docs)) — éditeur bloc-based type Notion pour les notes candidats/offres (texte, listes, titres). Contenu stocké en JSON en base. Intégré dans Story 3.9.
- **File Upload** : Upload direct vers Supabase Storage via SDK client
- **Environment** : Variables d'environnement pour les clés Supabase
- **Code Quality** : ESLint + Prettier, TypeScript strict mode
- **Git Workflow** : Main branch protégée, feature branches

### Observability Requirements

| Métrique               | Seuil d'alerte  | Action                             |
| ---------------------- | --------------- | ---------------------------------- |
| Temps de réponse API   | > 500ms (P95)   | Alert → Investigation              |
| Taux d'erreurs 5xx     | > 1% sur 5 min  | Alert → Investigation immédiate    |
| Taux d'erreurs 4xx     | > 10% sur 5 min | Warning → Review logs              |
| Espace DB utilisé      | > 400 Mo        | Warning (limite free tier: 500 Mo) |
| Espace Storage utilisé | > 800 Mo        | Warning (limite free tier: 1 Go)   |
| Bandwidth Vercel       | > 80 Go/mois    | Warning (limite: 100 Go)           |

**Outils de monitoring (gratuits) :**

- Vercel Analytics : Performance frontend, Core Web Vitals
- Supabase Dashboard : Métriques DB, requêtes lentes, storage
- Vercel Logs : Logs serverless functions, erreurs

**Métriques business à tracker :**

- Cabinets actifs (connexion < 7 jours)
- Candidats créés / cabinet
- Offres créées / cabinet
- Fiches partagées / mois
- Taux de rétention J7

---

## Data Model Overview

Cette section présente les entités principales identifiées. Le schéma Prisma détaillé sera créé par l'Architect.

### Entités principales

```
Company
├── id (UUID, PK)
├── name (String)
├── siren (String, unique)
├── createdAt (DateTime)
└── updatedAt (DateTime)

User
├── id (UUID, PK)
├── email (String, unique)
├── firstName (String)
├── lastName (String)
├── companyId (FK → Company)
└── createdAt (DateTime)

Invitation
├── id (UUID, PK)
├── email (String)
├── token (String, unique)
├── companyId (FK → Company)
├── expiresAt (DateTime)
└── usedAt (DateTime, nullable)

Candidate
├── id (UUID, PK)
├── firstName (String)
├── lastName (String)
├── email (String, nullable)
├── phone (String, nullable)
├── linkedinUrl (String, nullable)
├── title (String, nullable)
├── city (String, nullable)
├── summary (String, nullable)
├── photoUrl (String, nullable)
├── cvUrl (String, nullable)
├── companyId (FK → Company)
├── createdAt (DateTime)
└── updatedAt (DateTime)

Experience
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── title (String)
├── company (String)
├── startDate (DateTime)
├── endDate (DateTime, nullable)
├── description (String, nullable)
└── order (Int)

Formation
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── degree (String)
├── field (String, nullable)
├── school (String)
├── startDate (DateTime, nullable)
├── endDate (DateTime, nullable)
└── order (Int)

Language
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── name (String)
└── level (Enum: NOTION, INTERMEDIATE, FLUENT, BILINGUAL, NATIVE)

Tag
├── id (UUID, PK)
├── name (String)
├── color (String)
└── companyId (FK → Company)
(Unique constraint: name + companyId)

CandidateTag (Many-to-Many)
├── candidateId (FK → Candidate)
└── tagId (FK → Tag)

ClientCompany
├── id (UUID, PK)
├── name (String)
├── siren (String, nullable)
├── companyId (FK → Company)
├── createdAt (DateTime)
└── updatedAt (DateTime)

ClientContact
├── id (UUID, PK)
├── clientCompanyId (FK → ClientCompany)
├── firstName (String)
├── lastName (String)
├── email (String, nullable)
├── phone (String, nullable)
├── position (String, nullable)
├── linkedinUrl (String, nullable)
└── createdAt (DateTime)

JobOffer
├── id (UUID, PK)
├── title (String)
├── description (String, nullable)
├── location (String, nullable)
├── salaryMin (Int, nullable)
├── salaryMax (Int, nullable)
├── status (Enum: TODO, IN_PROGRESS, DONE)
├── clientCompanyId (FK → ClientCompany, nullable)
├── clientContactId (FK → ClientContact, nullable)
├── companyId (FK → Company)
├── createdAt (DateTime)
└── updatedAt (DateTime)

OfferTag (Many-to-Many)
├── offerId (FK → JobOffer)
└── tagId (FK → Tag)

Candidature
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── offerId (FK → JobOffer)
├── status (Enum: CONTACTED_LINKEDIN, PHONE_CONTACT, APPLIED, ACCEPTED, REJECTED_BY_EMPLOYER, REJECTED_BY_CANDIDATE)
├── createdAt (DateTime)
└── updatedAt (DateTime)
(Unique constraint: candidateId + offerId)

Note
├── id (UUID, PK)
├── content (String)
├── authorId (FK → User)
├── candidateId (FK → Candidate, nullable)
├── offerId (FK → JobOffer, nullable)
├── companyId (FK → Company)
├── createdAt (DateTime)
└── updatedAt (DateTime)

ShareLink
├── id (UUID, PK)
├── candidateId (FK → Candidate)
├── token (String, unique)
├── type (Enum: NORMAL, ANONYMOUS)
├── expiresAt (DateTime, nullable)
└── createdAt (DateTime)
```

### Relations clés

- **Company → Users** : 1-N (un cabinet a plusieurs utilisateurs)
- **Company → Candidates** : 1-N (isolation multi-tenant)
- **Candidate → Experiences/Formations/Languages** : 1-N
- **Candidate ↔ Tags** : N-N via CandidateTag
- **JobOffer ↔ Tags** : N-N via OfferTag
- **Candidate ↔ JobOffer** : N-N via Candidature (avec statut)
- **ClientCompany → ClientContacts** : 1-N
- **ClientCompany → JobOffers** : 1-N (optionnel)
- **JobOffer → ClientContact** : N-1 optionnel (contact référent pour l'offre)

---

## Epic List

### Références livrables UX & Architecture

Les epics et stories s’appuient sur les livrables suivants ; les critères d’acceptation doivent être alignés avec ces références :

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

| #          | Epic                          | Goal Statement                                                                                                                                                  |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Epic 1** | Foundation & Authentification | Établir l'infrastructure projet (Next.js, Prisma, Supabase) et implémenter l'authentification complète avec création de cabinet et invitation de collaborateurs |
| **Epic 2** | Gestion des Candidats         | Permettre la création, consultation et gestion complète des fiches candidats avec expériences, formations, CV, tags et layout professionnel type CV             |
| **Epic 3** | Offres, Clients & Pipeline    | Gérer les offres d'emploi et entreprises clientes, et permettre le suivi des candidats par offre avec statuts et notes partagées                                |
| **Epic 4** | Recherche, Filtres & Partage  | Implémenter la recherche/filtrage des candidats et offres, et permettre le partage de fiches candidats (normales et anonymisées) via URLs publiques             |

### Ordre de priorités de développement

L'ordre de développement recommandé privilégie la **recherche** et la **gestion des notes** avant les onglets Offres et Clients :

| Phase | Focus                      | Stories                                                                                                                                   |
| ----- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Foundation                 | Epic 1 (1.1 → 1.7)                                                                                                                        |
| **2** | Candidats                  | Epic 2 (2.1 → 2.10)                                                                                                                       |
| **3** | **Recherche & Notes**      | 4.1 Barre de recherche globale, 4.2 Filtres liste candidats, 3.9 Notes sur candidats, 3.11 Widget note rapide (chat), 3.12 Page Mes notes |
| **4** | Offres, Clients & Pipeline | Epic 3 (3.1 → 3.8, 3.10) + 4.3 Filtres offres                                                                                             |
| **5** | Partage & finalisation     | 4.4 → 4.8 (Partage, Dashboard final, Paramètres)                                                                                          |

_Les onglets Offres et Clients (3.1–3.8) peuvent être désactivés ou masqués en navigation tant que la phase 4 n’est pas engagée._

---

## Epic 1: Foundation & Authentification

**Réf. wireframes :** Layout global (shell), §1 Dashboard, §9 Paramètres — **Réf. architecture :** §1–4, §6 (structure `src/app/(auth)`, `(dashboard)`), §7 (Auth), §9 (routers auth, company, invitation) ; frontend-architecture (routing §2, état §3) ; rate-limiting.md ; coding-standards (template router §3.1, pièges §5.1).

### Epic Goal

Établir l'infrastructure technique du projet (Next.js, Prisma, Supabase, CI/CD) et implémenter l'authentification complète avec création de cabinet, invitation de collaborateurs, et un Dashboard d'accueil fonctionnel. À la fin de cet epic, un cabinet peut être créé, des collaborateurs invités, et tous les utilisateurs voient un Dashboard (même vide).

### Story 1.1: Project Setup & Infrastructure

**As a** developer,  
**I want** a fully configured Next.js monorepo with Prisma, Supabase, and deployment pipeline,  
**so that** I have a solid foundation to build features upon.

**Acceptance Criteria:**

1. Next.js 16 App Router project with React 19.2, initialized with TypeScript strict mode
2. Prisma configured with Supabase PostgreSQL connection
3. tRPC configured with Next.js API routes
4. Supabase client SDK configured (auth + storage)
5. Tailwind CSS + shadcn/ui base components installed
6. ESLint + Prettier configured with strict rules
7. Environment variables properly configured (.env.local, .env.example)
8. Project deployable to Vercel with successful build
9. Basic health check route (`/api/health`) returns 200 OK
10. Git repository initialized with proper .gitignore

**Réf.** Architecture §1–2 (stack), §6 (structure monorepo `src/app`, `src/server`, `src/lib`).

### Story 1.2: Database Schema & Multi-tenancy Foundation

**As a** developer,  
**I want** the core database schema with multi-tenancy support,  
**so that** each cabinet's data is properly isolated.

**Acceptance Criteria:**

1. Prisma schema defines `Company` model (id, name, siren, createdAt, updatedAt)
2. Prisma schema defines `User` model (id, email, firstName, lastName, password, companyId, createdAt)
3. Prisma schema defines `Invitation` model (id, email, companyId, token, expiresAt, usedAt)
4. SIREN field has unique constraint on Company
5. Foreign key relationship User → Company established
6. Supabase Row Level Security (RLS) policies configured for Company isolation
7. Database migrations created and applied successfully
8. Seed script available for development data

**Réf.** Architecture §4 (RLS, companyId), §5 (schéma Prisma Company, User, Invitation), `prisma/schema.prisma` et `docs/architecture/rls-policies.sql`.

### Story 1.3: User Registration & Company Creation

**As a** new user,  
**I want** to register with my information and create my company,  
**so that** I can start using the platform.

**Acceptance Criteria:**

1. Registration page with form: firstName, lastName, email, password, companyName, siren
2. Email format validation (client + server)
3. Password minimum requirements enforced (8+ chars)
4. SIREN format validation (9 digits)
5. SIREN uniqueness check with clear error message if already taken
6. Successful registration creates User + Company in single transaction
7. User automatically logged in after registration
8. Redirect to Dashboard after successful registration
9. Form shows loading state during submission
10. Error messages displayed clearly for all validation failures
11. Rate limiting appliqué sur l'inscription : max 10 requêtes par IP par minute ; en cas de dépassement, afficher le message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `docs/architecture/rate-limiting.md` §3.1, `src/lib/rate-limit.ts`)

**Réf.** Architecture §7 (flux inscription, création Company + User), validations Zod (SIREN, email) ; rate-limiting.md §3.1 (auth par IP).

### Story 1.4: User Login & Logout

**As a** registered user,  
**I want** to login and logout securely,  
**so that** I can access my cabinet's data.

**Acceptance Criteria:**

1. Login page with email + password form
2. Supabase Auth used for session management
3. Invalid credentials show generic error message (security)
4. Successful login redirects to Dashboard
5. Session persisted across browser refresh
6. Logout button accessible from any authenticated page
7. Logout clears session and redirects to login page
8. Protected routes redirect to login if not authenticated
9. Rate limiting : Supabase Auth applique des limites côté service ; l'app peut compléter par un rate limit par IP sur les routes auth (login/register) via le proxy Next.js (`src/proxy.ts`) si souhaité — sinon couvert par Story 1.3 pour l'inscription.

**Réf.** Architecture §7 (connexion Supabase Auth, proxy Next.js sur routes protégées) ; rate-limiting.md §3.1 (auth par IP, inscription prioritaire).

### Story 1.5: Collaborator Invitation System

**As a** cabinet admin,  
**I want** to invite collaborators via a dedicated URL,  
**so that** my team can access our shared data.

**Acceptance Criteria:**

1. "Invite Collaborator" button on settings/team page
2. Invitation creates unique token URL (e.g., `/invite/[token]`)
3. Invitation email field required, stored in Invitation table
4. Invitation expires after 7 days
5. Invitation URL displays registration form (pre-filled email)
6. Invited user creates account and is auto-assigned to the inviting Company
7. Invitation marked as used after successful registration
8. Expired/used invitations show appropriate error message
9. Admin can see list of pending invitations
10. Admin can revoke pending invitations

_Note: Email sending not included - URL generation only (admin shares manually)_

**Réf.** Architecture §7.3 (Invitation), router `invitation` ; wireframes §9 Paramètres (équipe, invitations).

### Story 1.6: Dashboard Home Page

**As a** logged-in user,  
**I want** to see a Dashboard with key metrics and quick actions,  
**so that** I have an overview of my cabinet's activity.

**Acceptance Criteria:**

1. Dashboard is the default page after login
2. Displays company name in header/navigation
3. Shows placeholder cards for future metrics: "Candidats", "Offres actives", "Clients"
4. Cards show "0" count initially (empty state)
5. Quick action buttons: "Nouveau candidat", "Nouvelle offre" (disabled/coming soon for now)
6. Navigation sidebar/header with links: Dashboard, Candidats, Offres, Clients (Candidats/Offres/Clients disabled for now)
7. User menu with: profile info, logout button
8. Responsive layout (desktop-first, basic tablet support)
9. Applies the branding color palette (beige background, terracotta accents, sage green secondary)
10. Empty state message encouraging user to start adding data

**Réf.** Wireframes §1 Dashboard (métriques, actions rapides, candidats récents, notes récentes) ; Design System §2 (palette, cards `--card`), §4 (espacement).

### Story 1.7: Base Layout & Navigation Shell

**As a** user,  
**I want** a consistent navigation and layout across all pages,  
**so that** I can easily navigate the application.

**Acceptance Criteria:**

1. Persistent sidebar or top navigation on all authenticated pages
2. Navigation items: Dashboard, Candidats, Offres, Clients, Paramètres
3. Active page highlighted in navigation
4. Company name displayed in navigation area
5. User avatar/initials + name in navigation
6. Logout accessible from user menu
7. Layout applies consistent spacing, typography, colors from brand palette
8. Mobile-responsive navigation (hamburger menu or collapsible sidebar)
9. Loading states for page transitions
10. 404 page styled consistently with app design
11. Les composants du layout (sidebar, header, navigation) sont testés pour l'accessibilité selon `coding-standards.md` §7 (jest-axe, Pa11y sur écrans critiques) ; violations WCAG AA corrigées.

**Réf.** Wireframes « Layout global (shell) » ; Design System (typo, couleurs, composants layout) ; coding-standards §7 (a11y : jest-axe, Pa11y).

---

## Epic 2: Gestion des Candidats

**Réf. wireframes :** §2 Liste Candidats, §3 Fiche Candidat (layout CV) — **Réf. architecture :** §5 (Candidate, Experience, Formation, Language, Tag), §8 (Storage photos/cvs), §9 (router candidate).

### Epic Goal

Permettre la création, consultation, modification et suppression complète des fiches candidats avec toutes leurs informations (expériences, formations, langues), upload de CV, système de tags, et affichage avec un layout professionnel type CV. À la fin de cet epic, un recruteur peut gérer sa base de candidats de manière complète.

### Story 2.1: Candidate List Page

**As a** recruiter,  
**I want** to see a list of all my cabinet's candidates,  
**so that** I can browse and access candidate profiles.

**Acceptance Criteria:**

1. Candidates page accessible from main navigation
2. Displays list of candidates as cards or table rows
3. Each candidate shows: photo (or initials placeholder), full name, title, city
4. List sorted by most recently created by default
5. Empty state with illustration and "Ajouter un candidat" CTA
6. "Nouveau candidat" button prominently displayed (terracotta CTA)
7. Click on candidate navigates to candidate detail page
8. List only shows candidates from user's company (RLS enforced)
9. Pagination or infinite scroll for large lists (>20 candidates)
10. Loading skeleton while fetching data

**Réf.** Wireframes §2 Liste Candidats (recherche, filtres Tags/Ville, cartes photo + nom + titre + ville, max 3 tags, pagination 20/page) ; Design System (cards, bouton terracotta).

### Story 2.2: Create Candidate - Basic Information

**As a** recruiter,  
**I want** to create a new candidate with basic information,  
**so that** I can start building their profile.

**Acceptance Criteria:**

1. "Nouveau candidat" opens creation form (modal or dedicated page)
2. Form fields: firstName*, lastName*, email, phone, linkedinUrl, title, city
3. Required fields marked with asterisk, validated on submit
4. Email format validation if provided
5. LinkedIn URL format validation if provided (linkedin.com/in/...)
6. Phone format flexible (accepts various French formats)
7. Successful creation redirects to candidate detail page
8. Candidate associated with user's company automatically
9. Form shows loading state during submission
10. Cancel button returns to candidate list without saving

**Réf.** Architecture §8 (Storage bucket `photos`, path `{companyId}/candidates/{candidateId}/`), validations Zod.

### Story 2.3: Candidate Profile Photo Upload

**As a** recruiter,  
**I want** to upload a photo for a candidate,  
**so that** their profile is visually identifiable.

**Acceptance Criteria:**

1. Photo upload available on candidate creation and edit forms
2. Accepts image formats: JPG, PNG, WebP
3. File size limit: 2 MB max with clear error message
4. Image uploaded to Supabase Storage in company-specific folder
5. Image URL stored in candidate record
6. Preview shown after upload, before form submission
7. Option to remove/replace existing photo
8. Default placeholder (initials) shown when no photo
9. Photos served via Supabase CDN URL
10. Circular crop/display of photo in UI
11. Rate limiting sur les uploads : max 30 uploads (photo + CV combinés) par utilisateur par heure ; en cas de dépassement, message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `rate-limiting.md` §3.3)

**Réf.** Architecture §8 bucket `photos`, path `{companyId}/candidates/{candidateId}/`, max 2 Mo ; rate-limiting.md §3.3 (upload par userId) ; wireframes §3.

### Story 2.4: Candidate Detail Page - CV Layout

**As a** recruiter,  
**I want** to view a candidate's full profile in a professional CV-style layout,  
**so that** I can review all their information at a glance.

**Acceptance Criteria:**

1. Candidate detail page with professional CV-inspired layout
2. **Header section:** Photo, full name, title, city, contact info (email, phone, LinkedIn)
3. **Two-column layout below header:**
   - Left column (narrow): Languages, tags, summary/résumé
   - Right column (wide): Experiences, formations
4. "Modifier" button to edit candidate information
5. "Supprimer" button with confirmation modal
6. Back navigation to candidate list
7. Responsive layout (stacks to single column on smaller screens)
8. Applies branding colors (beige background, terracotta accents)
9. Print-friendly styling (optional but nice to have)
10. Loading state while fetching candidate data

**Réf.** Wireframes §3 Fiche Candidat : header (photo 80px, nom, titre, ville, contacts), 2 colonnes (gauche 30 % : langues, tags, résumé, CV ; droite 70 % : expériences, formations), offres associées, notes ; Design System (palette, typo).

### Story 2.5: Candidate Summary & Languages

**As a** recruiter,  
**I want** to add a summary and languages to a candidate profile,  
**so that** I can capture their overview and language skills.

**Acceptance Criteria:**

1. "Résumé" field: multi-line textarea (500 chars max recommended)
2. Languages section with add/remove capability
3. Each language entry: language name + proficiency level
4. Proficiency levels: Notions, Intermédiaire, Courant, Bilingue, Natif
5. Common languages pre-suggested: Français, Anglais, Espagnol, Allemand, Italien
6. Custom language entry allowed
7. Languages displayed as badges/pills in CV layout
8. Edit inline or via edit form
9. Changes saved with explicit save action
10. Validation: at least language name required per entry

**Réf.** Wireframes §3 colonne gauche (langues en badges), résumé 500 caractères ; schéma Prisma Language.

### Story 2.6: Candidate Experiences (CRUD)

**As a** recruiter,  
**I want** to add, edit, and remove professional experiences on a candidate profile,  
**so that** I can document their career history.

**Acceptance Criteria:**

1. Experiences section on candidate detail page
2. "Ajouter une expérience" button
3. Experience form fields: title*, company*, startDate\*, endDate (optional = current), description
4. Date picker for start/end dates (month + year)
5. "Poste actuel" checkbox auto-clears endDate
6. Plain text for description (textarea)
7. Experiences displayed in reverse chronological order
8. Edit button on each experience opens edit form
9. Delete button with confirmation
10. Empty state: "Aucune expérience ajoutée"

### Story 2.7: Candidate Formations (CRUD)

**As a** recruiter,  
**I want** to add, edit, and remove education/formations on a candidate profile,  
**so that** I can document their academic background.

**Acceptance Criteria:**

1. Formations section on candidate detail page
2. "Ajouter une formation" button
3. Formation form fields: degree/title*, field/domain, school*, startDate, endDate
4. Date picker for dates (year, optionally month)
5. Formations displayed in reverse chronological order
6. Edit button on each formation opens edit form
7. Delete button with confirmation
8. School name with optional location
9. Empty state: "Aucune formation ajoutée"
10. Displayed in right column of CV layout, below experiences

**Réf.** Wireframes §3 colonne droite (expériences puis formations, ordre chrono inversé).

### Story 2.8: Candidate Tags System

**As a** recruiter,  
**I want** to add and remove tags on candidates,  
**so that** I can categorize and later filter them.

**Acceptance Criteria:**

1. Tags section visible on candidate detail page (left column)
2. "Ajouter un tag" input with autocomplete from existing tags
3. Create new tag on-the-fly if not exists
4. Tags scoped to company (each company has its own tag library)
5. Tags displayed as colored badges/chips (colors auto-assigned)
6. Click X on tag to remove from candidate
7. Tag colors auto-assigned from palette
8. Maximum 20 tags per candidate (reasonable limit)
9. Tags searchable and filterable (foundation for Epic 4)
10. Tag model in database: id, name, color, companyId

**Réf.** Design System §2 « Palette de tags » (couleurs auto-assignées, cycle hash % 8) ; wireframes §3 (badges tags, « + Ajouter »).

### Story 2.9: Candidate CV File Upload

**As a** recruiter,  
**I want** to upload a candidate's CV file,  
**so that** I can keep their original document on file.

**Acceptance Criteria:**

1. CV upload section on candidate detail page
2. Accepts PDF, DOC, DOCX formats
3. File size limit: 5 MB max
4. File uploaded to Supabase Storage (company/candidates/[id]/)
5. File URL stored in candidate record
6. Download link displayed after upload
7. File name displayed (original filename preserved)
8. Option to replace existing CV
9. Option to delete CV
10. Preview not required for MVP (just download link)
11. Rate limiting sur les uploads : max 30 uploads (photo + CV combinés) par utilisateur par heure ; en cas de dépassement, message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `rate-limiting.md` §3.3)

**Réf.** Architecture §8 bucket `cvs`, path `{companyId}/candidates/{candidateId}/`, max 5 Mo ; rate-limiting.md §3.3 (upload par userId) ; wireframes §3 « CV: doc.pdf 📥 ».

### Story 2.10: Edit Candidate - Full Form

**As a** recruiter,  
**I want** to edit all candidate information from a single form,  
**so that** I can make comprehensive updates efficiently.

**Acceptance Criteria:**

1. "Modifier" button on candidate detail opens edit mode/form
2. All basic fields editable: name, email, phone, LinkedIn, title, city, summary
3. Photo changeable from edit form
4. Languages editable inline
5. Experiences and formations editable via their respective sub-forms
6. Tags editable from edit form
7. CV replaceable from edit form
8. "Enregistrer" saves all changes
9. "Annuler" discards changes and returns to view mode
10. Validation errors prevent save and highlight problematic fields

**Réf.** Wireframes §3 actions Modifier (outline), Supprimer (destructive) ; formulaire cohérent avec création et sous-formulaires expériences/formations/langues/tags.

---

## Epic 3: Offres, Clients & Pipeline

**Réf. wireframes :** §4 Liste Offres, §5 Fiche Offre, §6 Liste Clients, §7 Fiche Client, modals « Note rapide » et « Partager » — **Réf. architecture :** §5 (JobOffer, ClientCompany, ClientContact, Candidature, Note), §9 (routers offer, client, note).

### Epic Goal

Permettre la gestion complète des offres d'emploi et des entreprises clientes, ainsi que le suivi des candidats par offre via un système de statuts. Implémenter également les notes partagées sur les candidats et les offres. À la fin de cet epic, un recruteur peut gérer son pipeline de recrutement complet.

### Story 3.1: Client Company List & Creation

**As a** recruiter,  
**I want** to manage my client companies,  
**so that** I can associate job offers with the right clients.

**Acceptance Criteria:**

1. Clients page accessible from main navigation
2. Displays list of client companies as cards or table
3. Each client shows: company name, SIREN, number of contacts, number of offers
4. "Nouveau client" button (terracotta CTA)
5. Creation form: companyName\*, siren (optional for clients)
6. SIREN format validation if provided
7. Click on client navigates to client detail page
8. Empty state: "Aucun client ajouté"
9. List scoped to user's company (RLS)
10. Loading state while fetching

**Réf.** Wireframes §6 Liste Clients (carte raison sociale, SIREN, compteurs contacts/offres, « Nouveau client ») ; router `client`.

### Story 3.2: Client Contacts Management

**As a** recruiter,  
**I want** to add contacts to my client companies,  
**so that** I can track who I interact with at each client.

**Acceptance Criteria:**

1. Contacts section on client detail page
2. "Ajouter un contact" button
3. Contact form: firstName*, lastName*, email, phone, position/title, linkedinUrl
4. Email and LinkedIn format validation
5. Contacts displayed as list/cards on client page
6. Edit button on each contact
7. Delete contact with confirmation
8. Contact associated with client company (foreign key)
9. Empty state: "Aucun contact ajouté"
10. Quick action: click email/phone to copy to clipboard

**Réf.** Wireframes §7 Fiche Client (section Contacts, modal Ajouter/Modifier contact, champs, icône copier 📋) ; Design System (boutons outline).

### Story 3.3: Job Offer List Page

**As a** recruiter,  
**I want** to see all my job offers,  
**so that** I can manage my open positions.

**Acceptance Criteria:**

1. Offers page accessible from main navigation
2. Displays list of offers as cards
3. Each offer shows: title, client company name, location, salary range, status badge
4. Status badges with distinct colors: "À faire" (gray), "En cours" (blue/sage), "Terminé" (green)
5. "Nouvelle offre" button (terracotta CTA)
6. Click on offer navigates to offer detail page
7. Empty state: "Aucune offre créée"
8. List scoped to user's company (RLS)
9. Sort by: date created (default), status
10. Loading state while fetching

**Réf.** Wireframes §4 Liste Offres (filtres Statut/Tags/Salaire/Client, cartes titre + client + localisation + fourchette salaire, badges statut) ; Design System §2 statuts offre (À faire / En cours / Terminé).

### Story 3.4: Create & Edit Job Offer

**As a** recruiter,  
**I want** to create and edit job offers,  
**so that** I can document open positions.

**Acceptance Criteria:**

1. "Nouvelle offre" opens creation form
2. Form fields: title\*, description (textarea), location, salaryMin, salaryMax, status, clientCompanyId, clientContactId
3. Client company dropdown populated from existing clients
4. Contact dropdown populated from contacts of selected client (optionnel ; si pas de client sélectionné, masqué ou vide)
5. Option to create offer without client (client optional)
6. Status dropdown: "À faire", "En cours", "Terminé" (default: "À faire")
7. Salary fields accept numbers (€, annual)
8. Description plain text (multi-line)
9. Edit form pre-populates existing data
10. Delete offer with confirmation (cascade deletes candidatures)
11. Validation: title required (contact référent optionnel)

**Réf.** Router `offer` (create, update, delete), schéma Prisma JobOffer, ClientCompany (optionnel).

### Story 3.5: Job Offer Tags

**As a** recruiter,  
**I want** to add tags to job offers,  
**so that** I can categorize and filter them.

**Acceptance Criteria:**

1. Tags section on offer detail page
2. Same tag system as candidates (shared tag library per company)
3. Add tag via autocomplete input
4. Create new tag if not exists
5. Remove tag by clicking X
6. Tags displayed as colored badges
7. Maximum 20 tags per offer
8. Tags will be filterable in Epic 4
9. Reuses Tag model from Story 2.8
10. Tags displayed on offer list cards (max 3 visible, +N more)

**Réf.** Design System palette tags ; wireframes §4 (tags sur carte offre).

### Story 3.6: Job Offer Detail Page

**As a** recruiter,  
**I want** to see full details of a job offer including linked candidates,  
**so that** I can manage the recruitment pipeline for that position.

**Acceptance Criteria:**

1. Offer detail page with header: title, status badge, client company (linked), contact référent (si défini)
2. Details section: description, location, salary range, tags, contact client (nom, email, téléphone avec lien copier)
3. "Modifier" and "Supprimer" buttons
4. **Candidats section:** List of candidates linked to this offer with their status
5. Candidate entries show: photo, name, title, status badge
6. Click on candidate opens candidate detail (or modal)
7. "Associer un candidat" button to link existing candidates
8. Empty candidats state: "Aucun candidat associé"
9. Quick status change dropdown on each candidate row
10. Count of candidates per status displayed

**Réf.** Wireframes §5 Fiche Offre (header titre/client/salaire/tags, description, section Candidats associés avec photo/nom/titre/dropdown statut/Dissocier, Notes).

### Story 3.7: Candidate-Offer Association (Candidature)

**As a** recruiter,  
**I want** to associate candidates with job offers,  
**so that** I can track which candidates are being considered for which positions.

**Acceptance Criteria:**

1. "Associer un candidat" on offer page opens candidate selector
2. Candidate selector: search/filter from company's candidate list
3. Select one or multiple candidates to associate
4. Each association creates a "Candidature" record with default status
5. Default status: "Contacté sur LinkedIn"
6. Cannot associate same candidate twice to same offer (unique constraint)
7. Association visible on both offer detail and candidate detail pages
8. Candidature model: id, candidateId, offerId, status, createdAt, updatedAt
9. Association date tracked
10. Bulk association possible (select multiple candidates)

**Réf.** Architecture §5 (Candidature), §9 router offer (candidatures) ; wireframes §5 bouton « Associer ».

### Story 3.8: Candidature Status Management

**As a** recruiter,  
**I want** to update the status of a candidate for a specific offer,  
**so that** I can track their progress in the pipeline.

**Acceptance Criteria:**

1. Status dropdown on candidature row (offer detail page)
2. Available statuses: "Contacté sur LinkedIn", "Contact téléphonique", "Postulé", "Accepté", "Refusé par l'employeur", "Rejeté par le candidat"
3. Status change saved immediately (optimistic UI)
4. Status change updates `updatedAt` timestamp
5. Status badges with distinct colors for visual clarity
6. Status history not tracked in MVP (only current status)
7. Status visible on candidate detail page (per offer)
8. Dissociate candidate from offer (remove candidature) with confirmation
9. Candidate can have different statuses on different offers
10. Filter candidates by status on offer detail page (basic)

**Réf.** Design System §2 « Statuts candidature » (6 valeurs avec couleurs fond/texte) ; wireframes §5 dropdown statut par candidat, bouton Dissocier.

### Story 3.9: Notes on Candidates

**As a** recruiter,  
**I want** to add notes on candidate profiles,  
**so that** I can document interactions and observations.

**Acceptance Criteria:**

1. Notes section on candidate detail page
2. "Ajouter une note" button or inline input
3. Note content: éditeur riche BlockNote (blocs texte, listes, titres — inspiration Notion)
4. Note metadata: author (user), createdAt timestamp
5. Notes displayed in reverse chronological order (newest first)
6. Author name displayed on each note
7. Edit own notes only (not others')
8. Delete own notes with confirmation
9. Notes visible to all company users (shared)
10. Empty state: "Aucune note"

### Story 3.10: Notes on Job Offers

**As a** recruiter,  
**I want** to add notes on job offers,  
**so that** I can document client requirements and updates.

**Acceptance Criteria:**

1. Notes section on offer detail page
2. Same note system as candidates (reuse Note model)
3. "Ajouter une note" input
4. Note content: plain text
5. Note metadata: author, createdAt
6. Reverse chronological order
7. Edit/delete own notes only
8. Notes visible to all company users
9. Note model: id, content, authorId, candidateId (nullable), offerId (nullable), companyId, createdAt
10. Empty state: "Aucune note"

**Réf.** Wireframes §5 section Notes ; router `note` (offerId).

### Story 3.11: Quick Note Widget (type chat)

**As a** recruiter,  
**I want** to quickly create and edit notes from anywhere via a floating widget,  
**so that** I can capture information without blocking navigation.

**Acceptance Criteria:**

1. Bouton flottant visible sur toutes les pages authentifiées
2. Bouton positionné bas-droite, style terracotta
3. Clic ouvre un panneau type chat widget (non bloquant, navigation possible)
4. Le widget reste ouvert et conserve son état lors de la navigation
5. Zone de saisie : éditeur BlockNote
6. Menu/liste déroulante des notes existantes, triées par dernière modification
7. Liste au-dessus de la zone de saisie ; clic sur une note l'ouvre dans le widget
8. Notes libres (non associées) ; champ titre optionnel (si vide : 30 premiers caractères)
9. Auto-save : debounce 2 secondes après dernière modification
10. Raccourci : Cmd/Ctrl + J
11. Lien vers page "Mes notes" accessible depuis le widget

**Réf.** Design chat widget : panneau flottant non bloquant ; Design System § FAB.

### Story 3.12: Page Mes notes

**As a** recruiter,  
**I want** a dedicated "Mes notes" page to view, organize, edit and move my free-standing notes to candidates or offers,  
**so that** I can manage my quick notes before associating them.

**Acceptance Criteria:**

1. Page "Mes notes" accessible depuis la navbar et le widget
2. Liste des notes libres triées par dernière modification
3. Affichage : titre (ou 30 premiers caractères), extrait, date
4. Clic ouvre l'édition (inline ou panneau)
5. Édition : titre, contenu BlockNote ; sauvegarde
6. Suppression avec confirmation
7. Possibilité de "déplacer" une note vers un candidat ou une offre
8. Empty state : "Aucune note"
9. Lien rapide pour ouvrir le widget depuis la page

**Réf.** Stories 3.9, 3.11 (notes libres, champ titre).

---

## Epic 4: Recherche, Filtres & Partage

**Réf. wireframes :** §8 Page Partage Public, §9 Paramètres, « Barre de recherche (Cmd+K) », « Modal Partager » — **Réf. architecture :** §9 (routers shareLink, search), route publique `src/app/share/[token]/` ; rate-limiting.md §3.2 (partage).

### Epic Goal

Implémenter la recherche globale et les filtres avancés pour retrouver rapidement candidats et offres, ainsi que le système de partage de fiches candidats via URLs publiques (version normale et anonymisée). À la fin de cet epic, le MVP est complet et prêt à être utilisé par de vrais cabinets.

### Story 4.1: Global Search Bar

**As a** recruiter,  
**I want** to search across candidates and offers from anywhere,  
**so that** I can quickly find what I'm looking for.

**Acceptance Criteria:**

1. Search trigger in navigation header (icon), visible on all pages
2. Clic on icon or Cmd/Ctrl+K opens modal with search input (expandable)
3. Search queries candidates by: firstName, lastName, title, summary
4. Search queries offers by: title, description
5. Results displayed in modal as user types (debounced, 300ms)
6. Results grouped by type: "Candidats", "Offres"
7. Each result shows: name/title, subtitle (title for candidate, client for offer)
8. Click result navigates to detail page
9. "Voir tous les résultats" link for full search page (optional)
10. Keyboard shortcut: Cmd/Ctrl + K opens search
11. Empty state: "Aucun résultat pour '[query]'"
12. Minimum 2 characters to trigger search

**Réf.** Wireframes « Barre de recherche (Cmd+K) » ; implémentation : icône trigger, modal centrée ancrée en haut, résultats groupés Candidats / Offres, lien « Voir tous les résultats » accessible clavier ; Design System (champ recherche, debounce 300ms).

### Story 4.2: Candidate List Filters

**As a** recruiter,  
**I want** to filter the candidate list by tags and other criteria,  
**so that** I can narrow down to relevant candidates.

**Acceptance Criteria:**

1. Filter panel on candidates list page (sidebar or collapsible)
2. Filter by tags: multi-select from existing tags
3. Tag filter logic: AND (candidate must have ALL selected tags)
4. Filter by city: text input with autocomplete from existing cities
5. Clear filters button to reset all
6. Active filters displayed as chips above the list
7. Remove individual filter by clicking X on chip
8. Filtered count displayed: "X candidats trouvés"
9. Filters persist during session (not on page reload)
10. URL query params reflect active filters (shareable filtered views)

**Réf.** Wireframes §2 Liste Candidats (filtres Tags, Ville, chips actifs, « Effacer filtres »).

### Story 4.3: Job Offer List Filters

**As a** recruiter,  
**I want** to filter job offers by status, salary, location, and tags,  
**so that** I can find specific offers quickly.

**Acceptance Criteria:**

1. Filter panel on offers list page
2. Filter by status: checkboxes (À faire, En cours, Terminé)
3. Filter by tags: multi-select
4. Filter by salary range: min/max inputs
5. Filter by location/city: text input
6. Filter by client company: dropdown
7. Multiple filters combine with AND logic
8. Clear filters button
9. Active filters shown as chips
10. Filtered count: "X offres trouvées"

**Réf.** Wireframes §4 Liste Offres (filtres Statut, Tags, Salaire, Client, Ville).

### Story 4.4: Candidate Sharing - URL Generation

**As a** recruiter,  
**I want** to generate a shareable URL for a candidate profile,  
**so that** I can send it to clients.

**Acceptance Criteria:**

1. "Partager" button on candidate detail page
2. Click opens sharing modal/popover
3. Two options: "Fiche complète" and "Fiche anonymisée"
4. Generate unique share token for each type
5. Share URL format: `/share/[token]`
6. Token stored in database with: candidateId, type (normal/anonymous), createdAt, expiresAt
7. Copy URL button with success toast "Lien copié!"
8. Display generated URL in modal
9. Option to set expiration (7 days, 30 days, never) - default 30 days
10. Previous share links listed in modal (reuse or regenerate)
11. Rate limiting sur la création de liens : max 20 liens de partage créés par utilisateur par heure ; en cas de dépassement, message « Trop de requêtes. Réessayez dans quelques minutes. » (réf. `rate-limiting.md` §3.2)

**Réf.** Wireframes « Modal Partager » ; Architecture router `shareLink`, modèle ShareLink ; rate-limiting.md §3.2 (partage par userId).

### Story 4.5: Public Candidate Page - Normal Version

**As a** client,  
**I want** to view a shared candidate profile without logging in,  
**so that** I can review candidates sent by the recruiter.

**Acceptance Criteria:**

1. Public route `/share/[token]` accessible without authentication
2. Validates token exists and not expired
3. Displays candidate profile in CV layout (same as internal view)
4. Shows: photo, full name, title, city, summary, experiences, formations, languages
5. Contact info visible: email, phone, LinkedIn
6. Does NOT show: notes, tags, associated offers, internal data
7. Company branding/logo displayed (recruiter's company)
8. Clean, professional design optimized for client viewing
9. Expired/invalid token shows friendly error page
10. Mobile-responsive layout

**Réf.** Wireframes §8 Page Partage Public (version normale : layout CV, pas de notes/offres ; branding cabinet/Claritee) ; route `src/app/share/[token]/` (Architecture §6).

### Story 4.6: Public Candidate Page - Anonymous Version

**As a** recruiter,  
**I want** to share an anonymized candidate profile,  
**so that** I can prospect new clients without revealing candidate identity.

**Acceptance Criteria:**

1. Anonymous share type generates different token
2. Public page shows candidate profile WITHOUT:
   - firstName, lastName (replaced with "Candidat anonyme" or initials like "J.D.")
   - Photo (replaced with generic avatar)
   - Email, phone, LinkedIn (hidden)
   - Company names in experiences (replaced with "[Entreprise confidentielle]")
   - School names in formations (replaced with "[École confidentielle]")
3. Shows: title, city, summary, experience descriptions, formation fields, languages
4. Professional layout, same structure as normal version
5. "Fiche anonymisée" badge visible on page
6. Recruiter's company branding still visible
7. CTA: "Intéressé par ce profil? Contactez [company name]"
8. Link to recruiter's company contact or email
9. Same expiration logic as normal shares
10. Cannot "de-anonymize" from public page

**Réf.** Wireframes §8 version anonymisée (badge « Fiche anonymisée », CTA « Intéressé par ce profil ? Contactez [cabinet] ») ; champs masqués selon PRD.

### Story 4.7: Dashboard Metrics (Final)

**As a** recruiter,  
**I want** the dashboard to show real metrics,  
**so that** I have an overview of my cabinet's activity.

**Acceptance Criteria:**

1. Dashboard cards now show real counts:
   - Total candidats
   - Offres actives (status "En cours")
   - Total clients
2. Recent activity section:
   - Last 5 candidates added
   - Last 5 notes created
3. Quick stats per offer status (mini bar chart or counts)
4. "Candidats partagés ce mois" count
5. Click on metric card navigates to relevant list
6. Data refreshed on page load (no real-time)
7. Empty states handled gracefully
8. Performance: dashboard loads in < 1 second
9. Cached queries where appropriate
10. Welcome message if all metrics are zero (onboarding hint)

**Réf.** Wireframes §1 Dashboard (métriques réelles, 4 cards avec [Voir →], candidats récents, notes récentes) ; Architecture §9 (queries agrégées par companyId).

### Story 4.8: Settings & Company Management

**As a** cabinet admin,  
**I want** to manage my company settings and team,  
**so that** I can maintain my cabinet's configuration.

**Acceptance Criteria:**

1. Settings page accessible from navigation
2. Company info section: edit company name (SIREN read-only)
3. Team section: list of all users in company
4. Show user: name, email, join date
5. Pending invitations list with expiration date
6. Generate new invitation URL button
7. Revoke pending invitation button
8. Cannot remove yourself from company
9. No role management in MVP (all users equal)
10. Profile section: edit own firstName, lastName, email
11. Change password functionality

**Réf.** Wireframes §9 Paramètres (informations cabinet, équipe, invitations en attente, mon profil, changement mot de passe) ; Architecture router `company`, `invitation`, §7.3.

---

## Améliorations Post MVP

Les points ci-dessous sont hors périmètre du MVP mais documentés pour les évolutions futures.

### Historique de recherche (style Notion)

- **Affichage de l’historique de recherche dans la modal de recherche globale**  
  Inspiré de Notion : dans la grande modal de recherche (ancrée en haut de l'écran à 20vh), afficher les recherches récentes (ex. « 30 derniers jours », « Plus ancien ») lorsque l’utilisateur n’a pas encore saisi de requête ou lorsqu’il n’y a pas de résultats.  
  _Prérequis :_ persister les recherches par utilisateur/cabinet (table `SearchHistory` ou similaire), API pour récupérer l’historique, affichage dans la modal avant les résultats live.

### Villes structurées (table City + API Photon)

- **Remplacement des champs ville/localisation texte par une table City et des relations structurées**  
  Actuellement : `Candidate.city` et `JobOffer.location` sont des champs texte libres. Évolution vers une table `City` globale (name, region, country, latitude, longitude), des tables de liaison (`CandidateCity` avec ordre + drag & drop, `ClientCompanyCity` N–N sans ordre), et `JobOffer.cityId` pour une seule ville.  
  _API externe :_ Photon (Komoot), gratuite, pas de clé, Europe, français, adaptée à l'autocomplétion.  
  _Flux :_ recherche locale en base (seed 200–300 villes) puis fallback API Photon ; création à la volée des villes non référencées.  
  _Prérequis :_ migration Prisma (suppression city/location, création City + liaisons), seed initial, procédure tRPC `city.autocomplete`, refonte filtres candidats (`cityIds`), refonte formulaires candidat/offre/client.  
  _Détail :_ ADR 0005.

### Rôles et permissions

- **Restriction de la page Settings/Team aux admins du cabinet**  
  Actuellement, tous les utilisateurs d’un cabinet peuvent accéder à `/settings/team` et gérer les invitations.  
  _Amélioration envisagée :_ restreindre cette page et les actions d’invitation (créer, révoquer, lister) aux administrateurs du cabinet.  
  _Prérequis :_ ajout d’un champ de rôle dans le modèle `User` (ex. `role: "ADMIN" | "MEMBER"` ou `isAdmin: Boolean`), migration Prisma, procédure `adminProcedure` pour les procédures concernées.

---

## Next Steps

### Livrables UX & Architecture (intégrés)

- **Design System** : `docs/design-system.md` — palette, typo, composants, statuts, WCAG AA.
- **Wireframes** : `docs/wireframes.md` — 8 écrans + layout shell + modals (recherche, note rapide, partager).
- **Architecture** : `docs/architecture.md` — stack, RLS, schéma Prisma, structure `src/`, routers tRPC, Auth, Storage, déploiement.

Les epics et stories ci-dessus référencent ces livrables ; le développement doit s'y aligner (composants selon design-system, écrans selon wireframes, structure et API selon architecture).

### Prochaines actions recommandées

1. **Développement** : Suivre l’**ordre de priorités** (§ Epic List > Ordre de priorités) : Foundation → Candidats → **Recherche & Notes** → Offres/Clients → Partage. Démarrer par l’Epic 1 (Story 1.1) selon `docs/architecture.md` §6.
2. **Phase Recherche & Notes (priorité)** : Implémenter 4.1, 4.2, 3.9, 3.11 avant d’attaquer les onglets Offres et Clients.
3. **Critères d'acceptation** : Pour chaque story, vérifier la cohérence avec les sections « Réf. » (wireframes, design-system, architecture, frontend-architecture, rate-limiting, coding-standards).
4. **Sharding optionnel** : Si besoin, utiliser la tâche `shard-doc` pour découper le PRD en sous-documents par epic.
