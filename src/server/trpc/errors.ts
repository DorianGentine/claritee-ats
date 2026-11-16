import { Prisma } from "@prisma/client"
import { TRPCError, type TRPC_ERROR_CODE_KEY } from "@trpc/server"

export const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Réessayez."

/**
 * Erreurs Prisma attendues (contrainte violée, enregistrement absent) → code
 * tRPC et message générique. Les autres codes Prisma restent des 500.
 */
const PRISMA_ERRORS: Record<
  string,
  { code: TRPC_ERROR_CODE_KEY; message: string }
> = {
  // Contrainte d'unicité
  P2002: { code: "CONFLICT", message: "Cet élément existe déjà." },
  // Clé étrangère vers un enregistrement absent (ex. cityId invalide)
  P2003: { code: "BAD_REQUEST", message: "Une donnée liée est introuvable." },
  // Enregistrement à modifier, supprimer ou connecter introuvable
  P2025: { code: "NOT_FOUND", message: "Élément introuvable." },
}

/** TRPCError équivalente à une erreur Prisma connue, sinon null. */
export const toTRPCErrorFromPrisma = (error: unknown): TRPCError | null => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null
  const mapped = PRISMA_ERRORS[error.code]
  if (!mapped) return null
  return new TRPCError({ ...mapped, cause: error })
}
