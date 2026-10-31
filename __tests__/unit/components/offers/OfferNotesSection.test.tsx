/**
 * @vitest-environment jsdom
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { api } from "@/lib/trpc/client"
import { OfferNotesSection } from "@/components/offers/OfferNotesSection"
import { noteContent } from "../../../helpers/note-content"

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

// NoteEditor (Tiptap) is stubbed with a simple textarea + forwardRef to support getContent().
vi.mock("@/components/shared/NoteEditor", () => ({
  NoteEditor: React.forwardRef(function MockEditor(
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
      getContent: () => noteContent(inputRef.current?.value ?? ""),
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
}))

const mockNotes = [
  {
    id: "n1",
    content: noteContent("Note 1"),
    authorId: "user-1",
    createdAt: new Date("2026-01-01T10:00:00Z"),
    author: { firstName: "Alice", lastName: "Dupont" },
  },
  {
    id: "n2",
    content: noteContent("Note 2"),
    authorId: "user-2",
    createdAt: new Date("2026-01-02T10:00:00Z"),
    author: { firstName: "Bob", lastName: "Martin" },
  },
]

describe("OfferNotesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it("renders note contents as static bubbles", () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: mockNotes,
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)
    expect(screen.getByText("Note 1")).toBeDefined()
    expect(screen.getByText("Note 2")).toBeDefined()
    expect(screen.queryByTestId("note-editor-readonly")).toBeNull()
  })

  it("shows edit/delete buttons only for own notes", async () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: mockNotes,
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)

    // currentUserId est "user-1" (mock supabase), chargé de façon asynchrone :
    // n1 appartient à user-1 → actions visibles ; n2 à user-2 → aucune action
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Modifier la note" })).toHaveLength(1)
    })
    expect(screen.getAllByRole("button", { name: "Supprimer la note" })).toHaveLength(1)
  })

  it("shows a Tiptap composer with a disabled send button when empty", () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)
    expect(screen.getByTestId("note-editor-editable")).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Envoyer la note" }).hasAttribute("disabled")
    ).toBe(true)
    expect(screen.queryByText("Nouvelle note")).toBeNull()
  })

  it("creates a note from the composer with offerId", () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)

    fireEvent.change(screen.getByTestId("note-editor-editable"), {
      target: { value: "Mon contenu" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Envoyer la note" }))

    // mutate est appelé avec (input, { onSuccess })
    expect(mockCreateMutate).toHaveBeenCalledWith(
      { offerId: "offer-1", content: noteContent("Mon contenu") },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it("sends the note with Ctrl+Enter from the composer", () => {
    vi.mocked(api.note.listByOffer.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof api.note.listByOffer.useQuery>)

    render(<OfferNotesSection offerId="offer-1" />)

    const composer = screen.getByTestId("note-editor-editable")
    fireEvent.change(composer, { target: { value: "Relancer jeudi" } })
    fireEvent.keyDown(composer, { key: "Enter", ctrlKey: true })

    expect(mockCreateMutate).toHaveBeenCalledWith(
      { offerId: "offer-1", content: noteContent("Relancer jeudi") },
      expect.anything(),
    )
  })
})
