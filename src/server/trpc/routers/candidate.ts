import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
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
  CV_ACCEPTED_MIMES,
  CV_MAX_BYTES,
  FILE_TOO_LARGE_MESSAGE,
  PHOTO_FORMAT_MESSAGE,
  CV_FORMAT_MESSAGE,
  createFileUploadUrlSchema,
  confirmFileUploadSchema,
} from "@/lib/validations/candidate"
import {
  addTagSchema,
  removeTagSchema,
  MAX_TAGS_PER_CANDIDATE,
} from "@/lib/validations/tag"
import { getTagColor } from "@/lib/tag-colors"
import {
  checkRateLimit,
  enforceRateLimit,
  getClientIp,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createCandidateFilePath,
  getCandidateFilePathFromUrl,
  parseCandidateFilePath,
  removeCandidateFiles,
} from "@/server/candidateStorage";

/** Le contenu commence-t-il par ces octets ? */
const startsWith = (buffer: Buffer, bytes: number[]) =>
  buffer.length >= bytes.length &&
  bytes.every((byte, index) => buffer[index] === byte);

/** Magic bytes attendus par extension, pour vérifier que le contenu correspond au format. */
const FILE_SIGNATURES: Record<string, (buffer: Buffer) => boolean> = {
  jpg: (buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]),
  png: (buffer) =>
    startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: (buffer) =>
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP",
  pdf: (buffer) => startsWith(buffer, [0x25, 0x50, 0x44, 0x46]), // %PDF
  doc: (buffer) =>
    startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // OLE
  docx: (buffer) => startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]), // ZIP
};

const MIME_EXTENSIONS: Record<
  (typeof PHOTO_ACCEPTED_MIMES)[number] | (typeof CV_ACCEPTED_MIMES)[number],
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

/** Bucket, taille max et message de format par type de fichier candidat. */
const FILE_KINDS = {
  photo: {
    bucket: "photos",
    maxBytes: PHOTO_MAX_BYTES,
    formatMessage: PHOTO_FORMAT_MESSAGE,
  },
  cv: { bucket: "cvs", maxBytes: CV_MAX_BYTES, formatMessage: CV_FORMAT_MESSAGE },
} as const;

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez.";

/**
 * Rattache des tags à un candidat par leur nom : un tag existant du cabinet est
 * réutilisé sans tenir compte de la casse (« react » → « React »), sinon il est créé.
 */
const attachTagsByName = async (
  tx: Prisma.TransactionClient,
  companyId: string,
  candidateId: string,
  tagNames: string[]
) => {
  // Dédoublonnage sans tenir compte de la casse, en gardant la première graphie
  const uniqueNames = tagNames.filter(
    (name, index) =>
      tagNames.findIndex(
        (otherName) => otherName.toLowerCase() === name.toLowerCase()
      ) === index
  );
  const existingTags = await tx.tag.findMany({
    where: {
      companyId,
      OR: uniqueNames.map((name) => ({
        name: { equals: name, mode: "insensitive" as const },
      })),
    },
  });
  const tagIds: string[] = [];
  for (const name of uniqueNames) {
    const existing = existingTags.find(
      (tag) => tag.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    const created = await tx.tag.create({
      data: { name, color: getTagColor(name), companyId },
    });
    tagIds.push(created.id);
  }
  await tx.candidateTag.createMany({
    data: tagIds.map((tagId) => ({ candidateId, tagId })),
    skipDuplicates: true,
  });
};

/** Génère une URL signée (15 min) pour le CV dans le bucket cvs */
const createCvSignedUrl = async (
  companyId: string,
  candidateId: string,
  cvUrl: string | null,
): Promise<string> => {
  const storagePath = getCandidateFilePathFromUrl(
    "cvs",
    companyId,
    candidateId,
    cvUrl,
  );
  if (!storagePath) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
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
      const cityIds = input.cityIds?.filter(Boolean).length
        ? input.cityIds
        : undefined;
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
        ...(cityIds?.length
          ? [{ cities: { some: { cityId: { in: cityIds } } } }]
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
          photoUrl: true,
          tags: {
            take: 3,
            select: {
              tag: {
                select: { id: true, name: true, color: true },
              },
            },
          },
          cities: {
            orderBy: { order: "asc" },
            take: 1,
            select: {
              city: { select: { id: true, name: true } },
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
          city: c.cities[0]?.city.name ?? null,
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
          cities: {
            orderBy: { order: "asc" },
            include: { city: true },
          },
          candidatures: {
            orderBy: { createdAt: "desc" },
            include: {
              jobOffer: {
                select: { id: true, title: true },
              },
            },
          },
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
   * Photo et CV sont supprimés du Storage avant la ligne : en cas d'échec Storage, le candidat
   * est conservé pour ne pas laisser de fichier orphelin (RGPD).
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
      const supabase = createAdminClient();
      const storageErrors = (
        await Promise.all([
          removeCandidateFiles(supabase, ctx.companyId, input.id, "photos"),
          removeCandidateFiles(supabase, ctx.companyId, input.id, "cvs"),
        ])
      ).filter((error) => error !== null);
      if (storageErrors.length > 0) {
        console.error("[candidate.delete] Storage remove failed:", storageErrors);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Une erreur est survenue. Réessayez.",
        });
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
      const { id, cities, ...rest } = input;
      const existing = await ctx.db.candidate.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const data = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined)
      );

      // Champs scalaires + remplacement des villes dans une seule transaction :
      // sur échec du createMany, le deleteMany est annulé (pas de perte de villes).
      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.candidate.update({ where: { id }, data });

        // Patch-semantics : les villes ne sont touchées que si explicitement fournies.
        // Prisma ne gère pas nativement la mise à jour d'une liste N-N ordonnée →
        // remplacement complet (delete + createMany).
        if (cities !== undefined) {
          await tx.candidateCity.deleteMany({ where: { candidateId: id } });
          if (cities.length > 0) {
            await tx.candidateCity.createMany({
              data: cities.map((cityInput) => ({
                candidateId: id,
                cityId: cityInput.cityId,
                order: cityInput.order,
              })),
            });
          }
        }

        return updated;
      });
    }),

  /**
   * Crée un candidat pour le cabinet de l'utilisateur connecté, avec son
   * parcours éventuel (import LinkedIn). companyId dérivé du contexte uniquement.
   */
  create: protectedProcedure
    .input(createCandidateSchema)
    .mutation(async ({ ctx, input }) => {
      // Candidat + villes ordonnées dans une seule transaction : un échec du
      // createMany annule la création du candidat (pas de candidat orphelin).
      return ctx.db.$transaction(async (tx) => {
        const candidate = await tx.candidate.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email || null,
            phone: input.phone || null,
            linkedinUrl: input.linkedinUrl || null,
            title: input.title || null,
            summary: input.summary || null,
            companyId: ctx.companyId,
          },
        });
        // Parcours optionnel (import LinkedIn) : l'ordre suit celui du profil
        if (input.experiences.length > 0) {
          await tx.experience.createMany({
            data: input.experiences.map((experience, index) => ({
              candidateId: candidate.id,
              title: experience.title,
              company: experience.company,
              startDate: experience.startDate,
              endDate: experience.endDate ?? null,
              description: experience.description?.trim() || null,
              order: index,
            })),
          });
        }
        if (input.formations.length > 0) {
          await tx.formation.createMany({
            data: input.formations.map((formation, index) => ({
              candidateId: candidate.id,
              degree: formation.degree,
              field: formation.field?.trim() || null,
              school: formation.school,
              startDate: formation.startDate ?? null,
              endDate: formation.endDate ?? null,
              order: index,
            })),
          });
        }
        if (input.languages.length > 0) {
          await tx.language.createMany({
            data: input.languages.map((language) => ({
              candidateId: candidate.id,
              name: language.name,
              level: language.level,
            })),
          });
        }
        if (input.tags.length > 0) {
          await attachTagsByName(tx, ctx.companyId, candidate.id, input.tags);
        }
        if (input.cities.length > 0) {
          await tx.candidateCity.createMany({
            data: input.cities.map((cityInput) => ({
              candidateId: candidate.id,
              cityId: cityInput.cityId,
              order: cityInput.order,
            })),
          });
        }
        return candidate;
      });
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
   * Prépare l'upload d'une photo ou d'un CV : vérifie le candidat, le format et la
   * taille annoncée, puis renvoie une URL d'upload signée vers un chemin unique.
   * Le navigateur envoie le fichier directement à Supabase Storage (sans transiter
   * par la fonction serverless), puis appelle `confirmFileUpload`.
   * Rate limit : 30 uploads / heure par utilisateur, photo et CV confondus.
   */
  createFileUploadUrl: protectedProcedure
    .input(createFileUploadUrlSchema)
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(
        `upload:${ctx.user.id}`,
        RATE_LIMITS.UPLOAD_PER_USER,
      );

      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { bucket } = FILE_KINDS[input.kind];
      const path = createCandidateFilePath(
        ctx.companyId,
        input.candidateId,
        bucket,
        MIME_EXTENSIONS[input.mimeType],
      );
      const { data, error } = await createAdminClient()
        .storage.from(bucket)
        .createSignedUploadUrl(path);
      if (error || !data) {
        console.error("[createFileUploadUrl] Supabase Storage error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: GENERIC_ERROR_MESSAGE,
        });
      }
      return { bucket, path: data.path, token: data.token };
    }),

  /**
   * Finalise un upload : revérifie le fichier réellement stocké (taille, signature
   * binaire), met à jour la fiche puis supprime les fichiers précédents du candidat.
   * Un fichier refusé est supprimé du Storage.
   */
  confirmFileUpload: protectedProcedure
    .input(confirmFileUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const candidate = await ctx.db.candidate.findFirst({
        where: { id: input.candidateId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { bucket, maxBytes, formatMessage } = FILE_KINDS[input.kind];
      const parsedPath = parseCandidateFilePath(bucket, input.path);
      if (
        parsedPath?.companyId !== ctx.companyId ||
        parsedPath.candidateId !== input.candidateId
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: GENERIC_ERROR_MESSAGE });
      }

      const supabase = createAdminClient();
      const { data: storedFile, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(input.path);
      if (downloadError || !storedFile) {
        console.error("[confirmFileUpload] Supabase Storage error:", downloadError);
        throw new TRPCError({ code: "BAD_REQUEST", message: GENERIC_ERROR_MESSAGE });
      }

      const buffer = Buffer.from(await storedFile.arrayBuffer());
      const hasValidSignature =
        FILE_SIGNATURES[parsedPath.extension]?.(buffer) ?? false;
      const rejectionMessage =
        buffer.length > maxBytes
          ? FILE_TOO_LARGE_MESSAGE
          : hasValidSignature
            ? null
            : formatMessage;
      if (rejectionMessage) {
        const { error: removeError } = await supabase.storage
          .from(bucket)
          .remove([input.path]);
        if (removeError) {
          console.warn("[confirmFileUpload] Rejected file removal failed:", removeError);
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: rejectionMessage });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(input.path);
      const updated = await ctx.db.candidate.update({
        where: { id: input.candidateId },
        data:
          input.kind === "photo"
            ? { photoUrl: publicUrl }
            : { cvUrl: publicUrl, cvFileName: input.fileName },
      });

      // Relecture : si un autre upload a été confirmé entre-temps, c'est son
      // fichier (celui que la fiche référence) qui est conservé.
      const current = await ctx.db.candidate.findUnique({
        where: { id: input.candidateId },
        select: { photoUrl: true, cvUrl: true },
      });
      const currentPath = getCandidateFilePathFromUrl(
        bucket,
        ctx.companyId,
        input.candidateId,
        (input.kind === "photo" ? current?.photoUrl : current?.cvUrl) ?? null,
      );
      const cleanupError = await removeCandidateFiles(
        supabase,
        ctx.companyId,
        input.candidateId,
        bucket,
        currentPath ?? input.path,
      );
      if (cleanupError) {
        console.warn("[confirmFileUpload] Previous file removal failed:", cleanupError);
      }
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
        const error = await removeCandidateFiles(
          createAdminClient(),
          ctx.companyId,
          input.candidateId,
          "cvs",
        );
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
        candidate.cvUrl,
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
      const rateResult = await checkRateLimit(
        `cv-share:${getClientIp(ctx.headers)}`,
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
        candidate.cvUrl,
      );
      return { url };
    }),
});
