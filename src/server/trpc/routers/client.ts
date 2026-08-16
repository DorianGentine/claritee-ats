import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  createClientCompanySchema,
  updateClientCompanySchema,
  createClientContactSchema,
  updateClientContactSchema,
} from "@/lib/validations/client";
import { checkMutationRateLimit } from "@/lib/rate-limit";

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
   * Retourne une société cliente par id avec compteurs, contacts et offres.
   * NOT_FOUND si absente ou autre cabinet.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.clientCompany.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              position: true,
              linkedinUrl: true,
              createdAt: true,
            },
          },
          cities: {
            orderBy: { city: { name: "asc" } },
            include: { city: true },
          },
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
        contacts: client.contacts,
        cities: client.cities,
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
      await checkMutationRateLimit(ctx.user!.id);
      // Client + villes dans une seule transaction : un échec du createMany
      // annule la création du client (pas de client orphelin sans ses villes).
      return ctx.db.$transaction(async (tx) => {
        const client = await tx.clientCompany.create({
          data: {
            name: input.name,
            siren: input.siren && input.siren.length > 0 ? input.siren : null,
            companyId: ctx.companyId,
          },
        });

        if (input.cityIds.length > 0) {
          await tx.clientCompanyCity.createMany({
            data: input.cityIds.map((cityId) => ({
              clientCompanyId: client.id,
              cityId,
            })),
          });
        }

        return client;
      });
    }),

  /**
   * Mise à jour d'une société cliente du cabinet courant.
   * Remplace entièrement les villes associées (deleteMany puis createMany).
   */
  update: protectedProcedure
    .input(updateClientCompanySchema)
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id);
      const existing = await ctx.db.clientCompany.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.$transaction(async (tx) => {
        const client = await tx.clientCompany.update({
          where: { id: input.id },
          data: {
            name: input.name,
            siren: input.siren && input.siren.length > 0 ? input.siren : null,
          },
        });

        await tx.clientCompanyCity.deleteMany({
          where: { clientCompanyId: input.id },
        });
        if (input.cityIds.length > 0) {
          await tx.clientCompanyCity.createMany({
            data: input.cityIds.map((cityId) => ({
              clientCompanyId: input.id,
              cityId,
            })),
          });
        }

        return client;
      });
    }),

  /**
   * Crée un contact pour une société cliente.
   * Vérifie que la ClientCompany existe et appartient au cabinet.
   */
  createContact: protectedProcedure
    .input(
      z.object({ clientCompanyId: z.uuid() }).merge(createClientContactSchema)
    )
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id);
      const company = await ctx.db.clientCompany.findFirst({
        where: {
          id: input.clientCompanyId,
          companyId: ctx.companyId,
        },
      });

      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { clientCompanyId, ...contactData } = input;
      return ctx.db.clientContact.create({
        data: {
          clientCompanyId,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email ?? null,
          phone: contactData.phone ?? null,
          position: contactData.position ?? null,
          linkedinUrl: contactData.linkedinUrl ?? null,
        },
      });
    }),

  /**
   * Met à jour un contact client.
   * Vérifie que le contact appartient à une ClientCompany du cabinet.
   */
  updateContact: protectedProcedure
    .input(updateClientContactSchema)
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id);
      const contact = await ctx.db.clientContact.findFirst({
        where: { id: input.id },
        include: { clientCompany: true },
      });

      if (!contact || contact.clientCompany.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const { id, ...data } = input;
      return ctx.db.clientContact.update({
        where: { id },
        data: {
          ...(data.firstName !== undefined && { firstName: data.firstName }),
          ...(data.lastName !== undefined && { lastName: data.lastName }),
          ...(data.email !== undefined && { email: data.email ?? null }),
          ...(data.phone !== undefined && { phone: data.phone ?? null }),
          ...(data.position !== undefined && { position: data.position ?? null }),
          ...(data.linkedinUrl !== undefined && {
            linkedinUrl: data.linkedinUrl ?? null,
          }),
        },
      });
    }),

  /**
   * Supprime un contact client.
   * Vérifie que le contact appartient à une ClientCompany du cabinet.
   */
  deleteContact: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await checkMutationRateLimit(ctx.user!.id);
      const contact = await ctx.db.clientContact.findFirst({
        where: { id: input.id },
        include: { clientCompany: true },
      });

      if (!contact || contact.clientCompany.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.clientContact.delete({ where: { id: input.id } });
      return { success: true };
    }),
});

