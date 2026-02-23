import { describe, it, expect } from "vitest"
import { createNoteSchema, updateNoteSchema } from "@/lib/validations/note"

const validContent = JSON.stringify([
  { id: "b1", type: "paragraph", content: [{ type: "text", text: "Note", styles: {} }], children: [] },
])

describe("createNoteSchema", () => {
  it("accepts note with candidateId (Story 3.9)", () => {
    const result = createNoteSchema.safeParse({
      candidateId: "550e8400-e29b-41d4-a716-446655440000",
      content: validContent,
    })
    expect(result.success).toBe(true)
  })

  it("accepts free note without candidateId or offerId (Story 3.11)", () => {
    const result = createNoteSchema.safeParse({
      content: validContent,
    })
    expect(result.success).toBe(true)
  })

  it("accepts optional title", () => {
    const result = createNoteSchema.safeParse({
      content: validContent,
      title: "Ma note",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty content", () => {
    const result = createNoteSchema.safeParse({
      content: "",
    })
    expect(result.success).toBe(false)
  })
})

describe("updateNoteSchema", () => {
  it("accepts id and content", () => {
    const result = updateNoteSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      content: validContent,
    })
    expect(result.success).toBe(true)
  })

  it("accepts optional title", () => {
    const result = updateNoteSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Nouveau titre",
    })
    expect(result.success).toBe(true)
  })
})
