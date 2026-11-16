import { TRPCError } from "@trpc/server"
import { initTRPC } from "@trpc/server"
import type { Context } from "./context"
import { GENERIC_ERROR_MESSAGE, toTRPCErrorFromPrisma } from "./errors"
import { checkMutationRateLimit } from "@/lib/rate-limit"

const t = initTRPC.context<Context>().create({
  // En production, le message d'une erreur 500 (exception imprévue, erreur
  // Prisma non mappée) ne part jamais au client : il est dans les logs.
  errorFormatter: ({ shape, error }) =>
    error.code === "INTERNAL_SERVER_ERROR" &&
    process.env.NODE_ENV === "production"
      ? { ...shape, message: GENERIC_ERROR_MESSAGE }
      : shape,
})

/** Erreurs Prisma connues (P2002, P2003, P2025) → code tRPC + message générique. */
const prismaErrorMiddleware = t.middleware(async ({ next }) => {
  const result = await next()
  if (!result.ok) {
    const mapped = toTRPCErrorFromPrisma(result.error.cause)
    if (mapped) throw mapped
  }
  return result
})

const baseProcedure = t.procedure.use(prismaErrorMiddleware)

export const router = t.router
export const publicProcedure = baseProcedure

/**
 * Procédure protégée : lance UNAUTHORIZED si !ctx.user ou !ctx.companyId.
 * Toute mutation est soumise à la limite GENERAL_MUTATION de l'utilisateur.
 */
export const protectedProcedure = baseProcedure.use(
  async ({ ctx, type, next }) => {
    if (!ctx.user || !ctx.companyId) {
      throw new TRPCError({ code: "UNAUTHORIZED" })
    }
    if (type === "mutation") {
      await checkMutationRateLimit(ctx.user.id)
    }
    return next({ ctx: { ...ctx, user: ctx.user, companyId: ctx.companyId } })
  }
)
