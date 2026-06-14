import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";

vi.mock("@/server/db", () => ({
  db: { $queryRaw: vi.fn() },
}));

import { db } from "@/server/db";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with db ok when DB is reachable", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValueOnce([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, db: "ok" });
  });

  it("returns 503 with db unavailable when DB throws", async () => {
    vi.mocked(db.$queryRaw).mockRejectedValueOnce(new Error("connection refused"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toEqual({ ok: false, db: "unavailable" });
  });
});
