/**
 * Mapping statut candidature → label + style badge.
 * Réutilisable section candidats de la fiche offre (Story 3.6), et futures vues candidatures.
 * Couleurs alignées sur le Design System.
 */

import type { CandidatureStatus } from "@prisma/client"

export const CANDIDATURE_STATUS_LABELS: Record<CandidatureStatus, string> = {
  CONTACTED_LINKEDIN: "Contacté LinkedIn",
  PHONE_CONTACT: "Entretien téléphonique",
  APPLIED: "Candidature envoyée",
  ACCEPTED: "Accepté",
  REJECTED_BY_EMPLOYER: "Refusé par l'employeur",
  REJECTED_BY_CANDIDATE: "Refusé par le candidat",
}

/** Classes Tailwind pour le badge (design tokens quand possible). */
export const CANDIDATURE_STATUS_BADGE_CLASS: Record<CandidatureStatus, string> = {
  CONTACTED_LINKEDIN: "bg-secondary text-secondary-foreground border-transparent",
  PHONE_CONTACT: "bg-primary/10 text-primary border-transparent",
  APPLIED: "bg-primary/20 text-primary border-transparent",
  ACCEPTED: "bg-success text-success-foreground border-transparent",
  REJECTED_BY_EMPLOYER: "bg-destructive/10 text-destructive border-transparent",
  REJECTED_BY_CANDIDATE: "bg-muted text-muted-foreground border-transparent",
}

export const getCandidatureStatusLabel = (status: CandidatureStatus): string =>
  CANDIDATURE_STATUS_LABELS[status] ?? status

export const getCandidatureStatusBadgeClass = (status: CandidatureStatus): string =>
  CANDIDATURE_STATUS_BADGE_CLASS[status] ?? "bg-muted text-muted-foreground"

export type CandidatureStatusStyle = {
  label: string
  badgeClassName: string
}

export const getCandidatureStatusStyle = (status: CandidatureStatus): CandidatureStatusStyle => ({
  label: getCandidatureStatusLabel(status),
  badgeClassName: getCandidatureStatusBadgeClass(status),
})

/** Ordre logique du pipeline de recrutement, pour l'affichage des récapitulatifs. */
export const CANDIDATURE_STATUS_ORDER: CandidatureStatus[] = [
  "CONTACTED_LINKEDIN",
  "PHONE_CONTACT",
  "APPLIED",
  "ACCEPTED",
  "REJECTED_BY_EMPLOYER",
  "REJECTED_BY_CANDIDATE",
]
