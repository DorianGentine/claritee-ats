/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { TeamSettings } from "@/components/settings/TeamSettings";

const mockListUsersUseQuery = vi.fn();
const mockListAllUseQuery = vi.fn();
const mockCreateUseMutation = vi.fn();
const mockRevokeUseMutation = vi.fn();
const mockGetMeUseQuery = vi.fn();
const mockGetMyCompanyUseQuery = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/trpc/client", () => ({
  api: {
    company: {
      listUsers: {
        useQuery: (...args: unknown[]) => mockListUsersUseQuery(...args),
      },
      getMyCompany: {
        useQuery: (...args: unknown[]) => mockGetMyCompanyUseQuery(...args),
      },
      deleteUser: {
        useMutation: () => ({ mutate: mockDeleteUser, isPending: false }),
      },
    },
    auth: {
      getMe: {
        useQuery: (...args: unknown[]) => mockGetMeUseQuery(...args),
      },
    },
    invitation: {
      listAll: {
        useQuery: (...args: unknown[]) => mockListAllUseQuery(...args),
      },
      create: {
        useMutation: (...args: unknown[]) => mockCreateUseMutation(...args),
      },
      revoke: {
        useMutation: (...args: unknown[]) => mockRevokeUseMutation(...args),
      },
    },
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const makeMembers = () => [
  {
    id: "u1",
    firstName: "Alice",
    lastName: "Martin",
    email: "alice@example.com",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "u2",
    firstName: "Bob",
    lastName: "Dupont",
    email: "bob@example.com",
    createdAt: new Date("2026-02-01"),
  },
];

const makeInvitations = () => [
  {
    id: "inv1",
    email: "charlie@example.com",
    token: "tok123",
    expiresAt: new Date(Date.now() + 86400000),
    usedAt: null,
    revokedAt: null,
  },
];

describe("TeamSettings", () => {
  beforeEach(() => {
    mockCreateUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockRevokeUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false, variables: undefined });
    mockGetMeUseQuery.mockReturnValue({ data: { id: "u1" } });
    mockGetMyCompanyUseQuery.mockReturnValue({ data: { id: "c1", name: "Cabinet", ownerId: "u1" } });
  });

  it("le créateur peut retirer un autre membre et supprimer son compte", () => {
    mockListUsersUseQuery.mockReturnValue({ data: makeMembers(), isLoading: false });
    mockListAllUseQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });

    render(<TeamSettings />);

    expect(screen.getByText("Créateur")).toBeDefined();
    expect(screen.getByRole("button", { name: "Retirer Bob Dupont du cabinet" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Supprimer mon compte" })).toBeDefined();
  });

  it("un membre ne peut retirer personne, seulement supprimer son compte", () => {
    mockGetMeUseQuery.mockReturnValue({ data: { id: "u2" } });
    mockListUsersUseQuery.mockReturnValue({ data: makeMembers(), isLoading: false });
    mockListAllUseQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });

    render(<TeamSettings />);

    expect(screen.queryByRole("button", { name: /^Retirer/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Supprimer mon compte" })).toBeDefined();
  });

  it("le dernier membre ne peut pas supprimer son compte", () => {
    mockListUsersUseQuery.mockReturnValue({ data: makeMembers().slice(0, 1), isLoading: false });
    mockListAllUseQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });

    render(<TeamSettings />);

    expect(screen.queryByRole("button", { name: "Supprimer mon compte" })).toBeNull();
  });

  it("retire un membre après confirmation", async () => {
    mockListUsersUseQuery.mockReturnValue({ data: makeMembers(), isLoading: false });
    mockListAllUseQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });

    render(<TeamSettings />);
    fireEvent.click(screen.getByRole("button", { name: "Retirer Bob Dupont du cabinet" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Retirer" }));

    expect(mockDeleteUser).toHaveBeenCalledWith({ userId: "u2" });
  });

  it("affiche les skeletons pendant isLoading (membres)", () => {
    mockListUsersUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    mockListAllUseQuery.mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() });

    render(<TeamSettings />);

    expect(screen.queryByText("Alice Martin")).toBeNull();
  });

  it("affiche la liste des membres avec nom, email, date", () => {
    mockListUsersUseQuery.mockReturnValue({ data: makeMembers(), isLoading: false });
    mockListAllUseQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });

    render(<TeamSettings />);

    expect(screen.getByText("Alice Martin")).toBeDefined();
    expect(screen.getByText("alice@example.com")).toBeDefined();
    expect(screen.getByText("Bob Dupont")).toBeDefined();
  });

  it("bouton Inviter visible", () => {
    mockListUsersUseQuery.mockReturnValue({ data: makeMembers(), isLoading: false });
    mockListAllUseQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });

    render(<TeamSettings />);

    expect(screen.getByRole("button", { name: /inviter/i })).toBeDefined();
  });

  it("bouton Révoquer visible sur invitation active", () => {
    mockListUsersUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockListAllUseQuery.mockReturnValue({
      data: makeInvitations(),
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<TeamSettings />);

    expect(screen.getByRole("button", { name: /révoquer/i })).toBeDefined();
  });

  it("pas de bouton Révoquer sur invitation utilisée", () => {
    const usedInvitation = [
      {
        id: "inv2",
        email: "used@example.com",
        token: "tok456",
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: new Date(),
        revokedAt: null,
      },
    ];
    mockListUsersUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockListAllUseQuery.mockReturnValue({
      data: usedInvitation,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<TeamSettings />);

    expect(screen.queryByRole("button", { name: /révoquer/i })).toBeNull();
  });
});
