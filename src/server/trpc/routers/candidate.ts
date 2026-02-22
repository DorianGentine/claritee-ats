import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import {
  candidateListInputSchema,
  createCandidateSchema,
  updateCandidateSchema,
  addLanguageSchema,
  removeLanguageSchema,
  addExperienceSchema,
  updateExperienceSchema,
  deleteExperienceSchema,
  addFormationSchema,
  updateFormationSchema,
  deleteFormationSchema,
  PHOTO_ACCEPTED_MIMES,
  PHOTO_MAX_BYTES,
  uploadPhotoSchema,
  CV_ACCEPTED_MIMES,
  CV_MAX_BYTES,
  uploadCvSchema,
} from "@/lib/validations/candidate"
import {
  addTagSchema,
  removeTagSchema,
  MAX_TAGS_PER_CANDIDATE,
} from "@/lib/validations/tag"
import { getTagColor } from "@/lib/tag-colors"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/** Magic bytes PDF (%PDF) */
const PDF_SIGNATURE = (buf: Buffer) =>
  buf.length >= 4 &&
  buf[0] === 0x25 &&
  buf[1] === 0x50 &&
  buf[2] === 0x44 &&
  buf[3] === 0x46;

/** Magic bytes pour valider que le contenu correspond au type déclaré */
const IMAGE_SIGNATURES: Record<
  (typeof PHOTO_ACCEPTED_MIMES)[number],
  (buf: Buffer) => boolean
> = {
  "image/jpeg": (buf) =>
    buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  "image/png": (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a,
  "image/webp": (buf) =>
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50,
};

/** Dérive l'extension valide pour le chemin Storage CV */
const getCvStorageExt = (cvFileName: string | null): string => {
  const ext = cvFileName?.split(".").pop()?.toLowerCase();
  return ["pdf", "doc", "docx"].includes(ext ?? "") ? (ext as string) : "pdf";
};

/** Génère une URL signée (15 min) pour le CV dans le bucket cvs */
const createCvSignedUrl = async (
  companyId: string,
  candidateId: string,
  cvFileName: string | null,
): Promise<string> => {
  const ext = getCvStorageExt(cvFileName);
  const storagePath = `${companyId}/candidates/${candidateId}/cv.${ext}`;
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("cvs")
    .createSignedUrl(storagePath, 15 * 60);
  if (error) {
    console.error("[createCvSignedUrl] Supabase error:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Une erreur est survenue. Réessayez.",
    });
  }
  if (!data?.signedUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Une erreur est survenue. Réessayez.",
    });
  }
  return data.signedUrl;
};

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

      const tagIds = input.tagIds?.filter(Boolean).length
        ? input.tagIds
        : undefined;
      const city = input.city;
      const languageNames = input.languageNames?.filter(Boolean).length
        ? input.languageNames
        : undefined;

      const whereConditions = [
        { companyId: ctx.companyId },
        ...(tagIds?.length
          ? tagIds.map((tagId) => ({
              tags: { some: { tagId } },
            }))
          : []),
        ...(city
          ? [{ city: { contains: city, mode: "insensitive" as const } }]
          : []),
        ...(languageNames?.length
          ? languageNames.map((name) => ({
              languages: {
                some: {
                  name: { equals: name, mode: "insensitive" as const },
                },
              },
            }))
          : []),
      ];

      const candidates = await ctx.db.candidate.findMany({
        where: { AND: whereConditions },
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
   * Retourne les noms de langues distincts des candidats du cabinet (pour filtre).
   */
  listDistinctLanguageNames: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.language.findMany({
      where: {
        candidate: { companyId: ctx.companyId },
      },
      distinct: ["name"],
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => r.name);
  }),

  /**
   * Retourne les villes distinctes non nulles des candidats du cabinet (pour autocomplete filtre).
   */
  listDistinctCities: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.candidate.findMany({
      where: {
        companyId: ctx.companyId,
        city: { not: null },
      },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    });
    return rows
      .map((r) => r.city)
      .filter((c): c is string => typeof c === "string" && c.length > 0);
  }),

  /**
   * Récupère un candidat par id avec toutes les relations nécessaires au layout CV.
   * NOT_FOUND si absent ou autre cabinet.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          experiences: { orderBy: [{ endDate: "desc" }, { startDate: "desc" }] },
          formations: { orderBy: [{ endDate: "desc" }, { startDate: "desc" }] },
          languages: true,
          tags: { include: { tag: true } },
        },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return {
        ...candidate,
        tags: candidate.tags.map((ct) => ct.tag),
      };
    }),

  /**
   * Supprime un candidat du cabinet. Vérifie companyId ; cascade Prisma gère les relations.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.candidate.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.candidate.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Met à jour les champs modifiables d'un candidat (infos de base).
   * Vérifie que le candidat appartient au cabinet.
   */
  update: protectedProcedure
    .input(updateCandidateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const existing = await ctx.db.candidate.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const data = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined)
      );
      return ctx.db.candidate.update({ where: { id }, data });
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
   * Ajoute une langue au profil d'un candidat.
   * Vérifie que le candidat appartient au cabinet.
   */
  addLanguage: protectedProcedure
    .input(addLanguageSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.language.create({
        data: {
          candidateId: input.candidateId,
          name: input.name.trim(),
          level: input.level,
        },
      });
    }),

  /**
   * Supprime une langue du profil d'un candidat.
   * Vérifie que le candidat appartient au cabinet et que la langue lui est bien rattachée.
   */
  removeLanguage: protectedProcedure
    .input(removeLanguageSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const language = await ctx.db.language.findFirst({
        where: { id: input.languageId, candidateId: input.candidateId },
      });
      if (!language) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.language.delete({ where: { id: input.languageId } });
      return { success: true };
    }),

  /**
   * Ajoute une expérience professionnelle à un candidat.
   * Vérifie que le candidat appartient au cabinet. Expériences triées par startDate desc côté getById.
   */
  addExperience: protectedProcedure
    .input(addExperienceSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.experience.create({
        data: {
          candidateId: input.candidateId,
          title: input.title,
          company: input.company,
          startDate: input.startDate,
          endDate: input.endDate ?? null,
          description: input.description ?? null,
        },
      });
    }),

  /**
   * Met à jour une expérience d'un candidat.
   * Vérifie que le candidat appartient au cabinet et que l'expérience lui est rattachée.
   */
  updateExperience: protectedProcedure
    .input(updateExperienceSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const experience = await ctx.db.experience.findFirst({
        where: { id: input.experienceId, candidateId: input.candidateId },
      });
      if (!experience) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const { candidateId: _cid, experienceId, ...data } = input;
      return ctx.db.experience.update({
        where: { id: experienceId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.company !== undefined && { company: data.company }),
          ...(data.startDate !== undefined && { startDate: data.startDate }),
          ...(data.endDate !== undefined && { endDate: data.endDate }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
        },
      });
    }),

  /**
   * Supprime une expérience d'un candidat.
   * Vérifie que le candidat appartient au cabinet et que l'expérience lui est rattachée.
   */
  deleteExperience: protectedProcedure
    .input(deleteExperienceSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const experience = await ctx.db.experience.findFirst({
        where: { id: input.experienceId, candidateId: input.candidateId },
      });
      if (!experience) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.experience.delete({ where: { id: input.experienceId } });
      return { success: true };
    }),

  /**
   * Ajoute une formation à un candidat.
   * Vérifie que le candidat appartient au cabinet. Formations triées par startDate desc côté getById.
   */
  addFormation: protectedProcedure
    .input(addFormationSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.formation.create({
        data: {
          candidateId: input.candidateId,
          degree: input.degree,
          field: input.field ?? null,
          school: input.school,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
        },
      });
    }),

  /**
   * Met à jour une formation d'un candidat.
   * Vérifie que le candidat appartient au cabinet et que la formation lui est rattachée.
   */
  updateFormation: protectedProcedure
    .input(updateFormationSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const formation = await ctx.db.formation.findFirst({
        where: { id: input.formationId, candidateId: input.candidateId },
      });
      if (!formation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const { candidateId: _cid, formationId, ...data } = input;
      return ctx.db.formation.update({
        where: { id: formationId },
        data: {
          ...(data.degree !== undefined && { degree: data.degree }),
          ...(data.field !== undefined && { field: data.field }),
          ...(data.school !== undefined && { school: data.school }),
          ...(data.startDate !== undefined && { startDate: data.startDate }),
          ...(data.endDate !== undefined && { endDate: data.endDate }),
        },
      });
    }),

  /**
   * Supprime une formation d'un candidat.
   * Vérifie que le candidat appartient au cabinet et que la formation lui est rattachée.
   */
  deleteFormation: protectedProcedure
    .input(deleteFormationSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const formation = await ctx.db.formation.findFirst({
        where: { id: input.formationId, candidateId: input.candidateId },
      });
      if (!formation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.formation.delete({ where: { id: input.formationId } });
      return { success: true };
    }),

  /**
   * Ajoute un tag à un candidat.
   * Si le tag n'existe pas pour le cabinet, le crée avec une couleur issue de la palette.
   * Max 20 tags par candidat.
   */
  addTag: protectedProcedure
    .input(addTagSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
        include: { tags: true },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (candidate.tags.length >= MAX_TAGS_PER_CANDIDATE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Maximum 20 tags par élément. Supprimez un tag existant pour en ajouter un nouveau.",
        });
      }
      const tagName = input.tagName;
      let tag = await ctx.db.tag.findUnique({
        where: {
          name_companyId: { name: tagName, companyId: ctx.companyId },
        },
      });
      if (!tag) {
        tag = await ctx.db.tag.create({
          data: {
            name: tagName,
            color: getTagColor(tagName),
            companyId: ctx.companyId,
          },
        });
      }
      const existingLink = await ctx.db.candidateTag.findUnique({
        where: {
          candidateId_tagId: {
            candidateId: input.candidateId,
            tagId: tag.id,
          },
        },
      });
      if (existingLink) {
        return { tag };
      }
      await ctx.db.candidateTag.create({
        data: { candidateId: input.candidateId, tagId: tag.id },
      });
      return { tag };
    }),

  /**
   * Supprime un tag d'un candidat.
   * Vérifie que le candidat appartient au cabinet et que le tag lui est associé.
   */
  removeTag: protectedProcedure
    .input(removeTagSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const existing = await ctx.db.candidateTag.findUnique({
        where: {
          candidateId_tagId: {
            candidateId: input.candidateId,
            tagId: input.tagId,
          },
        },
        include: { tag: true },
      });
      if (!existing || existing.tag.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.candidateTag.delete({
        where: {
          candidateId_tagId: {
            candidateId: input.candidateId,
            tagId: input.tagId,
          },
        },
      });
      return { success: true };
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

      const isValidSignature = IMAGE_SIGNATURES[input.mimeType];
      if (isValidSignature && !isValidSignature(buffer)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Format de fichier non supporté. Formats acceptés : JPG, PNG, WebP.",
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
        console.error("[uploadPhoto] Supabase Storage error:", error);
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

  /**
   * Upload un CV pour un candidat existant.
   * Rate limit : 30 uploads/heure par utilisateur (partagé avec photo). Formats : PDF, DOC, DOCX. Max 5 Mo.
   */
  uploadCv: protectedProcedure
    .input(uploadCvSchema)
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
      if (buffer.length > CV_MAX_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Le fichier dépasse la taille maximale autorisée (2 Mo pour les photos, 5 Mo pour les CVs).",
        });
      }

      if (input.mimeType === "application/pdf" && !PDF_SIGNATURE(buffer)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Format de fichier non supporté. Formats acceptés : PDF, DOC, DOCX.",
        });
      }

      const extMap: Record<(typeof CV_ACCEPTED_MIMES)[number], string> = {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          "docx",
      };
      const ext = extMap[input.mimeType];
      const storagePath = `${ctx.companyId}/candidates/${input.candidateId}/cv.${ext}`;

      const supabase = createAdminClient();
      const { error } = await supabase.storage
        .from("cvs")
        .upload(storagePath, buffer, {
          contentType: input.mimeType,
          upsert: true,
        });

      if (error) {
        console.error("[uploadCv] Supabase Storage error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Une erreur est survenue. Réessayez.",
        });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("cvs").getPublicUrl(storagePath);

      const updated = await ctx.db.candidate.update({
        where: { id: input.candidateId },
        data: { cvUrl: publicUrl, cvFileName: input.fileName },
      });
      return updated;
    }),

  /**
   * Supprime le CV d'un candidat. Retire le fichier du bucket et met à jour le record.
   */
  deleteCv: protectedProcedure
    .input(z.object({ candidateId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (candidate.cvUrl || candidate.cvFileName) {
        const ext =
          candidate.cvFileName?.split(".").pop()?.toLowerCase();
        const validExt = ["pdf", "doc", "docx"].includes(ext ?? "")
          ? ext
          : "pdf";
        const storagePath = `${ctx.companyId}/candidates/${input.candidateId}/cv.${validExt}`;
        const supabase = createAdminClient();
        const { error } = await supabase.storage.from("cvs").remove([storagePath]);
        if (error) {
          console.warn("[deleteCv] Storage remove failed (continuing):", error);
        }
      }

      await ctx.db.candidate.update({
        where: { id: input.candidateId },
        data: { cvUrl: null, cvFileName: null },
      });
      return { success: true };
    }),

  /**
   * Retourne une URL signée (15 min) pour télécharger le CV.
   * Pour utilisateurs authentifiés (fiche candidat).
   */
  getCvDownloadUrl: protectedProcedure
    .input(z.object({ candidateId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
        select: { cvUrl: true, cvFileName: true },
      });
      if (!candidate || !candidate.cvUrl) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const url = await createCvSignedUrl(
        ctx.companyId,
        input.candidateId,
        candidate.cvFileName,
      );
      return { url };
    }),

  /**
   * Retourne une URL signée (15 min) pour télécharger le CV via un lien de partage.
   * Procédure publique ; valide le token et l'expiration. Rate limit par IP.
   */
  getCvDownloadUrlByShareToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const ip =
        ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        ctx.headers?.get("x-real-ip") ??
        "unknown";
      const rateResult = await checkRateLimit(
        `cv-share:${ip}`,
        RATE_LIMITS.CV_DOWNLOAD_SHARE_PER_IP.limit,
        RATE_LIMITS.CV_DOWNLOAD_SHARE_PER_IP.windowMs,
      );
      if (!rateResult.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop de requêtes. Réessayez dans quelques minutes.",
        });
      }
      const shareLink = await ctx.db.shareLink.findUnique({
        where: { token: input.token },
        include: { candidate: true },
      });
      if (!shareLink) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (
        shareLink.expiresAt &&
        shareLink.expiresAt.getTime() < Date.now()
      ) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const candidate = shareLink.candidate;
      if (!candidate.cvUrl) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const url = await createCvSignedUrl(
        candidate.companyId,
        candidate.id,
        candidate.cvFileName,
      );
      return { url };
    }),
});
