import { z } from "zod"

/** Input pour l'autocomplétion de villes. La recherche se déclenche à partir de 3 caractères. */
export const cityAutocompleteInputSchema = z.object({
  // Borne max : endpoint public non authentifié, on évite les saisies démesurées
  // qui iraient dans la requête ILIKE et l'URL Photon à chaque frappe.
  q: z.string().max(100),
})

export type CityAutocompleteInput = z.infer<typeof cityAutocompleteInputSchema>

/** Input pour la résolution de villes par ids (hydratation du nom depuis une liste d'UUIDs). */
export const cityGetByIdsInputSchema = z.object({
  ids: z.array(z.uuid()).max(20, "Maximum 20 villes"),
})

export type CityGetByIdsInput = z.infer<typeof cityGetByIdsInputSchema>
