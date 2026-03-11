import { z } from "zod"
import type { CandidatureStatus } from "@prisma/client"

/** Les 6 statuts de candidature définis dans le Design System / PRD. */
export const candidatureStatusSchema = z.enum([
  "CONTACTED_LINKEDIN",
  "PHONE_CONTACT",
  "APPLIED",
  "ACCEPTED",
  "REJECTED_BY_EMPLOYER",
  "REJECTED_BY_CANDIDATE",
] as [CandidatureStatus, ...CandidatureStatus[]])

/** Input pour la mise à jour du statut d'une candidature */
export const updateCandidatureStatusSchema = z.object({
  candidatureId: z.uuid(),
  status: candidatureStatusSchema,
})

export type UpdateCandidatureStatusInput = z.infer<typeof updateCandidatureStatusSchema>

/** Input pour la suppression d'une candidature (dissociation candidat–offre) */
export const deleteCandidatureSchema = z.object({
  candidatureId: z.uuid(),
})

export type DeleteCandidatureInput = z.infer<typeof deleteCandidatureSchema>
