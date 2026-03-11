import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { offerRouter } from "@/server/trpc/routers/offer"
import { addCandidatesSchema } from "@/lib/validations/offer"
import type { Context } from "@/server/trpc/context"

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440001"
const OFFER_ID = "550e8400-e29b-41d4-a716-446655440002"
const CANDIDATE_ID_1 = "550e8400-e29b-41d4-a716-446655440003"
const CANDIDATE_ID_2 = "550e8400-e29b-41d4-a716-446655440004"

const createMockDb = () => ({
  jobOffer: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  candidate: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  candidature: {
    createMany: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  clientCompany: { findFirst: vi.fn() },
  clientContact: { findFirst: vi.fn() },
  tag: { findUnique: vi.fn(), create: vi.fn() },
  offerTag: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
})

const makeCtx = (db: ReturnType<typeof createMockDb>): Context => ({
  companyId: COMPANY_ID,
  user: null,
  headers: new Headers(),
  db: db as unknown as Context["db"],
})

const makeCaller = (db: ReturnType<typeof createMockDb>) =>
  offerRouter.createCaller(makeCtx(db))

describe("offer.addCandidates", () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb()
  })

  it("creates candidatures for valid candidates with CONTACTED_LINKEDIN status", async () => {
    db.jobOffer.findFirst.mockResolvedValue({ id: OFFER_ID, companyId: COMPANY_ID })
    db.candidate.findMany.mockResolvedValue([
      { id: CANDIDATE_ID_1 },
      { id: CANDIDATE_ID_2 },
    ])
    db.candidature.createMany.mockResolvedValue({ count: 2 })

    const caller = makeCaller(db)
    const result = await caller.addCandidates({
      offerId: OFFER_ID,
      candidateIds: [CANDIDATE_ID_1, CANDIDATE_ID_2],
    })

    expect(result.count).toBe(2)
    expect(db.candidature.createMany).toHaveBeenCalledWith({
      data: [
        { candidateId: CANDIDATE_ID_1, offerId: OFFER_ID, status: "CONTACTED_LINKEDIN" },
        { candidateId: CANDIDATE_ID_2, offerId: OFFER_ID, status: "CONTACTED_LINKEDIN" },
      ],
      skipDuplicates: true,
    })
  })

  it("throws NOT_FOUND if offer does not belong to companyId", async () => {
    db.jobOffer.findFirst.mockResolvedValue(null)

    const caller = makeCaller(db)
    await expect(
      caller.addCandidates({ offerId: OFFER_ID, candidateIds: [CANDIDATE_ID_1] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws BAD_REQUEST if a candidate does not belong to companyId", async () => {
    db.jobOffer.findFirst.mockResolvedValue({ id: OFFER_ID, companyId: COMPANY_ID })
    // Only returns 1 of 2 candidates (the other doesn't belong to the company)
    db.candidate.findMany.mockResolvedValue([{ id: CANDIDATE_ID_1 }])

    const caller = makeCaller(db)
    const error = await caller
      .addCandidates({ offerId: OFFER_ID, candidateIds: [CANDIDATE_ID_1, CANDIDATE_ID_2] })
      .catch((e) => e)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("BAD_REQUEST")
  })

  it("throws CONFLICT if all candidates are already associated", async () => {
    db.jobOffer.findFirst.mockResolvedValue({ id: OFFER_ID, companyId: COMPANY_ID })
    db.candidate.findMany.mockResolvedValue([{ id: CANDIDATE_ID_1 }])
    db.candidature.createMany.mockResolvedValue({ count: 0 })

    const caller = makeCaller(db)
    const error = await caller
      .addCandidates({ offerId: OFFER_ID, candidateIds: [CANDIDATE_ID_1] })
      .catch((e) => e)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe("CONFLICT")
  })

  it("creates only new candidatures when some already exist (bulk/partial)", async () => {
    db.jobOffer.findFirst.mockResolvedValue({ id: OFFER_ID, companyId: COMPANY_ID })
    db.candidate.findMany.mockResolvedValue([
      { id: CANDIDATE_ID_1 },
      { id: CANDIDATE_ID_2 },
    ])
    // Only 1 was newly created (1 was already existing)
    db.candidature.createMany.mockResolvedValue({ count: 1 })

    const caller = makeCaller(db)
    const result = await caller.addCandidates({
      offerId: OFFER_ID,
      candidateIds: [CANDIDATE_ID_1, CANDIDATE_ID_2],
    })

    expect(result.count).toBe(1)
  })

  it("throws UNAUTHORIZED if no companyId in context", async () => {
    const noAuthCtx: Context = {
      companyId: null,
      user: null,
      headers: new Headers(),
      db: db as unknown as Context["db"],
    }
    const caller = offerRouter.createCaller(noAuthCtx)

    await expect(
      caller.addCandidates({ offerId: OFFER_ID, candidateIds: [CANDIDATE_ID_1] }),
    ).rejects.toThrow(TRPCError)
  })
})

describe("addCandidatesSchema", () => {
  it("accepts valid input", () => {
    const result = addCandidatesSchema.safeParse({
      offerId: "550e8400-e29b-41d4-a716-446655440000",
      candidateIds: ["550e8400-e29b-41d4-a716-446655440001"],
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty candidateIds array", () => {
    const result = addCandidatesSchema.safeParse({
      offerId: "550e8400-e29b-41d4-a716-446655440000",
      candidateIds: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid uuid", () => {
    const result = addCandidatesSchema.safeParse({
      offerId: "not-a-uuid",
      candidateIds: ["550e8400-e29b-41d4-a716-446655440001"],
    })
    expect(result.success).toBe(false)
  })
})
