/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { NoteContent } from "@/components/shared/NoteContent"

const doc = (content: unknown[]) => JSON.stringify({ type: "doc", content })

describe("NoteContent", () => {
  afterEach(() => cleanup())

  it("rend paragraphes, marques et listes sans éditeur", () => {
    render(
      <NoteContent
        content={doc([
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Très ", marks: [{ type: "bold" }] },
              { type: "text", text: "motivé", marks: [{ type: "italic" }] },
            ],
          },
          {
            type: "bulletList",
            content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "React" }] }] },
            ],
          },
        ])}
      />
    )
    expect(screen.getByText("Très").tagName).toBe("STRONG")
    expect(screen.getByText("motivé").tagName).toBe("EM")
    expect(screen.getByRole("listitem").textContent).toBe("React")
    expect(document.querySelector(".ProseMirror")).toBeNull()
  })

  it("garde les liens http(s) et neutralise les protocoles dangereux", () => {
    render(
      <NoteContent
        content={doc([
          {
            type: "paragraph",
            content: [
              { type: "text", text: "profil", marks: [{ type: "link", attrs: { href: "https://linkedin.com/in/x" } }] },
              { type: "text", text: " piège", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
            ],
          },
        ])}
      />
    )
    expect(screen.getByRole("link", { name: "profil" }).getAttribute("href")).toBe(
      "https://linkedin.com/in/x"
    )
    expect(screen.queryByRole("link", { name: /piège/ })).toBeNull()
    expect(screen.getByText(/piège/)).toBeDefined()
  })

  it("n'affiche rien pour un contenu invalide", () => {
    const { container } = render(<NoteContent content="pas du JSON" />)
    expect(container.textContent).toBe("")
  })
})
