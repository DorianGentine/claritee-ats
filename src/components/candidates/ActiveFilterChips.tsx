"use client";

import { X } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CandidateFilters } from "./CandidateListFilters";

type ActiveFilterChipsProps = {
  filters: CandidateFilters;
  totalCount: number;
  isLoading?: boolean;
  onRemoveTag: (tagId: string) => void;
  onRemoveCity: () => void;
  onRemoveLanguage: (name: string) => void;
  className?: string;
};

export const ActiveFilterChips = ({
  filters,
  totalCount,
  isLoading,
  onRemoveTag,
  onRemoveCity,
  onRemoveLanguage,
  className,
}: ActiveFilterChipsProps) => {
  const { data: tags = [] } = api.tag.list.useQuery();
  const tagById = Object.fromEntries(tags.map((t) => [t.id, t]));
  const hasFilters =
    filters.tagIds.length > 0 ||
    (filters.city?.trim() ?? "").length > 0 ||
    filters.languageNames.length > 0;

  if (!hasFilters) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="list"
      aria-label="Filtres actifs"
    >
      {filters.tagIds.map((tagId) => {
        const tag = tagById[tagId];
        const label = tag?.name ?? tagId;
        return (
          <Badge
            key={tagId}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-1"
            role="listitem"
          >
            <span className="truncate">Tag: {label}</span>
            <button
              type="button"
              onClick={() => onRemoveTag(tagId)}
              className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Retirer le filtre tag ${label}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        );
      })}
      {filters.languageNames.map((name) => (
        <Badge
          key={name}
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1"
          role="listitem"
        >
          <span className="truncate">Langue: {name}</span>
          <button
            type="button"
            onClick={() => onRemoveLanguage(name)}
            className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Retirer le filtre langue ${name}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      {filters.city?.trim() && (
        <Badge
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1"
          role="listitem"
        >
          <span className="truncate">Ville: {filters.city}</span>
          <button
            type="button"
            onClick={onRemoveCity}
            className="rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Retirer le filtre ville ${filters.city}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      )}
      <span
        className="text-sm text-muted-foreground"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading
          ? "Chargement…"
          : `${totalCount} candidat${totalCount !== 1 ? "s" : ""} trouvé${totalCount !== 1 ? "s" : ""}`}
      </span>
    </div>
  );
};
