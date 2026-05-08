/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CompanySettings } from "@/components/settings/CompanySettings";

const mockGetMyCompanyUseQuery = vi.fn();
const mockUpdateCompanyUseMutation = vi.fn();
const mockGetMyCompanyInvalidate = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  api: {
    company: {
      getMyCompany: {
        useQuery: (...args: unknown[]) => mockGetMyCompanyUseQuery(...args),
      },
      updateCompany: {
        useMutation: (...args: unknown[]) => mockUpdateCompanyUseMutation(...args),
      },
    },
    useUtils: () => ({
      company: {
        getMyCompany: {
          invalidate: mockGetMyCompanyInvalidate,
        },
      },
    }),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const makeCompany = () => ({
  id: "company-1",
  name: "Cabinet Test",
  siren: "123456789",
});

describe("CompanySettings", () => {
  it("affiche les skeletons pendant isLoading", () => {
    mockGetMyCompanyUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    mockUpdateCompanyUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });

    render(<CompanySettings />);

    expect(screen.queryByLabelText("Nom du cabinet")).toBeNull();
  });

  it("affiche le nom actuel pré-rempli", async () => {
    mockGetMyCompanyUseQuery.mockReturnValue({ data: makeCompany(), isLoading: false });
    mockUpdateCompanyUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });

    render(<CompanySettings />);

    const input = screen.getByLabelText("Nom du cabinet") as HTMLInputElement;
    expect(input.value).toBe("Cabinet Test");
  });

  it("champ SIREN est disabled", () => {
    mockGetMyCompanyUseQuery.mockReturnValue({ data: makeCompany(), isLoading: false });
    mockUpdateCompanyUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });

    render(<CompanySettings />);

    const sirenInput = screen.getByLabelText("SIREN") as HTMLInputElement;
    expect(sirenInput.disabled).toBe(true);
    expect(sirenInput.value).toBe("123456789");
  });

  it("soumettre un nom vide → erreur de validation visible", async () => {
    mockGetMyCompanyUseQuery.mockReturnValue({ data: makeCompany(), isLoading: false });
    const mutateFn = vi.fn();
    mockUpdateCompanyUseMutation.mockReturnValue({ mutate: mutateFn, isPending: false });

    render(<CompanySettings />);

    const input = screen.getByLabelText("Nom du cabinet") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
    expect(mutateFn).not.toHaveBeenCalled();
  });

  it("soumettre un nom valide → appelle la mutation", async () => {
    mockGetMyCompanyUseQuery.mockReturnValue({ data: makeCompany(), isLoading: false });
    const mutateFn = vi.fn();
    mockUpdateCompanyUseMutation.mockReturnValue({ mutate: mutateFn, isPending: false });

    render(<CompanySettings />);

    const input = screen.getByLabelText("Nom du cabinet") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Nouveau Cabinet" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(mutateFn).toHaveBeenCalledWith({ name: "Nouveau Cabinet" });
    });
  });
});
