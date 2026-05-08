import type { AnonymousPublicCandidate } from "@/server/publicCandidateSelect"
import { Badge } from "@/components/ui/badge"
import { ProfileSectionsGrid } from "@/components/share/ProfileSectionsGrid"

type Props = {
  candidate: AnonymousPublicCandidate
  companyName: string
}

export const AnonymousCandidateProfile = ({ candidate, companyName }: Props) => (
  <main className="min-h-[calc(100vh-3.5rem)] bg-background p-6">
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Branding + badge anonyme */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <span>
          Présenté par{" "}
          <span className="font-medium text-foreground">{companyName}</span>
        </span>
        <Badge variant="secondary">Fiche anonymisée</Badge>
      </div>

      {/* Header anonyme — pas de photo, pas de nom réel, pas de contacts */}
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-start">
        {/* Avatar générique */}
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-border bg-secondary/80 text-2xl font-semibold text-secondary-foreground">
          ?
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Candidat anonyme
          </h1>
          {candidate.title && (
            <p className="mt-1 text-muted-foreground">{candidate.title}</p>
          )}
          {candidate.city && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {candidate.city}
            </p>
          )}
        </div>
      </header>

      <ProfileSectionsGrid
        summary={candidate.summary}
        languages={candidate.languages}
        experiences={candidate.experiences}
        formations={candidate.formations}
      />

      {/* CTA */}
      <div className="rounded-lg border border-border bg-card px-6 py-5 text-center">
        <p className="text-base font-medium text-foreground">
          Intéressé par ce profil ?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Contactez{" "}
          <span className="font-medium text-foreground">{companyName}</span>
        </p>
      </div>
    </div>
  </main>
)
