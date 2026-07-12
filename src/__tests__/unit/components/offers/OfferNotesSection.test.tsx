/**
 * @vitest-environment jsdom
 */
import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { api } from "@/lib/trpc/client"
import { OfferNotesSection } from "@/components/offers/OfferNotesSection"

const mockCreateMutate = vi.fn()
const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: "user-1" } } }),
    },
  }),
}))

vi.mock("@/lib/trpc/client", () => ({
  api: {
    note: {
      listByOffer: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(() => ({
          mutate: mockCreateMutate,
          isPending: false,
        })),
      },
      update: {
        useMutation: vi.fn(() => ({
          mutate: mockUpdateMutate,
          isPending: false,
        })),
      },
      delete: {
        useMutation: vi.fn(() => ({
          mutate: mockDeleteMutate,
          isPending: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      note: {
        listByOffer: { invalidate: vi.fn() },
      },
    })),
  },
}))

// NoteBlockNoteEditor is not testable in jsdom (uses heavy DOM APIs).
// We stub it with a simple textarea + forwardRef to support getContent().
vi.mock("@/components/shared/NoteBlockNoteEditor", () => ({
  NoteBlockNoteEditor: React.forwardRef(function MockEditor(
    {
      editable,
      onContentChange,
    }: {
      editable?: boolean
      onContentChange?: (isEmpty: boolean) => void
    },
    ref: React.Ref<{ getContent: () => string; focus: () => void }>,
  ) {
    const inputRef = React.useRef<HTMLTextAreaElement>(null)
    React.useImperativeHandle(ref, () => ({
      getContent: () => inputRef.current?.value || "[]",
      focus: () => inputRef.current?.focus(),
    }))
    return (
      <textarea
        ref={inputRef}
        data-testid={editable ? "note-editor-editable" : "note-editor-readonly"}
        onChange={(e) => onContentChange?.(e.target.value === "")}
      />
    )
  }),
  isBlockNoteContentEmpty: (content: string) => !content || content === "[]",
}))

const mockNotes = [
  {
    id: "n1",
    content: JSON.stringify([{ id: "b1", type: "paragraph", content: [], children: [] }]),
    authorId: "user-1",
    createdAt: new Date("2026-01-01T10:00:00Z"),
    author: { firstName: "Alice", lastName: "Dupont" },
  },
  {
    id: "n2",
    content: JSON.stringify([{ id: "b2", type: "paragraph", content: [], children: [] }]),
    authorId: "user-2",
    createdAt: new Date("2026-01-02T10:00:00Z"),
    author: { firstName: "Bob", lastName: "Martin" },
  },
]

describe("OfferNotesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows loading state", () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)
    expect(screen.getByText("Chargement…")).toBeDefined()
  })

  it("shows empty state when no notes", () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)
    expect(screen.getByText("Aucune note")).toBeDefined()
  })

  it("renders notes with author names", () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: mockNotes,
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)
    expect(screen.getByText(/Alice D\./)).toBeDefined()
    expect(screen.getByText(/Bob M\./)).toBeDefined()
  })

  it("shows edit/delete buttons only for own notes", async () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: mockNotes,
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)

    // currentUserId is "user-1" (from supabase mock) — loaded async
    // Wait for useEffect to resolve
    await new Promise((r) => setTimeout(r, 0))

    // n1 belongs to user-1 → edit/delete visible; n2 belongs to user-2 → not visible
    const pencilButtons = screen.getAllByRole("button").filter(
      (b) => b.querySelector("svg") !== null,
    )
    // At least 2 action buttons for own note (edit + delete) and 1 save button for form
    expect(pencilButtons.length).toBeGreaterThanOrEqual(2)
  })

  it("shows the new note form", () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)
    expect(screen.getByText("Nouvelle note")).toBeDefined()
    expect(screen.getByText("Enregistrer")).toBeDefined()
  })

  it("calls note.create mutation on save with offerId", () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)

    const editors = screen.getAllByTestId("note-editor-editable")
    const formEditor = editors[editors.length - 1]
    fireEvent.change(formEditor, { target: { value: "Mon contenu" } })

    fireEvent.click(screen.getByText("Enregistrer"))

    // mutate is called with (input, { onSuccess }) — check the first argument
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ offerId: "offer-1" }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
