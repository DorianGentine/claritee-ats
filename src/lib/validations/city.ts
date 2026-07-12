import { z } from "zod"

/** Input pour l'autocomplétion de villes. La recherche se déclenche à partir de 3 caractères. */
export const cityAutocompleteInputSchema = z.object({
  // Borne max : endpoint public non authentifié, on évite les saisies démesurées
  // qui iraient dans la requête ILIKE et l'URL Photon à chaque frappe.
  q: z.string().max(100),
})

export type CityAutocompleteInput = z.infer<typeof cityAutocompleteInputSchema>
