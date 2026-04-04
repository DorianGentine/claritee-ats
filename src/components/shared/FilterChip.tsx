"use client"

import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type FilterChipProps = {
  label: string
  onRemove: () => void
  removeAriaLabel?: string
}

export const FilterChip = ({ label, onRemove, removeAriaLabel }: FilterChipProps) => (
  <Badge variant="secondary" className="gap-1 py-1 pl-2 pr-1" role="listitem">
    <span className="truncate">{label}</span>
    <button
      type="button"
      onClick={onRemove}
      className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={removeAriaLabel ?? `Retirer le filtre ${label}`}
    >
      <X className="size-3" />
    </button>
  </Badge>
)
