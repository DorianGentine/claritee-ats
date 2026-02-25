import { router, protectedProcedure } from "../trpc";
import { searchInputSchema } from "@/lib/validations/search";

const CANDIDATE_WHERE_CACHE_MAX = 100;
const candidateWhereCache = new Map<string, object>();

const buildCandidateSearchWhere = (companyId: string, q: string) => {
  const key = `${companyId}:${q}`;
  const cached = candidateWhereCache.get(key);
  if (cached) return cached as CandidateSearchWhere;
  if (candidateWhereCache.size >= CANDIDATE_WHERE_CACHE_MAX) {
    candidateWhereCache.clear();
  }
  const where = buildCandidateSearchWhereInner(companyId, q);
  candidateWhereCache.set(key, where);
  return where;
};

const buildCandidateSearchWhereInner = (companyId: string, q: string) => ({
  companyId,
  OR: [
    { firstName: { contains: q, mode: "insensitive" as const } },
    { lastName: { contains: q, mode: "insensitive" as const } },
    { title: { contains: q, mode: "insensitive" as const } },
    { summary: { contains: q, mode: "insensitive" as const } },
    { city: { contains: q, mode: "insensitive" as const } },
    {
      tags: {
        some: { tag: { name: { contains: q, mode: "insensitive" as const } } },
      },
    },
    {
      languages: {
        some: { name: { contains: q, mode: "insensitive" as const } },
      },
    },
    {
      experiences: {
        some: {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { company: { contains: q, mode: "insensitive" as const } },
            {
              description: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        },
      },
    },
    {
      formations: {
        some: {
          OR: [
            { degree: { contains: q, mode: "insensitive" as const } },
            { field: { contains: q, mode: "insensitive" as const } },
            { school: { contains: q, mode: "insensitive" as const } },
          ],
        },
      },
    },
  ],
});

type CandidateSearchWhere = ReturnType<typeof buildCandidateSearchWhereInner>;

export const searchRouter = router({
  search: protectedProcedure
    .input(searchInputSchema)
    .query(async ({ ctx, input }) => {
      const q = input.q.trim();
      if (q.length < 2) {
        return { candidates: [], offers: [] };
      }

      const [candidates, offers] = await Promise.all([
        ctx.db.candidate.findMany({
          where: buildCandidateSearchWhere(ctx.companyId, q),
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
                tag: { select: { id: true, name: true, color: true } },
              },
            },
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          take: input.limit ?? 8,
        }),
        ctx.db.jobOffer.findMany({
          where: {
            companyId: ctx.companyId,
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              {
                AND: [
                  { description: { not: null } },
                  {
                    description: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            ],
          },
          select: {
            id: true,
            title: true,
            clientCompany: { select: { name: true } },
          },
          orderBy: { title: "asc" },
          take: input.limit ?? 8,
        }),
      ]);

      return {
        candidates: candidates.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          city: c.city,
          photoUrl: c.photoUrl,
          tags: c.tags.map((ct) => ct.tag),
        })),
        offers: offers.map((o) => ({
          id: o.id,
          title: o.title,
          clientCompany: o.clientCompany
            ? { name: o.clientCompany.name }
            : undefined,
        })),
      };
    }),
});
