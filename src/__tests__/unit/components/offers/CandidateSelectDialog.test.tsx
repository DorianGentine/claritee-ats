/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { api } from "@/lib/trpc/client"
import { CandidateSelectDialog } from "@/components/offers/CandidateSelectDialog"

const mockMutate = vi.fn()

vi.mock("@/lib/trpc/client", () => ({
  api: {
    candidate: {
      list: {
        useQuery: vi.fn(),
      },
    },
    offer: {
      addCandidates: {
        useMutation: vi.fn(() => ({
          mutate: mockMutate,
          isPending: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({})),
  },
}))

const mockCandidates = [
  { id: "c1", firstName: "Alice", lastName: "Dupont", title: "Dev Frontend", photoUrl: null },
  { id: "c2", firstName: "Bob", lastName: "Martin", title: "Dev Backend", photoUrl: null },
  { id: "c3", firstName: "Claire", lastName: "Petit", title: null, photoUrl: null },
]

const baseProps = {
  offerId: "offer-1",
  existingCandidateIds: [],
  open: true,
  onOpenChange: vi.fn(),
  onSuccess: vi.fn(),
}

describe("CandidateSelectDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders candidate list from useQuery", () => {
    vi.mocked(api.candidate.list.useQuery).mockReturnValue({
      data: { items: mockCandidates },
      isLoading: false,
      error: null,
    } as ReturnType<typeof api.candidate.list.useQuery>)

    render(<CandidateSelectDialog {...baseProps} />)

    // Dialog renders in portal — use screen to find elements in document.body
    expect(screen.getByText("Alice Dupont")).toBeDefined()
    expect(screen.getByText("Bob Martin")).toBeDefined()
    expect(screen.getByText("Claire Petit")).toBeDefined()
  })

  it("shows loading skeleton when isLoading is true", () => {
    vi.mocked(api.candidate.list.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof api.candidate.list.useQuery>)

    render(<CandidateSelectDialog {...baseProps} />)

    // Skeleton is inside the dialog portal
    const skeleton = document.querySelector(".animate-pulse")
    expect(skeleton).not.toBeNull()
  })

  it("shows empty state when no candidates", () => {
    vi.mocked(api.candidate.list.useQuery).mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    } as ReturnType<typeof api.candidate.list.useQuery>)

    render(<CandidateSelectDialog {...baseProps} />)

    expect(screen.getByText("Aucun candidat dans votre cabinet.")).toBeDefined()
  })

  it("filters candidates by name", () => {
    vi.mocked(api.candidate.list.useQuery).mockReturnValue({
      data: { items: mockCandidates },
      isLoading: false,
      error: null,
    } as ReturnType<typeof api.candidate.list.useQuery>)

    render(<CandidateSelectDialog {...baseProps} />)

    const input = document.querySelector('input[aria-label="Rechercher un candidat"]')!
    fireEvent.change(input, { target: { value: "alice" } })

    expect(screen.getByText("Alice Dupont")).toBeDefined()
    expect(screen.queryByText("Bob Martin")).toBeNull()
  })

  it("filters candidates by title", () => {
    vi.mocked(api.candidate.list.useQuery).mockReturnValue({
      data: { items: mockCandidates },
      isLoading: false,
      error: null,
    } as ReturnType<typeof api.candidate.list.useQuery>)

    render(<CandidateSelectDialog {...baseProps} />)

    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "backend" } })

    expect(screen.getByText("Bob Martin")).toBeDefined()
    expect(screen.queryByText("Alice Dupont")).toBeNull()
  })

  it("marks already-associated candidates as disabled", () => {
    vi.mocked(api.candidate.list.useQuery).mockReturnValue({
      data: { items: mockCandidates },
      isLoading: false,
      error: null,
    } as ReturnType<typeof api.candidate.list.useQuery>)

    render(<CandidateSelectDialog {...baseProps} existingCandidateIds={["c1"]} />)

    expect(screen.getByText("Déjà associé")).toBeDefined()
  })

  it("calls offer.addCandidates mutation on confirm with selected ids", () => {
    vi.mocked(api.candidate.list.useQuery).mockReturnValue({
      data: { items: mockCandidates },
      isLoading: false,
      error: null,
    } as ReturnType<typeof api.candidate.list.useQuery>)

    render(<CandidateSelectDialog {...baseProps} />)

    // Select Alice (first option button)
    const options = screen.getAllByRole("option")
    fireEvent.click(options[0])

    // Click Associer (1)
    const confirmBtn = screen.getByText(/Associer \(1\)/)
    fireEvent.click(confirmBtn)

    expect(mockMutate).toHaveBeenCalledWith({
      offerId: "offer-1",
      candidateIds: ["c1"],
    })
  })
})
