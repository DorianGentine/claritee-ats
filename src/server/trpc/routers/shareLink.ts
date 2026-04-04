import { TRPCError } from "@trpc/server"
import { randomUUID } from "crypto"
import { router, protectedProcedure } from "../trpc"
import {
  createShareLinkSchema,
  listShareLinksByCandidateSchema,
  type ShareLinkExpiration,
} from "@/lib/validations/shareLink"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

const computeExpiresAt = (expiration: ShareLinkExpiration): Date | null => {
  if (expiration === "never") return null
  const ms =
    expiration === "7d"
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000
  return new Date(Date.now() + ms)
}

export const shareLinkRouter = router({
  /**
   * Crée un lien de partage pour un candidat du cabinet courant.
   * Rate limit : 20 créations par utilisateur par heure.
   */
  create: protectedProcedure
    .input(createShareLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const rl = await checkRateLimit(
        // user is guaranteed non-null when companyId is set (see context.ts)
        `share-link:${ctx.user!.id}`,
        RATE_LIMITS.SHARE_LINK_PER_USER.limit,
        RATE_LIMITS.SHARE_LINK_PER_USER.windowMs
      )
      if (!rl.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop de requêtes. Réessayez dans quelques minutes.",
        })
      }

      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
        select: { id: true },
      })
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const token = randomUUID().replace(/-/g, "")
      const expiresAt = computeExpiresAt(input.expiration)

      return ctx.db.shareLink.create({
        data: {
          candidateId: input.candidateId,
          token,
          type: input.type,
          expiresAt,
        },
      })
    }),

  /**
   * Liste tous les liens de partage d'un candidat pour le cabinet courant,
   * triés par createdAt desc.
   */
  listByCandidate: protectedProcedure
    .input(listShareLinksByCandidateSchema)
    .query(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
        select: { id: true },
      })
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      return ctx.db.shareLink.findMany({
        where: { candidateId: input.candidateId },
        orderBy: { createdAt: "desc" },
      })
    }),
})
