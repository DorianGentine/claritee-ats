import { afterEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { TRPCError } from "@trpc/server"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { publicProcedure, router } from "@/server/trpc/trpc"
import { GENERIC_ERROR_MESSAGE } from "@/server/trpc/errors"
import type { Context } from "@/server/trpc/context"

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(
    `Raw Prisma message for ${code} on table "Candidate"`,
    { code, clientVersion: "7.4.0" }
  )

const testRouter = router({
  failWith: publicProcedure
    .input((raw) => raw as string)
    .query(({ input }) => {
      throw prismaError(input)
    }),
  businessError: publicProcedure.query(() => {
    throw new TRPCError({ code: "FORBIDDEN", message: "Message métier" })
  }),
  unexpected: publicProcedure.query(() => {
    throw new Error("Raw internal detail")
  }),
})

const call = async (path: string, input?: string) => {
  const query =
    input === undefined
      ? ""
      : `?input=${encodeURIComponent(JSON.stringify(input))}`
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(`http://localhost/api/trpc/${path}${query}`),
    router: testRouter,
    createContext: () => ({}) as unknown as Context,
  })
  const body = (await response.json()) as { error: { message: string } }
  return { status: response.status, message: body.error.message }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("Prisma error mapping", () => {
  it.each([
    ["P2002", 409, "Cet élément existe déjà."],
    ["P2003", 400, "Une donnée liée est introuvable."],
    ["P2025", 404, "Élément introuvable."],
  ])(
    "maps %s to HTTP %i with a generic message",
    async (code, status, message) => {
      await expect(call("failWith", code)).resolves.toEqual({ status, message })
    }
  )

  it("keeps an unmapped Prisma error as a 500", async () => {
    const { status } = await call("failWith", "P2034")
    expect(status).toBe(500)
  })

  it("lets a business TRPCError through untouched", async () => {
    await expect(call("businessError")).resolves.toEqual({
      status: 403,
      message: "Message métier",
    })
  })
})

describe("500 message masking", () => {
  it("hides the raw message in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    await expect(call("unexpected")).resolves.toEqual({
      status: 500,
      message: GENERIC_ERROR_MESSAGE,
    })
  })

  it("hides an unmapped Prisma message in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { message } = await call("failWith", "P2034")
    expect(message).toBe(GENERIC_ERROR_MESSAGE)
  })

  it("keeps the raw message outside production", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { message } = await call("unexpected")
    expect(message).toBe("Raw internal detail")
  })
})
