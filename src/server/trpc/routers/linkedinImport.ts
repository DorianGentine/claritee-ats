import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { linkedinPreviewInputSchema } from "@/lib/validations/candidate";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getLinkedInPublicIdentifier,
  type LinkedInProfileDraft,
} from "@/lib/linkedin/profile";
import {
  fetchLinkedInProfile,
  isLinkedInImportConfigured,
  LinkedInImportError,
} from "@/server/linkedin/apify";

const PROVIDER_FAILURE_MESSAGE =
  "Le service d'import LinkedIn ne répond pas. Réessayez plus tard ou saisissez la fiche à la main.";

/** Import d'un profil LinkedIn via Apify : prévisualisation avant création. */
export const linkedinImportRouter = router({
  /** L'import n'est proposé que si APIFY_TOKEN est configuré côté serveur. */
  status: protectedProcedure.query(() => ({
    enabled: isLinkedInImportConfigured(),
  })),

  /**
   * Récupère le profil et renvoie un brouillon de fiche (rien n'est enregistré),
   * ainsi que le candidat existant du cabinet ayant le même profil LinkedIn.
   */
  preview: protectedProcedure
    .input(linkedinPreviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      const rateLimit = await checkRateLimit(
        `linkedin-import:${ctx.user.id}`,
        RATE_LIMITS.LINKEDIN_IMPORT_PER_USER.limit,
        RATE_LIMITS.LINKEDIN_IMPORT_PER_USER.windowMs
      );
      if (!rateLimit.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop d'imports LinkedIn. Réessayez dans une heure.",
        });
      }

      let draft: LinkedInProfileDraft | null;
      try {
        ({ draft } = await fetchLinkedInProfile(input.linkedinUrl));
      } catch (error) {
        if (!(error instanceof LinkedInImportError)) throw error;
        console.error("LinkedIn import failed:", error.code, error.message);
        if (error.code === "NOT_CONFIGURED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "L'import LinkedIn n'est pas configuré.",
          });
        }
        if (error.code === "PROFILE_NOT_FOUND") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil LinkedIn introuvable ou non public.",
          });
        }
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: PROVIDER_FAILURE_MESSAGE,
        });
      }

      if (!draft) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil LinkedIn introuvable ou non public.",
        });
      }

      const publicIdentifier =
        getLinkedInPublicIdentifier(draft.linkedinUrl) ??
        getLinkedInPublicIdentifier(input.linkedinUrl);
      // Pré-filtre SQL large (« /in/jean » trouve aussi « /in/jeanne »), puis
      // comparaison exacte de l'identifiant public.
      const candidatesWithSimilarUrl = publicIdentifier
        ? await ctx.db.candidate.findMany({
          where: {
            companyId: ctx.companyId,
            linkedinUrl: {
              contains: `/in/${publicIdentifier}`,
              mode: "insensitive",
            },
          },
          select: { id: true, firstName: true, lastName: true, linkedinUrl: true },
          take: 20,
        })
        : [];
      const duplicateCandidate = candidatesWithSimilarUrl.find(
        (candidate) =>
          candidate.linkedinUrl !== null &&
          getLinkedInPublicIdentifier(candidate.linkedinUrl) === publicIdentifier
      );
      const duplicate = duplicateCandidate
        ? {
          id: duplicateCandidate.id,
          firstName: duplicateCandidate.firstName,
          lastName: duplicateCandidate.lastName,
        }
        : null;

      return { draft, duplicate };
    }),
});
