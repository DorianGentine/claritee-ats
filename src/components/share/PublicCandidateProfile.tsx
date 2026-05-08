import type { LanguageLevel } from "@prisma/client"
import { CandidateDetailHeader } from "@/components/candidates/CandidateDetailHeader"
import { ProfileSectionsGrid } from "@/components/share/ProfileSectionsGrid"

type Experience = {
  id: string
  title: string
  company: string
  startDate: Date | string
  endDate: Date | string | null
  description: string | null
}

type Formation = {
  id: string
  degree: string
  field: string | null
  school: string
  startDate: Date | string | null
  endDate: Date | string | null
}

type Language = {
  id: string
  name: string
  level: LanguageLevel
}

export type PublicCandidate = {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  title: string | null
  city: string | null
  summary: string | null
  photoUrl: string | null
  experiences: Experience[]
  formations: Formation[]
  languages: Language[]
}

type Props = {
  candidate: PublicCandidate
  companyName: string
}

export const PublicCandidateProfile = ({ candidate, companyName }: Props) => (
  <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Branding cabinet */}
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Présenté par{" "}
        <span className="font-medium text-foreground">{companyName}</span>
      </div>

      <CandidateDetailHeader
        photoUrl={candidate.photoUrl}
        firstName={candidate.firstName}
        lastName={candidate.lastName}
        title={candidate.title}
        city={candidate.city}
        email={candidate.email}
        phone={candidate.phone}
        linkedinUrl={candidate.linkedinUrl}
      />

      <ProfileSectionsGrid
        summary={candidate.summary}
        languages={candidate.languages}
        experiences={candidate.experiences}
        formations={candidate.formations}
      />
    </div>
  </main>
)
