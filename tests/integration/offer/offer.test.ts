import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { appRouter } from "@/server/trpc/routers/_app"
import type { Context } from "@/server/trpc/context"
import type { OfferMutationResult } from "@/server/trpc/routers/offer"
import { MAX_TAGS_PER_OFFER } from "@/lib/validations/tag"

const connectionString = process.env.DATABASE_URL

describe.runIf(!!connectionString)("offer router", () => {
  let db: PrismaClient
  let companyAId: string
  let companyBId: string
  let offerA1Id: string
  let offerA2Id: string
  let offerB1Id: string
  let tagCompanyAId: string

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

    const tagA = await db.tag.create({
      data: {
        name: "Tag A",
        color: "#ff0000",
        companyId: companyAId,
      },
    })
    tagCompanyAId = tagA.id

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
    await db.offerTag.deleteMany({
      where: { jobOffer: { companyId: { in: [companyAId, companyBId] } } },
    })
    await db.tag.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    })
    await db.candidature.deleteMany({
      where: { jobOffer: { companyId: { in: [companyAId, companyBId] } } },
    })
    await db.jobOffer.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    })
    await db.clientContact.deleteMany({
      where: { clientCompany: { companyId: { in: [companyAId, companyBId] } } },
    })
    await db.clientCompany.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    })
    await db.candidate.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
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

  it("creates an offer scoped to the caller company", async () => {
    const ctx = createContext(companyAId)
    const caller = appRouter.createCaller(ctx)

    const created = await caller.offer.create({
      title: "New Offer A",
      description: "Description A",
      location: "Paris",
      salaryMin: 45000,
      salaryMax: 55000,
      status: "IN_PROGRESS",
    })

    expect(created.id).toBeDefined()
    expect(created.title).toBe("New Offer A")
    expect(created.status).toBe("IN_PROGRESS")
    expect(created.location).toBe("Paris")
    expect(created.salaryMin).toBe(45000)
    expect(created.salaryMax).toBe(55000)

    const inDb = await db.jobOffer.findUniqueOrThrow({
      where: { id: created.id },
    })

    expect(inDb.companyId).toBe(companyAId)
  })

  it("validates client and contact belong to the caller company", async () => {
    const clientA = await db.clientCompany.create({
      data: {
        name: "Client A",
        companyId: companyAId,
      },
    })
    const clientB = await db.clientCompany.create({
      data: {
        name: "Client B",
        companyId: companyBId,
      },
    })
    const contactA = await db.clientContact.create({
      data: {
        clientCompanyId: clientA.id,
        firstName: "Alice",
        lastName: "Durand",
      },
    })

    const ctxA = createContext(companyAId)
    const callerA = appRouter.createCaller(ctxA)

    const created = await callerA.offer.create({
      title: "Offer with client/contact",
      clientCompanyId: clientA.id,
      clientContactId: contactA.id,
      status: "TODO",
    })

    expect(created.clientCompanyId).toBe(clientA.id)
    expect(created.clientContactId).toBe(contactA.id)

    const ctxInvalid = createContext(companyAId)
    const callerInvalid = appRouter.createCaller(ctxInvalid)

    await expect(
      callerInvalid.offer.create({
        title: "Invalid client",
        clientCompanyId: clientB.id,
        status: "TODO",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
  })

  it("updates an offer for the caller company and rejects cross-company updates", async () => {
    const offer = await db.jobOffer.create({
      data: {
        title: "Offer to update",
        companyId: companyAId,
        status: "TODO",
      },
    })

    const ctxA = createContext(companyAId)
    const callerA = appRouter.createCaller(ctxA)

    const updated = await callerA.offer.update({
      id: offer.id,
      title: "Offer updated",
      status: "DONE",
    })

    expect(updated.id).toBe(offer.id)
    expect(updated.title).toBe("Offer updated")
    expect(updated.status).toBe("DONE")

    const ctxB = createContext(companyBId)
    const callerB = appRouter.createCaller(ctxB)

    await expect(
      callerB.offer.update({
        id: offer.id,
        title: "Should not update",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("offer.update sets clientCompanyId and clientContactId to null when sent null", async () => {
    const clientA = await db.clientCompany.create({
      data: {
        name: "Client for null test",
        companyId: companyAId,
      },
    })
    const contactA = await db.clientContact.create({
      data: {
        clientCompanyId: clientA.id,
        firstName: "Bob",
        lastName: "Null",
      },
    })

    const offer = await db.jobOffer.create({
      data: {
        title: "Offer with client/contact to clear",
        companyId: companyAId,
        status: "TODO",
        clientCompanyId: clientA.id,
        clientContactId: contactA.id,
      },
    })

    const ctx = createContext(companyAId)
    const caller = appRouter.createCaller(ctx)

    const updated = await caller.offer.update({
      id: offer.id,
      clientCompanyId: null,
      clientContactId: null,
    }) as OfferMutationResult

    expect(updated.clientCompanyId).toBeNull()
    expect(updated.clientContactId).toBeNull()

    const fromDb = await db.jobOffer.findUniqueOrThrow({
      where: { id: offer.id },
    })
    expect(fromDb.clientCompanyId).toBeNull()
    expect(fromDb.clientContactId).toBeNull()

    await db.jobOffer.delete({ where: { id: offer.id } })
    await db.clientContact.delete({ where: { id: contactA.id } })
    await db.clientCompany.delete({ where: { id: clientA.id } })
  })

  it("deletes an offer and cascades candidatures", async () => {
    const candidate = await db.candidate.create({
      data: {
        firstName: "Jean",
        lastName: "Test",
        companyId: companyAId,
      },
    })

    const offer = await db.jobOffer.create({
      data: {
        title: "Offer to delete",
        companyId: companyAId,
        status: "TODO",
      },
    })

    const candidature = await db.candidature.create({
      data: {
        candidateId: candidate.id,
        offerId: offer.id,
      },
    })

    const ctx = createContext(companyAId)
    const caller = appRouter.createCaller(ctx)

    const result = await caller.offer.delete({ id: offer.id })
    expect(result).toEqual({ success: true })

    const offerInDb = await db.jobOffer.findUnique({
      where: { id: offer.id },
    })
    expect(offerInDb).toBeNull()

    const candidatureInDb = await db.candidature.findUnique({
      where: { id: candidature.id },
    })
    expect(candidatureInDb).toBeNull()
  })

  it("allows adding and removing tags on offers scoped to the caller company", async () => {
    const offer = await db.jobOffer.create({
      data: {
        title: "Offer with tags",
        companyId: companyAId,
        status: "TODO",
      },
    })

    const ctx = createContext(companyAId)
    const caller = appRouter.createCaller(ctx)

    const addResult = await caller.offer.addTag({
      offerId: offer.id,
      tagName: "Backend",
    })

    expect(addResult.tag).toBeDefined()
    expect(addResult.tag.name).toBe("Backend")

    const inDb = await db.offerTag.findFirst({
      where: { offerId: offer.id, tagId: addResult.tag.id },
    })
    expect(inDb).not.toBeNull()

    const removeResult = await caller.offer.removeTag({
      offerId: offer.id,
      tagId: addResult.tag.id,
    })
    expect(removeResult).toEqual({ success: true })

    const linkAfterDelete = await db.offerTag.findFirst({
      where: { offerId: offer.id, tagId: addResult.tag.id },
    })
    expect(linkAfterDelete).toBeNull()

    await db.jobOffer.delete({ where: { id: offer.id } })
  })

  it("enforces max 20 tags per offer", async () => {
    const offer = await db.jobOffer.create({
      data: {
        title: "Offer max tags",
        companyId: companyAId,
        status: "TODO",
      },
    })

    const ctx = createContext(companyAId)
    const caller = appRouter.createCaller(ctx)

    for (let i = 0; i < MAX_TAGS_PER_OFFER; i++) {
      const name = `Tag ${i}`
      const result = await caller.offer.addTag({
        offerId: offer.id,
        tagName: name,
      })
      expect(result.tag.name).toBe(name)
    }

    await expect(
      caller.offer.addTag({
        offerId: offer.id,
        tagName: "Tag overflow",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "Maximum 20 tags par élément. Supprimez un tag existant pour en ajouter un nouveau.",
    })

    await db.offerTag.deleteMany({
      where: { offerId: offer.id },
    })
    await db.jobOffer.delete({ where: { id: offer.id } })
  })

  it("prevents cross-company tag manipulation on offers", async () => {
    const offerCompanyA = await db.jobOffer.create({
      data: {
        title: "Offer company A tags",
        companyId: companyAId,
        status: "TODO",
      },
    })

    const ctxB = createContext(companyBId)
    const callerB = appRouter.createCaller(ctxB)

    await expect(
      callerB.offer.addTag({
        offerId: offerCompanyA.id,
        tagName: "Should fail",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    await expect(
      callerB.offer.removeTag({
        offerId: offerCompanyA.id,
        tagId: tagCompanyAId,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    await db.jobOffer.delete({ where: { id: offerCompanyA.id } })
  })
})
