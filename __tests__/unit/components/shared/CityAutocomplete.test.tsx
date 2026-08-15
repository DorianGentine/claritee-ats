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
  });

  afterEach(async () => {
    cleanup();
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

    it("remonte une ville avec ↑ (ordre inversé)", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon]}
          onChange={onChange}
        />
      );

      // ↑ sur la 2e ville (Lyon) → Lyon passe devant Paris
      fireEvent.click(screen.getByRole("button", { name: /Monter Lyon/ }));

      expect(onChange).toHaveBeenCalledWith([lyon, paris]);
    });

    it("descend une ville avec ↓", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon]}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /Descendre Paris/ }));

      expect(onChange).toHaveBeenCalledWith([lyon, paris]);
    });

    it("désactive ↑ sur le premier chip et ↓ sur le dernier", () => {
      const onChange = vi.fn();

      render(
        <CityAutocomplete
          mode="multi"
          value={[paris, lyon]}
          onChange={onChange}
        />
      );

      expect(
        screen.getByRole("button", { name: /Monter Paris/ })
      ).toHaveProperty("disabled", true);
      expect(
        screen.getByRole("button", { name: /Descendre Lyon/ })
      ).toHaveProperty("disabled", true);
      // Les mouvements internes restent possibles
      expect(
        screen.getByRole("button", { name: /Descendre Paris/ })
      ).toHaveProperty("disabled", false);
      expect(
        screen.getByRole("button", { name: /Monter Lyon/ })
      ).toHaveProperty("disabled", false);
    });
  });
});
