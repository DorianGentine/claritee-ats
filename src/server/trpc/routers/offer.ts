import { router, protectedProcedure } from "../trpc";
import { offerListInputSchema } from "@/lib/validations/offer";

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
});
