import { z } from "zod"

export const shareLinkTypeSchema = z.enum(["NORMAL", "ANONYMOUS"])
export type ShareLinkType = z.infer<typeof shareLinkTypeSchema>

export const shareLinkExpirationSchema = z.enum(["7d", "30d", "never"])
export type ShareLinkExpiration = z.infer<typeof shareLinkExpirationSchema>

export const createShareLinkSchema = z.object({
  candidateId: z.uuid(),
  type: shareLinkTypeSchema,
  expiration: shareLinkExpirationSchema.default("30d"),
})

export const listShareLinksByCandidateSchema = z.object({
  candidateId: z.uuid(),
})

export const EXPIRATION_LABELS: Record<ShareLinkExpiration, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  never: "Jamais",
}

export const TYPE_LABELS: Record<ShareLinkType, string> = {
  NORMAL: "Fiche complète",
  ANONYMOUS: "Fiche anonymisée",
}
