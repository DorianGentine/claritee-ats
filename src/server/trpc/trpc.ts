import { initTRPC } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
/** protectedProcedure (avec ctx.companyId) sera ajouté en Story 1.2 */
export const protectedProcedure = t.procedure;
