import { describe, it, expect } from "vitest";
import {
  createCandidateSchema,
  updateCandidateSchema,
  addLanguageSchema,
  removeLanguageSchema,
  uploadPhotoSchema,
  uploadCvSchema,
  PHOTO_ACCEPTED_MIMES,
  CV_ACCEPTED_MIMES,
  LANGUAGE_LEVELS,
} from "@/lib/validations/candidate";

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

  describe("updateCandidateSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";

    it("accepts valid summary", () => {
      const result = updateCandidateSchema.parse({
        id: validUuid,
        summary: "Un bon profil",
      });
      expect(result.id).toBe(validUuid);
      expect(result.summary).toBe("Un bon profil");
    });

    it("trims summary", () => {
      const result = updateCandidateSchema.parse({
        id: validUuid,
        summary: "  Résumé  ",
      });
      expect(result.summary).toBe("Résumé");
    });

    it("converts empty/whitespace summary to null", () => {
      expect(updateCandidateSchema.parse({ id: validUuid, summary: "" }).summary).toBeNull();
      expect(updateCandidateSchema.parse({ id: validUuid, summary: "   " }).summary).toBeNull();
    });

    it("converts undefined summary to null", () => {
      expect(updateCandidateSchema.parse({ id: validUuid }).summary).toBeNull();
    });

    it("rejects summary exceeding 500 characters", () => {
      expect(() =>
        updateCandidateSchema.parse({ id: validUuid, summary: "a".repeat(501) }),
      ).toThrow(/500/);
    });

    it("rejects invalid id", () => {
      expect(() =>
        updateCandidateSchema.parse({ id: "not-uuid", summary: "ok" }),
      ).toThrow();
    });
  });

  describe("addLanguageSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";

    it("accepts valid input for each level", () => {
      for (const level of LANGUAGE_LEVELS) {
        const result = addLanguageSchema.parse({
          candidateId: validUuid,
          name: "Français",
          level,
        });
        expect(result.level).toBe(level);
      }
    });

    it("rejects empty name", () => {
      expect(() =>
        addLanguageSchema.parse({ candidateId: validUuid, name: "", level: "FLUENT" }),
      ).toThrow();
    });

    it("rejects name exceeding 50 characters", () => {
      expect(() =>
        addLanguageSchema.parse({ candidateId: validUuid, name: "a".repeat(51), level: "FLUENT" }),
      ).toThrow();
    });

    it("rejects invalid level", () => {
      expect(() =>
        addLanguageSchema.parse({ candidateId: validUuid, name: "Français", level: "EXPERT" }),
      ).toThrow();
    });

    it("rejects missing level", () => {
      expect(() =>
        addLanguageSchema.parse({ candidateId: validUuid, name: "Français" }),
      ).toThrow();
    });
  });

  describe("removeLanguageSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";

    it("accepts valid input", () => {
      const result = removeLanguageSchema.parse({
        candidateId: validUuid,
        languageId: validUuid,
      });
      expect(result.candidateId).toBe(validUuid);
      expect(result.languageId).toBe(validUuid);
    });

    it("rejects invalid candidateId", () => {
      expect(() =>
        removeLanguageSchema.parse({ candidateId: "bad", languageId: validUuid }),
      ).toThrow();
    });

    it("rejects invalid languageId", () => {
      expect(() =>
        removeLanguageSchema.parse({ candidateId: validUuid, languageId: "bad" }),
      ).toThrow();
    });
  });

  describe("uploadPhotoSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const validBase64 = Buffer.from("fake-image-bytes").toString("base64");

    it("accepts valid input for each mime type", () => {
      for (const mimeType of PHOTO_ACCEPTED_MIMES) {
        const result = uploadPhotoSchema.parse({
          candidateId: validUuid,
          fileBase64: validBase64,
          mimeType,
        });
        expect(result.candidateId).toBe(validUuid);
        expect(result.mimeType).toBe(mimeType);
      }
    });

    it("rejects invalid mime type with PRD message", () => {
      expect(() =>
        uploadPhotoSchema.parse({
          candidateId: validUuid,
          fileBase64: validBase64,
          mimeType: "image/gif",
        }),
      ).toThrow(/Format de fichier non supporté. Formats acceptés : JPG, PNG, WebP/);
    });

    it("rejects empty fileBase64", () => {
      expect(() =>
        uploadPhotoSchema.parse({
          candidateId: validUuid,
          fileBase64: "",
          mimeType: "image/jpeg",
        }),
      ).toThrow();
    });

    it("rejects invalid candidateId (non-uuid)", () => {
      expect(() =>
        uploadPhotoSchema.parse({
          candidateId: "not-a-uuid",
          fileBase64: validBase64,
          mimeType: "image/jpeg",
        }),
      ).toThrow();
    });
  });

  describe("uploadCvSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const validBase64 = Buffer.from("fake-pdf-bytes").toString("base64");

    it("accepts valid input for each mime type", () => {
      for (const mimeType of CV_ACCEPTED_MIMES) {
        const result = uploadCvSchema.parse({
          candidateId: validUuid,
          fileBase64: validBase64,
          mimeType,
          fileName: "cv.pdf",
        });
        expect(result.candidateId).toBe(validUuid);
        expect(result.mimeType).toBe(mimeType);
        expect(result.fileName).toBe("cv.pdf");
      }
    });

    it("rejects invalid mime type with PRD message", () => {
      expect(() =>
        uploadCvSchema.parse({
          candidateId: validUuid,
          fileBase64: validBase64,
          mimeType: "text/plain",
          fileName: "doc.txt",
        }),
      ).toThrow(/Format de fichier non supporté. Formats acceptés : PDF, DOC, DOCX/);
    });

    it("rejects empty fileBase64", () => {
      expect(() =>
        uploadCvSchema.parse({
          candidateId: validUuid,
          fileBase64: "",
          mimeType: "application/pdf",
          fileName: "cv.pdf",
        }),
      ).toThrow();
    });

    it("rejects empty fileName", () => {
      expect(() =>
        uploadCvSchema.parse({
          candidateId: validUuid,
          fileBase64: validBase64,
          mimeType: "application/pdf",
          fileName: "",
        }),
      ).toThrow();
    });

    it("rejects fileName exceeding 255 characters", () => {
      expect(() =>
        uploadCvSchema.parse({
          candidateId: validUuid,
          fileBase64: validBase64,
          mimeType: "application/pdf",
          fileName: "a".repeat(256),
        }),
      ).toThrow();
    });

    it("rejects invalid candidateId (non-uuid)", () => {
      expect(() =>
        uploadCvSchema.parse({
          candidateId: "not-a-uuid",
          fileBase64: validBase64,
          mimeType: "application/pdf",
          fileName: "cv.pdf",
        }),
      ).toThrow();
    });
  });
});
