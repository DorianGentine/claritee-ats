# ADR 0005 — Villes structurées : table City + API Photon

## Contexte

L’application gère des candidats avec un champ `city` (string libre). Pour améliorer l’UX (autocomplétion, cohérence des données, géolocalisation future) et le filtrage par ville, nous avons besoin de villes structurées : nom, région, pays, coordonnées. Une API externe d’autocomplétion géographique est requise, ainsi qu’une stratégie de stockage local.

## Décision

1. **API externe** : **Photon (by Komoot)** — gratuite, sans clé, couverture Europe, adaptée à l’autocomplétion.
2. **Table locale** : table `cities` dans PostgreSQL avec recherche insensible aux accents (extensions `unaccent` + `pg_trgm`).
3. **Flux hybride** : recherche locale (200–300 villes pré-chargées) en priorité ; fallback vers Photon si aucun résultat local.

---

## 1. Choix de l’API externe : Photon (by Komoot)

### Critères d’évaluation

| Critère          | Photon                                     |
| ---------------- | ------------------------------------------ |
| Prix             | ✅ 100 % gratuit                           |
| Clé API          | ✅ Aucune inscription                      |
| Couverture       | ✅ Europe entière (basé sur OpenStreetMap) |
| Français         | ✅ Paramètre `lang=fr`                     |
| Autocomplétion   | ✅ Conçu pour ça                           |
| Latence          | ✅ Rapide (~50–150 ms)                     |
| Usage commercial | ✅ Autorisé (licence ODbL)                 |
| Fiabilité        | ⚠️ Pas de SLA garanti                      |

### Pourquoi Photon plutôt que les autres ?

| Alternative      | Raison d’exclusion                                                             |
| ---------------- | ------------------------------------------------------------------------------ |
| **GeoNames**     | Nécessite inscription, API vieillissante, résultats moins propres              |
| **Nominatim**    | Politique stricte (max 1 req/s), interdit l’autocomplétion intensive           |
| **OpenCage**     | Payant au-delà de 2 500 req/jour                                               |
| **API Geo.gouv** | France uniquement, pas de couverture Europe                                    |
| **Photon**       | Aucune contrainte de volume pour notre cas, gratuit, adapté à l’autocomplétion |

### Exemple d’appel Photon

```
GET https://photon.komoot.io/api/?q=Ly&lang=fr&limit=3&layer=city&bbox=-10,35,40,72
```

### Exemple de réponse Photon

```json
{
  "features": [
    {
      "properties": {
        "name": "Lyon",
        "state": "Auvergne-Rhône-Alpes",
        "country": "France"
      },
      "geometry": {
        "coordinates": [4.8357, 45.764]
      }
    }
  ]
}
```

Note : Photon retourne `[longitude, latitude]` (ordre GeoJSON standard).

---

## 2. Structure de table PostgreSQL (Supabase)

```sql
CREATE TABLE cities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(255),
    country VARCHAR(255) NOT NULL,
    latitude DECIMAL(8, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extensions pour la recherche insensible aux accents
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index pour l'autocomplétion performante
CREATE INDEX idx_cities_name_trgm
ON cities USING gin (unaccent(name) gin_trgm_ops);
```

La table est **partagée** (sans `companyId`) : les villes sont des données de référence communes à tous les cabinets.

---

## 3. Seed des 200–300 villes

Un script Node/TypeScript (ou `tsx`) appelle Photon pour récupérer les grandes villes européennes et les insère dans `cities` :

- Liste de villes cibles : Paris, Lyon, Marseille, Toulouse, Bordeaux, Lille, Nantes, Strasbourg, Nice, Rennes, Bruxelles, Genève, Barcelone, Berlin, Amsterdam, Londres, Rome, Madrid, Lisbonne, Prague, etc.
- Un appel Photon par ville : `q={city}&lang=fr&limit=1&layer=city`.
- Délai entre les appels (ex. 200 ms) pour respecter une charge raisonnable.
- Mapping : `properties.name`, `properties.state` → region, `properties.country`, `geometry.coordinates[1]` → latitude, `geometry.coordinates[0]` → longitude.

Le seed peut s’exécuter via `prisma db seed` ou un script dédié (`scripts/seed-cities.ts`).

---

## 4. Service d’autocomplétion (backend)

### Flux en deux étapes

1. **Recherche locale** : requête SQL sur `cities` via fonction RPC ou Prisma `$queryRaw` avec `unaccent` + `ILIKE`.
2. **Fallback Photon** : si aucun résultat local, appel à l’API Photon.

### Point d’entrée principal (pseudo-code)

```
autocompleteCity(query) :
  SI query vide OU longueur < 3 → retourner []
  ① Résultats = searchLocal(query)
  SI Résultats.length > 0 → retourner Résultats.slice(0, 3)
  ② retourner searchPhoton(query)
```

### Paramètres Photon pour le fallback

- `q` : terme de recherche
- `lang=fr`
- `limit=3`
- `layer=city`
- `bbox=-10,35,40,72` (Europe)

---

## 5. Fonction SQL de recherche locale (RPC)

```sql
CREATE OR REPLACE FUNCTION search_cities(search_term TEXT)
RETURNS TABLE (
    name VARCHAR,
    region VARCHAR,
    country VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.name,
        c.region,
        c.country,
        c.latitude,
        c.longitude
    FROM cities c
    WHERE unaccent(c.name) ILIKE unaccent(search_term) || '%'
    ORDER BY c.name ASC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;
```

Appel depuis Prisma : `$queryRaw` ou procédure Supabase RPC selon le choix d’implémentation.

---

## 6. Exposition API : procedure tRPC

Conformément à l’ADR 0003, l’autocomplétion est exposée via une **procedure tRPC** (et non une route REST). Exemple :

```
cities.autocomplete({ q: string })
```

- Input : `{ q: string }` (min 3 caractères pour déclencher la recherche)
- Output : tableau d’objets `{ name, region, country, latitude, longitude }`
- Procédure : `publicProcedure` (lecture seule, données de référence non sensibles)

**Exemple d’appel côté client :**

```ts
const { data } = trpc.cities.autocomplete.useQuery({ q: "Lyo" });
// [ { name: "Lyon", region: "Auvergne-Rhône-Alpes", country: "France", latitude: 45.764043, longitude: 4.835659 } ]
```

---

## 7. Récapitulatif du flux

| Saisie utilisateur | Recherche locale     | Fallback Photon | Résultat                           |
| ------------------ | -------------------- | --------------- | ---------------------------------- |
| `"Lyo"`            | Supabase : trouvé ✅ | —               | Lyon, Auvergne-Rhône-Alpes, France |
| `"Brat"`           | Supabase : vide ❌   | Photon API      | Bratislava, Slovaquie              |
| `"Ly"` (< 3 car.)  | —                    | —               | []                                 |

---

## Conséquences

- **Positives** : autocomplétion performante pour les grandes villes européennes ; coût nul ; pas de clé API à gérer ; fallback Photon pour les villes hors seed ; usage commercial autorisé (ODbL).
- **Négatives** : Photon sans SLA ; latence variable en fallback ; table `cities` à maintenir (seed initial + mises à jour ponctuelles si besoin).
- **Contraintes** : minimum 3 caractères pour lancer une recherche ; procédure tRPC `cities.autocomplete` exposée ; fonction SQL `search_cities` à déployer via migration Prisma ou script SQL.

---

_Référence : `docs/architecture.md` ; ADR 0003 (tRPC) ; [Photon API](https://photon.komoot.io/) ; [OpenStreetMap ODbL](https://www.openstreetmap.org/copyright)._
