/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { ClientCompanyForm } from "@/components/clients/ClientCompanyForm";
import type { CityOption } from "@/components/shared/CityAutocomplete";

const pushMock = vi.fn();
const createUseMutation = vi.fn();
const updateUseMutation = vi.fn();
const useUtilsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/shared/CityAutocomplete", () => ({
  CityAutocomplete: ({
    id,
    ordered,
    value,
    onChange,
  }: {
    id?: string;
    ordered?: boolean;
    value: CityOption[];
    onChange: (cities: CityOption[]) => void;
  }) => (
    <div data-testid="city-autocomplete" data-ordered={String(ordered)} id={id}>
      <ul>
        {value.map((city) => (
          <li key={city.id}>{city.name}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          onChange([...value, { id: "city-nantes", name: "Nantes", country: "France" }])
        }
      >
        Ajouter Nantes
      </button>
    </div>
  ),
}));

vi.mock("@/lib/trpc/client", () => ({
  api: {
    clientCompany: {
      create: { useMutation: (opts?: unknown) => createUseMutation(opts) },
      update: { useMutation: (opts?: unknown) => updateUseMutation(opts) },
    },
    useUtils: () => useUtilsMock(),
  },
}));

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const listInvalidate = vi.fn();
const getByIdInvalidate = vi.fn();

let createOnSuccess: ((client: { id: string }) => void) | undefined;
let updateOnSuccess: ((client: { id: string }) => void) | undefined;

describe("ClientCompanyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createUseMutation.mockImplementation(
      (opts?: { onSuccess?: (client: { id: string }) => void }) => {
        createOnSuccess = opts?.onSuccess;
        return { mutateAsync: createMutateAsync, isPending: false };
      },
    );
    updateUseMutation.mockImplementation(
      (opts?: { onSuccess?: (client: { id: string }) => void }) => {
        updateOnSuccess = opts?.onSuccess;
        return { mutateAsync: updateMutateAsync, isPending: false };
      },
    );
    useUtilsMock.mockReturnValue({
      clientCompany: {
        list: { invalidate: listInvalidate },
        getById: { invalidate: getByIdInvalidate },
      },
    });
  });

  afterEach(() => cleanup());

  it("mode create : soumet le nom et les villes sélectionnées, redirige vers la fiche créée", async () => {
    createMutateAsync.mockResolvedValue({ id: "client-1" });

    render(<ClientCompanyForm mode="create" />);

    fireEvent.change(screen.getByLabelText("Raison sociale *"), {
      target: { value: "ACME SA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter Nantes" }));
    fireEvent.click(screen.getByRole("button", { name: "Créer le client" }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        name: "ACME SA",
        siren: undefined,
        cityIds: ["city-nantes"],
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Client créé.");
    expect(pushMock).toHaveBeenCalledWith("/clients/client-1");
  });

  it("mode create : passe ordered=false et aucune ville pré-sélectionnée à CityAutocomplete", () => {
    render(<ClientCompanyForm mode="create" />);

    const autocomplete = screen.getByTestId("city-autocomplete");
    expect(autocomplete.getAttribute("data-ordered")).toBe("false");
    expect(autocomplete.getAttribute("id")).toBe("client-cities");
    expect(autocomplete.querySelector("li")).toBeNull();
  });

  it("mode edit : pré-charge les villes existantes et soumet une mise à jour", async () => {
    updateMutateAsync.mockResolvedValue({ id: "client-1" });

    render(
      <ClientCompanyForm
        mode="edit"
        initialClient={{
          id: "client-1",
          name: "ACME SA",
          siren: "123456789",
          cities: [{ id: "city-paris", name: "Paris", country: "France" }],
        }}
      />,
    );

    expect(screen.getByText("Paris")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: "client-1",
        name: "ACME SA",
        siren: "123456789",
        cityIds: ["city-paris"],
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Client mis à jour.");
    expect(pushMock).toHaveBeenCalledWith("/clients/client-1");
  });

  it("mode edit sans id : affiche une erreur en français plutôt que d'appeler l'API", async () => {
    render(<ClientCompanyForm mode="edit" />);

    fireEvent.change(screen.getByLabelText("Raison sociale *"), {
      target: { value: "ACME SA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      await screen.findByText("Identifiant client manquant pour la modification."),
    ).toBeDefined();
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  it("affiche le message générique quand l'erreur serveur n'a pas de message", async () => {
    createMutateAsync.mockRejectedValue({});

    render(<ClientCompanyForm mode="create" />);

    fireEvent.change(screen.getByLabelText("Raison sociale *"), {
      target: { value: "ACME SA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer le client" }));

    expect(
      await screen.findByText("Une erreur est survenue. Réessayez."),
    ).toBeDefined();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("invalide clientCompany.list après une création réussie", () => {
    render(<ClientCompanyForm mode="create" />);

    createOnSuccess?.({ id: "client-1" });

    expect(listInvalidate).toHaveBeenCalled();
  });

  it("invalide clientCompany.list et clientCompany.getById après une mise à jour réussie", () => {
    render(<ClientCompanyForm mode="edit" initialClient={{ id: "client-1" }} />);

    updateOnSuccess?.({ id: "client-1" });

    expect(listInvalidate).toHaveBeenCalled();
    expect(getByIdInvalidate).toHaveBeenCalledWith({ id: "client-1" });
  });

  it("cancelHref pointe vers /clients en création et vers la fiche client en édition", () => {
    const { unmount } = render(<ClientCompanyForm mode="create" />);
    expect(
      screen.getByRole("link", { name: "Annuler" }).getAttribute("href"),
    ).toBe("/clients");
    unmount();

    render(<ClientCompanyForm mode="edit" initialClient={{ id: "client-1" }} />);
    expect(
      screen.getByRole("link", { name: "Annuler" }).getAttribute("href"),
    ).toBe("/clients/client-1");
  });
});
