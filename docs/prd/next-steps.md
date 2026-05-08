# Next Steps

## Livrables UX & Architecture (intégrés)

- **Design System** : `docs/design-system.md` — palette, typo, composants, statuts, WCAG AA.
- **Wireframes** : `docs/wireframes.md` — 8 écrans + layout shell + modals (recherche, note rapide, partager).
- **Architecture** : `docs/architecture.md` — stack, RLS, schéma Prisma, structure `src/`, routers tRPC, Auth, Storage, déploiement.

Les epics et stories ci-dessus référencent ces livrables ; le développement doit s'y aligner (composants selon design-system, écrans selon wireframes, structure et API selon architecture).

## Prochaines actions recommandées

1. **Développement** : Suivre l’**ordre de priorités** (§ Epic List > Ordre de priorités) : Foundation → Candidats → **Recherche & Notes** → Offres/Clients → Partage. Démarrer par l’Epic 1 (Story 1.1) selon `docs/architecture.md` §6.
2. **Phase Recherche & Notes (priorité)** : Implémenter 4.1, 4.2, 3.9, 3.11 avant d’attaquer les onglets Offres et Clients.
3. **Critères d'acceptation** : Pour chaque story, vérifier la cohérence avec les sections « Réf. » (wireframes, design-system, architecture, frontend-architecture, rate-limiting, coding-standards).
4. **Sharding optionnel** : Si besoin, utiliser la tâche `shard-doc` pour découper le PRD en sous-documents par epic.
