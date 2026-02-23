import { z } from "zod"

/** Taille max du contenu JSON (document BlockNote) — limite DoS */
const NOTE_CONTENT_MAX_BYTES = 500_000 // 500 Ko

/** Valide que content est un JSON valide (document BlockNote sérialisé) */
const blockNoteContentSchema = z
  .string()
  .min(1, "La note ne peut pas être vide")
  .max(NOTE_CONTENT_MAX_BYTES, "La note dépasse la taille maximale autorisée")
  .refine(
    (s) => {
      try {
        const parsed = JSON.parse(s)
        return Array.isArray(parsed) || (typeof parsed === "object" && parsed !== null)
      } catch {
        return false
      }
    },
    { message: "Format de contenu invalide" }
  )

/** Schéma pour les notes liées à un candidat (Story 3.9) ou notes libres (Story 3.11) */
export const createNoteSchema = z.object({
  candidateId: z.uuid().optional(),
  offerId: z.uuid().optional(),
  title: z.string().trim().optional(),
  content: blockNoteContentSchema,
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>

export const updateNoteSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().optional(),
  content: blockNoteContentSchema.optional(),
})

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
