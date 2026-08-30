/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { OfferListFilters, EMPTY_OFFER_FILTERS, type OfferFilters } from "@/components/offers/OfferListFilters"

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
            { id: "client-2", name: "Beta Inc", siren: null, contactsCount: 0, offersCount: 1 },
          ],
        }),
      },
    },
    city: {
      autocomplete: {
        useQuery: () => ({ data: [], isLoading: false, isError: false }),
      },
    },
  },
}))

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}))

afterEach(() => {
  cleanup()
})

describe("OfferListFilters", () => {
  const defaultProps = {
    filters: EMPTY_OFFER_FILTERS,
    onFiltersChange: vi.fn(),
    onClear: vi.fn(),
  }

  it("renders filter panel with all filter sections", () => {
    render(<OfferListFilters {...defaultProps} />)

    expect(screen.getByText("Filtres")).toBeDefined()
    expect(screen.getByText("Statut")).toBeDefined()
    expect(screen.getByText("Tags")).toBeDefined()
    expect(screen.getByText("Salaire (€)")).toBeDefined()
    expect(screen.getByText("Ville")).toBeDefined()
    expect(screen.getByText("Client")).toBeDefined()
  })

  it("does not show clear button when no filters are active", () => {
    render(<OfferListFilters {...defaultProps} />)

    expect(screen.queryByText("Effacer filtres")).toBeNull()
  })

  it("shows clear button when at least one filter is active", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      statuses: ["TODO"],
    }
    render(
      <OfferListFilters
        {...defaultProps}
        filters={filters}
      />
    )

    expect(screen.getByText("Effacer filtres")).toBeDefined()
  })

  it("calls onClear when clear button is clicked", () => {
    const onClear = vi.fn()
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      statuses: ["TODO"],
    }
    const { container } = render(
      <OfferListFilters
        {...defaultProps}
        filters={filters}
        onClear={onClear}
      />
    )

    const allButtons = container.querySelectorAll("button")
    const clearButton = Array.from(allButtons).find(
      (b) => b.textContent === "Effacer filtres"
    )
    expect(clearButton).toBeDefined()
    fireEvent.click(clearButton!)
    expect(onClear).toHaveBeenCalledOnce()
  })

  it("displays correct status count when statuses are selected", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      statuses: ["TODO", "DONE"],
    }
    render(
      <OfferListFilters
        {...defaultProps}
        filters={filters}
      />
    )

    expect(screen.getByText("2 statut(s)")).toBeDefined()
  })

  it("displays correct tag count when tags are selected", () => {
    const filters: OfferFilters = {
      ...EMPTY_OFFER_FILTERS,
      tagIds: ["tag-1"],
    }
    render(
      <OfferListFilters
        {...defaultProps}
        filters={filters}
      />
    )

    expect(screen.getByText("1 tag(s) sélectionné(s)")).toBeDefined()
  })

  it("opens status popover and shows status options", () => {
    render(<OfferListFilters {...defaultProps} />)

    const trigger = document.getElementById("filter-offer-statuses")
    expect(trigger).toBeDefined()
    fireEvent.click(trigger!)

    expect(screen.getByText("À faire")).toBeDefined()
    expect(screen.getByText("En cours")).toBeDefined()
    expect(screen.getByText("Terminé")).toBeDefined()
  })

  it("opens tags popover and shows tag options", () => {
    render(<OfferListFilters {...defaultProps} />)

    const trigger = document.getElementById("filter-offer-tags")
    expect(trigger).toBeDefined()
    fireEvent.click(trigger!)

    expect(screen.getByText("React")).toBeDefined()
    expect(screen.getByText("Node.js")).toBeDefined()
  })
})
