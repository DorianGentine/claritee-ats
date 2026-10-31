/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import NotesPage from "@/app/(dashboard)/notes/page"

const {
  mockDeleteMutate,
  mockMoveToCandidateMutate,
  mockMoveToOfferMutate,
  mockSearchUseQuery,
  mutation,
} = vi.hoisted(() => ({
  mockDeleteMutate: vi.fn(),
  mockMoveToCandidateMutate: vi.fn(),
  mockMoveToOfferMutate: vi.fn(),
  mockSearchUseQuery: vi.fn(),
  mutation: (mutate: () => void) => () => ({ mutate, isPending: false }),
}))

vi.mock("@/lib/trpc/client", () => ({
  api: {
    useUtils: () => ({ note: { listFree: { invalidate: vi.fn() } } }),
    note: {
      listFree: {
        useQuery: () => ({
          data: [
            {
              id: "note-1",
              title: "Point client",
              content: "",
              updatedAt: new Date("2026-10-01"),
            },
          ],
          isLoading: false,
        }),
      },
      update: { useMutation: mutation(vi.fn()) },
      delete: { useMutation: mutation(mockDeleteMutate) },
      moveToCandidate: { useMutation: mutation(mockMoveToCandidateMutate) },
      moveToOffer: { useMutation: mutation(mockMoveToOfferMutate) },
    },
    search: { search: { useQuery: (...args: unknown[]) => mockSearchUseQuery(...args) } },
  },
}))

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: <T,>(value: T) => value,
}))

vi.mock("@/components/shared/NoteEditor", () => ({
  NoteEditor: () => <div data-testid="note-editor" />,
}))

describe("NotesPage", () => {
  beforeAll(() => {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    Element.prototype.scrollIntoView = vi.fn()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchUseQuery.mockReturnValue({
      data: {
        candidates: [
          { id: "cand-1", firstName: "Alice", lastName: "Dupont", title: "Dev Frontend" },
        ],
        offers: [
          { id: "offer-1", title: "Lead Dev", clientCompany: { name: "Acme" } },
        ],
      },
      isLoading: false,
      isError: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("supprime une note depuis sa carte après confirmation", () => {
    render(<NotesPage />)

    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer la note : Point client" })
    )
    expect(screen.getByText("Supprimer la note ?")).toBeDefined()
    expect(screen.queryByText("Éditer la note")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }))
    expect(mockDeleteMutate).toHaveBeenCalledWith({ id: "note-1" })
  })

  it("déplace la note vers un candidat trouvé par recherche", () => {
    render(<NotesPage />)

    fireEvent.click(
      screen.getByRole("button", { name: "Ouvrir la note : Point client" })
    )
    fireEvent.click(screen.getByRole("button", { name: /Choisir un candidat/ }))

    expect(screen.getByText("Saisir au moins 2 caractères")).toBeDefined()

    fireEvent.change(screen.getByPlaceholderText("Rechercher un candidat…"), {
      target: { value: "Ali" },
    })
    expect(mockSearchUseQuery).toHaveBeenLastCalledWith(
      { q: "Ali", limit: 20 },
      { enabled: true }
    )

    fireEvent.click(screen.getByText("Alice Dupont"))
    expect(mockMoveToCandidateMutate).toHaveBeenCalledWith(
      { id: "note-1", candidateId: "cand-1" },
      expect.anything()
    )
  })

  it("déplace la note vers une offre trouvée par recherche", () => {
    render(<NotesPage />)

    fireEvent.click(
      screen.getByRole("button", { name: "Ouvrir la note : Point client" })
    )
    fireEvent.click(screen.getByRole("button", { name: /Choisir une offre/ }))
    fireEvent.change(screen.getByPlaceholderText("Rechercher une offre…"), {
      target: { value: "Lead" },
    })

    expect(screen.getByText("Acme")).toBeDefined()
    fireEvent.click(screen.getByText("Lead Dev"))
    expect(mockMoveToOfferMutate).toHaveBeenCalledWith(
      { id: "note-1", offerId: "offer-1" },
      expect.anything()
    )
  })
})
