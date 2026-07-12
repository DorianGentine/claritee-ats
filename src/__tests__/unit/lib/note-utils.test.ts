import { describe, it, expect } from "vitest"
import { getNoteDisplayTitle } from "@/lib/note-utils"

describe("getNoteDisplayTitle", () => {
  it("returns title when provided", () => {
    expect(getNoteDisplayTitle("Mon titre", "[]")).toBe("Mon titre")
    expect(getNoteDisplayTitle("  Trimmed  ", "[]")).toBe("Trimmed")
  })

  it("truncates long title with ellipsis", () => {
    const long = "a".repeat(35)
    expect(getNoteDisplayTitle(long, "[]")).toBe("a".repeat(30) + "…")
  })

  it("extracts first 30 chars from BlockNote content when title empty", () => {
    const content = JSON.stringify([
      {
        id: "b1",
        type: "paragraph",
        content: [{ type: "text", text: "Hello world from BlockNote", styles: {} }],
        children: [],
      },
    ])
    expect(getNoteDisplayTitle(null, content)).toBe("Hello world from BlockNote")
    expect(getNoteDisplayTitle("", content)).toBe("Hello world from BlockNote")
  })

  it("truncates content-derived title with ellipsis", () => {
    const longText = "x".repeat(50)
    const content = JSON.stringify([
      {
        id: "b1",
        type: "paragraph",
        content: [{ type: "text", text: longText, styles: {} }],
        children: [],
      },
    ])
    expect(getNoteDisplayTitle(null, content)).toBe("x".repeat(30) + "…")
  })

  it("returns 'Sans titre' for empty content", () => {
    expect(getNoteDisplayTitle(null, "[]")).toBe("Sans titre")
    expect(getNoteDisplayTitle(null, "null")).toBe("Sans titre")
  })
})
