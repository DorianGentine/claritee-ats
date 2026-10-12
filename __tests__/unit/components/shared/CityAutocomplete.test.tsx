/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import { act } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { api } from "@/lib/trpc/client";
import {
  CityAutocomplete,
  type CityOption,
} from "@/components/shared/CityAutocomplete";

// Radix Popover (Popper) + cmdk requièrent des APIs absentes de jsdom.
beforeAll(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

vi.mock("@/lib/trpc/client", () => ({
  api: {
    city: {
      autocomplete: {
        useQuery: vi.fn(),
      },
    },
  },
}));

const paris: CityOption = {
  id: "paris",
  name: "Paris",
  region: "Île-de-France",
  country: "France",
};
const lyon: CityOption = {
  id: "lyon",
  name: "Lyon",
  region: "Auvergne-Rhône-Alpes",
  country: "France",
};

const marseille: CityOption = {
  id: "marseille",
  name: "Marseille",
  region: "Provence-Alpes-Côte d'Azur",
  country: "France",
};

const CHIP_WIDTH_PX = 100;
const CHIP_HEIGHT_PX = 24;

/**
 * jsdom ne calcule aucun layout : on positionne chaque chip (`li`) sur une
 * ligne pour que le KeyboardSensor de dnd-kit trouve les positions voisines.
 */
const mockChipLayout = () => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const chip = this.closest("li");
      const chipIndex = chip?.parentElement
        ? Array.from(chip.parentElement.children).indexOf(chip)
        : 0;
      const left = chipIndex * CHIP_WIDTH_PX;
      return {
        x: left,
        y: 0,
        left,
        top: 0,
        right: left + CHIP_WIDTH_PX,
        bottom: CHIP_HEIGHT_PX,
        width: CHIP_WIDTH_PX,
        height: CHIP_HEIGHT_PX,
        toJSON: () => ({}),
      } as DOMRect;
    }
  );
};

/** Envoie une touche et laisse dnd-kit traiter l'événement (rAF, état). */
const pressKey = async (target: HTMLElement, key: string) => {
  await act(async () => {
    fireEvent.keyDown(target, { key, code: key === " " ? "Space" : key });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

/** Saisit une chip via sa poignée (espace), la déplace d'un cran puis la dépose. */
const dragWithKeyboard = async (
  handleName: RegExp,
  arrowKey: "ArrowLeft" | "ArrowRight"
) => {
  const handle = screen.getByRole("button", { name: handleName });
  handle.focus();
  await pressKey(handle, " ");
  await pressKey(handle, arrowKey);
  await pressKey(handle, " ");
};

const mockSuggestions = (cities: CityOption[], isLoading = false) => {
  vi.mocked(api.city.autocomplete.useQuery).mockReturnValue({
    data: cities,
    isLoading,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof api.city.autocomplete.useQuery>);
};

/** Ouvre le popover en cliquant le trigger. */
const openPopover = (name: RegExp) => {
  fireEvent.click(screen.getByRole("button", { name }));
};

/** Saisit une recherche et attend le debounce (300ms) pour activer la query. */
const typeQuery = async (value: string) => {
  const input = screen.getByPlaceholderText("Rechercher une ville...");
  fireEvent.change(input, { target: { value } });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
};

describe("CityAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuggestions([]);
    mockChipLayout();
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    // Ouvrir/fermer le Popover Radix planifie du travail via le scheduler React
    // (MessageChannel). On le vide pendant que `window` existe encore, sinon la
    // tâche se déclenche après le teardown jsdom → "window is not defined".
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  describe("mode single", () => {
    it("efface les suggestions quand la recherche repasse sous le seuil minimal", async () => {
      // TanStack Query (`keepPreviousData`) peut renvoyer les données de la
      // recherche précédente même quand la query est désactivée (< 3 car.) —
      // ce mock renvoie volontairement les mêmes suggestions à chaque appel,
      // peu importe la query, pour reproduire ce cas réel.
      mockSuggestions([paris, lyon]);
      const onChange = vi.fn();

      render(
        <CityAutocomplete mode="single" value={null} onChange={onChange} />
      );
      openPopover(/Sélectionner une ville/);

      await typeQuery("Par");
      expect(screen.getByText("Paris")).toBeDefined();

      await typeQuery("");

      expect(screen.queryByText("Paris")).toBeNull();
      expect(screen.queryByText("Lyon")).toBeNull();
      expect(screen.getByText("Saisir au moins 3 caractères")).toBeDefined();
    });

    it("appelle onChange avec la ville sélectionnée", async () => {
      mockSuggestions([paris, lyon]);
      const onChange = vi.fn();

      render(
        <CityAutocomplete mode="single" value={null} onChange={onChange} />
      );
      openPopover(/Sélectionner une ville/);
      await typeQuery("Par");

      fireEvent.click(screen.getByText("Paris"));

      expect(onChange).toHaveBeenCalledWith(paris);
    });

    it("affiche la ville sélectionnée en badge et l'efface via ×", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete mode="single" value={paris} onChange={onChange} />
      );

      // Badge visible avec le nom de la ville
      expect(screen.getByText("Paris")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: /Effacer Paris/ }));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("avec showChips=false, affiche le nom de la ville dans le déclencheur au lieu du badge", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="single"
          value={paris}
          onChange={onChange}
          showChips={false}
        />
      );

      expect(screen.getByRole("button", { name: "Paris" })).toBeDefined();
      // Pas de badge interne avec bouton "Effacer"
      expect(
        screen.queryByRole("button", { name: /Effacer Paris/ })
      ).toBeNull();
    });

    it("avec showChips=false et aucune valeur, affiche le placeholder", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="single"
          value={null}
          onChange={onChange}
          showChips={false}
        />
      );

      expect(
        screen.getByRole("button", { name: "Sélectionner une ville" })
      ).toBeDefined();
    });

    it("exclut la ville déjà sélectionnée des suggestions", async () => {
      mockSuggestions([paris, lyon]);
      const onChange = vi.fn();

      render(
        <CityAutocomplete mode="single" value={paris} onChange={onChange} />
      );
      // Ouvre le popover via le badge (son libellé exact est le nom de la ville,
      // à ne pas confondre avec le bouton « Effacer Paris »).
      fireEvent.click(screen.getByRole("button", { name: "Paris" }));
      await typeQuery("Lyo");

      // Lyon reste proposé, Paris (déjà sélectionnée) est absente des options.
      expect(screen.getByRole("option", { name: /Lyon/ })).toBeDefined();
      expect(screen.queryByRole("option", { name: /Paris/ })).toBeNull();
    });
  });

  describe("mode multi", () => {
    it("ajoute une ville sélectionnée au tableau", async () => {
      mockSuggestions([paris, lyon]);
      const onChange = vi.fn();

      render(<CityAutocomplete mode="multi" value={[]} onChange={onChange} />);
      openPopover(/Ajouter une ville/);
      await typeQuery("Lyo");

      fireEvent.click(screen.getByText("Lyon"));

      expect(onChange).toHaveBeenCalledWith([lyon]);
    });

    it("supprime une ville via ×", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon]}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Retirer Paris/ }));

      expect(onChange).toHaveBeenCalledWith([lyon]);
    });

    it("réordonne les villes au clavier via la poignée (espace, flèche, espace)", async () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon, marseille]}
          onChange={onChange}
        />
      );

      await dragWithKeyboard(/Déplacer Paris/, "ArrowRight");

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([lyon, paris, marseille]);
    });

    it("remonte une ville au clavier (flèche gauche)", async () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon, marseille]}
          onChange={onChange}
        />
      );

      await dragWithKeyboard(/Déplacer Marseille/, "ArrowLeft");

      expect(onChange).toHaveBeenCalledWith([paris, marseille, lyon]);
    });

    it("n'appelle pas onChange quand le déplacement est annulé avec Échap", async () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon]}
          onChange={onChange}
        />
      );

      const handle = screen.getByRole("button", { name: /Déplacer Paris/ });
      handle.focus();
      await pressKey(handle, " ");
      await pressKey(handle, "ArrowRight");
      await pressKey(handle, "Escape");

      expect(onChange).not.toHaveBeenCalled();
    });

    it("affiche une poignée de drag par chip par défaut (ordered omis), sans boutons ↑↓", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon]}
          onChange={onChange}
        />
      );

      expect(
        screen.getByRole("button", { name: /Déplacer Paris/ })
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: /Déplacer Lyon/ })
      ).toBeDefined();
      expect(screen.queryByRole("button", { name: /Monter/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /Descendre/ })).toBeNull();
    });

    it("désactive les poignées de drag quand le composant est désactivé", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon]}
          onChange={onChange}
          disabled
        />
      );

      expect(
        screen.getByRole("button", { name: /Déplacer Paris/ })
      ).toHaveProperty("disabled", true);
    });

    it("n'affiche aucune poignée de drag quand ordered=false, garde le bouton de suppression", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon]}
          onChange={onChange}
          ordered={false}
        />
      );

      expect(screen.queryByRole("button", { name: /Déplacer/ })).toBeNull();
      expect(
        screen.getByRole("button", { name: /Retirer Paris/ })
      ).toBeDefined();
    });

    it("avec showChips=false, n'affiche pas la liste de chips interne et montre le décompte dans le déclencheur", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon]}
          onChange={onChange}
          showChips={false}
        />
      );

      expect(screen.queryByRole("button", { name: /Retirer/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /Déplacer/ })).toBeNull();
      expect(
        screen.getByRole("button", { name: "2 villes sélectionnées" })
      ).toBeDefined();
    });

    it("avec showChips=false et une seule ville, accorde le décompte au singulier", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris]}
          onChange={onChange}
          showChips={false}
        />
      );

      expect(
        screen.getByRole("button", { name: "1 ville sélectionnée" })
      ).toBeDefined();
    });

    it("avec showChips=false et aucune sélection, affiche le placeholder", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[]}
          onChange={onChange}
          showChips={false}
        />
      );

      expect(
        screen.getByRole("button", { name: "Ajouter une ville" })
      ).toBeDefined();
    });
  });
});
