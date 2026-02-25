import { describe, it, expect } from "vitest";
import { searchInputSchema } from "@/lib/validations/search";

describe("searchInputSchema", () => {
  it("accepts valid query with 2+ chars", () => {
    const result = searchInputSchema.safeParse({ q: "ab" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe("ab");
      expect(result.data.limit).toBe(8);
    }
  });

  it("accepts query with limit", () => {
    const result = searchInputSchema.safeParse({ q: "test", limit: 20 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("rejects query with less than 2 chars", () => {
    const result = searchInputSchema.safeParse({ q: "a" });
    expect(result.success).toBe(false);
  });

  it("rejects empty query", () => {
    const result = searchInputSchema.safeParse({ q: "" });
    expect(result.success).toBe(false);
  });

  it("trims whitespace", () => {
    const result = searchInputSchema.safeParse({ q: "  ab  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe("ab");
    }
  });

  it("rejects limit > 50", () => {
    const result = searchInputSchema.safeParse({ q: "test", limit: 51 });
    expect(result.success).toBe(false);
  });

  it("rejects limit < 1", () => {
    const result = searchInputSchema.safeParse({ q: "test", limit: 0 });
    expect(result.success).toBe(false);
  });
});
