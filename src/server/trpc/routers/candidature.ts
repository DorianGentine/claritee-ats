import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../trpc"
import {
  updateCandidatureStatusSchema,
  deleteCandidatureSchema,
} from "@/lib/validations/candidature"
import { checkMutationRateLimit } from "@/lib/rate-limit"

/**
 * Router pour la gestion des candidatures (statut, dissociation).
 * Les candidatures n'ont pas de companyId direct ; la vérification multi-tenancy
 * passe par le jobOffer parent (jobOffer.companyId = ctx.companyId).
 */
export const candidatureRouter = router({
  /**
   * Met à jour le statut d'une candidature.
   * Vérifie que la candidature appartient au cabinet courant via son offre.
   */
  updateStatus: protectedProcedure
    .input(updateCandidatureStatusSchema)
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id)
      const candidature = await ctx.db.candidature.findFirst({
        where: {
          id: input.candidatureId,
          jobOffer: { companyId: ctx.companyId },
        },
      })
      if (!candidature) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      return ctx.db.candidature.update({
        where: { id: input.candidatureId },
        data: { status: input.status },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      })
    }),

  /**
   * Supprime une candidature (dissociation candidat–offre).
   * Vérifie que la candidature appartient au cabinet courant via son offre.
   */
  delete: protectedProcedure
    .input(deleteCandidatureSchema)
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id)
      const candidature = await ctx.db.candidature.findFirst({
        where: {
          id: input.candidatureId,
          jobOffer: { companyId: ctx.companyId },
        },
      })
      if (!candidature) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      await ctx.db.candidature.delete({
        where: { id: input.candidatureId },
      })

      return { success: true }
    }),
})
