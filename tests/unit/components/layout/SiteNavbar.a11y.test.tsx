/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render } from "@testing-library/react";
import { SiteNavbar } from "@/components/layout/SiteNavbar";

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
      getSession: () =>
        Promise.resolve({ data: { session: { user: mockUser } } }),
      onAuthStateChange: (
        cb: (_e: string, s: { user: unknown } | null) => void
      ) => {
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
        useQuery: () => ({
          data: { id: "c1", name: "Cabinet Test" },
          isLoading: false,
        }),
      },
    },
    search: {
      search: {
        useQuery: () => ({
          data: { candidates: [], offers: [] },
          isLoading: false,
        }),
      },
    },
  },
}));

describe("SiteNavbar a11y", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has no axe violations when authenticated on dashboard", async () => {
    const { container } = render(<SiteNavbar />);
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
