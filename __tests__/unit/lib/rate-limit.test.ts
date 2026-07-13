import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { checkRateLimit, checkMutationRateLimit } from "@/lib/rate-limit"

describe("checkRateLimit", () => {
  it("succeeds within the limit and decrements remaining", async () => {
    const key = `rl-test-within-${Date.now()}`
    const result = await checkRateLimit(key, 3, 60_000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it("returns success:false when limit is exceeded", async () => {
    const key = `rl-test-exceeded-${Date.now()}`
    await checkRateLimit(key, 2, 60_000)
    await checkRateLimit(key, 2, 60_000)
    const result = await checkRateLimit(key, 2, 60_000)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("resets the counter after the window expires", async () => {
    const key = `rl-test-reset-${Date.now()}`
    await checkRateLimit(key, 1, 1)
    await new Promise((r) => setTimeout(r, 5))
    const result = await checkRateLimit(key, 1, 1)
    expect(result.success).toBe(true)
  })
})

describe("checkMutationRateLimit", () => {
  it("does not throw while under the limit", async () => {
    const userId = `mutation-ok-${Date.now()}`
    await expect(checkMutationRateLimit(userId)).resolves.toBeUndefined()
  })

  it("throws TRPCError TOO_MANY_REQUESTS when limit is exceeded", async () => {
    const userId = `mutation-exceeded-${Date.now()}`
    for (let i = 0; i < 60; i++) {
      await checkMutationRateLimit(userId)
    }
    await expect(checkMutationRateLimit(userId)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    })
    await expect(checkMutationRateLimit(userId)).rejects.toBeInstanceOf(TRPCError)
  })
})
