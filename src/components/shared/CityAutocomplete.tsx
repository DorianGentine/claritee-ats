"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, X } from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/trpc/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Ville manipulée côté UI. Les coordonnées ne sont jamais exposées par
 * `city.autocomplete` — ce composant n'en a donc pas besoin.
 */
export type CityOption = {
  id: string;
  name: string;
  region?: string | null;
  country: string;
};

type SingleProps = {
  mode: "single";
  value: CityOption | null;
  onChange: (city: CityOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

type MultiProps = {
  mode: "multi";
  value: CityOption[];
  onChange: (cities: CityOption[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

type Props = SingleProps | MultiProps;

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;
const SUGGESTIONS_STALE_TIME_MS = 60 * 1000;
const MAX_QUERY_LENGTH = 100; // aligné sur `cityAutocompleteInputSchema` (q: max 100)

/** Sous-titre d'une suggestion : `Région · Pays`, ou juste le pays si pas de région. */
const formatCitySubtitle = (city: CityOption) =>
  [city.region, city.country].filter(Boolean).join(" · ");

export const CityAutocomplete = (props: Props) => {
  const { mode, placeholder, disabled } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS);
  const hasMinQuery = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const {
    data: suggestions,
    isLoading,
    isError,
  } = api.city.autocomplete.useQuery(
    { q: debouncedQuery },
    {
      enabled: hasMinQuery,
      staleTime: SUGGESTIONS_STALE_TIME_MS,
      // Conserve les résultats précédents pendant qu'une nouvelle recherche
      // charge (pas de flash « Recherche... » à chaque frappe) — pattern projet.
      placeholderData: keepPreviousData,
    }
  );

  // AC 9 — les villes déjà choisies n'apparaissent pas dans les suggestions.
  const selectedIds =
    mode === "multi"
      ? new Set(props.value.map((city) => city.id))
      : new Set(props.value ? [props.value.id] : []);

  // `keepPreviousData` peut renvoyer les résultats de la recherche précédente
  // même quand la query est désactivée (recherche repassée sous le seuil) —
  // on les ignore explicitement dans ce cas pour ne pas afficher de résultats
  // obsolètes.
  const filteredSuggestions = hasMinQuery
    ? (suggestions ?? []).filter((city) => !selectedIds.has(city.id))
    : [];

  // Le serveur a bien renvoyé des villes, mais toutes sont déjà sélectionnées :
  // à distinguer de « aucun résultat » pour ne pas afficher un message trompeur.
  const allSuggestionsSelected =
    hasMinQuery &&
    !isLoading &&
    !isError &&
    (suggestions?.length ?? 0) > 0 &&
    filteredSuggestions.length === 0;

  const handleSelect = (city: CityOption) => {
    if (mode === "single") {
      props.onChange(city);
      setOpen(false);
    } else {
      props.onChange([...props.value, city]);
    }
    setQuery("");
  };

  const handleClearSingle = () => {
    if (mode === "single") {
      props.onChange(null);
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    if (mode !== "multi") return;
    const target = index + direction;
    if (target < 0 || target >= props.value.length) return;
    const reordered = [...props.value];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    props.onChange(reordered);
  };

  const handleRemove = (index: number) => {
    if (mode !== "multi") return;
    props.onChange(
      props.value.filter((_city, cityIndex) => cityIndex !== index)
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* AC 7 — chips ordonnés affichés au-dessus du trigger (mode multi) */}
      {mode === "multi" && props.value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {props.value.map((city, index) => (
            <li key={city.id}>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-3 pr-1 text-xs font-medium text-secondary-foreground">
                <span className="truncate">{city.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 text-secondary-foreground hover:bg-secondary-foreground/10"
                  disabled={disabled || index === 0}
                  aria-label={`Monter ${city.name}`}
                  onClick={() => handleMove(index, -1)}
                >
                  <ChevronUp className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 text-secondary-foreground hover:bg-secondary-foreground/10"
                  disabled={disabled || index === props.value.length - 1}
                  aria-label={`Descendre ${city.name}`}
                  onClick={() => handleMove(index, 1)}
                >
                  <ChevronDown className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 text-secondary-foreground hover:bg-secondary-foreground/10"
                  disabled={disabled}
                  aria-label={`Retirer ${city.name}`}
                  onClick={() => handleRemove(index)}
                >
                  <X className="size-3" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        {mode === "single" && props.value ? (
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full bg-primary py-0.5 pl-3 pr-1 text-xs font-medium text-primary-foreground ${disabled ? "opacity-50" : ""
              }`}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-expanded={open}
                aria-haspopup="listbox"
                className="inline-flex items-center gap-1 rounded-full"
              >
                <MapPin className="size-3" />
                <span className="truncate">{props.value.name}</span>
              </button>
            </PopoverTrigger>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Effacer ${props.value.name}`}
              className="inline-flex size-5 items-center justify-center rounded-full hover:bg-primary-foreground/20"
              onClick={handleClearSingle}
            >
              <X className="size-3" />
            </button>
          </span>
        ) : (
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-expanded={open}
              aria-haspopup="listbox"
              className="w-full justify-start text-left font-normal text-muted-foreground sm:w-64"
            >
              <MapPin className="size-4" />
              {placeholder ??
                (mode === "single"
                  ? "Sélectionner une ville"
                  : "Ajouter une ville")}
            </Button>
          </PopoverTrigger>
        )}
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              maxLength={MAX_QUERY_LENGTH}
              placeholder="Rechercher une ville..."
            />
            <CommandList>
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((city) => (
                  <CommandItem
                    key={city.id}
                    value={city.id}
                    onSelect={() => handleSelect(city)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span>{city.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCitySubtitle(city)}
                    </span>
                  </CommandItem>
                ))
              ) : isLoading ? (
                // AC 5 — état chargement
                <CommandEmpty>Recherche...</CommandEmpty>
              ) : isError ? (
                <CommandEmpty>Erreur lors de la recherche</CommandEmpty>
              ) : !hasMinQuery ? (
                // AC 4 — seuil minimal
                <CommandEmpty>Saisir au moins 3 caractères</CommandEmpty>
              ) : allSuggestionsSelected ? (
                <CommandEmpty>
                  Toutes les villes correspondantes sont déjà sélectionnées
                </CommandEmpty>
              ) : (
                // AC 10 — état vide
                <CommandEmpty>Aucune ville trouvée</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
