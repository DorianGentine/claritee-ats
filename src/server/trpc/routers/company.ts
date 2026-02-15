import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

export const companyRouter = router({
  /**
   * Returns the current user's company (id, name).
   * Used for header/nav display in dashboard.
   */
  getMyCompany: protectedProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findFirst({
      where: { id: ctx.companyId },
      select: { id: true, name: true },
    });
    if (!company) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return { id: company.id, name: company.name };
  }),
});
