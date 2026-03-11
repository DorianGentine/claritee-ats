"use client"

import type { CandidatureStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getCandidatureStatusStyle,
  CANDIDATURE_STATUS_ORDER,
} from "@/lib/candidature-status-style"

type Props = {
  currentStatus: CandidatureStatus
  onSelect: (status: CandidatureStatus) => void
  disabled?: boolean
}

/**
 * Badge interactif permettant de changer le statut d'une candidature.
 * Composant purement présentatif : la logique de mutation est dans le parent.
 */
export const CandidatureStatusDropdown = ({
  currentStatus,
  onSelect,
  disabled = false,
}: Props) => {
  const { label, badgeClassName } = getCandidatureStatusStyle(currentStatus)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Changer le statut : ${label}`}
          disabled={disabled}
          className="shrink-0"
        >
          <Badge
            variant="outline"
            className={`${badgeClassName} cursor-pointer hover:opacity-80 disabled:cursor-default disabled:opacity-60`}
          >
            {label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {CANDIDATURE_STATUS_ORDER.map((status) => {
          const { label: statusLabel, badgeClassName: statusBadgeClass } =
            getCandidatureStatusStyle(status)
          return (
            <DropdownMenuItem
              key={status}
              onSelect={() => {
                if (status !== currentStatus) {
                  onSelect(status)
                }
              }}
            >
              <Badge
                variant="outline"
                className={`${statusBadgeClass} pointer-events-none`}
              >
                {statusLabel}
              </Badge>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
