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
