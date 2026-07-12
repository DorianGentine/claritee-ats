/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, within, screen, fireEvent } from "@testing-library/react"
import { OfferCandidatesSection } from "@/components/offers/OfferCandidatesSection"
import type { CandidatureStatus } from "@prisma/client"

const mockMutateDelete = vi.fn()
const mockMutateUpdate = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/lib/trpc/client", () => ({
  api: {
    candidature: {
      updateStatus: {
        useMutation: vi.fn(() => ({ mutate: mockMutateUpdate, isPending: false })),
      },
      delete: {
        useMutation: vi.fn(() => ({ mutate: mockMutateDelete, isPending: false })),
      },
    },
    offer: {
      addCandidates: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
    },
    candidate: {
      list: {
        useQuery: vi.fn(() => ({ data: { items: [] }, isLoading: false, error: null })),
      },
    },
    useUtils: vi.fn(() => ({
      offer: {
        getById: {
          cancel: vi.fn().mockResolvedValue(undefined),
          getData: vi.fn().mockReturnValue(undefined),
          setData: vi.fn(),
          invalidate: vi.fn(),
        },
      },
      candidate: {
        getById: {
          cancel: vi.fn().mockResolvedValue(undefined),
          getData: vi.fn().mockReturnValue(undefined),
          setData: vi.fn(),
          invalidate: vi.fn(),
        },
      },
    })),
  },
}))

vi.mock("@/components/shared/CandidatureStatusDropdown", () => ({
  CandidatureStatusDropdown: ({
    currentStatus,
    onSelect,
  }: {
    currentStatus: string
    onSelect: (s: CandidatureStatus) => void
  }) => (
    <button
      data-testid="status-dropdown"
      onClick={() => onSelect("APPLIED" as CandidatureStatus)}
    >
      {currentStatus}
    </button>
  ),
}))

const mockCandidatures = [
  {
    id: "cand-1",
    status: "CONTACTED_LINKEDIN" as const,
    candidate: {
      id: "c1",
      firstName: "Alice",
      lastName: "Dupont",
      title: "Dev Frontend",
      photoUrl: null,
    },
  },
  {
    id: "cand-2",
    status: "APPLIED" as const,
    candidate: {
      id: "c2",
      firstName: "Bob",
      lastName: "Martin",
      title: "Dev Backend",
      photoUrl: null,
    },
  },
]

const baseProps = {
  offerId: "offer-1",
  candidatures: mockCandidatures,
  candidatureCountByStatus: {
    CONTACTED_LINKEDIN: 1,
    APPLIED: 1,
  },
}

describe("OfferCandidatesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows empty state when no candidatures", () => {
    const { container } = render(
      <OfferCandidatesSection
        offerId="offer-1"
        candidatures={[]}
        candidatureCountByStatus={{}}
      />,
    )
    expect(within(container).getByText("Aucun candidat associé")).toBeDefined()
  })

  it("renders candidate names with links to /candidates/[id]", () => {
    const { container } = render(<OfferCandidatesSection {...baseProps} />)
    const card = within(container)

    expect(card.getByText("Alice Dupont")).toBeDefined()
    expect(card.getByText("Bob Martin")).toBeDefined()

    const links = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    )
    expect(links).toContain("/candidates/c1")
    expect(links).toContain("/candidates/c2")
  })

  it("renders one status dropdown per candidature", () => {
    const { container } = render(<OfferCandidatesSection {...baseProps} />)
    const dropdowns = container.querySelectorAll("[data-testid='status-dropdown']")
    expect(dropdowns).toHaveLength(2)
  })

  it("calls candidature.updateStatus mutation when a status is selected", () => {
    const { container } = render(<OfferCandidatesSection {...baseProps} />)
    const dropdowns = container.querySelectorAll("[data-testid='status-dropdown']")
    fireEvent.click(dropdowns[0])

    expect(mockMutateUpdate).toHaveBeenCalledWith({
      candidatureId: "cand-1",
      status: "APPLIED",
    })
  })

  it("shows dissociation confirmation dialog when trash button clicked", () => {
    const { container } = render(<OfferCandidatesSection {...baseProps} />)

    const trashBtn = container.querySelector("[aria-label='Dissocier Alice Dupont']")!
    fireEvent.click(trashBtn)

    // AlertDialog renders in portal — use screen to find content in document.body
    expect(screen.getByText("Dissocier ce candidat ?")).toBeDefined()
  })

  it("calls candidature.delete mutation after confirmation", () => {
    const { container } = render(<OfferCandidatesSection {...baseProps} />)

    // Open dialog
    const trashBtn = container.querySelector("[aria-label='Dissocier Alice Dupont']")!
    fireEvent.click(trashBtn)

    // Confirm dissociation — button is in dialog portal
    const dissocierBtns = screen.getAllByText("Dissocier")
    // The confirm button is the last "Dissocier" (the AlertDialog action button)
    fireEvent.click(dissocierBtns[dissocierBtns.length - 1])

    expect(mockMutateDelete).toHaveBeenCalledWith({ candidatureId: "cand-1" })
  })

  it("shows filter pill buttons when multiple statuses present", () => {
    const { container } = render(<OfferCandidatesSection {...baseProps} />)
    const card = within(container)

    expect(card.getByText("Tous")).toBeDefined()
  })

  it("filters candidatures when a status filter is clicked", () => {
    const { container } = render(<OfferCandidatesSection {...baseProps} />)
    const card = within(container)

    // Click on "Contacté sur LinkedIn" filter
    const filterBtn = card.getByText("Contacté sur LinkedIn")
    fireEvent.click(filterBtn)

    // Only Alice should be visible (CONTACTED_LINKEDIN)
    expect(card.getByText("Alice Dupont")).toBeDefined()
    expect(card.queryByText("Bob Martin")).toBeNull()
  })

  it("shows all candidatures when 'Tous' is clicked after filtering", () => {
    const { container } = render(<OfferCandidatesSection {...baseProps} />)
    const card = within(container)

    // Filter first
    fireEvent.click(card.getByText("Contacté sur LinkedIn"))
    expect(card.queryByText("Bob Martin")).toBeNull()

    // Reset
    fireEvent.click(card.getByText("Tous"))
    expect(card.getByText("Bob Martin")).toBeDefined()
    expect(card.getByText("Alice Dupont")).toBeDefined()
  })
})
