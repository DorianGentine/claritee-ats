import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 OK", async () => {
    const res = GET();
    expect(res.status).toBe(200);
  });
});
