/**
 * Mapping statut offre → label + style badge.
 * Réutilisable liste offres, fiche offre (Story 3.6), Dashboard.
 * Couleurs alignées sur docs/design-system.md § Statuts offre.
 */

import type { JobOfferStatus } from "@prisma/client";

export const OFFER_STATUS_LABELS: Record<JobOfferStatus, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Terminé",
};

/** Classes Tailwind pour le badge (design tokens quand possible). Terminé = design-system § Statuts offre (vert). */
export const OFFER_STATUS_BADGE_CLASS: Record<JobOfferStatus, string> = {
  TODO: "bg-muted text-muted-foreground border-transparent",
  IN_PROGRESS: "bg-secondary text-secondary-foreground border-transparent",
  DONE: "bg-success text-success-foreground border-transparent",
};

export const getOfferStatusLabel = (status: JobOfferStatus): string =>
  OFFER_STATUS_LABELS[status] ?? status;

export const getOfferStatusBadgeClass = (status: JobOfferStatus): string =>
  OFFER_STATUS_BADGE_CLASS[status] ?? "bg-muted text-muted-foreground";

export type OfferStatusStyle = {
  label: string;
  badgeClassName: string;
};

export const getOfferStatusStyle = (
  status: JobOfferStatus
): OfferStatusStyle => ({
  label: getOfferStatusLabel(status),
  badgeClassName: getOfferStatusBadgeClass(status),
});
