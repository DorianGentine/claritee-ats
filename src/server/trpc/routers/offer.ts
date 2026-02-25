import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  offerListInputSchema,
  createJobOfferSchema,
  updateJobOfferSchema,
  jobOfferStatusSchema,
} from "@/lib/validations/offer";

type JobOfferStatus = z.infer<typeof jobOfferStatusSchema>;

/** Résultat create/update avec clientContactId dérivé (pour typage explicite côté appelant). */
export type OfferMutationResult = {
  id: string;
  title: string;
  status: JobOfferStatus;
  clientCompanyId: string | null;
  clientContactId: string | null;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
};

export const offerRouter = router({
  /**
   * Liste paginée des offres du cabinet courant.
   * Tri par défaut : createdAt desc. Optionnel : sortBy (createdAt | status), sortOrder (asc | desc).
   */
  list: protectedProcedure
    .input(offerListInputSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, sortBy, sortOrder } = input;
      const skip = (page - 1) * pageSize;
      const [items, totalCount] = await Promise.all([
        ctx.db.jobOffer.findMany({
          where: { companyId: ctx.companyId },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: pageSize,
          select: {
            id: true,
            title: true,
            location: true,
            salaryMin: true,
            salaryMax: true,
            status: true,
            createdAt: true,
            clientCompany: {
              select: { name: true },
            },
          },
        }),
        ctx.db.jobOffer.count({
          where: { companyId: ctx.companyId },
        }),
      ]);
      return {
        items: items.map((o) => ({
          id: o.id,
          title: o.title,
          location: o.location,
          salaryMin: o.salaryMin,
          salaryMax: o.salaryMax,
          status: o.status,
          createdAt: o.createdAt,
          clientCompanyName: o.clientCompany?.name ?? null,
        })),
        totalCount,
        page,
        pageSize,
      };
    }),

  /**
   * Récupère une offre par id pour le cabinet courant.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const offer = await ctx.db.jobOffer.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          clientCompany: true,
          clientContact: true,
        },
      });
      if (!offer) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return offer;
    }),

  /**
   * Création d'une nouvelle offre pour le cabinet courant.
   */
  create: protectedProcedure
    .input(createJobOfferSchema)
    .mutation(async ({ ctx, input }) => {
      const { clientCompanyId, clientContactId, ...rest } = input;
      let resolvedClientCompanyId: string | null | undefined = clientCompanyId;
      let resolvedClientContactId: string | null | undefined = clientContactId;
      if (clientCompanyId) {
        const clientCompany = await ctx.db.clientCompany.findFirst({
          where: { id: clientCompanyId, companyId: ctx.companyId },
          select: { id: true },
        });
        if (!clientCompany) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Client invalide.",
          });
        }
      }

      if (clientContactId) {
        const contact = await ctx.db.clientContact.findFirst({
          where: {
            id: clientContactId,
            clientCompany: { companyId: ctx.companyId },
          },
          select: { id: true, clientCompanyId: true },
        });
        if (!contact) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Contact client invalide.",
          });
        }

        if (
          resolvedClientCompanyId &&
          contact.clientCompanyId !== resolvedClientCompanyId
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Le contact sélectionné n'appartient pas au client.",
          });
        }

        // Si aucun client explicite n'est fourni mais que le contact est valide,
        // on aligne automatiquement le client sur celui du contact.
        if (!resolvedClientCompanyId) {
          resolvedClientCompanyId = contact.clientCompanyId;
        }

        resolvedClientContactId = contact.id;
      }

      const created = await ctx.db.jobOffer.create({
        data: {
          ...rest,
          company: { connect: { id: ctx.companyId } },
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
          location: true,
          salaryMin: true,
          salaryMax: true,
        },
      });
      const createdWithContact = created as {
        clientContact?: { id: string } | null;
      };
      return {
        ...created,
        clientContactId: createdWithContact.clientContact?.id ?? null,
      };
    }),

  /**
   * Mise à jour partielle d'une offre du cabinet courant.
   */
  update: protectedProcedure
    .input(updateJobOfferSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, clientCompanyId, clientContactId, ...rest } = input;
      const existing = await ctx.db.jobOffer.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      let resolvedClientCompanyId: string | null | undefined = clientCompanyId;
      let resolvedClientContactId: string | null | undefined = clientContactId;
      if (clientCompanyId !== undefined && clientCompanyId !== null) {
        const clientCompany = await ctx.db.clientCompany.findFirst({
          where: { id: clientCompanyId, companyId: ctx.companyId },
          select: { id: true },
        });
        if (!clientCompany) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Client invalide.",
          });
        }
      }

      if (clientContactId !== undefined) {
        if (clientContactId === null) {
          resolvedClientContactId = null;
        } else {
          const contact = await ctx.db.clientContact.findFirst({
            where: {
              id: clientContactId,
              clientCompany: { companyId: ctx.companyId },
            },
            select: { id: true, clientCompanyId: true },
          });
          if (!contact) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Contact client invalide.",
            });
          }

          if (
            resolvedClientCompanyId &&
            contact.clientCompanyId !== resolvedClientCompanyId
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Le contact sélectionné n'appartient pas au client.",
            });
          }

          if (!resolvedClientCompanyId) {
            resolvedClientCompanyId = contact.clientCompanyId;
          }

          resolvedClientContactId = contact.id;
        }
      }

      const data: {
        title?: string;
        description?: string | null;
        location?: string | null;
        salaryMin?: number | null;
        salaryMax?: number | null;
        status?: JobOfferStatus;
        clientCompany?: { connect: { id: string } } | { disconnect: true };
        clientContact?: { connect: { id: string } } | { disconnect: true };
      } = { ...rest };

      if (resolvedClientCompanyId !== undefined) {
        data.clientCompany =
          resolvedClientCompanyId != null
            ? { connect: { id: resolvedClientCompanyId } }
            : { disconnect: true };
      }
      if (resolvedClientContactId !== undefined) {
        data.clientContact =
          resolvedClientContactId != null
            ? { connect: { id: resolvedClientContactId } }
            : { disconnect: true };
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
          location: true,
          salaryMin: true,
          salaryMax: true,
        },
      });
      const updatedWithContact = updated as {
        clientContact?: { id: string } | null;
      };
      return {
        ...updated,
        clientContactId: updatedWithContact.clientContact?.id ?? null,
      };
    }),

  /**
   * Suppression d'une offre du cabinet courant.
   * Les candidatures associées sont supprimées en cascade via Prisma.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.jobOffer.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.jobOffer.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
