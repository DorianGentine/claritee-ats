/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { fireEvent, render, within } from "@testing-library/react";
import { AppSidebar } from "@/components/layout/AppSidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const mockUser = vi.hoisted(() => ({
  id: "user-1",
  email: "user@example.com",
  user_metadata: { full_name: "Test User" },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: mockUser } } }),
      onAuthStateChange: (cb: (_e: string, s: { user: unknown } | null) => void) => {
        cb("INITIAL_SESSION", { user: mockUser });
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: () => Promise.resolve(),
    },
  }),
}));

vi.mock("@/lib/trpc/client", () => ({
  api: {
    company: {
      getMyCompany: {
        useQuery: () => ({ data: { id: "c1", name: "Cabinet Test" }, isLoading: false }),
      },
    },
    search: {
      search: {
        useQuery: () => ({ data: { candidates: [], offers: [] }, isLoading: false }),
      },
    },
  },
}));

describe("AppSidebar a11y", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has no axe violations when authenticated on dashboard", async () => {
    const { container } = render(<AppSidebar />);
    expect(
      within(container).getByRole("link", { name: "Candidats" }).getAttribute("href")
    ).toBe("/candidates");
    expect(
      within(container).getByRole("link", { name: "Dashboard" }).getAttribute("aria-current")
    ).toBe("page");
    expect(within(container).getByRole("button", { name: "Se déconnecter" })).toBeDefined();
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  it("se replie et mémorise l'état dans un cookie", () => {
    const { container } = render(<AppSidebar />);
    const view = within(container);

    fireEvent.click(view.getByRole("button", { name: "Replier le menu" }));

    const toggle = view.getByRole("button", { name: "Déplier le menu" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.cookie).toContain("sidebar_collapsed=1");
    // Libellés conservés pour les lecteurs d'écran, infobulle au survol
    const candidatesLink = view.getByRole("link", { name: "Candidats" });
    expect(candidatesLink.getAttribute("title")).toBe("Candidats");

    fireEvent.click(toggle);
    expect(document.cookie).toContain("sidebar_collapsed=0");
  });

  it("démarre replié selon l'état fourni par le serveur", () => {
    const { container } = render(<AppSidebar defaultCollapsed />);
    expect(
      within(container).getByRole("button", { name: "Déplier le menu" })
    ).toBeDefined();
  });
});
