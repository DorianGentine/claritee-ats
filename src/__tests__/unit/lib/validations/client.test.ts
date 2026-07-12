import { describe, it, expect } from "vitest";
import {
  createClientContactSchema,
  updateClientContactSchema,
} from "@/lib/validations/client";

describe("client contact validations", () => {
  describe("createClientContactSchema", () => {
    it("accepts valid contact with required fields only", () => {
      const result = createClientContactSchema.parse({
        firstName: "Jean",
        lastName: "Dupont",
      });
      expect(result.firstName).toBe("Jean");
      expect(result.lastName).toBe("Dupont");
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.position).toBeUndefined();
      expect(result.linkedinUrl).toBeUndefined();
    });

    it("accepts valid contact with all optional fields", () => {
      const result = createClientContactSchema.parse({
        firstName: "Marie",
        lastName: "Martin",
        email: "marie@example.com",
        phone: "+33612345678",
        position: "DRH",
        linkedinUrl: "https://linkedin.com/in/mariemartin",
      });
      expect(result.firstName).toBe("Marie");
      expect(result.lastName).toBe("Martin");
      expect(result.email).toBe("marie@example.com");
      expect(result.phone).toBe("+33612345678");
      expect(result.position).toBe("DRH");
      expect(result.linkedinUrl).toBe("https://linkedin.com/in/mariemartin");
    });

    it("transforms empty optional fields to undefined", () => {
      const result = createClientContactSchema.parse({
        firstName: "Jean",
        lastName: "Dupont",
        email: "  ",
        phone: "",
        position: "",
        linkedinUrl: "",
      });
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.position).toBeUndefined();
      expect(result.linkedinUrl).toBeUndefined();
    });

    it("rejects when firstName is empty", () => {
      expect(() =>
        createClientContactSchema.parse({
          firstName: "",
          lastName: "Dupont",
        }),
      ).toThrow();
    });

    it("rejects when lastName is empty", () => {
      expect(() =>
        createClientContactSchema.parse({
          firstName: "Jean",
          lastName: "",
        }),
      ).toThrow();
    });

    it("rejects invalid email format", () => {
      expect(() =>
        createClientContactSchema.parse({
          firstName: "Jean",
          lastName: "Dupont",
          email: "invalid-email",
        }),
      ).toThrow();
    });

    it("accepts valid email", () => {
      const result = createClientContactSchema.parse({
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean.dupont@example.com",
      });
      expect(result.email).toBe("jean.dupont@example.com");
    });

    it("rejects invalid LinkedIn URL (not linkedin.com/in/...)", () => {
      expect(() =>
        createClientContactSchema.parse({
          firstName: "Jean",
          lastName: "Dupont",
          linkedinUrl: "https://example.com/profile",
        }),
      ).toThrow();
    });

    it("accepts valid LinkedIn URL", () => {
      const result = createClientContactSchema.parse({
        firstName: "Jean",
        lastName: "Dupont",
        linkedinUrl: "https://linkedin.com/in/jeandupont",
      });
      expect(result.linkedinUrl).toBe("https://linkedin.com/in/jeandupont");
    });

    it("accepts LinkedIn URL with www", () => {
      const result = createClientContactSchema.parse({
        firstName: "Jean",
        lastName: "Dupont",
        linkedinUrl: "https://www.linkedin.com/in/jeandupont",
      });
      expect(result.linkedinUrl).toBe("https://www.linkedin.com/in/jeandupont");
    });
  });

  describe("updateClientContactSchema", () => {
    const validId = "550e8400-e29b-41d4-a716-446655440001";

    it("accepts id only (partial update)", () => {
      const result = updateClientContactSchema.parse({ id: validId });
      expect(result.id).toBe(validId);
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
    });

    it("accepts id + partial fields", () => {
      const result = updateClientContactSchema.parse({
        id: validId,
        firstName: "Jean-Pierre",
        position: "DRH",
      });
      expect(result.id).toBe(validId);
      expect(result.firstName).toBe("Jean-Pierre");
      expect(result.position).toBe("DRH");
      expect(result.lastName).toBeUndefined();
    });

    it("rejects invalid uuid", () => {
      expect(() =>
        updateClientContactSchema.parse({
          id: "not-a-uuid",
          firstName: "Jean",
        }),
      ).toThrow();
    });
  });
});
