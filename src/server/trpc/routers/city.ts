import { router, publicProcedure } from "../trpc"
import {
  cityAutocompleteInputSchema,
  cityGetByIdsInputSchema,
} from "@/lib/validations/city"

/** Résultat exposé au client (les coordonnées ne sont jamais renvoyées). */
type CityResult = {
  id: string
  name: string
  region: string | null
  country: string
}

/** Ligne brute renvoyée par la recherche locale `$queryRaw`. */
type CityRow = {
  id: string
  name: string
  region: string | null
  country: string
}

const PHOTON_TIMEOUT_MS = 3000
const EUROPE_BBOX = "-10,35,40,72"
// DROM-COM hors bbox Europe : façades Atlantique (Antilles/Guyane) et Océan
// Indien (Réunion/Mayotte) trop excentrées pour être incluses dans une seule
// bbox sans engloutir des continents entiers (Afrique, Atlantique...).
// Interrogées séparément, seulement si la bbox Europe ne renvoie rien.
const ANTILLES_GUYANE_BBOX = "-62,2,-51,17" // Guadeloupe, Martinique, Guyane
const OCEAN_INDIEN_BBOX = "44.5,-22,56,-12" // Réunion, Mayotte
const FALLBACK_BBOXES = [EUROPE_BBOX, ANTILLES_GUYANE_BBOX, OCEAN_INDIEN_BBOX]

/**
 * Échappe les métacaractères LIKE (`%`, `_`, `\`) pour qu'ils soient traités
 * littéralement dans le motif `ILIKE`. Sans cela, une saisie comme `%%%` ou `p__`
 * agirait comme un joker et renverrait des correspondances erronées.
 */
const escapeLikePattern = (value: string) =>
  value.replace(/[\\%_]/g, (character) => `\\${character}`)

/** Structure minimale d'une réponse GeoJSON Photon (narrowing depuis unknown). */
type PhotonFeature = {
  properties?: { name?: string; state?: string; country?: string }
  geometry?: { coordinates?: number[] }
}
type PhotonResponse = {
  features?: PhotonFeature[]
}

type PhotonFetchResult =
  | { ok: true; features: PhotonFeature[] }
  | { ok: false; status: number }

/** Un seul appel Photon, restreint à la bbox donnée. */
const fetchPhotonFeatures = async (
  query: string,
  bbox: string
): Promise<PhotonFetchResult> => {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    query
  )}&lang=fr&limit=5&layer=city&bbox=${bbox}`

  const response = await fetch(url, {
    signal: AbortSignal.timeout(PHOTON_TIMEOUT_MS),
  })

  if (!response.ok) {
    return { ok: false, status: response.status }
  }

  const data = (await response.json()) as PhotonResponse
  return { ok: true, features: data.features ?? [] }
}

export const cityRouter = router({
  autocomplete: publicProcedure
    .input(cityAutocompleteInputSchema)
    .query(async ({ ctx, input }): Promise<CityResult[]> => {
      const q = input.q.trim()

      // AC 3 — pas de requête tant que < 3 caractères
      if (q.length < 3) {
        return []
      }

      // AC 4 — recherche locale insensible aux accents, préfixe, triée, limitée à 5.
      // Les métacaractères LIKE sont échappés pour rester littéraux (ESCAPE '\').
      const pattern = `${escapeLikePattern(q)}%`
      const localResults = await ctx.db.$queryRaw<CityRow[]>`
        SELECT id, name, region, country
        FROM cities
        WHERE unaccent(name) ILIKE unaccent(${pattern}) ESCAPE '\'
        ORDER BY name ASC
        LIMIT 5
      `

      // AC 5 — si résultats locaux, on retourne sans appel externe
      if (localResults.length > 0) {
        return localResults
      }

      // AC 6-8 — fallback Photon, tolérant aux pannes réseau
      try {
        // Les 3 bbox sont interrogées en parallèle et fusionnées : on ne peut
        // pas s'arrêter à la première non-vide, l'Europe contenant tellement
        // de villes qu'une simple correspondance de préfixe y trouve presque
        // toujours quelque chose, même quand la ville visée est un DROM-COM.
        const settled = await Promise.allSettled(
          FALLBACK_BBOXES.map((bbox) => fetchPhotonFeatures(q, bbox))
        )

        // Un échec réseau sur n'importe quelle bbox fait échouer tout le
        // fallback (cohérent avec le comportement existant, catché plus bas).
        for (const result of settled) {
          if (result.status === "rejected") {
            throw result.reason
          }
        }

        // Une réponse non-2xx (429, 500…) n'est pas un résultat vide légitime :
        // on log et on abandonne tout le fallback pour ne pas masquer une
        // panne Photon.
        for (const result of settled) {
          if (result.status === "fulfilled" && !result.value.ok) {
            console.error(
              `Photon autocomplete returned HTTP ${result.value.status}`
            )
            return []
          }
        }

        // Fusion Europe → Antilles/Guyane → Océan Indien (ordre de priorité
        // en cas de dépassement des 5 résultats affichés, cf. slice plus bas).
        const features = settled.flatMap((result) =>
          result.status === "fulfilled" && result.value.ok
            ? result.value.features
            : []
        )

        const results: CityResult[] = []

        for (const feature of features) {
          const name = feature.properties?.name
          const country = feature.properties?.country
          const region = feature.properties?.state ?? null
          const coordinates = feature.geometry?.coordinates

          // name + country requis (clé unique + colonnes NOT NULL) ; on rejette
          // aussi les valeurs composées uniquement d'espaces.
          if (!name?.trim() || !country?.trim()) {
            continue
          }

          const longitude = coordinates?.[0]
          const latitude = coordinates?.[1]
          if (typeof latitude !== "number" || typeof longitude !== "number") {
            continue
          }

          // AC 7 — création à la volée des villes absentes de la DB.
          // L'upsert est isolé par itération : un échec (ex. race P2002 sur
          // (name, country) en requêtes concurrentes) ne doit pas jeter les
          // villes déjà collectées ni faire échouer toute la requête.
          try {
            const city = await ctx.db.city.upsert({
              where: { name_country: { name, country } },
              update: {},
              create: { name, region, country, latitude, longitude },
            })
            // AC 9 — latitude/longitude jamais exposées
            results.push({
              id: city.id,
              name: city.name,
              region: city.region,
              country: city.country,
            })
          } catch (upsertError) {
            // La ville a pu être créée par une requête concurrente : on tente
            // de la relire avant de renoncer à cette entrée.
            const existing = await ctx.db.city
              .findUnique({ where: { name_country: { name, country } } })
              .catch(() => null)
            if (existing) {
              results.push({
                id: existing.id,
                name: existing.name,
                region: existing.region,
                country: existing.country,
              })
            } else {
              console.error("City upsert failed:", upsertError)
            }
          }
        }

        // Fusion de jusqu'à 3×5 résultats bruts : on cap l'affichage final à 5,
        // en gardant la priorité Europe en cas de dépassement.
        return results.slice(0, 5)
      } catch (error) {
        // AC 8 — Photon inaccessible : on log et on retourne [] sans lever d'exception
        console.error("Photon autocomplete failed:", error)
        return []
      }
    }),

  /**
   * Résout un lot d'ids en villes complètes (pour afficher un nom depuis un
   * simple UUID, ex. filtres persistés dans l'URL). Pas d'ordre garanti.
   */
  getByIds: publicProcedure
    .input(cityGetByIdsInputSchema)
    .query(async ({ ctx, input }): Promise<CityResult[]> => {
      if (input.ids.length === 0) {
        return []
      }

      return ctx.db.city.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, name: true, region: true, country: true },
      })
    }),
})
