/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { render, within } from "@testing-library/react"
import { JobOfferCard, type JobOfferCardItem } from "@/components/offers/JobOfferCard"

const mockOffer: JobOfferCardItem = {
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
    expect(card.getByText(/45000–55000 €/)).toBeDefined()
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

  it("renders up to 3 tags and +N badge using tagCount", () => {
    const offerWithTags: JobOfferCardItem = {
      ...mockOffer,
      tags: [
        { id: "t1", name: "CDI", color: "#ff0000" },
        { id: "t2", name: "Remote", color: "#00ff00" },
        { id: "t3", name: "Senior", color: "#0000ff" },
        { id: "t4", name: "Tech Lead", color: "#aaaaaa" },
      ],
      tagCount: 7,
    }

    const { container } = render(<JobOfferCard offer={offerWithTags} />)
    const card = within(container)

    expect(card.getByText("CDI")).toBeDefined()
    expect(card.getByText("Remote")).toBeDefined()
    expect(card.getByText("Senior")).toBeDefined()
    expect(card.getByText("+4")).toBeDefined()
  })
})
