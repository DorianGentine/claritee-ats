import { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Procédure protégée : lance UNAUTHORIZED si !ctx.companyId */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.companyId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, companyId: ctx.companyId } });
});
