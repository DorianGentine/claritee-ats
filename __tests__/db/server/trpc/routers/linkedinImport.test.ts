import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";
import { LinkedInImportError } from "@/server/linkedin/apify";

const connectionString = process.env.DATABASE_URL;

// Seul l'appel réseau est simulé : la conversion du profil reste la vraie.
const { fetchProfile } = vi.hoisted(() => ({
  fetchProfile: vi.fn<(url: string) => Promise<unknown>>(),
}));

vi.mock("@/server/linkedin/apify", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/linkedin/apify")>();
  const { mapSupremeCoderProfile } = await import("@/lib/linkedin/profile");
  return {
    ...original,
    isLinkedInImportConfigured: () => true,
    fetchLinkedInProfile: async (url: string) => {
      const rawProfile = await fetchProfile(url);
      return { rawProfile, draft: mapSupremeCoderProfile(rawProfile, url) };
    },
  };
});

/** Format de sortie de supreme_coder/linkedin-profile-scraper */
const linkedInProfile = {
  firstName: "Jeanne",
  lastName: "Martin",
  publicIdentifier: "Jeanne-Martin-42",
  headline: "Responsable RH",
  positions: [
    {
      title: "Responsable RH",
      company: { name: "Acme" },
      timePeriod: { startDate: { month: 3, year: 2021 }, endDate: null },
    },
  ],
};

describe.runIf(!!connectionString)("linkedinImport", () => {
  let db: PrismaClient;
  let companyAId: string;
  let companyBId: string;
  // Utilisateur distinct par test : la limite d'import est par utilisateur
  let userCounter = 0;

  const createCaller = (companyId: string | null) =>
    appRouter.createCaller({
      db,
      user: companyId ? { id: `linkedin-user-${userCounter}`, email: "a@test.com" } : null,
      companyId,
      headers: new Headers(),
    } as unknown as Context);

  beforeAll(async () => {
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const [companyA, companyB] = await Promise.all([
      db.company.create({
        data: { name: "LinkedIn Import A", siren: `7${Date.now().toString().slice(-8)}` },
      }),
      db.company.create({
        data: { name: "LinkedIn Import B", siren: `6${Date.now().toString().slice(-8)}` },
      }),
    ]);
    companyAId = companyA.id;
    companyBId = companyB.id;
  });

  afterAll(async () => {
    await db.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    await db.$disconnect();
  });

  beforeEach(() => {
    userCounter += 1;
    fetchProfile.mockReset();
  });

  it("status: reports the import as enabled when configured", async () => {
    await expect(createCaller(companyAId).linkedinImport.status()).resolves.toEqual({
      enabled: true,
    });
  });

  it("preview: returns the draft without creating anything", async () => {
    fetchProfile.mockResolvedValue(linkedInProfile);
    const countBefore = await db.candidate.count({ where: { companyId: companyAId } });

    const result = await createCaller(companyAId).linkedinImport.preview({
      linkedinUrl: "https://www.linkedin.com/in/jeanne-martin-42/",
    });

    expect(fetchProfile).toHaveBeenCalledWith("https://www.linkedin.com/in/jeanne-martin-42/");
    expect(result.draft).toMatchObject({
      firstName: "Jeanne",
      lastName: "Martin",
      title: "Responsable RH",
      experiences: [{ company: "Acme", startDate: "2021-03-01", endDate: null }],
    });
    expect(result.duplicate).toBeNull();
    expect(await db.candidate.count({ where: { companyId: companyAId } })).toBe(countBefore);
  });

  it("preview: flags an existing candidate of the same company with the same profile", async () => {
    fetchProfile.mockResolvedValue(linkedInProfile);
    const [existing, otherCompany] = await Promise.all([
      db.candidate.create({
        data: {
          firstName: "Jeanne",
          lastName: "M.",
          companyId: companyAId,
          linkedinUrl: "https://linkedin.com/in/jeanne-martin-42?trk=x",
        },
      }),
      db.candidate.create({
        data: {
          firstName: "Jeanne",
          lastName: "Autre cabinet",
          companyId: companyBId,
          linkedinUrl: "https://www.linkedin.com/in/jeanne-martin-42",
        },
      }),
    ]);

    const resultA = await createCaller(companyAId).linkedinImport.preview({
      linkedinUrl: "https://www.linkedin.com/in/jeanne-martin-42",
    });
    expect(resultA.duplicate).toEqual({ id: existing.id, firstName: "Jeanne", lastName: "M." });

    await db.candidate.delete({ where: { id: existing.id } });
    userCounter += 1;
    const resultAfterDelete = await createCaller(companyAId).linkedinImport.preview({
      linkedinUrl: "https://www.linkedin.com/in/jeanne-martin-42",
    });
    // Le candidat de l'autre cabinet n'est jamais signalé
    expect(resultAfterDelete.duplicate).toBeNull();

    await db.candidate.delete({ where: { id: otherCompany.id } });
  });

  it("preview: rejects a URL that is not a LinkedIn profile", async () => {
    await expect(
      createCaller(companyAId).linkedinImport.preview({ linkedinUrl: "https://example.com/in/x" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it("preview: maps provider failures to user-facing errors", async () => {
    fetchProfile.mockRejectedValueOnce(new LinkedInImportError("PROFILE_NOT_FOUND", "vide"));
    await expect(
      createCaller(companyAId).linkedinImport.preview({
        linkedinUrl: "https://www.linkedin.com/in/ghost",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    fetchProfile.mockRejectedValueOnce(new LinkedInImportError("PROVIDER_ERROR", "HTTP 500"));
    await expect(
      createCaller(companyAId).linkedinImport.preview({
        linkedinUrl: "https://www.linkedin.com/in/ghost",
      })
    ).rejects.toMatchObject({ code: "BAD_GATEWAY" });

    fetchProfile.mockResolvedValueOnce({ error: "Profile is private" });
    await expect(
      createCaller(companyAId).linkedinImport.preview({
        linkedinUrl: "https://www.linkedin.com/in/ghost",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("preview: requires authentication", async () => {
    await expect(
      createCaller(null).linkedinImport.preview({
        linkedinUrl: "https://www.linkedin.com/in/jeanne-martin-42",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
