import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";
import { PHOTO_MAX_BYTES } from "@/lib/validations/candidate";

const connectionString = process.env.DATABASE_URL;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: (path: string) => ({
          data: {
            publicUrl: `https://storage.example.com/photos/${path}`,
          },
        }),
      }),
    },
  }),
}));

describe.runIf(!!connectionString)("candidate", () => {
  let db: PrismaClient;
  let companyAId: string;
  let companyBId: string;
  let candidateA1Id: string;
  let candidateA2Id: string;
  let candidateB1Id: string;

  const createContext = (companyId: string | null): Context =>
    ({
      db,
      user: companyId ? { id: "test-user", email: "admin@test.com" } : null,
      companyId,
      headers: new Headers(),
    }) as unknown as Context;

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: connectionString! });
    db = new PrismaClient({ adapter });

    const [companyA, companyB] = await Promise.all([
      db.company.create({
        data: {
          name: "Test Company A Candidates",
          siren: `9${Date.now().toString().slice(-8)}`,
        },
      }),
      db.company.create({
        data: {
          name: "Test Company B Candidates",
          siren: `8${Date.now().toString().slice(-8)}`,
        },
      }),
    ]);
    companyAId = companyA.id;
    companyBId = companyB.id;

    const [cA1, cA2, cB1] = await Promise.all([
      db.candidate.create({
        data: {
          firstName: "Alice",
          lastName: "A1",
          companyId: companyAId,
          title: "Dev",
          city: "Paris",
        },
      }),
      db.candidate.create({
        data: {
          firstName: "Bob",
          lastName: "A2",
          companyId: companyAId,
          title: "Designer",
          city: "Lyon",
        },
      }),
      db.candidate.create({
        data: {
          firstName: "Charlie",
          lastName: "B1",
          companyId: companyBId,
          title: "PM",
          city: "Marseille",
        },
      }),
    ]);
    candidateA1Id = cA1.id;
    candidateA2Id = cA2.id;
    candidateB1Id = cB1.id;
  });

  afterAll(async () => {
    await db.candidate.deleteMany({
      where: {
        id: { in: [candidateA1Id, candidateA2Id, candidateB1Id] },
      },
    });
    await db.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    });
    await db.$disconnect();
  });

  it("list: returns only candidates for the caller company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.candidate.list({ limit: 20 });

    expect(result.items).toHaveLength(2);
    const ids = result.items.map((c) => c.id).sort();
    expect(ids).toEqual([candidateA1Id, candidateA2Id].sort());
    expect(result.items.some((c) => c.id === candidateB1Id)).toBe(false);
  });

  it("list: returns items sorted by createdAt desc", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.candidate.list({ limit: 20 });

    expect(result.items.length).toBeGreaterThanOrEqual(2);
    const [cA1, cA2] = await Promise.all([
      db.candidate.findUniqueOrThrow({ where: { id: candidateA1Id } }),
      db.candidate.findUniqueOrThrow({ where: { id: candidateA2Id } }),
    ]);
    const expectedOrder =
      cA1.createdAt.getTime() >= cA2.createdAt.getTime()
        ? [cA1.id, cA2.id]
        : [cA2.id, cA1.id];
    expect(result.items[0].id).toBe(expectedOrder[0]);
    expect(result.items[1].id).toBe(expectedOrder[1]);
  });

  it("list: pagination returns nextCursor and hasMore when more than limit", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const page1 = await caller.candidate.list({ limit: 1 });
    expect(page1.items).toHaveLength(1);
    expect(page1.nextCursor).not.toBeNull();
    expect(page1.hasMore).toBe(true);

    const page2 = await caller.candidate.list({
      limit: 1,
      cursor: page1.nextCursor!,
    });
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].id).not.toBe(page1.items[0].id);
  });

  it("list: throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.candidate.list({ limit: 20 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("create: creates candidate with caller companyId and returns id", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.candidate.create({
      firstName: "New",
      lastName: "Candidate",
      email: "new@test.com",
      phone: "06 11 22 33 44",
      title: "QA",
      city: "Lille",
    });

    expect(result.id).toBeDefined();
    expect(result.firstName).toBe("New");
    expect(result.lastName).toBe("Candidate");
    expect(result.companyId).toBe(companyAId);

    const inDb = await db.candidate.findUniqueOrThrow({
      where: { id: result.id },
    });
    expect(inDb.companyId).toBe(companyAId);
    expect(inDb.email).toBe("new@test.com");
    expect(inDb.phone).toBe("06 11 22 33 44");
    expect(inDb.title).toBe("QA");
    expect(inDb.city).toBe("Lille");

    await db.candidate.delete({ where: { id: result.id } });
  });

  it("create: does not allow creating candidate for another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.candidate.create({
      firstName: "Scoped",
      lastName: "User",
    });

    expect(result.companyId).toBe(companyAId);
    const inDb = await db.candidate.findUniqueOrThrow({
      where: { id: result.id },
    });
    expect(inDb.companyId).toBe(companyAId);

    await db.candidate.delete({ where: { id: result.id } });
  });

  it("create: throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.candidate.create({ firstName: "X", lastName: "Y" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  /** Minimal valid JPEG (magic bytes FF D8 FF) */
  const minimalJpegBase64 = Buffer.from([
    0xff, 0xd8, 0xff, ...Array(20).fill(0),
  ]).toString("base64");

  it("uploadPhoto: updates Candidate.photoUrl after upload", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.candidate.uploadPhoto({
      candidateId: candidateA1Id,
      fileBase64: minimalJpegBase64,
      mimeType: "image/jpeg",
    });

    expect(result.photoUrl).toContain(
      `https://storage.example.com/photos/${companyAId}/candidates/${candidateA1Id}/photo.jpg`,
    );

    const inDb = await db.candidate.findUniqueOrThrow({
      where: { id: candidateA1Id },
    });
    expect(inDb.photoUrl).toBe(result.photoUrl);

    await db.candidate.update({
      where: { id: candidateA1Id },
      data: { photoUrl: null },
    });
  });

  it("uploadPhoto: rejects file exceeding 2 MB with PRD message", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);
    const oversizedBuffer = Buffer.alloc(PHOTO_MAX_BYTES + 1, "x");
    const oversizedBase64 = oversizedBuffer.toString("base64");

    await expect(
      caller.candidate.uploadPhoto({
        candidateId: candidateA1Id,
        fileBase64: oversizedBase64,
        mimeType: "image/jpeg",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining(
        "Le fichier dépasse la taille maximale autorisée (2 Mo pour les photos, 5 Mo pour les CVs)",
      ),
    });
  });

  it("uploadPhoto: rejects invalid mime type with PRD message", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);
    const smallBase64 = Buffer.from("x").toString("base64");

    await expect(
      caller.candidate.uploadPhoto({
        candidateId: candidateA1Id,
        fileBase64: smallBase64,
        mimeType: "image/gif" as "image/jpeg",
      }),
    ).rejects.toThrow(/Format de fichier non supporté/);
  });

  it("uploadPhoto: throws NOT_FOUND when candidate belongs to another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.candidate.uploadPhoto({
        candidateId: candidateB1Id,
        fileBase64: minimalJpegBase64,
        mimeType: "image/jpeg",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("uploadPhoto: rejects file with content not matching declared mime type", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);
    const notJpegBase64 = Buffer.from("not a jpeg").toString("base64");

    await expect(
      caller.candidate.uploadPhoto({
        candidateId: candidateA1Id,
        fileBase64: notJpegBase64,
        mimeType: "image/jpeg",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("Format de fichier non supporté"),
    });
  });

  it("getById: returns candidate with relations for own company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.candidate.getById({ id: candidateA1Id });

    expect(result.id).toBe(candidateA1Id);
    expect(result.firstName).toBe("Alice");
    expect(result.lastName).toBe("A1");
    expect(result.companyId).toBe(companyAId);
    expect(result.title).toBe("Dev");
    expect(result.city).toBe("Paris");
    expect(Array.isArray(result.experiences)).toBe(true);
    expect(Array.isArray(result.formations)).toBe(true);
    expect(Array.isArray(result.languages)).toBe(true);
    expect(Array.isArray(result.tags)).toBe(true);
  });

  it("getById: throws NOT_FOUND when candidate belongs to another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.candidate.getById({ id: candidateB1Id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("getById: throws NOT_FOUND for non-existent id", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);
    const fakeId = "00000000-0000-0000-0000-000000000000";

    await expect(
      caller.candidate.getById({ id: fakeId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("delete: removes candidate and respects companyId", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.candidate.create({
      firstName: "ToDelete",
      lastName: "User",
    });
    expect(created.id).toBeDefined();

    const result = await caller.candidate.delete({ id: created.id });
    expect(result.success).toBe(true);

    const inDb = await db.candidate.findUnique({
      where: { id: created.id },
    });
    expect(inDb).toBeNull();
  });

  it("delete: throws NOT_FOUND when candidate belongs to another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.candidate.delete({ id: candidateB1Id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const stillExists = await db.candidate.findUnique({
      where: { id: candidateB1Id },
    });
    expect(stillExists).not.toBeNull();
  });

  // ─── update (summary) ───

  it("update: updates summary for own candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.candidate.update({
      id: candidateA1Id,
      summary: "Développeur full-stack senior",
    });

    expect(result.summary).toBe("Développeur full-stack senior");

    const inDb = await db.candidate.findUniqueOrThrow({
      where: { id: candidateA1Id },
    });
    expect(inDb.summary).toBe("Développeur full-stack senior");

    await db.candidate.update({
      where: { id: candidateA1Id },
      data: { summary: null },
    });
  });

  it("update: clears summary when empty string sent", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await caller.candidate.update({
      id: candidateA1Id,
      summary: "Temp",
    });

    const result = await caller.candidate.update({
      id: candidateA1Id,
      summary: "",
    });

    expect(result.summary).toBeNull();
  });

  it("update: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.candidate.update({ id: candidateB1Id, summary: "Nope" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  // ─── addLanguage / removeLanguage ───

  it("addLanguage: adds language to own candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const lang = await caller.candidate.addLanguage({
      candidateId: candidateA1Id,
      name: "Français",
      level: "NATIVE",
    });

    expect(lang.id).toBeDefined();
    expect(lang.name).toBe("Français");
    expect(lang.level).toBe("NATIVE");
    expect(lang.candidateId).toBe(candidateA1Id);

    await db.language.delete({ where: { id: lang.id } });
  });

  it("addLanguage: trims language name", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const lang = await caller.candidate.addLanguage({
      candidateId: candidateA1Id,
      name: "  Anglais  ",
      level: "FLUENT",
    });

    expect(lang.name).toBe("Anglais");
    await db.language.delete({ where: { id: lang.id } });
  });

  it("addLanguage: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.candidate.addLanguage({
        candidateId: candidateB1Id,
        name: "Français",
        level: "NATIVE",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("removeLanguage: removes language from own candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const lang = await db.language.create({
      data: { candidateId: candidateA1Id, name: "Espagnol", level: "NOTION" },
    });

    const result = await caller.candidate.removeLanguage({
      candidateId: candidateA1Id,
      languageId: lang.id,
    });

    expect(result.success).toBe(true);

    const inDb = await db.language.findUnique({ where: { id: lang.id } });
    expect(inDb).toBeNull();
  });

  it("removeLanguage: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const lang = await db.language.create({
      data: { candidateId: candidateB1Id, name: "Allemand", level: "INTERMEDIATE" },
    });

    await expect(
      caller.candidate.removeLanguage({
        candidateId: candidateB1Id,
        languageId: lang.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.language.delete({ where: { id: lang.id } });
  });

  it("removeLanguage: throws NOT_FOUND if language does not belong to candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const lang = await db.language.create({
      data: { candidateId: candidateA2Id, name: "Italien", level: "NOTION" },
    });

    await expect(
      caller.candidate.removeLanguage({
        candidateId: candidateA1Id,
        languageId: lang.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.language.delete({ where: { id: lang.id } });
  });

  // ─── addExperience / updateExperience / deleteExperience ───

  it("addExperience: adds experience to own candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date("2022-06-01");
    const endDate = new Date("2024-03-01");

    const exp = await caller.candidate.addExperience({
      candidateId: candidateA1Id,
      title: "Développeur",
      company: "Acme",
      startDate,
      endDate,
      description: "Mission principale",
    });

    expect(exp.id).toBeDefined();
    expect(exp.title).toBe("Développeur");
    expect(exp.company).toBe("Acme");
    expect(new Date(exp.startDate).toISOString()).toBe(startDate.toISOString());
    expect(exp.endDate).not.toBeNull();
    expect(exp.description).toBe("Mission principale");

    await db.experience.delete({ where: { id: exp.id } });
  });

  it("addExperience: allows null endDate (current job)", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const exp = await caller.candidate.addExperience({
      candidateId: candidateA1Id,
      title: "Lead Dev",
      company: "Beta",
      startDate: new Date("2023-01-01"),
      endDate: null,
      description: null,
    });

    expect(exp.endDate).toBeNull();
    expect(exp.description).toBeNull();
    await db.experience.delete({ where: { id: exp.id } });
  });

  it("addExperience: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.candidate.addExperience({
        candidateId: candidateB1Id,
        title: "Dev",
        company: "Other",
        startDate: new Date("2020-01-01"),
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updateExperience: updates experience of own candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const exp = await db.experience.create({
      data: {
        candidateId: candidateA1Id,
        title: "Stagiaire",
        company: "Gamma",
        startDate: new Date("2021-06-01"),
        endDate: new Date("2021-08-01"),
      },
    });

    const updated = await caller.candidate.updateExperience({
      candidateId: candidateA1Id,
      experienceId: exp.id,
      title: "Développeur stagiaire",
      company: "Gamma Corp",
    });

    expect(updated.title).toBe("Développeur stagiaire");
    expect(updated.company).toBe("Gamma Corp");
    await db.experience.delete({ where: { id: exp.id } });
  });

  it("updateExperience: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const exp = await db.experience.create({
      data: {
        candidateId: candidateB1Id,
        title: "Dev",
        company: "Other",
        startDate: new Date("2020-01-01"),
      },
    });

    await expect(
      caller.candidate.updateExperience({
        candidateId: candidateB1Id,
        experienceId: exp.id,
        title: "Updated",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.experience.delete({ where: { id: exp.id } });
  });

  it("updateExperience: throws NOT_FOUND if experience does not belong to candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const exp = await db.experience.create({
      data: {
        candidateId: candidateA2Id,
        title: "Designer",
        company: "Studio",
        startDate: new Date("2022-01-01"),
      },
    });

    await expect(
      caller.candidate.updateExperience({
        candidateId: candidateA1Id,
        experienceId: exp.id,
        title: "Hacked",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.experience.delete({ where: { id: exp.id } });
  });

  it("deleteExperience: removes experience of own candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const exp = await db.experience.create({
      data: {
        candidateId: candidateA1Id,
        title: "To Delete",
        company: "Tmp",
        startDate: new Date("2020-01-01"),
      },
    });

    const result = await caller.candidate.deleteExperience({
      candidateId: candidateA1Id,
      experienceId: exp.id,
    });

    expect(result.success).toBe(true);
    const inDb = await db.experience.findUnique({ where: { id: exp.id } });
    expect(inDb).toBeNull();
  });

  it("deleteExperience: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const exp = await db.experience.create({
      data: {
        candidateId: candidateB1Id,
        title: "Dev",
        company: "Other",
        startDate: new Date("2020-01-01"),
      },
    });

    await expect(
      caller.candidate.deleteExperience({
        candidateId: candidateB1Id,
        experienceId: exp.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.experience.delete({ where: { id: exp.id } });
  });

  it("deleteExperience: throws NOT_FOUND if experience does not belong to candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const exp = await db.experience.create({
      data: {
        candidateId: candidateA2Id,
        title: "Designer",
        company: "Studio",
        startDate: new Date("2022-01-01"),
      },
    });

    await expect(
      caller.candidate.deleteExperience({
        candidateId: candidateA1Id,
        experienceId: exp.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.experience.delete({ where: { id: exp.id } });
  });

  it("getById: returns experiences ordered by startDate desc", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const [e1, e2] = await Promise.all([
      db.experience.create({
        data: {
          candidateId: candidateA1Id,
          title: "First",
          company: "A",
          startDate: new Date("2020-01-01"),
          endDate: new Date("2021-12-01"),
        },
      }),
      db.experience.create({
        data: {
          candidateId: candidateA1Id,
          title: "Second",
          company: "B",
          startDate: new Date("2023-06-01"),
          endDate: null,
        },
      }),
    ]);

    const result = await caller.candidate.getById({ id: candidateA1Id });
    expect(result.experiences).toHaveLength(2);
    expect(result.experiences[0].title).toBe("Second");
    expect(result.experiences[1].title).toBe("First");

    await db.experience.deleteMany({ where: { id: { in: [e1.id, e2.id] } } });
  });

  // ─── addFormation / updateFormation / deleteFormation ───

  it("addFormation: adds formation to own candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date("2018-09-01");
    const endDate = new Date("2020-06-01");

    const form = await caller.candidate.addFormation({
      candidateId: candidateA1Id,
      degree: "Master Informatique",
      field: "Systèmes distribués",
      school: "HEC Paris",
      startDate,
      endDate,
    });

    expect(form.id).toBeDefined();
    expect(form.degree).toBe("Master Informatique");
    expect(form.field).toBe("Systèmes distribués");
    expect(form.school).toBe("HEC Paris");
    expect(new Date(form.startDate!).toISOString()).toBe(startDate.toISOString());
    expect(new Date(form.endDate!).toISOString()).toBe(endDate.toISOString());

    await db.formation.delete({ where: { id: form.id } });
  });

  it("addFormation: allows optional dates and field", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const form = await caller.candidate.addFormation({
      candidateId: candidateA1Id,
      degree: "Licence",
      school: "Université Paris-Saclay",
      field: null,
      startDate: null,
      endDate: null,
    });

    expect(form.startDate).toBeNull();
    expect(form.endDate).toBeNull();
    expect(form.field).toBeNull();
    await db.formation.delete({ where: { id: form.id } });
  });

  it("addFormation: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.candidate.addFormation({
        candidateId: candidateB1Id,
        degree: "MBA",
        school: "INSEAD",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updateFormation: updates formation of own candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const form = await db.formation.create({
      data: {
        candidateId: candidateA1Id,
        degree: "BTS",
        school: "Lycée X",
        startDate: new Date("2015-09-01"),
        endDate: new Date("2017-06-01"),
      },
    });

    const updated = await caller.candidate.updateFormation({
      candidateId: candidateA1Id,
      formationId: form.id,
      degree: "BTS SIO",
      school: "Lycée Y",
    });

    expect(updated.degree).toBe("BTS SIO");
    expect(updated.school).toBe("Lycée Y");
    await db.formation.delete({ where: { id: form.id } });
  });

  it("updateFormation: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const form = await db.formation.create({
      data: {
        candidateId: candidateB1Id,
        degree: "PhD",
        school: "MIT",
      },
    });

    await expect(
      caller.candidate.updateFormation({
        candidateId: candidateB1Id,
        formationId: form.id,
        degree: "PhD CS",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.formation.delete({ where: { id: form.id } });
  });

  it("updateFormation: throws NOT_FOUND if formation does not belong to candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const form = await db.formation.create({
      data: {
        candidateId: candidateA2Id,
        degree: "Master",
        school: "ESSEC",
      },
    });

    await expect(
      caller.candidate.updateFormation({
        candidateId: candidateA1Id,
        formationId: form.id,
        degree: "Hacked",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.formation.delete({ where: { id: form.id } });
  });

  it("deleteFormation: removes formation of own candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const form = await db.formation.create({
      data: {
        candidateId: candidateA1Id,
        degree: "To Delete",
        school: "Tmp School",
      },
    });

    const result = await caller.candidate.deleteFormation({
      candidateId: candidateA1Id,
      formationId: form.id,
    });

    expect(result.success).toBe(true);
    const inDb = await db.formation.findUnique({ where: { id: form.id } });
    expect(inDb).toBeNull();
  });

  it("deleteFormation: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const form = await db.formation.create({
      data: {
        candidateId: candidateB1Id,
        degree: "MBA",
        school: "HEC",
      },
    });

    await expect(
      caller.candidate.deleteFormation({
        candidateId: candidateB1Id,
        formationId: form.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.formation.delete({ where: { id: form.id } });
  });

  it("deleteFormation: throws NOT_FOUND if formation does not belong to candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const form = await db.formation.create({
      data: {
        candidateId: candidateA2Id,
        degree: "Master",
        school: "ESSEC",
      },
    });

    await expect(
      caller.candidate.deleteFormation({
        candidateId: candidateA1Id,
        formationId: form.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.formation.delete({ where: { id: form.id } });
  });

  it("getById: returns formations ordered by startDate desc", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const [f1, f2] = await Promise.all([
      db.formation.create({
        data: {
          candidateId: candidateA1Id,
          degree: "Licence",
          school: "Paris 6",
          startDate: new Date("2012-09-01"),
          endDate: new Date("2015-06-01"),
        },
      }),
      db.formation.create({
        data: {
          candidateId: candidateA1Id,
          degree: "Master",
          school: "Paris 9",
          startDate: new Date("2016-09-01"),
          endDate: new Date("2018-06-01"),
        },
      }),
    ]);

    const result = await caller.candidate.getById({ id: candidateA1Id });
    expect(result.formations).toHaveLength(2);
    expect(result.formations[0].degree).toBe("Master");
    expect(result.formations[1].degree).toBe("Licence");

    await db.formation.deleteMany({ where: { id: { in: [f1.id, f2.id] } } });
  });

  // ─── addTag / removeTag ───

  it("addTag: creates new tag and links to candidate when tag does not exist", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.candidate.addTag({
      candidateId: candidateA1Id,
      tagName: "Python",
    });

    expect(result.tag.id).toBeDefined();
    expect(result.tag.name).toBe("Python");
    expect(result.tag.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.tag.companyId).toBe(companyAId);

    const inDb = await db.candidateTag.findUnique({
      where: {
        candidateId_tagId: {
          candidateId: candidateA1Id,
          tagId: result.tag.id,
        },
      },
    });
    expect(inDb).not.toBeNull();

    await db.candidateTag.delete({
      where: {
        candidateId_tagId: {
          candidateId: candidateA1Id,
          tagId: result.tag.id,
        },
      },
    });
    await db.tag.delete({ where: { id: result.tag.id } });
  });

  it("addTag: returns tag when candidate already has this tag (idempotent)", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const tag = await db.tag.create({
      data: {
        name: `Idempotent-${Date.now()}`,
        color: "#9B8BA8",
        companyId: companyAId,
      },
    });
    await db.candidateTag.create({
      data: { candidateId: candidateA1Id, tagId: tag.id },
    });

    const result = await caller.candidate.addTag({
      candidateId: candidateA1Id,
      tagName: tag.name,
    });

    expect(result.tag.id).toBe(tag.id);
    const linkCount = await db.candidateTag.count({
      where: { candidateId: candidateA1Id, tagId: tag.id },
    });
    expect(linkCount).toBe(1);

    await db.candidateTag.delete({
      where: {
        candidateId_tagId: { candidateId: candidateA1Id, tagId: tag.id },
      },
    });
    await db.tag.delete({ where: { id: tag.id } });
  });

  it("addTag: reuses existing tag when tag exists for company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const existingTag = await db.tag.create({
      data: {
        name: "React",
        color: "#9B8BA8",
        companyId: companyAId,
      },
    });

    const result = await caller.candidate.addTag({
      candidateId: candidateA1Id,
      tagName: "React",
    });

    expect(result.tag.id).toBe(existingTag.id);
    expect(result.tag.name).toBe("React");

    const count = await db.tag.count({
      where: { name: "React", companyId: companyAId },
    });
    expect(count).toBe(1);

    await db.candidateTag.delete({
      where: {
        candidateId_tagId: {
          candidateId: candidateA1Id,
          tagId: existingTag.id,
        },
      },
    });
    await db.tag.delete({ where: { id: existingTag.id } });
  });

  it("addTag: trims tagName", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.candidate.addTag({
      candidateId: candidateA1Id,
      tagName: "  TypeScript  ",
    });

    expect(result.tag.name).toBe("TypeScript");

    await db.candidateTag.delete({
      where: {
        candidateId_tagId: {
          candidateId: candidateA1Id,
          tagId: result.tag.id,
        },
      },
    });
    await db.tag.delete({ where: { id: result.tag.id } });
  });

  it("addTag: throws BAD_REQUEST when candidate has 20 tags", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const tags = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        db.tag.create({
          data: {
            name: `Tag-${i}-${Date.now()}`,
            color: "#D4A5A5",
            companyId: companyAId,
          },
        }),
      ),
    );
    await db.candidateTag.createMany({
      data: tags.map((t) => ({
        candidateId: candidateA1Id,
        tagId: t.id,
      })),
    });

    await expect(
      caller.candidate.addTag({
        candidateId: candidateA1Id,
        tagName: "Extra",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "Maximum 20 tags par élément. Supprimez un tag existant pour en ajouter un nouveau.",
    });

    await db.candidateTag.deleteMany({
      where: { candidateId: candidateA1Id, tagId: { in: tags.map((t) => t.id) } },
    });
    await db.tag.deleteMany({
      where: { id: { in: tags.map((t) => t.id) } },
    });
  });

  it("addTag: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.candidate.addTag({
        candidateId: candidateB1Id,
        tagName: "Python",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("removeTag: removes tag from candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const tag = await db.tag.create({
      data: {
        name: `ToRemove-${Date.now()}`,
        color: "#D4A5A5",
        companyId: companyAId,
      },
    });
    await db.candidateTag.create({
      data: { candidateId: candidateA1Id, tagId: tag.id },
    });

    const result = await caller.candidate.removeTag({
      candidateId: candidateA1Id,
      tagId: tag.id,
    });

    expect(result.success).toBe(true);

    const inDb = await db.candidateTag.findUnique({
      where: {
        candidateId_tagId: { candidateId: candidateA1Id, tagId: tag.id },
      },
    });
    expect(inDb).toBeNull();

    await db.tag.delete({ where: { id: tag.id } });
  });

  it("removeTag: throws NOT_FOUND for candidate of another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const tag = await db.tag.create({
      data: {
        name: `CompanyB-${Date.now()}`,
        color: "#D4A5A5",
        companyId: companyBId,
      },
    });
    await db.candidateTag.create({
      data: { candidateId: candidateB1Id, tagId: tag.id },
    });

    await expect(
      caller.candidate.removeTag({
        candidateId: candidateB1Id,
        tagId: tag.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.candidateTag.delete({
      where: {
        candidateId_tagId: { candidateId: candidateB1Id, tagId: tag.id },
      },
    });
    await db.tag.delete({ where: { id: tag.id } });
  });

  it("removeTag: throws NOT_FOUND when tag is not linked to candidate", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const tag = await db.tag.create({
      data: {
        name: `Orphan-${Date.now()}`,
        color: "#D4A5A5",
        companyId: companyAId,
      },
    });

    await expect(
      caller.candidate.removeTag({
        candidateId: candidateA1Id,
        tagId: tag.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.tag.delete({ where: { id: tag.id } });
  });
});
