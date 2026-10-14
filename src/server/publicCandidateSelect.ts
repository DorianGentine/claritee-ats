import type { LanguageLevel, Prisma } from "@prisma/client"
import { formatCandidateCities } from "@/lib/candidate-utils"

/**
 * Champs publics du candidat exposés via les liens de partage.
 * Utilisé par la page SSR `/share/[token]` et par la publicProcedure tRPC.
 * Ne pas ajouter de champs internes (notes, tags, candidatures, cvUrl, etc.).
 * `satisfies` garantit que tsc détecte tout champ absent du schéma Prisma.
 */
export const publicCandidateSelect = {
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  linkedinUrl: true,
  title: true,
  cities: {
    select: { city: { select: { name: true } } },
    orderBy: { order: "asc" as const },
  },
  summary: true,
  photoUrl: true,
  company: { select: { name: true } },
  experiences: {
    select: {
      id: true,
      title: true,
      company: true,
      startDate: true,
      endDate: true,
      description: true,
    },
    orderBy: { order: "asc" as const },
  },
  formations: {
    select: {
      id: true,
      degree: true,
      field: true,
      school: true,
      startDate: true,
      endDate: true,
    },
    orderBy: { order: "asc" as const },
  },
  languages: { select: { id: true, name: true, level: true } },
} satisfies Prisma.CandidateSelect

type PublicCandidateRecord = Prisma.CandidateGetPayload<{
  select: typeof publicCandidateSelect
}>

export type AnonymousPublicCandidate = {
  title: string | null
  city: string | null
  summary: string | null
  experiences: Array<{
    id: string
    title: string
    company: string
    startDate: Date
    endDate: Date | null
    description: string | null
  }>
  formations: Array<{
    id: string
    degree: string
    field: string | null
    school: string
    startDate: Date | null
    endDate: Date | null
  }>
  languages: Array<{ id: string; name: string; level: LanguageLevel }>
}

/**
 * Transforme un candidat issu de publicCandidateSelect en DTO public :
 * les villes structurées deviennent un libellé unique `city`.
 */
export const mapToPublicDto = ({ cities, ...candidate }: PublicCandidateRecord) => ({
  ...candidate,
  city: formatCandidateCities(cities),
})

/**
 * Transforme un candidat issu de publicCandidateSelect en DTO anonyme.
 * Supprime les champs identifiants et masque les noms d'entreprises et d'écoles.
 * Ce mapping s'exécute côté serveur uniquement.
 */
export const mapToAnonymousPublicDto = (
  candidate: PublicCandidateRecord
): AnonymousPublicCandidate => ({
  title: candidate.title,
  city: formatCandidateCities(candidate.cities),
  summary: candidate.summary,
  experiences: candidate.experiences.map((experience) => ({
    ...experience,
    company: "[Entreprise confidentielle]",
  })),
  formations: candidate.formations.map((formation) => ({
    ...formation,
    school: "[École confidentielle]",
  })),
  languages: candidate.languages,
})
