# ADR 0004 — Recherche full-text : tsvector vs ilike/contains

## Contexte

La recherche globale (candidats, offres) est implémentée avec Prisma `OR` + `contains`/`ilike` sur les champs textuels (firstName, lastName, title, summary, city, etc.) et leurs relations (tags, languages, experiences, formations). Pour le MVP, avec un volume limité de données par cabinet, cette approche est suffisante. Une alternative serait d’utiliser le full-text search natif de PostgreSQL via **tsvector** et des index **GIN**.

## Décision

Pour le MVP, nous conservons **ilike/contains**. Une évolution vers **tsvector** est documentée comme amélioration optionnelle si les volumes ou les exigences de pertinence l’exigent.

## Analyse détaillée

### Gains potentiels de tsvector

| Aspect | Détail |
|--------|--------|
| **Performance** | Un index GIN sur une colonne tsvector permet des recherches O(log n) au lieu de scans séquentiels ou index B-tree par champ. Sur des milliers de candidats par cabinet, la différence devient notable. |
| **Pertinence** | `to_tsquery` gère la stemming (racines de mots : "développeur" → "développ"), les stop-words, et permet le ranking (`ts_rank`) pour trier par pertinence. |
| **Requêtes avancées** | Opérateurs `&` (ET), `|` (OU), `!` (NON) dans la requête utilisateur. Recherche de phrases exactes (`phraseto_tsquery`). |
| **Scalabilité** | Meilleure utilisation des index pour des tables volumineuses. |

### Inconvénients et coûts de tsvector

| Aspect | Détail |
|--------|--------|
| **Complexité** | Nécessite des colonnes dédiées (ex. `search_vector` sur Candidate, JobOffer), des triggers ou des jobs pour maintenir le tsvector à jour à chaque insertion/mise à jour des champs sources. |
| **Maintenance** | Les migrations Prisma ne gèrent pas nativement tsvector ; il faut des migrations SQL brutes. La configuration du dictionnaire et de la langue (français) demande un soin particulier. |
| **Relations** | Intégrer tags, languages, experiences, formations dans le vecteur de recherche implique soit des colonnes concaténées, soit des vues matérialisées, ce qui complique le modèle. |
| **Prisma** | Les requêtes tsvector se font via `$queryRaw` ou `$queryRawUnsafe` ; perte du typage Prisma et du filtrage par `companyId` si mal encapsulé. |
| **Volume MVP** | Pour quelques centaines de candidats et offres par cabinet, ilike reste très acceptable (< 500 ms). Le gain tsvector se justifie surtout au-delà de 2 000–5 000 lignes par entité. |

### Conditions de révision

Envisager une migration vers tsvector si :

- Le volume de candidats/offres par cabinet dépasse ~2 000–3 000 et les requêtes dépassent régulièrement 500 ms.
- Les retours utilisateurs signalent une pertinence insuffisante (ex. pas de stemming, résultats bruités).
- Une recherche de type "phrase exacte" ou "ET/OU" devient un besoin métier.

### Approche recommandée en cas de migration

1. Créer une colonne `search_vector tsvector` sur `Candidate` et `JobOffer`.
2. Trigger ou procédure de mise à jour concaténant les champs pertinents (et relations) dans le vecteur.
3. Index GIN sur `search_vector`.
4. Requête via `to_tsquery` avec sanitization de l’input utilisateur (éviter l’injection SQL).
5. Conserver le filtrage `companyId` dans la clause WHERE.
6. Tester la configuration du dictionnaire français (`french` ou `simple` selon les besoins).

## Conséquences

- **Immédiat :** pas de changement ; l’implémentation actuelle reste en place.
- **Documentation :** cette ADR et la section 11.8 de `docs/architecture.md` guident une éventuelle évolution future.
- **Monitoring :** si des métriques de performance de recherche sont ajoutées, un dépassement récurrent du seuil 500 ms peut déclencher une réévaluation.

---

*Référence : `docs/architecture.md` §10.2, §11.8 ; `src/server/trpc/routers/search.ts` ; PostgreSQL [Full Text Search](https://www.postgresql.org/docs/current/textsearch.html).*
