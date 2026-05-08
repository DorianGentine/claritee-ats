/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TeamSettings } from "@/components/settings/TeamSettings";

const mockListUsersUseQuery = vi.fn();
const mockListAllUseQuery = vi.fn();
const mockCreateUseMutation = vi.fn();
const mockRevokeUseMutation = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  api: {
    company: {
      listUsers: {
        useQuery: (...args: unknown[]) => mockListUsersUseQuery(...args),
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
