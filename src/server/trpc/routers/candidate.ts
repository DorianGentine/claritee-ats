import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import {
  candidateListInputSchema,
  createCandidateSchema,
  PHOTO_ACCEPTED_MIMES,
  PHOTO_MAX_BYTES,
  uploadPhotoSchema,
} from "@/lib/validations/candidate";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const candidateRouter = router({
  /**
   * Liste paginée des candidats du cabinet (cursor-based).
   * Tri par création décroissante ; RLS + filtre companyId.
   */
  list: protectedProcedure
    .input(candidateListInputSchema)
    .query(async ({ ctx, input }) => {
      const limit = input.limit;
      const take = limit + 1;

      const candidates = await ctx.db.candidate.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { createdAt: "desc" },
        take,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          city: true,
          photoUrl: true,
          tags: {
            take: 3,
            select: {
              tag: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        },
      });

      const hasMore = candidates.length > limit;
      const items = hasMore ? candidates.slice(0, limit) : candidates;
      const nextCursor =
        items.length > 0 && hasMore ? items[items.length - 1]?.id : null;

      return {
        items: items.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          city: c.city,
          photoUrl: c.photoUrl,
          tags: c.tags.map((ct) => ct.tag),
        })),
        nextCursor,
        hasMore: !!nextCursor,
      };
    }),

  /**
   * Crée un candidat pour le cabinet de l'utilisateur connecté.
   * companyId dérivé du contexte uniquement.
   */
  create: protectedProcedure
    .input(createCandidateSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email || null,
          phone: input.phone || null,
          linkedinUrl: input.linkedinUrl || null,
          title: input.title || null,
          city: input.city || null,
          companyId: ctx.companyId,
        },
      });
      return candidate;
    }),

  /**
   * Upload une photo pour un candidat existant.
   * Rate limit : 30 uploads/heure par utilisateur. Formats : JPG, PNG, WebP. Max 2 Mo.
   */
  uploadPhoto: protectedProcedure
    .input(uploadPhotoSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const rateResult = await checkRateLimit(
        `upload:${userId}`,
        RATE_LIMITS.UPLOAD_PER_USER.limit,
        RATE_LIMITS.UPLOAD_PER_USER.windowMs,
      );
      if (!rateResult.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop de requêtes. Réessayez dans quelques minutes.",
        });
      }

      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const buffer = Buffer.from(input.fileBase64, "base64");
      if (buffer.length > PHOTO_MAX_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Le fichier dépasse la taille maximale autorisée (2 Mo pour les photos, 5 Mo pour les CVs).",
        });
      }

      const extMap: Record<(typeof PHOTO_ACCEPTED_MIMES)[number], string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const ext = extMap[input.mimeType];
      const storagePath = `${ctx.companyId}/candidates/${input.candidateId}/photo.${ext}`;

      const supabase = createAdminClient();
      const { error } = await supabase.storage
        .from("photos")
        .upload(storagePath, buffer, {
          contentType: input.mimeType,
          upsert: true,
        });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Une erreur est survenue. Réessayez.",
        });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("photos").getPublicUrl(storagePath);

      const updated = await ctx.db.candidate.update({
        where: { id: input.candidateId },
        data: { photoUrl: publicUrl },
      });
      return updated;
    }),
});
