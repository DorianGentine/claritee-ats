/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, within, fireEvent, cleanup } from "@testing-library/react"
import { ActiveFilterChips } from "@/components/candidates/ActiveFilterChips"
import { EMPTY_CANDIDATE_FILTERS, type CandidateFilters } from "@/components/candidates/CandidateListFilters"

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
  },
}))

const paris = { id: "city-1", name: "Paris", region: null, country: "France" }
const lyon = { id: "city-2", name: "Lyon", region: null, country: "France" }

afterEach(() => {
  cleanup()
})

const baseProps = {
  filters: EMPTY_CANDIDATE_FILTERS,
  totalCount: 0,
  isLoading: false,
  selectedCities: [],
  onRemoveTag: vi.fn(),
  onRemoveCity: vi.fn(),
  onRemoveLanguage: vi.fn(),
}

describe("ActiveFilterChips", () => {
  it("renders nothing when no filters are active", () => {
    const { container } = render(<ActiveFilterChips {...baseProps} />)
    expect(container.innerHTML).toBe("")
  })

  it("renders tag chips with tag names", () => {
    const filters: CandidateFilters = {
      ...EMPTY_CANDIDATE_FILTERS,
      tagIds: ["tag-1"],
    }
    const { container } = render(
      <ActiveFilterChips {...baseProps} filters={filters} totalCount={3} />
    )

    expect(within(container).getByText("Tag: React")).toBeDefined()
  })

  it("renders language chips", () => {
    const filters: CandidateFilters = {
      ...EMPTY_CANDIDATE_FILTERS,
      languageNames: ["Français"],
    }
    const { container } = render(
      <ActiveFilterChips {...baseProps} filters={filters} totalCount={1} />
    )

    expect(within(container).getByText("Langue: Français")).toBeDefined()
  })

  it("renders a city chip with the resolved name", () => {
    const filters: CandidateFilters = {
      ...EMPTY_CANDIDATE_FILTERS,
      cityIds: [paris.id],
    }
    const { container } = render(
      <ActiveFilterChips
        {...baseProps}
        filters={filters}
        totalCount={2}
        selectedCities={[paris]}
      />
    )

    expect(within(container).getByText("Ville: Paris")).toBeDefined()
  })

  it("renders a fallback chip (still removable) when the city name isn't resolved yet", () => {
    const filters: CandidateFilters = {
      ...EMPTY_CANDIDATE_FILTERS,
      cityIds: [paris.id],
    }
    const { container } = render(
      <ActiveFilterChips
        {...baseProps}
        filters={filters}
        totalCount={2}
        selectedCities={[]}
      />
    )
    const el = within(container)

    expect(el.getByText("Ville : résolution…")).toBeDefined()
    expect(
      el.getByRole("button", { name: "Retirer le filtre ville" })
    ).toBeDefined()
  })

  it("calls onRemoveCity when clicking the city chip X button", () => {
    const onRemoveCity = vi.fn()
    const filters: CandidateFilters = {
      ...EMPTY_CANDIDATE_FILTERS,
      cityIds: [lyon.id],
    }
    const { container } = render(
      <ActiveFilterChips
        {...baseProps}
        filters={filters}
        totalCount={1}
        selectedCities={[lyon]}
        onRemoveCity={onRemoveCity}
      />
    )

    const removeBtn = within(container).getByRole("button", {
      name: "Retirer le filtre ville Lyon",
    })
    fireEvent.click(removeBtn)
    expect(onRemoveCity).toHaveBeenCalledOnce()
    expect(onRemoveCity).toHaveBeenCalledWith(lyon.id)
  })

  it("shows the candidate count, or a loading state", () => {
    const filters: CandidateFilters = {
      ...EMPTY_CANDIDATE_FILTERS,
      tagIds: ["tag-1"],
    }
    const { container, rerender } = render(
      <ActiveFilterChips {...baseProps} filters={filters} totalCount={4} />
    )
    expect(within(container).getByText("4 candidats trouvés")).toBeDefined()

    rerender(
      <ActiveFilterChips
        {...baseProps}
        filters={filters}
        totalCount={1}
        isLoading
      />
    )
    expect(within(container).getByText("Chargement…")).toBeDefined()
  })
})
