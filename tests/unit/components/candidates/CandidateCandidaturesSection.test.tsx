/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, within } from "@testing-library/react"
import { CandidateCandidaturesSection } from "@/components/candidates/CandidateCandidaturesSection"

const mockMutate = vi.fn()

vi.mock("@/lib/trpc/client", () => ({
  api: {
    candidature: {
      updateStatus: {
        useMutation: vi.fn(() => ({
          mutate: mockMutate,
          isPending: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      candidate: {
        getById: {
          cancel: vi.fn().mockResolvedValue(undefined),
          getData: vi.fn().mockReturnValue(undefined),
          setData: vi.fn(),
          invalidate: vi.fn(),
        },
      },
      offer: {
        getById: {
          invalidate: vi.fn(),
        },
      },
    })),
  },
}))

vi.mock("@/components/shared/CandidatureStatusDropdown", () => ({
  CandidatureStatusDropdown: ({ currentStatus }: { currentStatus: string }) => (
    <span data-testid="status-dropdown">{currentStatus}</span>
  ),
}))

const mockCandidatures = [
  {
    id: "cand-1",
    status: "CONTACTED_LINKEDIN" as const,
    createdAt: new Date("2026-01-15"),
    jobOffer: { id: "offer-1", title: "Développeur Full Stack" },
  },
  {
    id: "cand-2",
    status: "APPLIED" as const,
    createdAt: new Date("2026-02-01"),
    jobOffer: { id: "offer-2", title: "Lead Technique" },
  },
]

describe("CandidateCandidaturesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows empty state when no candidatures", () => {
    const { container } = render(
      <CandidateCandidaturesSection candidateId="c1" candidatures={[]} />,
    )
    const card = within(container)
    expect(card.getByText("Aucune offre associée")).toBeDefined()
  })

  it("renders offer titles with links to /offers/[id]", () => {
    const { container } = render(
      <CandidateCandidaturesSection candidateId="c1" candidatures={mockCandidatures} />,
    )
    const card = within(container)

    expect(card.getByText("Développeur Full Stack")).toBeDefined()
    expect(card.getByText("Lead Technique")).toBeDefined()

    const links = container.querySelectorAll("a")
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"))
    expect(hrefs).toContain("/offers/offer-1")
    expect(hrefs).toContain("/offers/offer-2")
  })

  it("renders status dropdown for each candidature", () => {
    const { container } = render(
      <CandidateCandidaturesSection candidateId="c1" candidatures={mockCandidatures} />,
    )
    const dropdowns = container.querySelectorAll("[data-testid='status-dropdown']")
    expect(dropdowns).toHaveLength(2)
    expect(dropdowns[0].textContent).toBe("CONTACTED_LINKEDIN")
    expect(dropdowns[1].textContent).toBe("APPLIED")
  })

  it("renders section title 'Offres associées'", () => {
    const { container } = render(
      <CandidateCandidaturesSection candidateId="c1" candidatures={mockCandidatures} />,
    )
    expect(within(container).getByText("Offres associées")).toBeDefined()
  })
})
