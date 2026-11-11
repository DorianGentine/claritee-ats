import { describe, it, expect } from "vitest"
import {
  candidateListInputSchema,
  createCandidateSchema,
  updateCandidateSchema,
  addLanguageSchema,
  removeLanguageSchema,
  createFileUploadUrlSchema,
  confirmFileUploadSchema,
  PHOTO_MAX_BYTES,
  CV_MAX_BYTES,
  PHOTO_ACCEPTED_MIMES,
  CV_ACCEPTED_MIMES,
  LANGUAGE_LEVELS,
} from "@/lib/validations/candidate"

describe("candidate validations", () => {
  describe("candidateListInputSchema", () => {
    const validUuid1 = "550e8400-e29b-41d4-a716-446655440001"
    const validUuid2 = "550e8400-e29b-41d4-a716-446655440002"

    it("accepts base list input (cursor, limit)", () => {
      const result = candidateListInputSchema.parse({ limit: 20 })
      expect(result.limit).toBe(20)
      expect(result.cursor).toBeUndefined()
      expect(result.tagIds).toBeUndefined()
    })

    it("accepts tagIds array of UUIDs", () => {
      const result = candidateListInputSchema.parse({
        limit: 10,
        tagIds: [validUuid1, validUuid2],
      })
      expect(result.tagIds).toEqual([validUuid1, validUuid2])
    })

    it("accepts cityIds array of UUIDs", () => {
      const result = candidateListInputSchema.parse({
        limit: 10,
        cityIds: [validUuid1, validUuid2],
      })
      expect(result.cityIds).toEqual([validUuid1, validUuid2])
    })

    it("rejects invalid cityIds (non-UUID)", () => {
      expect(() =>
        candidateListInputSchema.parse({
          limit: 10,
          cityIds: ["not-a-uuid"],
        })
      ).toThrow()
    })

    it("rejects invalid tagIds (non-UUID)", () => {
      expect(() =>
        candidateListInputSchema.parse({
          limit: 10,
          tagIds: ["not-a-uuid"],
        })
      ).toThrow()
    })

    it("rejects invalid cursor (non-UUID)", () => {
      expect(() =>
        candidateListInputSchema.parse({
          limit: 10,
          cursor: "invalid",
        })
      ).toThrow()
    })

    it("accepts languageNames array", () => {
      const result = candidateListInputSchema.parse({
        limit: 10,
        languageNames: ["Français", "Anglais"],
      })
      expect(result.languageNames).toEqual(["Français", "Anglais"])
    })

    it("trims and filters empty languageNames", () => {
      const result = candidateListInputSchema.parse({
        limit: 10,
        languageNames: ["  Français  ", "", "  ", "Anglais"],
      })
      expect(result.languageNames).toEqual(["Français", "Anglais"])
    })

    it("rejects tagIds array exceeding 20 elements", () => {
      const manyUuids = Array.from(
        { length: 21 },
        (_, i) =>
          `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, "0")}`
      )
      expect(() =>
        candidateListInputSchema.parse({
          limit: 10,
          tagIds: manyUuids,
        })
      ).toThrow(/Maximum 20 tags/)
    })
  })

  describe("createCandidateSchema", () => {
    const base = {
      firstName: "Jean",
      lastName: "Dupont",
    }
    /** Valeurs par défaut ajoutées par le schéma (villes et parcours vides) */
    const emptyDefaults = {
      cities: [],
      experiences: [],
      formations: [],
      languages: [],
      tags: [],
    }

    it("accepts only required fields", () => {
      expect(createCandidateSchema.parse(base)).toEqual({
        ...base,
        ...emptyDefaults,
      })
    })

    it("accepts all optional fields", () => {
      const data = {
        ...base,
        email: "jean@example.com",
        phone: "06 12 34 56 78",
        linkedinUrl: "https://linkedin.com/in/jeandupont",
        title: "Développeur",
      }
      expect(createCandidateSchema.parse(data)).toEqual({
        ...data,
        ...emptyDefaults,
      })
    })

    it("rejects invalid email when provided", () => {
      expect(() =>
        createCandidateSchema.parse({ ...base, email: "not-an-email" })
      ).toThrow()
      expect(() =>
        createCandidateSchema.parse({ ...base, email: "missing@" })
      ).toThrow()
    })

    it("rejects invalid LinkedIn URL when provided", () => {
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          linkedinUrl: "https://example.com/profile",
        })
      ).toThrow()
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          linkedinUrl: "https://linkedin.com/company/foo",
        })
      ).toThrow()
    })

    it("accepts valid LinkedIn URL with www", () => {
      const data = {
        ...base,
        linkedinUrl: "https://www.linkedin.com/in/jeandupont",
      }
      expect(createCandidateSchema.parse(data)).toEqual({
        ...data,
        ...emptyDefaults,
      })
    })

    it("accepts LinkedIn URL with trailing slash and query params", () => {
      const data = {
        ...base,
        linkedinUrl:
          "https://www.linkedin.com/in/john-doe/?originalSubdomain=fr",
      }
      expect(createCandidateSchema.parse(data)).toEqual({
        ...data,
        ...emptyDefaults,
      })
    })

    it("accepts flexible French phone formats", () => {
      const validPhones = [
        "06 12 34 56 78",
        "0612345678",
        "+33 6 12 34 56 78",
        "+33612345678",
        "06-12-34-56-78",
        "01 23 45 67 89",
      ]
      for (const phone of validPhones) {
        expect(createCandidateSchema.parse({ ...base, phone })).toMatchObject({
          phone,
        })
      }
    })

    it("rejects too short phone when provided", () => {
      expect(() =>
        createCandidateSchema.parse({ ...base, phone: "123" })
      ).toThrow()
    })

    it("rejects empty firstName", () => {
      expect(() =>
        createCandidateSchema.parse({ ...base, firstName: "" })
      ).toThrow()
    })

    it("rejects empty lastName", () => {
      expect(() =>
        createCandidateSchema.parse({ ...base, lastName: "" })
      ).toThrow()
    })

    it("defaults cities to an empty array when omitted", () => {
      const result = createCandidateSchema.parse(base)
      expect(result.cities).toEqual([])
    })

    it("accepts an ordered cities array", () => {
      const cities = [
        { cityId: "550e8400-e29b-41d4-a716-446655440010", order: 0 },
        { cityId: "550e8400-e29b-41d4-a716-446655440011", order: 1 },
      ]
      const result = createCandidateSchema.parse({ ...base, cities })
      expect(result.cities).toEqual(cities)
    })

    it("rejects cities with a negative order", () => {
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          cities: [
            { cityId: "550e8400-e29b-41d4-a716-446655440010", order: -1 },
          ],
        })
      ).toThrow()
    })

    it("rejects cities with a non-UUID cityId", () => {
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          cities: [{ cityId: "not-a-uuid", order: 0 }],
        })
      ).toThrow()
    })

    it("rejects duplicate cityId in cities", () => {
      const duplicatedId = "550e8400-e29b-41d4-a716-446655440010"
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          cities: [
            { cityId: duplicatedId, order: 0 },
            { cityId: duplicatedId, order: 1 },
          ],
        })
      ).toThrow()
    })

    it("accepts an imported background and coerces its dates", () => {
      const parsed = createCandidateSchema.parse({
        ...base,
        summary: "  Recruteuse tech.  ",
        experiences: [
          {
            title: "Lead",
            company: "Acme",
            startDate: "2022-11-01",
            endDate: null,
          },
        ],
        formations: [{ degree: "Master", school: "Lyon 2", startDate: null }],
        languages: [{ name: "Anglais", level: "FLUENT" }],
      })
      expect(parsed.summary).toBe("Recruteuse tech.")
      expect(parsed.experiences[0]!.startDate).toEqual(new Date("2022-11-01"))
      expect(parsed.formations[0]!.school).toBe("Lyon 2")
      expect(parsed.languages).toEqual([{ name: "Anglais", level: "FLUENT" }])
    })

    it("rejects an imported experience without company or with an invalid level", () => {
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          experiences: [
            { title: "Lead", company: " ", startDate: "2022-11-01" },
          ],
        })
      ).toThrow(/L'entreprise est requise/)
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          languages: [{ name: "Anglais", level: "EXPERT" }],
        })
      ).toThrow()
    })

    it("accepts up to 20 trimmed tag names", () => {
      expect(
        createCandidateSchema.parse({ ...base, tags: [" React "] }).tags
      ).toEqual(["React"])
      expect(() =>
        createCandidateSchema.parse({
          ...base,
          tags: Array.from({ length: 21 }, (_unused, index) => `Tag ${index}`),
        })
      ).toThrow()
    })

    it("rejects a summary over 500 characters", () => {
      expect(() =>
        createCandidateSchema.parse({ ...base, summary: "a".repeat(501) })
      ).toThrow(/500 caractères/)
    })
  })

  describe("updateCandidateSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000"

    it("accepts all base fields including ordered cities", () => {
      const cities = [
        { cityId: "550e8400-e29b-41d4-a716-446655440010", order: 0 },
        { cityId: "550e8400-e29b-41d4-a716-446655440011", order: 1 },
      ]
      const result = updateCandidateSchema.parse({
        id: validUuid,
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean@example.com",
        phone: "06 12 34 56 78",
        linkedinUrl: "https://linkedin.com/in/jeandupont",
        title: "Développeur",
        summary: "Bon profil",
        cities,
      })
      expect(result.firstName).toBe("Jean")
      expect(result.lastName).toBe("Dupont")
      expect(result.cities).toEqual(cities)
    })

    it("leaves cities untouched (undefined) when omitted — patch-semantics", () => {
      const result = updateCandidateSchema.parse({ id: validUuid })
      expect(result.cities).toBeUndefined()
    })

    it("rejects duplicate cityId in cities", () => {
      const duplicatedId = "550e8400-e29b-41d4-a716-446655440010"
      expect(() =>
        updateCandidateSchema.parse({
          id: validUuid,
          cities: [
            { cityId: duplicatedId, order: 0 },
            { cityId: duplicatedId, order: 1 },
          ],
        })
      ).toThrow()
    })

    it("accepts partial update (only some fields)", () => {
      const result = updateCandidateSchema.parse({
        id: validUuid,
        firstName: "Jean-Pierre",
      })
      expect(result.firstName).toBe("Jean-Pierre")
      expect(result.lastName).toBeUndefined()
    })

    it("validates email format when provided", () => {
      expect(() =>
        updateCandidateSchema.parse({
          id: validUuid,
          email: "invalid-email",
        })
      ).toThrow()
    })

    it("validates LinkedIn URL format when provided", () => {
      expect(() =>
        updateCandidateSchema.parse({
          id: validUuid,
          linkedinUrl: "https://example.com/profile",
        })
      ).toThrow()
    })

    it("validates phone format when provided", () => {
      expect(() =>
        updateCandidateSchema.parse({
          id: validUuid,
          phone: "123",
        })
      ).toThrow()
    })

    it("accepts valid summary", () => {
      const result = updateCandidateSchema.parse({
        id: validUuid,
        summary: "Un bon profil",
      })
      expect(result.id).toBe(validUuid)
      expect(result.summary).toBe("Un bon profil")
    })

    it("trims summary", () => {
      const result = updateCandidateSchema.parse({
        id: validUuid,
        summary: "  Résumé  ",
      })
      expect(result.summary).toBe("Résumé")
    })

    it("converts empty/whitespace summary to null", () => {
      expect(
        updateCandidateSchema.parse({ id: validUuid, summary: "" }).summary
      ).toBeNull()
      expect(
        updateCandidateSchema.parse({ id: validUuid, summary: "   " }).summary
      ).toBeNull()
    })

    it("leaves summary untouched (undefined) when omitted — patch-semantics", () => {
      expect(
        updateCandidateSchema.parse({ id: validUuid }).summary
      ).toBeUndefined()
    })

    it("clears optional contact fields with an empty string, keeps them when omitted", () => {
      const cleared = updateCandidateSchema.parse({
        id: validUuid,
        email: "",
        phone: "  ",
        linkedinUrl: "",
        title: "",
      })
      expect(cleared.email).toBeNull()
      expect(cleared.phone).toBeNull()
      expect(cleared.linkedinUrl).toBeNull()
      expect(cleared.title).toBeNull()

      const omitted = updateCandidateSchema.parse({ id: validUuid })
      expect(omitted.email).toBeUndefined()
      expect(omitted.title).toBeUndefined()
    })

    it("rejects summary exceeding 500 characters", () => {
      expect(() =>
        updateCandidateSchema.parse({ id: validUuid, summary: "a".repeat(501) })
      ).toThrow(/500/)
    })

    it("rejects invalid id", () => {
      expect(() =>
        updateCandidateSchema.parse({ id: "not-uuid", summary: "ok" })
      ).toThrow()
    })
  })

  describe("addLanguageSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000"

    it("accepts valid input for each level", () => {
      for (const level of LANGUAGE_LEVELS) {
        const result = addLanguageSchema.parse({
          candidateId: validUuid,
          name: "Français",
          level,
        })
        expect(result.level).toBe(level)
      }
    })

    it("rejects empty name", () => {
      expect(() =>
        addLanguageSchema.parse({
          candidateId: validUuid,
          name: "",
          level: "FLUENT",
        })
      ).toThrow()
    })

    it("rejects name exceeding 50 characters", () => {
      expect(() =>
        addLanguageSchema.parse({
          candidateId: validUuid,
          name: "a".repeat(51),
          level: "FLUENT",
        })
      ).toThrow()
    })

    it("rejects invalid level", () => {
      expect(() =>
        addLanguageSchema.parse({
          candidateId: validUuid,
          name: "Français",
          level: "EXPERT",
        })
      ).toThrow()
    })

    it("rejects missing level", () => {
      expect(() =>
        addLanguageSchema.parse({ candidateId: validUuid, name: "Français" })
      ).toThrow()
    })
  })

  describe("removeLanguageSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000"

    it("accepts valid input", () => {
      const result = removeLanguageSchema.parse({
        candidateId: validUuid,
        languageId: validUuid,
      })
      expect(result.candidateId).toBe(validUuid)
      expect(result.languageId).toBe(validUuid)
    })

    it("rejects invalid candidateId", () => {
      expect(() =>
        removeLanguageSchema.parse({
          candidateId: "bad",
          languageId: validUuid,
        })
      ).toThrow()
    })

    it("rejects invalid languageId", () => {
      expect(() =>
        removeLanguageSchema.parse({
          candidateId: validUuid,
          languageId: "bad",
        })
      ).toThrow()
    })
  })

  describe("createFileUploadUrlSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000"

    it("accepts every accepted mime type within the size limit", () => {
      for (const mimeType of PHOTO_ACCEPTED_MIMES) {
        expect(
          createFileUploadUrlSchema.parse({
            kind: "photo",
            candidateId: validUuid,
            mimeType,
            size: PHOTO_MAX_BYTES,
          }).mimeType
        ).toBe(mimeType)
      }
      for (const mimeType of CV_ACCEPTED_MIMES) {
        expect(
          createFileUploadUrlSchema.parse({
            kind: "cv",
            candidateId: validUuid,
            mimeType,
            size: CV_MAX_BYTES,
          }).mimeType
        ).toBe(mimeType)
      }
    })

    it("rejects a mime type of the other kind with the PRD message", () => {
      expect(() =>
        createFileUploadUrlSchema.parse({
          kind: "photo",
          candidateId: validUuid,
          mimeType: "application/pdf",
          size: 10,
        })
      ).toThrow(/Formats acceptés : JPG, PNG, WebP/)
      expect(() =>
        createFileUploadUrlSchema.parse({
          kind: "cv",
          candidateId: validUuid,
          mimeType: "text/plain",
          size: 10,
        })
      ).toThrow(/Formats acceptés : PDF, DOC, DOCX/)
    })

    it("rejects a file above the limit of its kind with the PRD message", () => {
      expect(() =>
        createFileUploadUrlSchema.parse({
          kind: "photo",
          candidateId: validUuid,
          mimeType: "image/jpeg",
          size: PHOTO_MAX_BYTES + 1,
        })
      ).toThrow(/Le fichier dépasse la taille maximale autorisée/)
      expect(() =>
        createFileUploadUrlSchema.parse({
          kind: "cv",
          candidateId: validUuid,
          mimeType: "application/pdf",
          size: CV_MAX_BYTES + 1,
        })
      ).toThrow(/Le fichier dépasse la taille maximale autorisée/)
    })

    it("rejects an empty file and a non-uuid candidate", () => {
      expect(() =>
        createFileUploadUrlSchema.parse({
          kind: "cv",
          candidateId: validUuid,
          mimeType: "application/pdf",
          size: 0,
        })
      ).toThrow()
      expect(() =>
        createFileUploadUrlSchema.parse({
          kind: "cv",
          candidateId: "not-a-uuid",
          mimeType: "application/pdf",
          size: 10,
        })
      ).toThrow()
    })
  })

  describe("confirmFileUploadSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000"

    it("requires a file name for a CV only", () => {
      expect(
        confirmFileUploadSchema.parse({
          kind: "photo",
          candidateId: validUuid,
          path: "a/b.jpg",
        }).kind
      ).toBe("photo")
      expect(() =>
        confirmFileUploadSchema.parse({
          kind: "cv",
          candidateId: validUuid,
          path: "a/b.pdf",
        })
      ).toThrow()
    })
  })
})
