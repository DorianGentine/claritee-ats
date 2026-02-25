"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Filter } from "lucide-react";
import { api } from "@/lib/trpc/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CandidateFilters = {
  tagIds: string[];
  city?: string;
  languageNames: string[];
};

type CandidateListFiltersProps = {
  filters: CandidateFilters;
  onFiltersChange: (filters: CandidateFilters) => void;
  onClear: () => void;
};

export const CandidateListFilters = ({
  filters,
  onFiltersChange,
  onClear,
}: CandidateListFiltersProps) => {
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [cityInput, setCityInput] = useState(filters.city ?? "");

  const debouncedCity = useDebounce(cityInput.trim(), 300);

  useEffect(() => {
    // Sync local input when filters change externally (URL, clear)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- légitime : sync props → state pour input
    setCityInput(filters.city ?? "");
  }, [filters.city]);

  useEffect(() => {
    const nextCity = debouncedCity ? debouncedCity : undefined;
    const currentCity = filters.city ?? undefined;
    if (nextCity !== currentCity) {
      onFiltersChange({ ...filters, city: nextCity });
    }
  }, [debouncedCity, filters, onFiltersChange]);

  const [languagePopoverOpen, setLanguagePopoverOpen] = useState(false);

  const { data: tags = [] } = api.tag.list.useQuery();
  const { data: cities = [] } = api.candidate.listDistinctCities.useQuery();
  const { data: languageNames = [] } =
    api.candidate.listDistinctLanguageNames.useQuery();

  const hasActiveFilters =
    filters.tagIds.length > 0 ||
    (filters.city?.trim() ?? "").length > 0 ||
    filters.languageNames.length > 0;

  const cityOptions = useMemo(() => {
    const value = cityInput.trim().toLowerCase();
    if (!value) return cities;
    return cities.filter((c) => c.toLowerCase().includes(value));
  }, [cities, cityInput]);

  const toggleTag = (tagId: string) => {
    const next = filters.tagIds.includes(tagId)
      ? filters.tagIds.filter((id) => id !== tagId)
      : [...filters.tagIds, tagId];
    onFiltersChange({ ...filters, tagIds: next });
  };

  const toggleLanguage = (name: string) => {
    const next = filters.languageNames.includes(name)
      ? filters.languageNames.filter((n) => n !== name)
      : [...filters.languageNames, name];
    onFiltersChange({ ...filters, languageNames: next });
  };

  const handleCityChange = (value: string) => {
    setCityInput(value);
  };

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Filter className="size-4" aria-hidden />
        Filtres
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label
            htmlFor="filter-tags"
            className="text-xs text-muted-foreground"
          >
            Tags
          </label>
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                id="filter-tags"
                variant="outline"
                size="sm"
                className="w-full justify-between text-left font-normal sm:w-48"
                aria-expanded={tagPopoverOpen}
                aria-haspopup="listbox"
              >
                {filters.tagIds.length > 0
                  ? `${filters.tagIds.length} tag(s) sélectionné(s)`
                  : "Sélectionner des tags"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              {tags.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun tag disponible
                </p>
              ) : (
                <ul
                  role="listbox"
                  aria-multiselectable
                  className="max-h-60 overflow-y-auto"
                >
                  {tags.map((tag) => {
                    const selected = filters.tagIds.includes(tag.id);
                    return (
                      <li key={tag.id} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                            selected && "bg-accent/80"
                          )}
                          onClick={() => toggleTag(tag.id)}
                        >
                          <span
                            className="flex size-4 shrink-0 items-center justify-center rounded border border-border"
                            aria-hidden
                          >
                            {selected ? (
                              <Check className="size-3 text-foreground" />
                            ) : null}
                          </span>
                          <span
                            className="inline-block size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="truncate">{tag.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label
            htmlFor="filter-languages"
            className="text-xs text-muted-foreground"
          >
            Langues
          </label>
          <Popover
            open={languagePopoverOpen}
            onOpenChange={setLanguagePopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button
                id="filter-languages"
                variant="outline"
                size="sm"
                className="w-full justify-between text-left font-normal sm:w-48"
                aria-expanded={languagePopoverOpen}
                aria-haspopup="listbox"
              >
                {filters.languageNames.length > 0
                  ? `${filters.languageNames.length} langue(s) sélectionnée(s)`
                  : "Sélectionner des langues"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              {languageNames.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucune langue disponible
                </p>
              ) : (
                <ul
                  role="listbox"
                  aria-multiselectable
                  className="max-h-60 overflow-y-auto"
                >
                  {languageNames.map((name) => {
                    const selected = filters.languageNames.includes(name);
                    return (
                      <li key={name} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                            selected && "bg-accent/80"
                          )}
                          onClick={() => toggleLanguage(name)}
                        >
                          <span
                            className="flex size-4 shrink-0 items-center justify-center rounded border border-border"
                            aria-hidden
                          >
                            {selected ? (
                              <Check className="size-3 text-foreground" />
                            ) : null}
                          </span>
                          <span className="truncate">{name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label
            htmlFor="filter-city"
            className="text-xs text-muted-foreground"
          >
            Ville
          </label>
          <div className="relative">
            <Input
              id="filter-city"
              type="text"
              placeholder="Ex: Paris"
              value={cityInput}
              onChange={(e) => handleCityChange(e.target.value)}
              onKeyDown={handleCityKeyDown}
              list="filter-city-datalist"
              className="w-full sm:w-48"
              aria-autocomplete="list"
            />
            <datalist id="filter-city-datalist">
              {cityOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground"
            >
              Effacer filtres
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
