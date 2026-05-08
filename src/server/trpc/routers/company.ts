import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { updateCompanySchema } from "@/lib/validations/company";

export const companyRouter = router({
  /**
   * Returns the current user's company (id, name).
   * Used for header/nav display in dashboard.
   */
  getMyCompany: protectedProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findFirst({
      where: { id: ctx.companyId },
      select: { id: true, name: true, siren: true },
    });
    if (!company) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return company;
  }),

  updateCompany: protectedProcedure
    .input(updateCompanySchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.company.update({
        where: { id: ctx.companyId },
        data: { name: input.name },
        select: { id: true, name: true, siren: true },
      });
    }),

  listUsers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { companyId: ctx.companyId },
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }),
});
