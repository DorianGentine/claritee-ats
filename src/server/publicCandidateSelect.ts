import type { LanguageLevel } from "@prisma/client"

/**
 * Champs publics du candidat exposés via les liens de partage.
 * Utilisé par la page SSR `/share/[token]` et par la publicProcedure tRPC.
 * Ne pas ajouter de champs internes (notes, tags, candidatures, cvUrl, etc.).
 */
export const publicCandidateSelect = {
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  linkedinUrl: true,
  title: true,
  city: true,
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
}

type RawCandidate = {
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
 * Transforme un candidat complet (issu de publicCandidateSelect) en DTO anonyme.
 * Supprime les champs identifiants et masque les noms d'entreprises et d'écoles.
 * Ce mapping s'exécute côté serveur uniquement.
 */
export function mapToAnonymousPublicDto(candidate: RawCandidate): AnonymousPublicCandidate {
  return {
    title: candidate.title,
    city: candidate.city,
    summary: candidate.summary,
    experiences: candidate.experiences.map((exp) => ({
      ...exp,
      company: "[Entreprise confidentielle]",
    })),
    formations: candidate.formations.map((f) => ({
      ...f,
      school: "[École confidentielle]",
    })),
    languages: candidate.languages,
  }
}
