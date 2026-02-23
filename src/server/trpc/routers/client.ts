import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { createClientCompanySchema } from "@/lib/validations/client";

export const clientRouter = router({
  /**
   * Liste les sociétés clientes du cabinet courant, triées par création décroissante.
   * Retourne les compteurs de contacts et d'offres.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.clientCompany.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        siren: true,
        _count: {
          select: {
            contacts: true,
            jobOffers: true,
          },
        },
      },
    });

    return items.map((c) => ({
      id: c.id,
      name: c.name,
      siren: c.siren,
      contactsCount: c._count.contacts,
      offersCount: c._count.jobOffers,
    }));
  }),

  /**
   * Retourne une société cliente par id avec compteurs contacts/offres.
   * NOT_FOUND si absente ou autre cabinet.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.clientCompany.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          _count: {
            select: {
              contacts: true,
              jobOffers: true,
            },
          },
        },
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        id: client.id,
        name: client.name,
        siren: client.siren,
        contactsCount: client._count.contacts,
        offersCount: client._count.jobOffers,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      };
    }),

  /**
   * Crée une société cliente pour le cabinet courant.
   * SIREN optionnel, validé si fourni.
   */
  create: protectedProcedure
    .input(createClientCompanySchema)
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.db.clientCompany.create({
        data: {
          name: input.name,
          siren: input.siren && input.siren.length > 0 ? input.siren : null,
          companyId: ctx.companyId,
        },
      });

      return client;
    }),
});

