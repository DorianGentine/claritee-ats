import { randomUUID } from "crypto"
import { describe, it, expect } from "vitest"
import { router, protectedProcedure } from "@/server/trpc/trpc"
import { RATE_LIMITS } from "@/lib/rate-limit"
import type { Context } from "@/server/trpc/context"

const testRouter = router({
  read: protectedProcedure.query(() => "ok"),
  write: protectedProcedure.mutation(() => "ok"),
})

const makeCaller = (userId: string) =>
  testRouter.createCaller({
    db: {},
    user: { id: userId },
    companyId: "company-1",
    headers: new Headers(),
  } as unknown as Context)

describe("protectedProcedure", () => {
  it("rejects a mutation once the user exceeds GENERAL_MUTATION", async () => {
    const caller = makeCaller(randomUUID())
    for (let call = 0; call < RATE_LIMITS.GENERAL_MUTATION.limit; call++) {
      await caller.write()
    }
    await expect(caller.write()).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    })
  })

  it("does not count queries against the mutation limit", async () => {
    const caller = makeCaller(randomUUID())
    for (let call = 0; call < RATE_LIMITS.GENERAL_MUTATION.limit + 1; call++) {
      await caller.read()
    }
    await expect(caller.write()).resolves.toBe("ok")
  })

  it("keeps a separate budget per user", async () => {
    const firstCaller = makeCaller(randomUUID())
    for (let call = 0; call < RATE_LIMITS.GENERAL_MUTATION.limit; call++) {
      await firstCaller.write()
    }
    await expect(makeCaller(randomUUID()).write()).resolves.toBe("ok")
  })

  it("rejects an anonymous caller with UNAUTHORIZED", async () => {
    const anonymousCaller = testRouter.createCaller({
      db: {},
      user: null,
      companyId: null,
      headers: new Headers(),
    } as unknown as Context)
    await expect(anonymousCaller.write()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })
  })
})
