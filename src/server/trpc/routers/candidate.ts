import { router, protectedProcedure } from "../trpc";
import { candidateListInputSchema } from "@/lib/validations/candidate";

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
});
