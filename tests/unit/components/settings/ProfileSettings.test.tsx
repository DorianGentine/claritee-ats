/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ProfileSettings } from "@/components/settings/ProfileSettings";

const mockGetMeUseQuery = vi.fn();
const mockUpdateProfileUseMutation = vi.fn();
const mockGetMeInvalidate = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  api: {
    auth: {
      getMe: {
        useQuery: (...args: unknown[]) => mockGetMeUseQuery(...args),
      },
      updateProfile: {
        useMutation: (...args: unknown[]) => mockUpdateProfileUseMutation(...args),
      },
    },
    useUtils: () => ({
      auth: {
        getMe: {
          invalidate: mockGetMeInvalidate,
        },
      },
    }),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const makeProfile = () => ({
  id: "user-1",
  firstName: "Alice",
  lastName: "Martin",
  email: "alice@example.com",
});

describe("ProfileSettings", () => {
  it("affiche les skeletons pendant isLoading", () => {
    mockGetMeUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    mockUpdateProfileUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });

    render(<ProfileSettings />);

    expect(screen.queryByLabelText("Prénom")).toBeNull();
  });

  it("affiche firstName et lastName pré-remplis", async () => {
    mockGetMeUseQuery.mockReturnValue({ data: makeProfile(), isLoading: false });
    mockUpdateProfileUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });

    render(<ProfileSettings />);

    const firstNameInput = screen.getByLabelText("Prénom") as HTMLInputElement;
    const lastNameInput = screen.getByLabelText("Nom") as HTMLInputElement;
    expect(firstNameInput.value).toBe("Alice");
    expect(lastNameInput.value).toBe("Martin");
  });

  it("email affiché en lecture seule", () => {
    mockGetMeUseQuery.mockReturnValue({ data: makeProfile(), isLoading: false });
    mockUpdateProfileUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });

    render(<ProfileSettings />);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    expect(emailInput.disabled).toBe(true);
    expect(emailInput.value).toBe("alice@example.com");
  });

  it("soumettre profil valide → mutation appelée", async () => {
    mockGetMeUseQuery.mockReturnValue({ data: makeProfile(), isLoading: false });
    const mutateFn = vi.fn();
    mockUpdateProfileUseMutation.mockReturnValue({ mutate: mutateFn, isPending: false });

    render(<ProfileSettings />);

    const firstNameInput = screen.getByLabelText("Prénom");
    fireEvent.change(firstNameInput, { target: { value: "Bob" } });
    fireEvent.submit(firstNameInput.closest("form")!);

    await waitFor(() => {
      expect(mutateFn).toHaveBeenCalledWith({ firstName: "Bob", lastName: "Martin" });
    });
  });

  it("bouton mot de passe désactivé si champs vides", () => {
    mockGetMeUseQuery.mockReturnValue({ data: makeProfile(), isLoading: false });
    mockUpdateProfileUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });

    render(<ProfileSettings />);

    const submitBtn = screen.getByRole("button", { name: /changer le mot de passe/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
