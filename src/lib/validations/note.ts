import { z } from "zod"
import { parseNoteContent } from "@/lib/note-utils"

/** Taille max du contenu JSON (document Tiptap) — limite DoS */
const NOTE_CONTENT_MAX_BYTES = 500_000 // 500 Ko

/** Valide que content est un document Tiptap sérialisé (`{ "type": "doc", … }`) */
const noteContentSchema = z
  .string()
  .min(1, "La note ne peut pas être vide")
  .max(NOTE_CONTENT_MAX_BYTES, "La note dépasse la taille maximale autorisée")
  .refine((content) => parseNoteContent(content) !== null, {
    message: "Format de contenu invalide",
  })

/** Schéma pour les notes liées à un candidat (Story 3.9) ou notes libres (Story 3.11) */
export const createNoteSchema = z.object({
  candidateId: z.uuid().optional(),
  offerId: z.uuid().optional(),
  title: z.string().trim().optional(),
  content: noteContentSchema,
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>

export const updateNoteSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().optional(),
  content: noteContentSchema.optional(),
})

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
