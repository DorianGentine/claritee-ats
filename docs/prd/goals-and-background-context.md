# Goals and Background Context

## Goals

- **Centraliser la gestion des candidats** : Permettre aux recruteurs de gérer tous leurs candidats depuis une seule plateforme, éliminant la fragmentation des outils (Excel, emails, notes papier)
- **Professionnaliser la communication client** : Offrir des fiches candidats partageables avec un layout professionnel type CV, en version normale et anonymisée
- **Accélérer le travail quotidien** : Réduire le temps de saisie et de recherche de candidats grâce à un système de tags et une interface fluide
- **Éviter les doublons de contact** : Permettre la collaboration multi-utilisateurs avec suivi des statuts pour coordonner les actions de l'équipe
- **Valider le concept sans investissement** : Créer un MVP fonctionnel avec budget zéro (Supabase, Vercel gratuits) pour tester l'adoption

## Background Context

Les cabinets de recrutement de petite et moyenne taille en France utilisent souvent une multitude d'outils fragmentés pour gérer leurs candidats et offres d'emploi. Cette fragmentation entraîne une perte de temps considérable, des candidats oubliés dans la masse, et des doublons de contact qui nuisent à l'image professionnelle du cabinet.

Les ATS existants sur le marché sont généralement trop chers, trop complexes ou non adaptés aux pratiques spécifiques des cabinets français (SIREN, fiches anonymisées pour prospection). Claritee ATS répond à ce besoin avec une solution gratuite, simple et professionnelle, conçue spécifiquement pour ce marché.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-24 | 1.0 | Initial PRD creation | John (PM) |
| 2026-01-24 | 1.1 | Added Data Model, User Flows, Testing Matrix, Observability, Error Messages | John (PM) |
| 2026-02-14 | 1.2 | Repasse epics/stories : intégration livrables UX (wireframes, design-system) et Architecture ; références par epic et story ; Next Steps mis à jour | John (PM) |
| 2026-02-14 | 1.3 | Alignement epics/stories avec doc architecture : rate limiting (Stories 1.3, 1.4, 2.3, 2.9, 4.4), références frontend-architecture, rate-limiting, coding-standards, source-tree, tech-stack ; a11y (Story 1.7) | John (PM) |
| 2026-02-21 | 1.4 | Association offre d'emploi à un contact client (FR16b, modèle JobOffer + clientContactId, Stories 3.4 & 3.6) | John (PM) |
| 2026-02-21 | 1.5 | Priorisation : Recherche (4.1, 4.2) et Notes (3.9, 3.11) avant Offres/Clients ; section Ordre de priorités, Next Steps | John (PM) |
| 2026-02-21 | 1.6 | Éditeur BlockNote pour les notes (Story 3.9) — retiré de Out of Scope | John (PM) |

---
