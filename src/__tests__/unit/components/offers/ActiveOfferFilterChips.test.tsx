/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, within, fireEvent, cleanup } from "@testing-library/react"
import { ActiveOfferFilterChips } from "@/components/offers/ActiveOfferFilterChips"
import { EMPTY_OFFER_FILTERS, type OfferFilters } from "@/components/offers/OfferListFilters"

vi.mock("@/lib/trpc/client", () => ({
  api: {
    tag: {
      list: {
        useQuery: () => ({
          data: [
            { id: "tag-1", name: "React", color: "#61dafb" },
            { id: "tag-2", name: "Node.js", color: "#68a063" },
          ],
        }),
      },
    },
    clientCompany: {
      list: {
        useQuery: () => ({
          data: [
            { id: "client-1", name: "Acme Corp", siren: null, contactsCount: 1, offersCount: 2 },
          ],
        }),
      },
    },
  },
}))

afterEach(() => {
  cleanup()
})

const baseProps = {
  filters: EMPTY_OFFER_FILTERS,
  totalCount: 0,
  isLoading: false,
  onRemoveStatus: vi.fn(),
  onRemoveTag: vi.fn(),
  onRemoveSalaryMin: vi.fn(),
  onRemoveSalaryMax: vi.fn(),
  onRemoveLocation: vi.fn(),
  onRemoveClientCompany: vi.fn(),
}

describe("ActiveOfferFilterChips", () => {
  it("renders nothing when no filters are active", () => {
    const { container } = render(<ActiveOfferFilterChips {...baseProps} />)
    expect(container.innerHTML).toBe("")
  })

  it("renders status chips with correct labels", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      statuses: ["TODO", "IN_PROGRESS"],
    }
    const { container } = render(
      <ActiveOfferFilterChips {...baseProps} filters={filters} totalCount={5} />
    )
    const el = within(container)

    expect(el.getByText("Statut: À faire")).toBeDefined()
    expect(el.getByText("Statut: En cours")).toBeDefined()
  })

  it("renders tag chips with tag names", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      tagIds: ["tag-1"],
    }
    const { container } = render(
      <ActiveOfferFilterChips {...baseProps} filters={filters} totalCount={3} />
    )

    expect(within(container).getByText("Tag: React")).toBeDefined()
  })

  it("renders salary min/max chips", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      salaryMin: 30000,
      salaryMax: 60000,
    }
    const { container } = render(
      <ActiveOfferFilterChips {...baseProps} filters={filters} totalCount={2} />
    )
    const el = within(container)

    expect(el.getByText("Salaire min: 30000")).toBeDefined()
    expect(el.getByText("Salaire max: 60000")).toBeDefined()
  })

  it("renders location chip", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      location: "Paris",
    }
    const { container } = render(
      <ActiveOfferFilterChips {...baseProps} filters={filters} totalCount={4} />
    )

    expect(within(container).getByText("Ville: Paris")).toBeDefined()
  })

  it("renders client company chip", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      clientCompanyId: "client-1",
    }
    const { container } = render(
      <ActiveOfferFilterChips {...baseProps} filters={filters} totalCount={1} />
    )

    expect(within(container).getByText("Client: Acme Corp")).toBeDefined()
  })

  it("displays count text with correct plural form", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      statuses: ["TODO"],
    }
    const { container: c7 } = render(
      <ActiveOfferFilterChips {...baseProps} filters={filters} totalCount={7} />
    )
    expect(within(c7).getByText("7 offres trouvées")).toBeDefined()
    cleanup()

    const { container: c1 } = render(
      <ActiveOfferFilterChips {...baseProps} filters={filters} totalCount={1} />
    )
    expect(within(c1).getByText("1 offre trouvée")).toBeDefined()
  })

  it("displays loading text when isLoading is true", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      statuses: ["TODO"],
    }
    const { container } = render(
      <ActiveOfferFilterChips
        {...baseProps}
        filters={filters}
        isLoading={true}
        totalCount={0}
      />
    )

    expect(within(container).getByText("Chargement…")).toBeDefined()
  })

  it("calls onRemoveStatus when clicking a status chip X button", () => {
    const onRemoveStatus = vi.fn()
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      statuses: ["DONE"],
    }
    const { container } = render(
      <ActiveOfferFilterChips
        {...baseProps}
        filters={filters}
        totalCount={1}
        onRemoveStatus={onRemoveStatus}
      />
    )

    const removeBtn = within(container).getByLabelText(
      "Retirer le filtre statut Terminé"
    )
    fireEvent.click(removeBtn)
    expect(onRemoveStatus).toHaveBeenCalledWith("DONE")
  })

  it("calls onRemoveTag when clicking a tag chip X button", () => {
    const onRemoveTag = vi.fn()
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      tagIds: ["tag-1"],
    }
    const { container } = render(
      <ActiveOfferFilterChips
        {...baseProps}
        filters={filters}
        totalCount={1}
        onRemoveTag={onRemoveTag}
      />
    )

    const removeBtn = within(container).getByLabelText(
      "Retirer le filtre tag React"
    )
    fireEvent.click(removeBtn)
    expect(onRemoveTag).toHaveBeenCalledWith("tag-1")
  })

  it("calls onRemoveLocation when clicking location chip X button", () => {
    const onRemoveLocation = vi.fn()
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      location: "Lyon",
    }
    const { container } = render(
      <ActiveOfferFilterChips
        {...baseProps}
        filters={filters}
        totalCount={1}
        onRemoveLocation={onRemoveLocation}
      />
    )

    const removeBtn = within(container).getByLabelText(
      "Retirer le filtre ville Lyon"
    )
    fireEvent.click(removeBtn)
    expect(onRemoveLocation).toHaveBeenCalledOnce()
  })
})
