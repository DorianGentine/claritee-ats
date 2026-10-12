"use client";

import {
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { GripVertical, MapPin, X } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  /** Rend les chips réordonnables par drag & drop (souris et clavier) (défaut : true). */
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
// Évite qu'un simple clic sur la poignée ne démarre un drag.
const POINTER_ACTIVATION_DISTANCE_PX = 5;

/**
 * Annonces lecteur d'écran en français (dnd-kit les fournit en anglais par
 * défaut). Les ids des items sont des ids de ville : on les résout en nom.
 */
const buildDragAnnouncements = (cities: CityOption[]): Announcements => {
  const getCityName = (cityId: string | number) =>
    cities.find((city) => city.id === cityId)?.name ?? String(cityId);
  const getPosition = (cityId: string | number) =>
    cities.findIndex((city) => city.id === cityId) + 1;

  return {
    onDragStart: ({ active }) =>
      `${getCityName(active.id)} saisie, position ${getPosition(active.id)} sur ${cities.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${getCityName(active.id)} déplacée en position ${getPosition(over.id)} sur ${cities.length}.`
        : `${getCityName(active.id)} n'est plus au-dessus d'une position valide.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${getCityName(active.id)} déposée en position ${getPosition(over.id)} sur ${cities.length}.`
        : `${getCityName(active.id)} déposée.`,
    onDragCancel: ({ active }) =>
      `Déplacement annulé. ${getCityName(active.id)} reste à sa position initiale.`,
  };
};

const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Pour réordonner une ville, appuyez sur espace pour la saisir, utilisez les flèches pour la déplacer, puis espace pour la déposer ou Échap pour annuler.",
};

type CityChipProps = {
  city: CityOption;
  disabled?: boolean;
  onRemove: () => void;
};

type CityChipLayoutProps = CityChipProps & {
  ref?: Ref<HTMLLIElement>;
  style?: CSSProperties;
  className?: string;
  /** Poignée de drag affichée à gauche du nom (chips réordonnables uniquement). */
  dragHandle?: ReactNode;
};

const CityChip = ({
  city,
  disabled,
  onRemove,
  ref,
  style,
  className,
  dragHandle,
}: CityChipLayoutProps) => (
  <li ref={ref} style={style} className={className}>
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 text-xs font-medium text-secondary-foreground ${
        dragHandle ? "pl-1" : "pl-3"
      }`}
    >
      {dragHandle}
      <span className="truncate">{city.name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5 text-secondary-foreground hover:bg-secondary-foreground/10"
        disabled={disabled}
        aria-label={`Retirer ${city.name}`}
        onClick={onRemove}
      >
        <X className="size-3" />
      </Button>
    </span>
  </li>
);

/** Chip réordonnable : la poignée (⠿) porte le drag souris et clavier. */
const SortableCityChip = ({ city, disabled, onRemove }: CityChipProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: city.id,
    disabled,
    attributes: { roleDescription: "ville réordonnable" },
  });

  return (
    <CityChip
      city={city}
      disabled={disabled}
      onRemove={onRemove}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-50" : undefined}
      dragHandle={
        <button
          ref={setActivatorNodeRef}
          type="button"
          disabled={disabled}
          aria-label={`Déplacer ${city.name}`}
          className="inline-flex size-5 cursor-grab touch-none items-center justify-center rounded-full hover:bg-secondary-foreground/10 active:cursor-grabbing disabled:cursor-not-allowed"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3" />
        </button>
      }
    />
  );
};

type SortableCityListProps = {
  cities: CityOption[];
  onChange: (cities: CityOption[]) => void;
  children: ReactNode;
};

/** Contexte dnd-kit des chips ordonnées : réordonne `cities` au drop. */
const SortableCityList = ({
  cities,
  onChange,
  children,
}: SortableCityListProps) => {
  // Id stable SSR/client : dnd-kit dérive l'`aria-describedby` des poignées d'un compteur global.
  const dndContextId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = cities.findIndex((city) => city.id === active.id);
    const newIndex = cities.findIndex((city) => city.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(cities, oldIndex, newIndex));
  };

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: buildDragAnnouncements(cities),
        screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
      }}
    >
      <SortableContext
        items={cities.map((city) => city.id)}
        strategy={rectSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
};

type CityChipListProps = {
  cities: CityOption[];
  onChange: (cities: CityOption[]) => void;
  ordered: boolean;
  disabled?: boolean;
};

const CityChipList = ({
  cities,
  onChange,
  ordered,
  disabled,
}: CityChipListProps) => {
  const ChipComponent = ordered ? SortableCityChip : CityChip;
  const chipList = (
    <ul className="flex flex-wrap gap-2">
      {cities.map((city, index) => (
        <ChipComponent
          key={city.id}
          city={city}
          disabled={disabled}
          onRemove={() =>
            onChange(cities.filter((_city, cityIndex) => cityIndex !== index))
          }
        />
      ))}
    </ul>
  );

  return ordered ? (
    <SortableCityList cities={cities} onChange={onChange}>
      {chipList}
    </SortableCityList>
  ) : (
    chipList
  );
};

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
        <CityChipList
          cities={props.value}
          onChange={props.onChange}
          ordered={ordered}
          disabled={disabled}
        />
      )}

      <Popover open={open} onOpenChange={setOpen}>
        {showChips && mode === "single" && props.value ? (
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full bg-primary py-0.5 pl-3 pr-1 text-xs font-medium text-primary-foreground ${
              disabled ? "opacity-50" : ""
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
