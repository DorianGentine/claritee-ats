"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type MultiSelectItem = {
  value: string
  label: string
  /** Affiche un point coloré à gauche du label (ex. tags) */
  color?: string
}

type Props = {
  triggerId: string
  items: MultiSelectItem[]
  selectedValues: string[]
  onToggle: (value: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  placeholder: string
  /** Appelée quand au moins 1 valeur est sélectionnée */
  selectedLabel: (count: number) => string
  emptyMessage?: string
  className?: string
}

export const MultiSelectPopover = ({
  triggerId,
  items,
  selectedValues,
  onToggle,
  open,
  onOpenChange,
  placeholder,
  selectedLabel,
  emptyMessage = "Aucune option disponible",
  className,
}: Props) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      <Button
        id={triggerId}
        variant="outline"
        size="sm"
        className={cn(
          "w-full justify-between text-left font-normal sm:w-48",
          className
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selectedValues.length > 0 ? selectedLabel(selectedValues.length) : placeholder}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-56 p-2">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul
          role="listbox"
          aria-multiselectable
          className="max-h-60 overflow-y-auto"
        >
          {items.map((item) => {
            const selected = selectedValues.includes(item.value)
            return (
              <li key={item.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    selected && "bg-accent/80"
                  )}
                  onClick={() => onToggle(item.value)}
                >
                  <span
                    className="flex size-4 shrink-0 items-center justify-center rounded border border-border"
                    aria-hidden
                  >
                    {selected ? (
                      <Check className="size-3 text-foreground" />
                    ) : null}
                  </span>
                  {item.color !== undefined && (
                    <span
                      className="inline-block size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </PopoverContent>
  </Popover>
)
