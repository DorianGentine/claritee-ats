"use client"

import { cn } from "@/lib/utils"
import { FilterChip } from "@/components/shared/FilterChip"

export type FilterChipDescriptor = {
  key: string
  label: string
  onRemove: () => void
  removeAriaLabel?: string
}

type FilterChipsBarProps = {
  chips: FilterChipDescriptor[]
  /** Texte affiché à droite des chips (ex. "12 candidats trouvés") — remplacé par "Chargement…" pendant `isLoading`. */
  countLabel: string
  isLoading?: boolean
  className?: string
}

/**
 * Barre de chips de filtres actifs, partagée entre domaines (candidats, offres...).
 * Ne décide pas seule si elle doit s'afficher — l'appelant reste responsable de
 * son propre `hasActiveXFilters` avant de la monter, pour ne pas masquer le
 * compteur pendant qu'un chip est encore en cours de résolution (ex. nom de ville).
 */
export const FilterChipsBar = ({
  chips,
  countLabel,
  isLoading,
  className,
}: FilterChipsBarProps) => (
  <div
    className={cn("flex flex-wrap items-center gap-2", className)}
    role="list"
    aria-label="Filtres actifs"
  >
    {chips.map((chip) => (
      <FilterChip
        key={chip.key}
        label={chip.label}
        onRemove={chip.onRemove}
        removeAriaLabel={chip.removeAriaLabel}
      />
    ))}
    <span
      className="text-sm text-muted-foreground"
      aria-live="polite"
      aria-busy={isLoading}
    >
      {isLoading ? "Chargement…" : countLabel}
    </span>
  </div>
)
