import { describe, it, expect } from "vitest"
import { offerListInputSchema } from "@/lib/validations/offer"

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
    expect(offerListInputSchema.safeParse({ sortBy: "createdAt", sortOrder: "asc" }).success).toBe(true)
    expect(offerListInputSchema.safeParse({ sortBy: "status", sortOrder: "desc" }).success).toBe(true)
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
