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

export const createNoteSchema = z.object({
  candidateId: z.uuid(),
  content: blockNoteContentSchema,
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>

export const updateNoteSchema = z.object({
  id: z.uuid(),
  content: blockNoteContentSchema,
})

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
