import { describe, it, expect } from "vitest";
import { createCandidateSchema } from "@/lib/validations/candidate";

describe("candidate validations", () => {
  describe("createCandidateSchema", () => {
    const base = {
      firstName: "Jean",
      lastName: "Dupont",
    };

    it("accepts only required fields", () => {
      expect(createCandidateSchema.parse(base)).toEqual(base);
    });

    it("accepts all optional fields", () => {
      const data = {
        ...base,
        email: "jean@example.com",
        phone: "06 12 34 56 78",
        linkedinUrl: "https://linkedin.com/in/jeandupont",
        title: "Développeur",
        city: "Paris",
      };
      expect(createCandidateSchema.parse(data)).toEqual(data);
    });

    it("rejects invalid email when provided", () => {
      expect(() =>
        createCandidateSchema.parse({ ...base, email: "not-an-email" }),
      ).toThrow();
      expect(() =>
        createCandidateSchema.parse({ ...base, email: "missing@" }),
      ).toThrow();
    });

    it("rejects invalid LinkedIn URL when provided", () => {
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          linkedinUrl: "https://example.com/profile",
        }),
      ).toThrow();
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          linkedinUrl: "https://linkedin.com/company/foo",
        }),
      ).toThrow();
    });

    it("accepts valid LinkedIn URL with www", () => {
      const data = {
        ...base,
        linkedinUrl: "https://www.linkedin.com/in/jeandupont",
      };
      expect(createCandidateSchema.parse(data)).toEqual(data);
    });

    it("accepts flexible French phone formats", () => {
      const validPhones = [
        "06 12 34 56 78",
        "0612345678",
        "+33 6 12 34 56 78",
        "+33612345678",
        "06-12-34-56-78",
        "01 23 45 67 89",
      ];
      for (const phone of validPhones) {
        expect(
          createCandidateSchema.parse({ ...base, phone }),
        ).toMatchObject({ phone });
      }
    });

    it("rejects too short phone when provided", () => {
      expect(() =>
        createCandidateSchema.parse({ ...base, phone: "123" }),
      ).toThrow();
    });

    it("rejects empty firstName", () => {
      expect(() =>
        createCandidateSchema.parse({ ...base, firstName: "" }),
      ).toThrow();
    });

    it("rejects empty lastName", () => {
      expect(() =>
        createCandidateSchema.parse({ ...base, lastName: "" }),
      ).toThrow();
    });

    it("trims optional fields and converts whitespace-only to undefined", () => {
      const result = createCandidateSchema.parse({
        ...base,
        title: "  Dev  ",
        city: "  Paris  ",
        email: "  jean@example.com  ",
      });
      expect(result.title).toBe("Dev");
      expect(result.city).toBe("Paris");
      expect(result.email).toBe("jean@example.com");
    });

    it("converts whitespace-only optional fields to undefined", () => {
      const result = createCandidateSchema.parse({
        ...base,
        title: "   ",
        city: "",
        email: "  ",
      });
      expect(result.title).toBeUndefined();
      expect(result.city).toBeUndefined();
      expect(result.email).toBeUndefined();
    });
  });
});
