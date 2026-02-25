import { describe, it, expect } from "vitest";
import {
  getOfferStatusLabel,
  getOfferStatusBadgeClass,
  getOfferStatusStyle,
  OFFER_STATUS_LABELS,
} from "@/lib/offer-status-style";
import type { JobOfferStatus } from "@prisma/client";

describe("offer-status-style", () => {
  it("returns correct labels for each status", () => {
    expect(getOfferStatusLabel("TODO")).toBe("À faire");
    expect(getOfferStatusLabel("IN_PROGRESS")).toBe("En cours");
    expect(getOfferStatusLabel("DONE")).toBe("Terminé");
  });

  it("OFFER_STATUS_LABELS covers all statuses", () => {
    const statuses: JobOfferStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
    statuses.forEach((status) => {
      expect(OFFER_STATUS_LABELS[status]).toBeDefined();
      expect(typeof OFFER_STATUS_LABELS[status]).toBe("string");
    });
  });

  it("returns badge classes that include bg- for each status", () => {
    expect(getOfferStatusBadgeClass("TODO")).toMatch(/bg-muted/);
    expect(getOfferStatusBadgeClass("IN_PROGRESS")).toMatch(/bg-secondary/);
    expect(getOfferStatusBadgeClass("DONE")).toMatch(/bg-\[#E8F5EC\]/);
  });

  it("getOfferStatusStyle returns label and badgeClassName", () => {
    const style = getOfferStatusStyle("IN_PROGRESS");
    expect(style.label).toBe("En cours");
    expect(style.badgeClassName).toMatch(/secondary/);
  });
});
