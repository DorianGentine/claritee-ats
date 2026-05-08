import { router, protectedProcedure } from "../trpc";

export const dashboardRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalCandidates,
      activeOffers,
      totalClients,
      recentCandidates,
      recentOffers,
      recentNotes,
    ] = await Promise.all([
      ctx.db.candidate.count({ where: { companyId: ctx.companyId } }),
      ctx.db.jobOffer.count({ where: { companyId: ctx.companyId, status: "IN_PROGRESS" } }),
      ctx.db.clientCompany.count({ where: { companyId: ctx.companyId } }),
      ctx.db.candidate.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, firstName: true, lastName: true, createdAt: true },
      }),
      ctx.db.jobOffer.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, status: true, createdAt: true },
      }),
      ctx.db.note.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          createdAt: true,
          candidateId: true,
          offerId: true,
          candidate: { select: { firstName: true, lastName: true } },
          jobOffer: { select: { title: true } },
        },
      }),
    ]);

    return {
      totalCandidates,
      activeOffers,
      totalClients,
      recentCandidates,
      recentOffers,
      recentNotes,
    };
  }),
});
