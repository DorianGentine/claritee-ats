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
  /** Id posé sur le déclencheur, pour l'associer à un `<Label htmlFor>`. */
  id?: string;
  /** Affiche la sélection sous forme de chip(s) intégrée(s) au composant (défaut : true). À désactiver quand un composant parent affiche déjà ses propres chips (ex. filtres de liste), pour éviter le doublon. */
  showChips?: boolean;
};

type MultiProps = {
  mode: "multi";
  value: CityOption[];
  onChange: (cities: CityOption[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Affiche les boutons ↑↓ de réordonnancement des chips (défaut : true). */
  ordered?: boolean;
  /** Id posé sur le déclencheur, pour l'associer à un `<Label htmlFor>`. */
  id?: string;
  /** Affiche la sélection sous forme de chip(s) intégrée(s) au composant (défaut : true). À désactiver quand un composant parent affiche déjà ses propres chips (ex. filtres de liste), pour éviter le doublon. */
  showChips?: boolean;
};

type Props = SingleProps | MultiProps;

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;
const SUGGESTIONS_STALE_TIME_MS = 60 * 1000;
const MAX_QUERY_LENGTH = 100; // aligné sur `cityAutocompleteInputSchema` (q: max 100)

/** Sous-titre d'une suggestion : `Région · Pays`, ou juste le pays si pas de région. */
const formatCitySubtitle = (city: CityOption) =>
  [city.region, city.country].filter(Boolean).join(" · ");

/**
 * Libellé du déclencheur. Quand `showChips` est désactivé, la sélection n'est
 * affichée nulle part ailleurs dans le composant — le déclencheur doit donc la
 * porter lui-même (nom unique en mode single, décompte en mode multi).
 */
const getTriggerLabel = (props: Props, showChips: boolean): string => {
  if (props.mode === "single") {
    if (!showChips && props.value) return props.value.name;
    return props.placeholder ?? "Sélectionner une ville";
  }
  if (!showChips && props.value.length > 0) {
    const count = props.value.length;
    return `${count} ville${count > 1 ? "s" : ""} sélectionnée${count > 1 ? "s" : ""}`;
  }
  return props.placeholder ?? "Ajouter une ville";
};

export const CityAutocomplete = (props: Props) => {
  const { mode, disabled, id, showChips = true } = props;
  const ordered = mode === "multi" ? (props.ordered ?? true) : true;
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

  // Quand `showChips` est désactivé, le déclencheur affiche lui-même la
  // sélection (nom unique, ou décompte) puisqu'aucune chip interne n'est
  // rendue — sinon la sélection resterait invisible dans le composant.
  const hasDisplayValue =
    !showChips && (mode === "single" ? !!props.value : props.value.length > 0);
  const triggerLabel = getTriggerLabel(props, showChips);

  return (
    <div className="flex flex-col gap-2">
      {/* AC 7 — chips ordonnés affichés au-dessus du trigger (mode multi) */}
      {showChips && mode === "multi" && props.value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {props.value.map((city, index) => (
            <li key={city.id}>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-3 pr-1 text-xs font-medium text-secondary-foreground">
                <span className="truncate">{city.name}</span>
                {ordered && (
                  <>
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
                  </>
                )}
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
        {showChips && mode === "single" && props.value ? (
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full bg-primary py-0.5 pl-3 pr-1 text-xs font-medium text-primary-foreground ${disabled ? "opacity-50" : ""
              }`}
          >
            <PopoverTrigger asChild>
              <button
                id={id}
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
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-expanded={open}
              aria-haspopup="listbox"
              className={`w-full justify-start text-left font-normal sm:w-64 ${hasDisplayValue ? "" : "text-muted-foreground"}`}
            >
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{triggerLabel}</span>
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
