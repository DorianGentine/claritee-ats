import { router, protectedProcedure } from "../trpc";

export const tagRouter = router({
  /**
   * Liste les tags du cabinet pour l'autocomplete.
   * Base pour la recherche/filtrage (Epic 4).
   */
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.db.tag.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    })
  ),
});
