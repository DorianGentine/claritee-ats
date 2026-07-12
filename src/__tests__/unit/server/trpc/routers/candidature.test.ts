import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { candidatureRouter } from "@/server/trpc/routers/candidature"
import {
  updateCandidatureStatusSchema,
  deleteCandidatureSchema,
} from "@/lib/validations/candidature"
import {
  getCandidatureStatusStyle,
  CANDIDATURE_STATUS_ORDER,
} from "@/lib/candidature-status-style"
import type { CandidatureStatus } from "@prisma/client"
import type { Context } from "@/server/trpc/context"

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440001"
const OFFER_ID = "550e8400-e29b-41d4-a716-446655440002"
const CANDIDATE_ID = "550e8400-e29b-41d4-a716-446655440003"
const CANDIDATURE_ID = "550e8400-e29b-41d4-a716-446655440004"
const USER_ID = "550e8400-e29b-41d4-a716-446655440000"

const createMockDb = () => ({
  candidature: {
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
})

const makeCtx = (db: ReturnType<typeof createMockDb>): Context => ({
  companyId: COMPANY_ID,
  user: { id: USER_ID } as Context["user"],
  headers: new Headers(),
  db: db as unknown as Context["db"],
})

const makeCaller = (db: ReturnType<typeof createMockDb>) =>
  candidatureRouter.createCaller(makeCtx(db))

// ─── candidature.updateStatus ─────────────────────────────────────────────────

describe("candidature.updateStatus", () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb()
  })

  it("updates the status of a valid candidature", async () => {
    db.candidature.findFirst.mockResolvedValue({
      id: CANDIDATURE_ID,
      status: "CONTACTED_LINKEDIN",
      offerId: OFFER_ID,
      candidateId: CANDIDATE_ID,
    })
    db.candidature.update.mockResolvedValue({
      id: CANDIDATURE_ID,
      status: "APPLIED",
      updatedAt: new Date(),
    })

    const caller = makeCaller(db)
    const result = await caller.updateStatus({
      candidatureId: CANDIDATURE_ID,
      status: "APPLIED",
    })

    expect(result.status).toBe("APPLIED")
    expect(db.candidature.update).toHaveBeenCalledWith({
      where: { id: CANDIDATURE_ID },
      data: { status: "APPLIED" },
      select: { id: true, status: true, updatedAt: true },
    })
  })

  it("verifies companyId via jobOffer (multi-tenancy)", async () => {
    db.candidature.findFirst.mockResolvedValue({
      id: CANDIDATURE_ID,
      status: "CONTACTED_LINKEDIN",
    })
    db.candidature.update.mockResolvedValue({
      id: CANDIDATURE_ID,
      status: "PHONE_CONTACT",
      updatedAt: new Date(),
    })

    const caller = makeCaller(db)
    await caller.updateStatus({ candidatureId: CANDIDATURE_ID, status: "PHONE_CONTACT" })

    expect(db.candidature.findFirst).toHaveBeenCalledWith({
      where: {
        id: CANDIDATURE_ID,
        jobOffer: { companyId: COMPANY_ID },
      },
    })
  })

  it("throws NOT_FOUND if candidature does not belong to companyId", async () => {
    db.candidature.findFirst.mockResolvedValue(null)

    const caller = makeCaller(db)
    await expect(
      caller.updateStatus({ candidatureId: CANDIDATURE_ID, status: "APPLIED" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws UNAUTHORIZED if no companyId in context", async () => {
    const noAuthCtx: Context = {
      companyId: null,
      user: null,
      headers: new Headers(),
      db: db as unknown as Context["db"],
    }
    const caller = candidatureRouter.createCaller(noAuthCtx)

    await expect(
      caller.updateStatus({ candidatureId: CANDIDATURE_ID, status: "APPLIED" }),
    ).rejects.toThrow(TRPCError)
  })
})

// ─── candidature.delete ───────────────────────────────────────────────────────

describe("candidature.delete", () => {
  let db: ReturnType<typeof createMockDb>

  beforeEach(() => {
    db = createMockDb()
  })

  it("deletes a valid candidature", async () => {
    db.candidature.findFirst.mockResolvedValue({
      id: CANDIDATURE_ID,
      offerId: OFFER_ID,
      candidateId: CANDIDATE_ID,
    })
    db.candidature.delete.mockResolvedValue({ id: CANDIDATURE_ID })

    const caller = makeCaller(db)
    const result = await caller.delete({ candidatureId: CANDIDATURE_ID })

    expect(result.success).toBe(true)
    expect(db.candidature.delete).toHaveBeenCalledWith({
      where: { id: CANDIDATURE_ID },
    })
  })

  it("verifies companyId via jobOffer (multi-tenancy)", async () => {
    db.candidature.findFirst.mockResolvedValue({ id: CANDIDATURE_ID })
    db.candidature.delete.mockResolvedValue({ id: CANDIDATURE_ID })

    const caller = makeCaller(db)
    await caller.delete({ candidatureId: CANDIDATURE_ID })

    expect(db.candidature.findFirst).toHaveBeenCalledWith({
      where: {
        id: CANDIDATURE_ID,
        jobOffer: { companyId: COMPANY_ID },
      },
    })
  })

  it("throws NOT_FOUND if candidature does not belong to companyId", async () => {
    db.candidature.findFirst.mockResolvedValue(null)

    const caller = makeCaller(db)
    await expect(
      caller.delete({ candidatureId: CANDIDATURE_ID }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws UNAUTHORIZED if no companyId in context", async () => {
    const noAuthCtx: Context = {
      companyId: null,
      user: null,
      headers: new Headers(),
      db: db as unknown as Context["db"],
    }
    const caller = candidatureRouter.createCaller(noAuthCtx)

    await expect(
      caller.delete({ candidatureId: CANDIDATURE_ID }),
    ).rejects.toThrow(TRPCError)
  })
})

// ─── Zod schemas ──────────────────────────────────────────────────────────────

describe("updateCandidatureStatusSchema", () => {
  it("accepts valid input", () => {
    expect(
      updateCandidatureStatusSchema.safeParse({
        candidatureId: "550e8400-e29b-41d4-a716-446655440000",
        status: "APPLIED",
      }).success,
    ).toBe(true)
  })

  it("rejects invalid uuid", () => {
    expect(
      updateCandidatureStatusSchema.safeParse({
        candidatureId: "not-a-uuid",
        status: "APPLIED",
      }).success,
    ).toBe(false)
  })

  it("rejects invalid status value", () => {
    expect(
      updateCandidatureStatusSchema.safeParse({
        candidatureId: "550e8400-e29b-41d4-a716-446655440000",
        status: "INVALID_STATUS",
      }).success,
    ).toBe(false)
  })

  it("accepts all 6 valid statuses", () => {
    const statuses: CandidatureStatus[] = [
      "CONTACTED_LINKEDIN",
      "PHONE_CONTACT",
      "APPLIED",
      "ACCEPTED",
      "REJECTED_BY_EMPLOYER",
      "REJECTED_BY_CANDIDATE",
    ]
    for (const status of statuses) {
      expect(
        updateCandidatureStatusSchema.safeParse({
          candidatureId: "550e8400-e29b-41d4-a716-446655440000",
          status,
        }).success,
      ).toBe(true)
    }
  })
})

describe("deleteCandidatureSchema", () => {
  it("accepts valid uuid", () => {
    expect(
      deleteCandidatureSchema.safeParse({
        candidatureId: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(true)
  })

  it("rejects invalid uuid", () => {
    expect(
      deleteCandidatureSchema.safeParse({
        candidatureId: "not-a-uuid",
      }).success,
    ).toBe(false)
  })
})

// ─── candidature-status-style ─────────────────────────────────────────────────

describe("candidature-status-style", () => {
  it("covers all 6 statuses defined in the PRD with non-empty label and className", () => {
    for (const status of CANDIDATURE_STATUS_ORDER) {
      const { label, badgeClassName } = getCandidatureStatusStyle(status)
      expect(label.length).toBeGreaterThan(0)
      expect(badgeClassName.length).toBeGreaterThan(0)
    }
  })

  it("CANDIDATURE_STATUS_ORDER contains exactly 6 statuses", () => {
    expect(CANDIDATURE_STATUS_ORDER).toHaveLength(6)
  })

  it("labels match PRD specification", () => {
    const { label: l1 } = getCandidatureStatusStyle("CONTACTED_LINKEDIN")
    const { label: l2 } = getCandidatureStatusStyle("PHONE_CONTACT")
    const { label: l3 } = getCandidatureStatusStyle("APPLIED")
    const { label: l4 } = getCandidatureStatusStyle("ACCEPTED")
    const { label: l5 } = getCandidatureStatusStyle("REJECTED_BY_EMPLOYER")
    const { label: l6 } = getCandidatureStatusStyle("REJECTED_BY_CANDIDATE")

    expect(l1).toBe("Contacté sur LinkedIn")
    expect(l2).toBe("Contact téléphonique")
    expect(l3).toBe("Postulé")
    expect(l4).toBe("Accepté")
    expect(l5).toBe("Refusé par l'employeur")
    expect(l6).toBe("Rejeté par le candidat")
  })
})
