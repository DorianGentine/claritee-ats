import { TRPCError } from "@trpc/server"
import { z } from "zod"
import type { CandidatureStatus, Prisma } from "@prisma/client"
import { router, protectedProcedure } from "../trpc"
import { checkMutationRateLimit } from "@/lib/rate-limit"
import {
  offerListInputSchema,
  createJobOfferSchema,
  updateJobOfferSchema,
  addCandidatesSchema,
  type JobOfferStatus,
} from "@/lib/validations/offer"
import {
  addOfferTagSchema,
  removeOfferTagSchema,
  MAX_TAGS_PER_OFFER,
} from "@/lib/validations/tag"
import { getTagColor } from "@/lib/tag-colors"

/** Résultat create/update avec clientContactId dérivé (pour typage explicite côté appelant). */
export type OfferMutationResult = {
  id: string
  title: string
  status: JobOfferStatus
  clientCompanyId: string | null
  clientContactId: string | null
  cityId: string | null
  salaryMin: number | null
  salaryMax: number | null
}

export const offerRouter = router({
  /**
   * Liste paginée des offres du cabinet courant.
   * Tri par défaut : createdAt desc. Optionnel : sortBy (createdAt | status), sortOrder (asc | desc).
   */
  list: protectedProcedure
    .input(offerListInputSchema)
    .query(async ({ ctx, input }) => {
      const {
        page,
        pageSize,
        sortBy,
        sortOrder,
        statuses,
        tagIds,
        salaryMin,
        salaryMax,
        clientCompanyId,
        cityId,
      } = input
      const skip = (page - 1) * pageSize

      const where: Prisma.JobOfferWhereInput = {
        companyId: ctx.companyId,
      }

      if (statuses && statuses.length > 0) {
        where.status = { in: statuses }
      }

      if (tagIds && tagIds.length > 0) {
        where.AND = tagIds.map((tagId) => ({
          tags: { some: { tagId } },
        }))
      }

      if (salaryMin !== undefined) {
        where.salaryMax = { gte: salaryMin }
      }
      if (salaryMax !== undefined) {
        where.salaryMin = { lte: salaryMax }
      }

      if (clientCompanyId) {
        where.clientCompanyId = clientCompanyId
      }

      if (cityId) {
        where.cityId = cityId
      }

      const [items, totalCount] = await Promise.all([
        ctx.db.jobOffer.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: pageSize,
          select: {
            id: true,
            title: true,
            cityId: true,
            city: {
              select: { name: true },
            },
            salaryMin: true,
            salaryMax: true,
            status: true,
            createdAt: true,
            clientCompany: {
              select: { name: true },
            },
            tags: {
              take: 4,
              include: {
                tag: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
            _count: { select: { tags: true } },
          },
        }),
        ctx.db.jobOffer.count({ where }),
      ])
      return {
        items: items.map((o) => ({
          id: o.id,
          title: o.title,
          cityName: o.city?.name ?? null,
          salaryMin: o.salaryMin,
          salaryMax: o.salaryMax,
          status: o.status,
          createdAt: o.createdAt,
          clientCompanyName: o.clientCompany?.name ?? null,
          tags: o.tags.map((ot) => ot.tag),
          tagCount: o._count.tags,
        })),
        totalCount,
        page,
        pageSize,
      }
    }),

  /**
   * Récupère une offre par id pour le cabinet courant.
   * Inclut clientCompany, clientContact, tags, candidatures avec candidate, et les comptes par statut.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const offer = await ctx.db.jobOffer.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          city: {
            select: { id: true, name: true, region: true, country: true },
          },
          clientCompany: {
            select: { id: true, name: true },
          },
          clientContact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              position: true,
            },
          },
          tags: {
            include: {
              tag: {
                select: { id: true, name: true, color: true },
              },
            },
          },
          candidatures: {
            include: {
              candidate: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  title: true,
                  photoUrl: true,
                },
              },
            },
          },
        },
      })
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const candidatureCountByStatus = offer.candidatures.reduce<
        Partial<Record<CandidatureStatus, number>>
      >((acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1
        return acc
      }, {})

      return {
        ...offer,
        tags: offer.tags.map((ot) => ot.tag),
        candidatures: offer.candidatures.map((c) => ({
          id: c.id,
          status: c.status,
          candidate: c.candidate,
        })),
        candidatureCountByStatus,
      }
    }),

  /**
   * Création d'une nouvelle offre pour le cabinet courant.
   */
  create: protectedProcedure
    .input(createJobOfferSchema)
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id)
      const { clientCompanyId, clientContactId, cityId, ...rest } = input
      let resolvedClientCompanyId: string | null | undefined = clientCompanyId
      let resolvedClientContactId: string | null | undefined = clientContactId
      if (clientCompanyId) {
        const clientCompany = await ctx.db.clientCompany.findFirst({
          where: { id: clientCompanyId, companyId: ctx.companyId },
          select: { id: true },
        })
        if (!clientCompany) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Client invalide.",
          })
        }
      }

      if (clientContactId) {
        const contact = await ctx.db.clientContact.findFirst({
          where: {
            id: clientContactId,
            clientCompany: { companyId: ctx.companyId },
          },
          select: { id: true, clientCompanyId: true },
        })
        if (!contact) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Contact client invalide.",
          })
        }

        if (resolvedClientCompanyId && contact.clientCompanyId !== resolvedClientCompanyId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Le contact sélectionné n'appartient pas au client.",
          })
        }

        // Si aucun client explicite n'est fourni mais que le contact est valide,
        // on aligne automatiquement le client sur celui du contact.
        if (!resolvedClientCompanyId) {
          resolvedClientCompanyId = contact.clientCompanyId
        }

        resolvedClientContactId = contact.id
      }

      const created = await ctx.db.jobOffer.create({
        data: {
          ...rest,
          company: { connect: { id: ctx.companyId } },
          ...(cityId != null && {
            city: { connect: { id: cityId } },
          }),
          ...(resolvedClientCompanyId != null && {
            clientCompany: { connect: { id: resolvedClientCompanyId } },
          }),
          ...(resolvedClientContactId != null && {
            clientContact: { connect: { id: resolvedClientContactId } },
          }),
        },
        select: {
          id: true,
          title: true,
          status: true,
          clientCompanyId: true,
          clientContact: { select: { id: true } },
          cityId: true,
          salaryMin: true,
          salaryMax: true,
        },
      })
      const createdWithContact = created as { clientContact?: { id: string } | null }
      return {
        ...created,
        clientContactId: createdWithContact.clientContact?.id ?? null,
      }
    }),

  /**
   * Mise à jour partielle d'une offre du cabinet courant.
   */
  update: protectedProcedure
    .input(updateJobOfferSchema)
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id)
      const { id, clientCompanyId, clientContactId, cityId, ...rest } = input
      const existing = await ctx.db.jobOffer.findFirst({
        where: { id, companyId: ctx.companyId },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      let resolvedClientCompanyId: string | null | undefined = clientCompanyId
      let resolvedClientContactId: string | null | undefined = clientContactId
      if (clientCompanyId !== undefined && clientCompanyId !== null) {
        const clientCompany = await ctx.db.clientCompany.findFirst({
          where: { id: clientCompanyId, companyId: ctx.companyId },
          select: { id: true },
        })
        if (!clientCompany) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Client invalide.",
          })
        }
      }

      if (clientContactId !== undefined) {
        if (clientContactId === null) {
          resolvedClientContactId = null
        } else {
          const contact = await ctx.db.clientContact.findFirst({
            where: {
              id: clientContactId,
              clientCompany: { companyId: ctx.companyId },
            },
            select: { id: true, clientCompanyId: true },
          })
          if (!contact) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Contact client invalide.",
            })
          }

          if (
            resolvedClientCompanyId &&
            contact.clientCompanyId !== resolvedClientCompanyId
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Le contact sélectionné n'appartient pas au client.",
            })
          }

          if (!resolvedClientCompanyId) {
            resolvedClientCompanyId = contact.clientCompanyId
          }

          resolvedClientContactId = contact.id
        }
      }

      if (
        resolvedClientCompanyId === null &&
        clientContactId === undefined
      ) {
        resolvedClientContactId = null
      }

      const data: {
        title?: string
        description?: string | null
        salaryMin?: number | null
        salaryMax?: number | null
        status?: JobOfferStatus
        city?: { connect: { id: string } } | { disconnect: true }
        clientCompany?: { connect: { id: string } } | { disconnect: true }
        clientContact?: { connect: { id: string } } | { disconnect: true }
      } = { ...rest }

      if (cityId !== undefined) {
        data.city = cityId != null ? { connect: { id: cityId } } : { disconnect: true }
      }

      if (resolvedClientCompanyId !== undefined) {
        data.clientCompany =
          resolvedClientCompanyId != null
            ? { connect: { id: resolvedClientCompanyId } }
            : { disconnect: true }
      }
      if (resolvedClientContactId !== undefined) {
        data.clientContact =
          resolvedClientContactId != null
            ? { connect: { id: resolvedClientContactId } }
            : { disconnect: true }
      }

      const updated = await ctx.db.jobOffer.update({
        where: { id },
        data,
        select: {
          id: true,
          title: true,
          status: true,
          clientCompanyId: true,
          clientContact: { select: { id: true } },
          cityId: true,
          salaryMin: true,
          salaryMax: true,
        },
      })
      const updatedWithContact = updated as { clientContact?: { id: string } | null }
      return {
        ...updated,
        clientContactId: updatedWithContact.clientContact?.id ?? null,
      }
    }),

  /**
   * Suppression d'une offre du cabinet courant.
   * Les candidatures associées sont supprimées en cascade via Prisma.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id)
      const existing = await ctx.db.jobOffer.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      await ctx.db.jobOffer.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),

  /**
   * Ajoute un tag à une offre.
   * Si le tag n'existe pas pour le cabinet, le crée avec une couleur issue de la palette.
   * Max 20 tags par offre.
   */
  addTag: protectedProcedure
    .input(addOfferTagSchema)
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.db.jobOffer.findFirst({
        where: { id: input.offerId, companyId: ctx.companyId },
        include: { tags: true },
      })
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }
      if (offer.tags.length >= MAX_TAGS_PER_OFFER) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Maximum 20 tags par élément. Supprimez un tag existant pour en ajouter un nouveau.",
        })
      }

      const tagName = input.tagName

      let tag = await ctx.db.tag.findUnique({
        where: {
          name_companyId: { name: tagName, companyId: ctx.companyId },
        },
      })

      if (!tag) {
        tag = await ctx.db.tag.create({
          data: {
            name: tagName,
            color: getTagColor(tagName),
            companyId: ctx.companyId,
          },
        })
      }

      const existingLink = await ctx.db.offerTag.findUnique({
        where: {
          offerId_tagId: {
            offerId: input.offerId,
            tagId: tag.id,
          },
        },
      })

      if (existingLink) {
        return { tag }
      }

      await ctx.db.offerTag.create({
        data: { offerId: input.offerId, tagId: tag.id },
      })

      return { tag }
    }),

  /**
   * Supprime un tag d'une offre.
   * Vérifie que l'offre appartient au cabinet et que le tag lui est associé.
   */
  removeTag: protectedProcedure
    .input(removeOfferTagSchema)
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.db.jobOffer.findFirst({
        where: { id: input.offerId, companyId: ctx.companyId },
      })
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const existing = await ctx.db.offerTag.findUnique({
        where: {
          offerId_tagId: {
            offerId: input.offerId,
            tagId: input.tagId,
          },
        },
        include: { tag: true },
      })

      if (!existing || existing.tag.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      await ctx.db.offerTag.delete({
        where: {
          offerId_tagId: {
            offerId: input.offerId,
            tagId: input.tagId,
          },
        },
      })

      return { success: true }
    }),

  /**
   * Associe un ou plusieurs candidats à une offre (bulk).
   * Vérifie que l'offre et les candidats appartiennent au companyId courant.
   * Statut initial : CONTACTED_LINKEDIN. Ignore les doublons (skipDuplicates).
   * Retourne CONFLICT si tous les candidats sont déjà associés.
   */
  addCandidates: protectedProcedure
    .input(addCandidatesSchema)
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id)
      const offer = await ctx.db.jobOffer.findFirst({
        where: { id: input.offerId, companyId: ctx.companyId },
      })
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }

      const uniqueCandidateIds = [...new Set(input.candidateIds)]

      const validCandidates = await ctx.db.candidate.findMany({
        where: { id: { in: uniqueCandidateIds }, companyId: ctx.companyId },
        select: { id: true },
      })
      if (validCandidates.length !== uniqueCandidateIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Certains candidats sont invalides.",
        })
      }

      const result = await ctx.db.candidature.createMany({
        data: uniqueCandidateIds.map((candidateId) => ({
          candidateId,
          offerId: input.offerId,
          status: "CONTACTED_LINKEDIN" as const,
        })),
        skipDuplicates: true,
      })

      if (result.count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Tous les candidats sélectionnés sont déjà associés à cette offre.",
        })
      }

      return { count: result.count }
    }),
})
