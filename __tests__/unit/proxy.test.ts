import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { checkRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}));

const request = (path: string) =>
  new NextRequest(new URL(path, "http://localhost:3000"));

describe("proxy — limite de débit sur /login", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockReset();
  });

  it("redirige vers la page d'erreur quand la limite est atteinte", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false } as Awaited<
      ReturnType<typeof checkRateLimit>
    >);

    const response = await proxy(request("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=rate_limit"
    );
  });

  it("affiche la page d'erreur sans la rediriger vers elle-même", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false } as Awaited<
      ReturnType<typeof checkRateLimit>
    >);

    const response = await proxy(request("/login?error=rate_limit"));

    expect(response.headers.get("location")).toBeNull();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("laisse passer /login sous la limite", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true } as Awaited<
      ReturnType<typeof checkRateLimit>
    >);

    const response = await proxy(request("/login"));

    expect(response.headers.get("location")).toBeNull();
  });
});
