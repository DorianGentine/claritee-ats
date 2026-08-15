/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, within } from "@testing-library/react"
import { api } from "@/lib/trpc/client"
import { OfferDetailView } from "@/components/offers/OfferDetailView"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/components/offers/OfferTagsSection", () => ({
  OfferTagsSection: () => <div data-testid="offer-tags-section" />,
}))

vi.mock("@/components/offers/OfferCandidatesSection", () => ({
  OfferCandidatesSection: ({ candidatures }: { candidatures: unknown[] }) => (
    <div data-testid="offer-candidates-section">
      {candidatures.length === 0 && <p>Aucun candidat associé</p>}
    </div>
  ),
}))

vi.mock("@/components/offers/OfferNotesSection", () => ({
  OfferNotesSection: () => <div data-testid="offer-notes-section" />,
}))

vi.mock("@/lib/trpc/client", () => ({
  api: {
    offer: {
      getById: {
        useQuery: vi.fn(),
      },
      delete: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      offer: {
        list: { invalidate: vi.fn() },
        getById: { invalidate: vi.fn() },
      },
    })),
  },
}))

const mockOffer = {
  id: "offer-1",
  title: "Développeur Full Stack",
  description: "Description du poste",
  city: { id: "city-1", name: "Paris", region: "Île-de-France", country: "France" },
  salaryMin: 45000,
  salaryMax: 55000,
  status: "IN_PROGRESS" as const,
  clientCompanyId: "client-1",
  clientContactId: "contact-1",
  companyId: "company-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  clientCompany: { id: "client-1", name: "Acme Corp" },
  clientContact: {
    id: "contact-1",
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@example.com",
    phone: "0600000001",
    position: "DRH",
  },
  tags: [{ id: "t1", name: "CDI", color: "#ff0000" }],
  candidatures: [],
  candidatureCountByStatus: {},
}

describe("OfferDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading skeleton when isLoading is true", () => {
    vi.mocked(api.offer.getById.useQuery).mockReturnValue({
      isLoading: true,
      data: undefined,
      error: null,
    } as ReturnType<typeof api.offer.getById.useQuery>)

    const { container } = render(<OfferDetailView offerId="offer-1" />)
    const skeleton = container.querySelector(".animate-pulse")
    expect(skeleton).not.toBeNull()
  })

  it("shows error state when error occurs", () => {
    vi.mocked(api.offer.getById.useQuery).mockReturnValue({
      isLoading: false,
      data: undefined,
      error: { message: "Not found" },
    } as ReturnType<typeof api.offer.getById.useQuery>)

    const { container } = render(<OfferDetailView offerId="offer-1" />)
    const card = within(container)
    expect(
      card.getByText("Offre introuvable ou vous n'avez pas accès à cette fiche."),
    ).toBeDefined()
  })

  it("shows offer title, status badge, client company name in success state", () => {
    vi.mocked(api.offer.getById.useQuery).mockReturnValue({
      isLoading: false,
      data: mockOffer,
      error: null,
    } as ReturnType<typeof api.offer.getById.useQuery>)

    const { container } = render(<OfferDetailView offerId="offer-1" />)
    const card = within(container)

    expect(card.getByText("Développeur Full Stack")).toBeDefined()
    expect(card.getByText("En cours")).toBeDefined()
    expect(card.getByText("Acme Corp")).toBeDefined()
  })

  it("shows 'Aucun candidat associé' when no candidatures", () => {
    vi.mocked(api.offer.getById.useQuery).mockReturnValue({
      isLoading: false,
      data: { ...mockOffer, candidatures: [] },
      error: null,
    } as ReturnType<typeof api.offer.getById.useQuery>)

    const { container } = render(<OfferDetailView offerId="offer-1" />)
    const card = within(container)

    expect(card.getByText("Aucun candidat associé")).toBeDefined()
  })

  it("shows city name and region when city is defined", () => {
    vi.mocked(api.offer.getById.useQuery).mockReturnValue({
      isLoading: false,
      data: mockOffer,
      error: null,
    } as ReturnType<typeof api.offer.getById.useQuery>)

    const { container } = render(<OfferDetailView offerId="offer-1" />)
    const card = within(container)

    expect(card.getByText("Localisation")).toBeDefined()
    expect(card.getByText("Paris, Île-de-France")).toBeDefined()
  })

  it("shows 'Localisation non précisée' when city is null", () => {
    vi.mocked(api.offer.getById.useQuery).mockReturnValue({
      isLoading: false,
      data: { ...mockOffer, city: null },
      error: null,
    } as ReturnType<typeof api.offer.getById.useQuery>)

    const { container } = render(<OfferDetailView offerId="offer-1" />)
    const card = within(container)

    expect(card.getByText("Localisation")).toBeDefined()
    expect(card.getByText("Localisation non précisée")).toBeDefined()
  })
})
