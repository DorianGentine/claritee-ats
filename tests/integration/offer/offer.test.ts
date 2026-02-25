import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { appRouter } from "@/server/trpc/routers/_app"
import type { Context } from "@/server/trpc/context"

const connectionString = process.env.DATABASE_URL

describe.runIf(!!connectionString)("offer.list", () => {
  let db: PrismaClient
  let companyAId: string
  let companyBId: string
  let offerA1Id: string
  let offerA2Id: string
  let offerB1Id: string

  const createContext = (companyId: string | null): Context =>
    ({
      db,
      user: companyId ? { id: "test-user", email: "admin@test.com" } : null,
      companyId,
      headers: new Headers(),
    }) as unknown as Context

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: connectionString! })
    db = new PrismaClient({ adapter })

    const [companyA, companyB] = await Promise.all([
      db.company.create({
        data: {
          name: "Test Company A Offers",
          siren: `7${Date.now().toString().slice(-8)}`,
        },
      }),
      db.company.create({
        data: {
          name: "Test Company B Offers",
          siren: `6${Date.now().toString().slice(-8)}`,
        },
      }),
    ])
    companyAId = companyA.id
    companyBId = companyB.id

    const [oA1, oA2, oB1] = await Promise.all([
      db.jobOffer.create({
        data: {
          title: "Offer A1",
          companyId: companyAId,
          status: "TODO",
        },
      }),
      db.jobOffer.create({
        data: {
          title: "Offer A2",
          companyId: companyAId,
          status: "IN_PROGRESS",
        },
      }),
      db.jobOffer.create({
        data: {
          title: "Offer B1",
          companyId: companyBId,
          status: "DONE",
        },
      }),
    ])
    offerA1Id = oA1.id
    offerA2Id = oA2.id
    offerB1Id = oB1.id
  })

  afterAll(async () => {
    await db.jobOffer.deleteMany({
      where: { id: { in: [offerA1Id, offerA2Id, offerB1Id] } },
    })
    await db.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    })
    await db.$disconnect()
  })

  it("returns only offers for the caller company", async () => {
    const ctx = createContext(companyAId)
    const caller = appRouter.createCaller(ctx)

    const result = await caller.offer.list({})

    expect(result.items).toHaveLength(2)
    const ids = result.items.map((o) => o.id).sort()
    expect(ids).toEqual([offerA1Id, offerA2Id].sort())
    expect(result.items.some((o) => o.id === offerB1Id)).toBe(false)
    expect(result.totalCount).toBe(2)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(20)
  })

  it("default sort is createdAt desc (newest first)", async () => {
    const ctx = createContext(companyAId)
    const caller = appRouter.createCaller(ctx)

    const result = await caller.offer.list({ sortBy: "createdAt", sortOrder: "desc" })

    expect(result.items.length).toBeGreaterThanOrEqual(2)
    const [o1, o2] = await Promise.all([
      db.jobOffer.findUniqueOrThrow({ where: { id: offerA1Id } }),
      db.jobOffer.findUniqueOrThrow({ where: { id: offerA2Id } }),
    ])
    const expectedOrder =
      o1.createdAt.getTime() >= o2.createdAt.getTime()
        ? [o1.id, o2.id]
        : [o2.id, o1.id]
    expect(result.items[0].id).toBe(expectedOrder[0])
    expect(result.items[1].id).toBe(expectedOrder[1])
  })

  it("can sort by status", async () => {
    const ctx = createContext(companyAId)
    const caller = appRouter.createCaller(ctx)

    const resultAsc = await caller.offer.list({ sortBy: "status", sortOrder: "asc" })
    const resultDesc = await caller.offer.list({ sortBy: "status", sortOrder: "desc" })

    expect(resultAsc.items.length).toBe(2)
    expect(resultDesc.items.length).toBe(2)
    const statusesAsc = resultAsc.items.map((o) => o.status)
    const statusesDesc = resultDesc.items.map((o) => o.status)
    expect(statusesAsc).toEqual([...statusesAsc].sort())
    expect(statusesDesc).toEqual([...statusesDesc].sort((a, b) => (a > b ? -1 : 1)))
  })

  it("pagination returns correct slice and totalCount", async () => {
    const ctx = createContext(companyAId)
    const caller = appRouter.createCaller(ctx)

    const page1 = await caller.offer.list({ page: 1, pageSize: 1 })
    const page2 = await caller.offer.list({ page: 2, pageSize: 1 })

    expect(page1.items).toHaveLength(1)
    expect(page2.items).toHaveLength(1)
    expect(page1.totalCount).toBe(2)
    expect(page2.totalCount).toBe(2)
    expect(page1.items[0].id).not.toBe(page2.items[0].id)
  })

  it("throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = createContext(null)
    const caller = appRouter.createCaller(ctx)

    await expect(caller.offer.list({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    })
  })
})
