/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { render, within } from "@testing-library/react"
import { JobOfferCard, type JobOfferCardItem } from "@/components/offers/JobOfferCard"

const mockOffer = {
  id: "offer-1",
  title: "Développeur Full Stack",
  location: "Paris",
  salaryMin: 45000,
  salaryMax: 55000,
  status: "IN_PROGRESS" as const,
  clientCompanyName: "Acme Corp",
}

describe("JobOfferCard", () => {
  it("renders title, client name, location and salary range", () => {
    const { container } = render(<JobOfferCard offer={mockOffer} />)
    const card = within(container)

    expect(card.getByText("Développeur Full Stack")).toBeDefined()
    expect(card.getByText("Acme Corp")).toBeDefined()
    expect(card.getByText("Paris")).toBeDefined()
    expect(card.getByText(/45–55 k€/)).toBeDefined()
  })

  it("renders status badge with label En cours", () => {
    const { container } = render(<JobOfferCard offer={mockOffer} />)
    const card = within(container)
    expect(card.getByText("En cours")).toBeDefined()
  })

  it("links to offer detail page", () => {
    const { container } = render(<JobOfferCard offer={mockOffer} />)
    const card = within(container)
    const link = card.getByRole("link", { name: /voir l'offre/i })
    expect(link.getAttribute("href")).toBe("/offers/offer-1")
  })

  it("shows Client non défini when clientCompanyName is null", () => {
    const offerWithoutClient: JobOfferCardItem = {
      ...mockOffer,
      clientCompanyName: null,
    }
    const { container } = render(<JobOfferCard offer={offerWithoutClient} />)
    const card = within(container)
    expect(card.getByText("Client non défini")).toBeDefined()
  })

  it("shows Salaire non précisé when salary is null", () => {
    const { container } = render(
      <JobOfferCard
        offer={{
          ...mockOffer,
          salaryMin: null,
          salaryMax: null,
        }}
      />
    )
    const card = within(container)
    expect(card.getByText("Salaire non précisé")).toBeDefined()
  })
})
