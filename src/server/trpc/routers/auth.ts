import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { registerSchema } from "@/lib/validations/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const RATE_LIMIT_MESSAGE = "Trop de requêtes. Réessayez dans quelques minutes.";

/** Message générique quand email ou SIREN déjà utilisé (option B : tout côté serveur) */
const REGISTER_UNAVAILABLE_MESSAGE =
  "Cette combinaison n'est pas disponible. Utilisez un autre email ou un autre numéro SIREN.";

export const authRouter = router({
  /**
   * Inscription complète côté serveur : vérifie SIREN et email (Auth + User),
   * puis crée l'utilisateur Auth (email_confirm: true, pas d'envoi d'email),
   * puis Company + User en une transaction. Évite les utilisateurs Auth orphelins.
   */
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      const ip =
        ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        ctx.headers?.get("x-real-ip") ??
        "unknown";
      const result = await checkRateLimit(
        "auth:" + ip,
        RATE_LIMITS.AUTH_PER_IP.limit,
        RATE_LIMITS.AUTH_PER_IP.windowMs
      );
      if (!result.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: RATE_LIMIT_MESSAGE,
        });
      }

      const existingCompany = await ctx.db.company.findUnique({
        where: { siren: input.siren },
      });
      if (existingCompany) {
        throw new TRPCError({
          code: "CONFLICT",
          message: REGISTER_UNAVAILABLE_MESSAGE,
        });
      }

      const existingUserByEmail = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existingUserByEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: REGISTER_UNAVAILABLE_MESSAGE,
        });
      }

      const supabaseAdmin = createAdminClient();
      const { data: authUser, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: false,
          user_metadata: {
            firstName: input.firstName,
            lastName: input.lastName,
            companyName: input.companyName,
            siren: input.siren,
          },
        });

      if (createAuthError || !authUser?.user) {
        throw new TRPCError({
          code: "CONFLICT",
          message: REGISTER_UNAVAILABLE_MESSAGE,
        });
      }

      const { error: resendError } = await supabaseAdmin.auth.resend({
        type: "signup",
        email: input.email,
      });
      if (resendError) {
        console.warn(
          "[auth.register] Resend confirmation email failed:",
          resendError.message
        );
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
            id: authUser.user.id,
            email: input.email,
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
