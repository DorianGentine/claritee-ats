import { z } from "zod"

/** Input pour la recherche globale (candidats + offres). Min 2 caractères. */
export const searchInputSchema = z.object({
  q: z.string().min(2, "Au moins 2 caractères requis").trim(),
  limit: z.number().int().min(1).max(50).optional().default(8),
})

export type SearchInput = z.infer<typeof searchInputSchema>
