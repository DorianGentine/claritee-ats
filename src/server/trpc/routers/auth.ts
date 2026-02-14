import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { completeRegistrationSchema } from "@/lib/validations/auth";
import {
  checkRateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const SIREN_ALREADY_USED_MESSAGE =
  "Ce numéro SIREN est déjà enregistré. Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.";

const RATE_LIMIT_MESSAGE =
  "Trop de requêtes. Réessayez dans quelques minutes.";

export const authRouter = router({
  completeRegistration: publicProcedure
    .input(completeRegistrationSchema)
    .mutation(async ({ ctx, input }) => {
      const ip =
        ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        ctx.headers?.get("x-real-ip") ??
        "unknown";
      const result = await checkRateLimit(
        "auth:" + ip,
        RATE_LIMITS.AUTH_PER_IP.limit,
        RATE_LIMITS.AUTH_PER_IP.windowMs,
      );
      if (!result.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: RATE_LIMIT_MESSAGE,
        });
      }

      const user = ctx.user;
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "Votre session n'a pas pu être établie. Réessayez de vous inscrire.",
        });
      }

      const existingCompany = await ctx.db.company.findUnique({
        where: { siren: input.siren },
      });
      if (existingCompany) {
        throw new TRPCError({
          code: "CONFLICT",
          message: SIREN_ALREADY_USED_MESSAGE,
        });
      }

      const company = await ctx.db.$transaction(async (tx) => {
        const newCompany = await tx.company.create({
          data: {
            name: input.companyName,
            siren: input.siren,
          },
        });
        await tx.user.create({
          data: {
            id: user.id,
            email: user.email ?? "",
            firstName: input.firstName,
            lastName: input.lastName,
            companyId: newCompany.id,
          },
        });
        return newCompany;
      });

      return { companyId: company.id };
    }),
});
