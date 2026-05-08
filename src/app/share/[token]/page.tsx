import { cache } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { db } from "@/server/db"
import {
  publicCandidateSelect,
  mapToAnonymousPublicDto,
} from "@/server/publicCandidateSelect"
import { PublicCandidateProfile } from "@/components/share/PublicCandidateProfile"
import { AnonymousCandidateProfile } from "@/components/share/AnonymousCandidateProfile"
import { ShareErrorState } from "@/components/share/ShareErrorState"

type Props = { params: Promise<{ token: string }> }

/**
 * Requête mise en cache par React pour dédupliquer l'appel DB entre
 * generateMetadata et le composant page dans le même rendu serveur.
 */
const getShareLink = cache((token: string) =>
  db.shareLink.findUnique({
    where: { token },
    select: {
      type: true,
      expiresAt: true,
      candidate: { select: publicCandidateSelect },
    },
  })
)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const link = await getShareLink(token)

  if (!link || (link.expiresAt && link.expiresAt < new Date())) {
    return { title: "Fiche candidat | Claritee" }
  }

  if (link.type === "ANONYMOUS") {
    return { title: "Fiche anonymisée | Claritee" }
  }

  if (link.type === "NORMAL") {
    const { firstName, lastName, company } = link.candidate
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") || "candidat"

    return {
      title: `Fiche ${company.name} | ${fullName}`,
      description: `Profil de ${fullName} partagé par ${company.name}`,
    }
  }

  return { title: "Fiche candidat | Claritee" }
}

export default async function SharePage({ params }: Props) {
  const { token } = await params
  const link = await getShareLink(token)

  if (!link) {
    notFound()
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return <ShareErrorState variant="expired" />
  }

  if (link.type === "NORMAL") {
    const { company, ...candidateFields } = link.candidate
    return (
      <PublicCandidateProfile
        candidate={candidateFields}
        companyName={company.name}
      />
    )
  }

  if (link.type === "ANONYMOUS") {
    const { company, ...candidateFields } = link.candidate
    return (
      <AnonymousCandidateProfile
        candidate={mapToAnonymousPublicDto(candidateFields)}
        companyName={company.name}
      />
    )
  }

  notFound()
}
