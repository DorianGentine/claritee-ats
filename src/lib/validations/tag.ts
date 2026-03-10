import { z } from "zod"

/** Limite de tags par candidat (AC 8) */
export const MAX_TAGS_PER_CANDIDATE = 20

/** Limite de tags par offre (AC 7) */
export const MAX_TAGS_PER_OFFER = 20

/** Schéma réutilisable pour le nom d'un tag (trim puis validation) */
export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Le nom du tag est requis")
  .max(100)

/** Schéma pour l'ajout d'un tag à un candidat */
export const addTagSchema = z.object({
  candidateId: z.uuid(),
  tagName: tagNameSchema,
})

export type AddTagInput = z.infer<typeof addTagSchema>

/** Schéma pour la suppression d'un tag d'un candidat */
export const removeTagSchema = z.object({
  candidateId: z.uuid(),
  tagId: z.uuid(),
})

export type RemoveTagInput = z.infer<typeof removeTagSchema>

/** Schéma pour l'ajout d'un tag à une offre */
export const addOfferTagSchema = z.object({
  offerId: z.uuid(),
  tagName: tagNameSchema,
})

export type AddOfferTagInput = z.infer<typeof addOfferTagSchema>

/** Schéma pour la suppression d'un tag d'une offre */
export const removeOfferTagSchema = z.object({
  offerId: z.uuid(),
  tagId: z.uuid(),
})

export type RemoveOfferTagInput = z.infer<typeof removeOfferTagSchema>
