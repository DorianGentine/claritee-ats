import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { Context } from "./context";
import { checkMutationRateLimit } from "@/lib/rate-limit";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Procédure protégée : lance UNAUTHORIZED si !ctx.user ou !ctx.companyId.
 * Toute mutation est soumise à la limite GENERAL_MUTATION de l'utilisateur.
 */
export const protectedProcedure = t.procedure.use(
  async ({ ctx, type, next }) => {
    if (!ctx.user || !ctx.companyId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (type === "mutation") {
      await checkMutationRateLimit(ctx.user.id);
    }
    return next({ ctx: { ...ctx, user: ctx.user, companyId: ctx.companyId } });
  }
);
