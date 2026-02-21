import { describe, it, expect } from "vitest"
import { addTagSchema, removeTagSchema } from "@/lib/validations/tag"

const validCandidateId = "123e4567-e89b-12d3-a456-426614174000"
const validTagId = "123e4567-e89b-12d3-a456-426614174001"

describe("tag validations", () => {
  describe("addTagSchema", () => {
    it("accepts valid input", () => {
      const result = addTagSchema.parse({
        candidateId: validCandidateId,
        tagName: "Python",
      })
      expect(result.tagName).toBe("Python")
    })

    it("trims tagName", () => {
      const result = addTagSchema.parse({
        candidateId: validCandidateId,
        tagName: "  React  ",
      })
      expect(result.tagName).toBe("React")
    })

    it("rejects empty tagName", () => {
      expect(() =>
        addTagSchema.parse({
          candidateId: validCandidateId,
          tagName: "",
        }),
      ).toThrow()
    })

    it("rejects whitespace-only tagName", () => {
      expect(() =>
        addTagSchema.parse({
          candidateId: validCandidateId,
          tagName: "   ",
        }),
      ).toThrow()
    })

    it("rejects tagName longer than 100 chars", () => {
      expect(() =>
        addTagSchema.parse({
          candidateId: validCandidateId,
          tagName: "a".repeat(101),
        }),
      ).toThrow()
    })

    it("rejects invalid candidateId", () => {
      expect(() =>
        addTagSchema.parse({
          candidateId: "not-a-uuid",
          tagName: "Python",
        }),
      ).toThrow()
    })
  })

  describe("removeTagSchema", () => {
    it("accepts valid input", () => {
      const result = removeTagSchema.parse({
        candidateId: validCandidateId,
        tagId: validTagId,
      })
      expect(result.candidateId).toBeDefined()
      expect(result.tagId).toBeDefined()
    })

    it("rejects invalid ids", () => {
      expect(() =>
        removeTagSchema.parse({
          candidateId: "x",
          tagId: validTagId,
        }),
      ).toThrow()
      expect(() =>
        removeTagSchema.parse({
          candidateId: validCandidateId,
          tagId: "invalid",
        }),
      ).toThrow()
    })
  })
})
