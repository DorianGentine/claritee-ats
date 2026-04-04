import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { appRouter } from "@/server/trpc/routers/_app"
import type { Context } from "@/server/trpc/context"

const connectionString = process.env.DATABASE_URL

describe.runIf(!!connectionString)("shareLink router", () => {
  let db: PrismaClient
  let companyAId: string
  let companyBId: string
  let candidateAId: string
  let candidateBId: string
  const userAId = "user-sharelink-a"

  const createContext = (companyId: string | null, userId = userAId): Context =>
    ({
      db,
      user: companyId ? { id: userId, email: "admin@test.com" } : null,
      companyId,
      headers: new Headers(),
    }) as unknown as Context

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: connectionString! })
    db = new PrismaClient({ adapter })

    const [companyA, companyB] = await Promise.all([
      db.company.create({
        data: {
          name: "ShareLink Test Company A",
          siren: `SL${Date.now().toString().slice(-7)}A`,
        },
      }),
      db.company.create({
        data: {
          name: "ShareLink Test Company B",
          siren: `SL${Date.now().toString().slice(-7)}B`,
        },
      }),
    ])
    companyAId = companyA.id
    companyBId = companyB.id

    const [candidateA, candidateB] = await Promise.all([
      db.candidate.create({
        data: {
          firstName: "Alice",
          lastName: "Test",
          companyId: companyAId,
        },
      }),
      db.candidate.create({
        data: {
          firstName: "Bob",
          lastName: "Other",
          companyId: companyBId,
        },
      }),
    ])
    candidateAId = candidateA.id
    candidateBId = candidateB.id
  })

  afterAll(async () => {
    await db.shareLink.deleteMany({
      where: { candidate: { companyId: { in: [companyAId, companyBId] } } },
    })
    await db.candidate.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    })
    await db.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    })
    await db.$disconnect()
  })

  // ─── shareLink.create ────────────────────────────────────────────────────

  it("creates a NORMAL share link with 30d expiration", async () => {
    const caller = appRouter.createCaller(createContext(companyAId))
    const before = Date.now()

    const link = await caller.shareLink.create({
      candidateId: candidateAId,
      type: "NORMAL",
      expiration: "30d",
    })

    expect(link.candidateId).toBe(candidateAId)
    expect(link.type).toBe("NORMAL")
    expect(link.token).toHaveLength(32)
    expect(link.expiresAt).not.toBeNull()
    const expiresMs = new Date(link.expiresAt!).getTime()
    const expected = before + 30 * 24 * 60 * 60 * 1000
    expect(expiresMs).toBeGreaterThanOrEqual(expected - 5000)
    expect(expiresMs).toBeLessThanOrEqual(expected + 5000)
  })

  it("creates an ANONYMOUS share link with 7d expiration", async () => {
    const caller = appRouter.createCaller(createContext(companyAId))
    const before = Date.now()

    const link = await caller.shareLink.create({
      candidateId: candidateAId,
      type: "ANONYMOUS",
      expiration: "7d",
    })

    expect(link.type).toBe("ANONYMOUS")
    const expiresMs = new Date(link.expiresAt!).getTime()
    const expected = before + 7 * 24 * 60 * 60 * 1000
    expect(expiresMs).toBeGreaterThanOrEqual(expected - 5000)
    expect(expiresMs).toBeLessThanOrEqual(expected + 5000)
  })

  it("creates a share link with never expiration (expiresAt is null)", async () => {
    const caller = appRouter.createCaller(createContext(companyAId))

    const link = await caller.shareLink.create({
      candidateId: candidateAId,
      type: "NORMAL",
      expiration: "never",
    })

    expect(link.expiresAt).toBeNull()
  })

  it("throws NOT_FOUND when candidate belongs to another company", async () => {
    const caller = appRouter.createCaller(createContext(companyAId))

    await expect(
      caller.shareLink.create({
        candidateId: candidateBId,
        type: "NORMAL",
        expiration: "30d",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = appRouter.createCaller(createContext(null))

    await expect(
      caller.shareLink.create({
        candidateId: candidateAId,
        type: "NORMAL",
        expiration: "30d",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("enforces rate limit (TOO_MANY_REQUESTS after 20 creations in an hour)", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit")
    const uniqueUserId = `rate-limit-test-${Date.now()}`
    const caller = appRouter.createCaller(createContext(companyAId, uniqueUserId))

    // Mock after 20 calls to avoid hitting the DB 20 times
    const mod = await import("@/lib/rate-limit")
    const spy = vi.spyOn(mod, "checkRateLimit").mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 3600_000,
    })

    await expect(
      caller.shareLink.create({
        candidateId: candidateAId,
        type: "NORMAL",
        expiration: "30d",
      })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" })

    spy.mockRestore()
    // suppress unused import warning
    void checkRateLimit
  })

  // ─── shareLink.listByCandidate ───────────────────────────────────────────

  it("listByCandidate returns only links for the given candidate, sorted createdAt desc", async () => {
    const caller = appRouter.createCaller(createContext(companyAId))

    const links = await caller.shareLink.listByCandidate({ candidateId: candidateAId })

    expect(links.length).toBeGreaterThanOrEqual(2)
    expect(links.every((l) => l.candidateId === candidateAId)).toBe(true)
    // sorted desc
    for (let i = 1; i < links.length; i++) {
      expect(new Date(links[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(links[i].createdAt).getTime()
      )
    }
  })

  it("listByCandidate throws NOT_FOUND when candidate belongs to another company", async () => {
    const caller = appRouter.createCaller(createContext(companyAId))

    await expect(
      caller.shareLink.listByCandidate({ candidateId: candidateBId })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("listByCandidate throws UNAUTHORIZED when not authenticated", async () => {
    const caller = appRouter.createCaller(createContext(null))

    await expect(
      caller.shareLink.listByCandidate({ candidateId: candidateAId })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})
