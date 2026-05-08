/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { AnonymousCandidateProfile } from "@/components/share/AnonymousCandidateProfile"
import type { AnonymousPublicCandidate } from "@/server/publicCandidateSelect"

const baseAnonymous: AnonymousPublicCandidate = {
  title: "Développeuse Full Stack",
  city: "Paris",
  summary: "Profil senior orienté backend.",
  experiences: [
    {
      id: "exp-1",
      title: "Lead Dev",
      company: "[Entreprise confidentielle]",
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
      school: "[École confidentielle]",
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

describe("AnonymousCandidateProfile", () => {
  it("displays company branding banner", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.getByText(/Présenté par/)).toBeDefined()
    expect(screen.getAllByText("Cabinet Alpha").length).toBeGreaterThanOrEqual(1)
  })

  it("displays 'Fiche anonymisée' badge", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.getByText("Fiche anonymisée")).toBeDefined()
  })

  it("displays 'Candidat anonyme' as name", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.getByText("Candidat anonyme")).toBeDefined()
  })

  it("displays title and city", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.getByText("Développeuse Full Stack")).toBeDefined()
    expect(screen.getByText("Paris")).toBeDefined()
  })

  it("does not display email, phone or LinkedIn", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.queryByText(/@/)).toBeNull()
    expect(screen.queryByText(/LinkedIn/i)).toBeNull()
    expect(screen.queryByText(/tel:/)).toBeNull()
  })

  it("displays summary", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.getByText("Profil senior orienté backend.")).toBeDefined()
  })

  it("displays languages with level labels", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.getByText(/Anglais/)).toBeDefined()
    expect(screen.getByText(/Courant/)).toBeDefined()
    expect(screen.getByText(/Espagnol/)).toBeDefined()
    expect(screen.getByText(/Notions/)).toBeDefined()
  })

  it("displays experiences with masked company", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.getByText("Lead Dev")).toBeDefined()
    expect(screen.getByText(/Entreprise confidentielle/)).toBeDefined()
    expect(screen.getByText("Architecture micro-services.")).toBeDefined()
  })

  it("displays formations with masked school", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.getByText(/Master Informatique/)).toBeDefined()
    expect(screen.getByText(/École confidentielle/)).toBeDefined()
  })

  it("displays CTA with company name", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.getByText(/Intéressé par ce profil/)).toBeDefined()
    expect(screen.getByText(/Contactez/)).toBeDefined()
  })

  it("shows empty state when no summary", () => {
    render(
      <AnonymousCandidateProfile
        candidate={{ ...baseAnonymous, summary: null }}
        companyName="Cabinet Alpha"
      />
    )
    expect(screen.getByText("Aucun résumé renseigné")).toBeDefined()
  })

  it("shows empty state when no experiences", () => {
    render(
      <AnonymousCandidateProfile
        candidate={{ ...baseAnonymous, experiences: [] }}
        companyName="Cabinet Alpha"
      />
    )
    expect(screen.getByText("Aucune expérience ajoutée")).toBeDefined()
  })

  it("shows empty state when no formations", () => {
    render(
      <AnonymousCandidateProfile
        candidate={{ ...baseAnonymous, formations: [] }}
        companyName="Cabinet Alpha"
      />
    )
    expect(screen.getByText("Aucune formation ajoutée")).toBeDefined()
  })

  it("shows empty state when no languages", () => {
    render(
      <AnonymousCandidateProfile
        candidate={{ ...baseAnonymous, languages: [] }}
        companyName="Cabinet Alpha"
      />
    )
    expect(screen.getByText("Aucune langue renseignée")).toBeDefined()
  })

  it("does not render internal sections (notes, tags, CV, actions)", () => {
    render(<AnonymousCandidateProfile candidate={baseAnonymous} companyName="Cabinet Alpha" />)
    expect(screen.queryByText("Notes")).toBeNull()
    expect(screen.queryByText("Tags")).toBeNull()
    expect(screen.queryByText("Candidatures")).toBeNull()
    expect(screen.queryByText(/CV/)).toBeNull()
    expect(screen.queryByText("Modifier")).toBeNull()
    expect(screen.queryByText("Supprimer")).toBeNull()
  })
})
