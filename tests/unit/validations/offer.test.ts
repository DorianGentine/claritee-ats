import { describe, it, expect } from "vitest"
import {
  offerListInputSchema,
  createJobOfferSchema,
  updateJobOfferSchema,
  jobOfferStatusSchema,
} from "@/lib/validations/offer"

describe("offerListInputSchema", () => {
  it("accepts empty input and applies defaults", () => {
    const result = offerListInputSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(20)
      expect(result.data.sortBy).toBe("createdAt")
      expect(result.data.sortOrder).toBe("desc")
    }
  })

  it("accepts valid sortBy and sortOrder", () => {
    expect(
      offerListInputSchema.safeParse({
        sortBy: "createdAt",
        sortOrder: "asc",
      }).success,
    ).toBe(true)
    expect(
      offerListInputSchema.safeParse({
        sortBy: "status",
        sortOrder: "desc",
      }).success,
    ).toBe(true)
  })

  it("rejects invalid sortBy", () => {
    const result = offerListInputSchema.safeParse({ sortBy: "title" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid sortOrder", () => {
    const result = offerListInputSchema.safeParse({ sortOrder: "invalid" })
    expect(result.success).toBe(false)
  })

  it("accepts valid pagination", () => {
    const result = offerListInputSchema.safeParse({ page: 2, pageSize: 10 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.pageSize).toBe(10)
    }
  })

  it("rejects page < 1", () => {
    const result = offerListInputSchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects pageSize > 100", () => {
    const result = offerListInputSchema.safeParse({ pageSize: 101 })
    expect(result.success).toBe(false)
  })
})

describe("jobOfferStatusSchema", () => {
  it("only accepts valid status values", () => {
    expect(jobOfferStatusSchema.safeParse("TODO").success).toBe(true)
    expect(jobOfferStatusSchema.safeParse("IN_PROGRESS").success).toBe(true)
    expect(jobOfferStatusSchema.safeParse("DONE").success).toBe(true)
    expect(jobOfferStatusSchema.safeParse("UNKNOWN").success).toBe(false)
  })
})

describe("createJobOfferSchema", () => {
  it("accepts minimal valid payload and applies defaults", () => {
    const result = createJobOfferSchema.safeParse({
      title: "Nouvelle offre",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe("Nouvelle offre")
      expect(result.data.status).toBe("TODO")
      expect(result.data.salaryMin).toBeUndefined()
      expect(result.data.salaryMax).toBeUndefined()
    }
  })

  it("rejects empty title with proper message", () => {
    const result = createJobOfferSchema.safeParse({
      title: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "title")
      expect(issue?.message).toBe("Titre est requis.")
    }
  })

  it("rejects non-numeric salary with clear message", () => {
    const result = createJobOfferSchema.safeParse({
      title: "Offre avec salaire invalide",
      // forcer une valeur de type incorrect au runtime
      salaryMin: "abc" as unknown as number,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "salaryMin")
      expect(issue?.message).toBeDefined()
    }
  })

  it("rejects salaryMin > salaryMax", () => {
    const result = createJobOfferSchema.safeParse({
      title: "Offre avec bornes inversées",
      salaryMin: 60000,
      salaryMax: 50000,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "salaryMax")
      expect(issue?.message).toContain(
        "Le salaire minimum ne peut pas être supérieur au salaire maximum.",
      )
    }
  })

  it("rejects clientContactId without clientCompanyId", () => {
    const result = createJobOfferSchema.safeParse({
      title: "Offre avec contact seul",
      clientContactId: "7c3ec936-4a1d-4f2f-9f3e-4a1d4f2f9f3e",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === "clientContactId",
      )
      expect(issue?.message).toBe(
        "Un contact référent nécessite un client associé.",
      )
    }
  })
})

describe("updateJobOfferSchema", () => {
  it("requires id and allows partial fields", () => {
    const result = updateJobOfferSchema.safeParse({
      id: "7c3ec936-4a1d-4f2f-9f3e-4a1d4f2f9f3e",
      title: "Titre mis à jour",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(
        "7c3ec936-4a1d-4f2f-9f3e-4a1d4f2f9f3e",
      )
      expect(result.data.title).toBe("Titre mis à jour")
    }
  })

  it("rejects payload without id", () => {
    const result = updateJobOfferSchema.safeParse({
      title: "Sans id",
    })

    expect(result.success).toBe(false)
  })

  it("accepts null for clearable fields and outputs null", () => {
    const result = updateJobOfferSchema.safeParse({
      id: "7c3ec936-4a1d-4f2f-9f3e-4a1d4f2f9f3e",
      description: null,
      location: null,
      salaryMin: null,
      salaryMax: null,
      clientCompanyId: null,
      clientContactId: null,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBeNull()
      expect(result.data.location).toBeNull()
      expect(result.data.salaryMin).toBeNull()
      expect(result.data.salaryMax).toBeNull()
      expect(result.data.clientCompanyId).toBeNull()
      expect(result.data.clientContactId).toBeNull()
    }
  })
})
