/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clearNoteDraft,
  readNoteDraft,
  writeNoteDraft,
} from "@/lib/note-draft";

describe("note-draft", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores one draft per user", () => {
    writeNoteDraft("user-1", "brouillon 1");
    writeNoteDraft("user-2", "brouillon 2");
    expect(readNoteDraft("user-1")).toBe("brouillon 1");
    expect(readNoteDraft("user-2")).toBe("brouillon 2");
    clearNoteDraft("user-1");
    expect(readNoteDraft("user-1")).toBeNull();
    expect(readNoteDraft("user-2")).toBe("brouillon 2");
  });

  it("reads the memory fallback when only writing fails (quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });
    writeNoteDraft("user-1", "trop gros");
    expect(readNoteDraft("user-1")).toBe("trop gros");
    writeNoteDraft("user-1", "plus petit");
    expect(readNoteDraft("user-1")).toBe("plus petit");
    clearNoteDraft("user-1");
    expect(readNoteDraft("user-1")).toBeNull();
  });

  it("falls back to memory when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    writeNoteDraft("user-1", "en mémoire");
    expect(readNoteDraft("user-1")).toBe("en mémoire");
    clearNoteDraft("user-1");
    expect(readNoteDraft("user-1")).toBeNull();
  });
});
