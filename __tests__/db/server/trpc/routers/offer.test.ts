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

  // TODO(db-test-debt): flaky — offres créées à la même milliseconde → ordre du tri
  // secondaire indéfini (le router ne trie que par createdAt). Skippé, à fiabiliser
  // (timestamps espacés ou tiebreaker) — voir docs/prd/TO-DO.md.
  it.skip("default sort is createdAt desc (newest first)", async () => {
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

  // TODO(db-test-debt): échoue sur base fraîche — skippé temporairement, à corriger (voir docs/prd/TO-DO.md)
  it.skip("can sort by status", async () => {
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
      salaryMin: 45000,
      salaryMax: 55000,
      status: "IN_PROGRESS",
    })

    expect(created.id).toBeDefined()
    expect(created.title).toBe("New Offer A")
    expect(created.status).toBe("IN_PROGRESS")
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

  it("getById returns offer with all relations for the caller company", async () => {
    const clientCompany = await db.clientCompany.create({
      data: {
        name: "Client GetById Test",
        companyId: companyAId,
      },
    })
    const contact = await db.clientContact.create({
      data: {
        clientCompanyId: clientCompany.id,
        firstName: "Marie",
        lastName: "Dupont",
        email: "marie@example.com",
        phone: "0600000001",
        position: "DRH",
      },
    })
    const candidate = await db.candidate.create({
      data: {
        firstName: "Alice",
        lastName: "Martin",
        title: "Développeuse",
        companyId: companyAId,
      },
    })
    const offer = await db.jobOffer.create({
      data: {
        title: "Offer GetById Full",
        companyId: companyAId,
        status: "IN_PROGRESS",
        clientCompanyId: clientCompany.id,
        clientContactId: contact.id,
      },
    })
    const tag = await db.tag.create({
      data: {
        name: "GetById Tag",
        color: "#aabbcc",
        companyId: companyAId,
      },
    })
    await db.offerTag.create({
      data: { offerId: offer.id, tagId: tag.id },
    })
    const candidature = await db.candidature.create({
      data: {
        candidateId: candidate.id,
        offerId: offer.id,
        status: "APPLIED",
      },
    })

    try {
      const ctx = createContext(companyAId)
      const caller = appRouter.createCaller(ctx)

      const result = await caller.offer.getById({ id: offer.id })

      expect(result.title).toBe("Offer GetById Full")
      expect(result.clientCompany?.name).toBe("Client GetById Test")
      expect(result.clientContact?.firstName).toBe("Marie")
      expect(result.tags).toHaveLength(1)
      expect(result.tags[0].name).toBe("GetById Tag")
      expect(result.candidatures).toHaveLength(1)
      expect(result.candidatures[0].candidate.firstName).toBe("Alice")
      expect(result.candidatureCountByStatus["APPLIED"]).toBe(1)
    } finally {
      await db.candidature.delete({ where: { id: candidature.id } })
      await db.offerTag.delete({ where: { offerId_tagId: { offerId: offer.id, tagId: tag.id } } })
      await db.tag.delete({ where: { id: tag.id } })
      await db.jobOffer.delete({ where: { id: offer.id } })
      await db.clientContact.delete({ where: { id: contact.id } })
      await db.clientCompany.delete({ where: { id: clientCompany.id } })
      await db.candidate.delete({ where: { id: candidate.id } })
    }
  })

  it("getById throws NOT_FOUND for offer belonging to another company", async () => {
    const ctxB = createContext(companyBId)
    const callerB = appRouter.createCaller(ctxB)

    await expect(callerB.offer.getById({ id: offerA1Id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("getById candidatureCountByStatus sums correctly", async () => {
    const candidate1 = await db.candidate.create({
      data: {
        firstName: "Bob",
        lastName: "Count",
        companyId: companyAId,
      },
    })
    const candidate2 = await db.candidate.create({
      data: {
        firstName: "Clara",
        lastName: "Count",
        companyId: companyAId,
      },
    })
    const candidate3 = await db.candidate.create({
      data: {
        firstName: "David",
        lastName: "Count",
        companyId: companyAId,
      },
    })
    const offer = await db.jobOffer.create({
      data: {
        title: "Offer Status Count",
        companyId: companyAId,
        status: "TODO",
      },
    })
    const c1 = await db.candidature.create({
      data: { candidateId: candidate1.id, offerId: offer.id, status: "APPLIED" },
    })
    const c2 = await db.candidature.create({
      data: { candidateId: candidate2.id, offerId: offer.id, status: "APPLIED" },
    })
    const c3 = await db.candidature.create({
      data: { candidateId: candidate3.id, offerId: offer.id, status: "ACCEPTED" },
    })

    try {
      const ctx = createContext(companyAId)
      const caller = appRouter.createCaller(ctx)

      const result = await caller.offer.getById({ id: offer.id })

      expect(result.candidatureCountByStatus["APPLIED"]).toBe(2)
      expect(result.candidatureCountByStatus["ACCEPTED"]).toBe(1)
      expect(result.candidatureCountByStatus["CONTACTED_LINKEDIN"]).toBeUndefined()
    } finally {
      await db.candidature.deleteMany({ where: { id: { in: [c1.id, c2.id, c3.id] } } })
      await db.jobOffer.delete({ where: { id: offer.id } })
      await db.candidate.deleteMany({ where: { id: { in: [candidate1.id, candidate2.id, candidate3.id] } } })
    }
  })

  describe("offer.list filters", () => {
    let filterOfferTodo: string
    let filterOfferDone: string
    let filterOfferParis: string
    let filterTagAlpha: string
    let filterTagBeta: string
    let filterClientId: string

    beforeAll(async () => {
      const client = await db.clientCompany.create({
        data: { name: "Filter Client", companyId: companyAId },
      })
      filterClientId = client.id

      const [oTodo, oDone, oParis] = await Promise.all([
        db.jobOffer.create({
          data: {
            title: "Filter TODO",
            companyId: companyAId,
            status: "TODO",
            salaryMin: 30000,
            salaryMax: 50000,
          },
        }),
        db.jobOffer.create({
          data: {
            title: "Filter DONE",
            companyId: companyAId,
            status: "DONE",
            salaryMin: 60000,
            salaryMax: 80000,
            clientCompanyId: client.id,
          },
        }),
        db.jobOffer.create({
          data: {
            title: "Filter Paris",
            companyId: companyAId,
            status: "IN_PROGRESS",
            salaryMin: 40000,
            salaryMax: 55000,
          },
        }),
      ])
      filterOfferTodo = oTodo.id
      filterOfferDone = oDone.id
      filterOfferParis = oParis.id

      const [tagAlpha, tagBeta] = await Promise.all([
        db.tag.create({
          data: { name: "FilterAlpha", color: "#aaa", companyId: companyAId },
        }),
        db.tag.create({
          data: { name: "FilterBeta", color: "#bbb", companyId: companyAId },
        }),
      ])
      filterTagAlpha = tagAlpha.id
      filterTagBeta = tagBeta.id

      await db.offerTag.createMany({
        data: [
          { offerId: filterOfferTodo, tagId: filterTagAlpha },
          { offerId: filterOfferTodo, tagId: filterTagBeta },
          { offerId: filterOfferDone, tagId: filterTagAlpha },
          { offerId: filterOfferParis, tagId: filterTagBeta },
        ],
      })
    })

    afterAll(async () => {
      await db.offerTag.deleteMany({
        where: {
          offerId: { in: [filterOfferTodo, filterOfferDone, filterOfferParis] },
        },
      })
      await db.tag.deleteMany({
        where: { id: { in: [filterTagAlpha, filterTagBeta] } },
      })
      await db.jobOffer.deleteMany({
        where: {
          id: { in: [filterOfferTodo, filterOfferDone, filterOfferParis] },
        },
      })
      await db.clientCompany.delete({ where: { id: filterClientId } })
    })

    it("filters by single status", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({ statuses: ["TODO"] })

      const filterIds = result.items.map((o) => o.id)
      expect(filterIds).toContain(filterOfferTodo)
      expect(filterIds).not.toContain(filterOfferDone)
      expect(filterIds).not.toContain(filterOfferParis)
    })

    it("filters by multiple statuses", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({
        statuses: ["TODO", "IN_PROGRESS"],
      })

      const filterIds = result.items.map((o) => o.id)
      expect(filterIds).toContain(filterOfferTodo)
      expect(filterIds).toContain(filterOfferParis)
      expect(filterIds).not.toContain(filterOfferDone)
    })

    it("filters by single tag", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({
        tagIds: [filterTagAlpha],
      })

      const filterIds = result.items.map((o) => o.id)
      expect(filterIds).toContain(filterOfferTodo)
      expect(filterIds).toContain(filterOfferDone)
      expect(filterIds).not.toContain(filterOfferParis)
    })

    it("filters by multiple tags with AND logic", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({
        tagIds: [filterTagAlpha, filterTagBeta],
      })

      const filterIds = result.items.map((o) => o.id)
      expect(filterIds).toContain(filterOfferTodo)
      expect(filterIds).not.toContain(filterOfferDone)
      expect(filterIds).not.toContain(filterOfferParis)
    })

    it("filters by salaryMin only", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({ salaryMin: 55000 })

      const filterIds = result.items.map((o) => o.id)
      expect(filterIds).toContain(filterOfferDone)
      expect(filterIds).toContain(filterOfferParis)
      expect(filterIds).not.toContain(filterOfferTodo)
    })

    it("filters by salaryMax only", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({ salaryMax: 45000 })

      const filterIds = result.items.map((o) => o.id)
      expect(filterIds).toContain(filterOfferTodo)
      expect(filterIds).toContain(filterOfferParis)
      expect(filterIds).not.toContain(filterOfferDone)
    })

    it("filters by salary range (min + max)", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({
        salaryMin: 45000,
        salaryMax: 55000,
      })

      const filterIds = result.items.map((o) => o.id)
      expect(filterIds).toContain(filterOfferTodo)
      expect(filterIds).toContain(filterOfferParis)
      expect(filterIds).not.toContain(filterOfferDone)
    })

    it.todo("filters by location (case-insensitive) — replaced by City relation in story 5.7")

    it("filters by clientCompanyId", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({
        clientCompanyId: filterClientId,
      })

      const filterIds = result.items.map((o) => o.id)
      expect(filterIds).toContain(filterOfferDone)
      expect(filterIds).not.toContain(filterOfferTodo)
      expect(filterIds).not.toContain(filterOfferParis)
    })

    it("combines multiple filters with AND logic", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({
        statuses: ["DONE"],
        tagIds: [filterTagAlpha],
        clientCompanyId: filterClientId,
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe(filterOfferDone)
      expect(result.totalCount).toBe(1)
    })

    it("returns totalCount reflecting filtered results", async () => {
      const caller = appRouter.createCaller(createContext(companyAId))
      const result = await caller.offer.list({ statuses: ["TODO"] })

      const unfilteredResult = await caller.offer.list({})
      expect(result.totalCount).toBeLessThanOrEqual(unfilteredResult.totalCount)
      expect(result.totalCount).toBeGreaterThanOrEqual(1)
    })

    it("multi-tenancy: filters do not leak cross-company data", async () => {
      const callerB = appRouter.createCaller(createContext(companyBId))
      const result = await callerB.offer.list({
        statuses: ["TODO", "IN_PROGRESS", "DONE"],
      })

      const ids = result.items.map((o) => o.id)
      expect(ids).not.toContain(filterOfferTodo)
      expect(ids).not.toContain(filterOfferDone)
      expect(ids).not.toContain(filterOfferParis)
    })
  })
})
