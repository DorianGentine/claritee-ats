import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/server/trpc/routers/_app"
import { createContext } from "@/server/trpc/context"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    // Le client ne reçoit qu'un message générique pour un 500 : l'erreur
    // complète (cause Prisma comprise) reste dans les logs Vercel.
    onError: ({ error, path }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[tRPC] ${path ?? "<no-path>"}:`, error.cause ?? error)
      }
    },
  })

export const GET = handler
export const POST = handler
