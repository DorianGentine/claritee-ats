/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import {
  PublicCandidateProfile,
  type PublicCandidate,
} from "@/components/share/PublicCandidateProfile"

const baseCandidate: PublicCandidate = {
  firstName: "Alice",
  lastName: "Martin",
  email: "alice@example.com",
  phone: "0612345678",
  linkedinUrl: null,
  title: "Développeuse Full Stack",
  city: "Paris",
  summary: "Profil senior orienté backend.",
  photoUrl: null,
  experiences: [
    {
      id: "exp-1",
      title: "Lead Dev",
      company: "Acme Corp",
      startDate: new Date("2022-01-01"),
      endDate: null,
      description: "Architecture micro-services.",
    },
  ],
  formations: [
    {
      id: "form-1",
      degree: "Master Informatique",
      field: "Génie logiciel",
      school: "Université Paris-Saclay",
      startDate: new Date("2018-09-01"),
      endDate: new Date("2020-06-30"),
    },
  ],
  languages: [
    { id: "lang-1", name: "Anglais", level: "FLUENT" },
    { id: "lang-2", name: "Espagnol", level: "NOTION" },
  ],
}

afterEach(() => cleanup())

describe("PublicCandidateProfile", () => {
  it("displays company branding banner", () => {
    render(<PublicCandidateProfile candidate={baseCandidate} companyName="Cabinet Alpha" />)
    expect(screen.getByText("Cabinet Alpha")).toBeDefined()
    expect(screen.getByText(/Présenté par/)).toBeDefined()
  })

  it("displays candidate name and title", () => {
    render(<PublicCandidateProfile candidate={baseCandidate} companyName="Cabinet Alpha" />)
    expect(screen.getByText("Alice Martin")).toBeDefined()
    expect(screen.getByText("Développeuse Full Stack")).toBeDefined()
  })

  it("displays contact info", () => {
    render(<PublicCandidateProfile candidate={baseCandidate} companyName="Cabinet Alpha" />)
    expect(screen.getByText("alice@example.com")).toBeDefined()
    expect(screen.getByText("0612345678")).toBeDefined()
  })

  it("displays summary", () => {
    render(<PublicCandidateProfile candidate={baseCandidate} companyName="Cabinet Alpha" />)
    expect(screen.getByText("Profil senior orienté backend.")).toBeDefined()
  })

  it("displays languages with level labels", () => {
    render(<PublicCandidateProfile candidate={baseCandidate} companyName="Cabinet Alpha" />)
    expect(screen.getByText(/Anglais/)).toBeDefined()
    expect(screen.getByText(/Courant/)).toBeDefined()
    expect(screen.getByText(/Espagnol/)).toBeDefined()
    expect(screen.getByText(/Notions/)).toBeDefined()
  })

  it("displays experiences", () => {
    render(<PublicCandidateProfile candidate={baseCandidate} companyName="Cabinet Alpha" />)
    expect(screen.getByText("Lead Dev")).toBeDefined()
    expect(screen.getByText(/Acme Corp/)).toBeDefined()
    expect(screen.getByText("Architecture micro-services.")).toBeDefined()
    // En cours → "Aujourd'hui"
    expect(screen.getByText(/Aujourd'hui/)).toBeDefined()
  })

  it("displays formations", () => {
    render(<PublicCandidateProfile candidate={baseCandidate} companyName="Cabinet Alpha" />)
    expect(screen.getByText(/Master Informatique/)).toBeDefined()
    expect(screen.getByText(/Université Paris-Saclay/)).toBeDefined()
  })

  it("shows empty state when no experiences", () => {
    render(
      <PublicCandidateProfile
        candidate={{ ...baseCandidate, experiences: [] }}
        companyName="Cabinet Alpha"
      />
    )
    expect(screen.getByText("Aucune expérience ajoutée")).toBeDefined()
  })

  it("shows empty state when no formations", () => {
    render(
      <PublicCandidateProfile
        candidate={{ ...baseCandidate, formations: [] }}
        companyName="Cabinet Alpha"
      />
    )
    expect(screen.getByText("Aucune formation ajoutée")).toBeDefined()
  })

  it("shows empty state when no languages", () => {
    render(
      <PublicCandidateProfile
        candidate={{ ...baseCandidate, languages: [] }}
        companyName="Cabinet Alpha"
      />
    )
    expect(screen.getByText("Aucune langue renseignée")).toBeDefined()
  })

  it("shows empty state when no summary", () => {
    render(
      <PublicCandidateProfile
        candidate={{ ...baseCandidate, summary: null }}
        companyName="Cabinet Alpha"
      />
    )
    expect(screen.getByText("Aucun résumé renseigné")).toBeDefined()
  })

  it("does not render internal sections (notes, tags, offers, CV)", () => {
    render(<PublicCandidateProfile candidate={baseCandidate} companyName="Cabinet Alpha" />)
    expect(screen.queryByText("Notes")).toBeNull()
    expect(screen.queryByText("Tags")).toBeNull()
    expect(screen.queryByText("Candidatures")).toBeNull()
    expect(screen.queryByText(/CV/)).toBeNull()
    expect(screen.queryByText("Modifier")).toBeNull()
    expect(screen.queryByText("Supprimer")).toBeNull()
  })
})
