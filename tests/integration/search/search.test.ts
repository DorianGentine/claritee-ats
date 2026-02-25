import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

describe.runIf(!!connectionString)("search", () => {
  let db: PrismaClient;
  let companyAId: string;
  let companyBId: string;
  let candidateA1Id: string;
  let candidateA2Id: string;
  let candidateB1Id: string;
  let offerAId: string;
  let tagId: string;

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
          name: "Test Company A Search",
          siren: `9${Date.now().toString().slice(-8)}`,
        },
      }),
      db.company.create({
        data: {
          name: "Test Company B Search",
          siren: `8${Date.now().toString().slice(-8)}`,
        },
      }),
    ]);
    companyAId = companyA.id;
    companyBId = companyB.id;

    const tag = await db.tag.create({
      data: {
        name: "React",
        color: "#61dafb",
        companyId: companyAId,
      },
    });
    tagId = tag.id;

    const clientCompany = await db.clientCompany.create({
      data: {
        name: "Acme Corp",
        companyId: companyAId,
      },
    });

    const [cA1, cA2, cB1] = await Promise.all([
      db.candidate.create({
        data: {
          firstName: "Alice",
          lastName: "Dupont",
          companyId: companyAId,
          title: "Développeuse React",
          city: "Paris",
          summary: "Expert React et TypeScript",
        },
      }),
      db.candidate.create({
        data: {
          firstName: "Bob",
          lastName: "Martin",
          companyId: companyAId,
          title: "Designer",
          city: "Lyon",
        },
      }),
      db.candidate.create({
        data: {
          firstName: "Charlie",
          lastName: "Other",
          companyId: companyBId,
          title: "PM",
          city: "Marseille",
        },
      }),
    ]);
    candidateA1Id = cA1.id;
    candidateA2Id = cA2.id;
    candidateB1Id = cB1.id;

    await db.candidateTag.create({
      data: { candidateId: candidateA1Id, tagId },
    });

    await db.language.create({
      data: {
        candidateId: candidateA1Id,
        name: "Anglais",
        level: "FLUENT",
      },
    });

    const startDate = new Date("2020-01-01");
    const endDate = new Date("2022-06-30");
    await db.experience.create({
      data: {
        candidateId: candidateA1Id,
        title: "Développeur Full Stack",
        company: "TechCorp",
        startDate,
        endDate,
      },
    });

    await db.formation.create({
      data: {
        candidateId: candidateA1Id,
        degree: "MBA",
        field: "Management",
        school: "HEC Paris",
        startDate,
        endDate,
      },
    });

    const offer = await db.jobOffer.create({
      data: {
        title: "Développeur React Senior",
        description:
          "Nous recherchons un expert React pour notre équipe produit.",
        companyId: companyAId,
        clientCompanyId: clientCompany.id,
      },
    });
    offerAId = offer.id;
  });

  afterAll(async () => {
    await db.experience.deleteMany({
      where: { candidateId: candidateA1Id },
    });
    await db.formation.deleteMany({
      where: { candidateId: candidateA1Id },
    });
    await db.language.deleteMany({
      where: { candidateId: candidateA1Id },
    });
    await db.candidateTag.deleteMany({
      where: { candidateId: candidateA1Id },
    });
    await db.jobOffer.deleteMany({
      where: { id: offerAId },
    });
    await db.clientCompany.deleteMany({
      where: { companyId: companyAId },
    });
    await db.candidate.deleteMany({
      where: {
        id: { in: [candidateA1Id, candidateA2Id, candidateB1Id] },
      },
    });
    await db.tag.deleteMany({
      where: { id: tagId },
    });
    await db.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    });
    await db.$disconnect();
  });

  it("search: returns only candidates and offers for the caller company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "Développeur" });

    const candidateIds = result.candidates.map((c) => c.id);
    expect(candidateIds).toContain(candidateA1Id);
    expect(candidateIds).not.toContain(candidateB1Id);

    const offerIds = result.offers.map((o) => o.id);
    expect(offerIds).toContain(offerAId);
  });

  it("search: finds candidate by firstName", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "Alice" });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]!.firstName).toBe("Alice");
    expect(result.candidates[0]!.lastName).toBe("Dupont");
  });

  it("search: finds candidate by lastName", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "Dupont" });
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates.some((c) => c.lastName === "Dupont")).toBe(true);
  });

  it("search: finds candidate by title", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "React" });
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates.some((c) => c.title?.includes("React"))).toBe(
      true
    );
  });

  it("search: finds candidate by city", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "Paris" });
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates.some((c) => c.id === candidateA1Id)).toBe(true);
  });

  it("search: finds candidate by tag name", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "React" });
    expect(result.candidates.some((c) => c.id === candidateA1Id)).toBe(true);
  });

  it("search: finds candidate by language", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "Anglais" });
    expect(result.candidates.some((c) => c.id === candidateA1Id)).toBe(true);
  });

  it("search: finds candidate by experience company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "TechCorp" });
    expect(result.candidates.some((c) => c.id === candidateA1Id)).toBe(true);
  });

  it("search: finds candidate by formation school", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "HEC" });
    expect(result.candidates.some((c) => c.id === candidateA1Id)).toBe(true);
  });

  it("search: finds offer by title", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "React Senior" });
    expect(result.offers.length).toBeGreaterThanOrEqual(1);
    expect(result.offers.some((o) => o.id === offerAId)).toBe(true);
    expect(
      result.offers.find((o) => o.id === offerAId)?.clientCompany?.name
    ).toBe("Acme Corp");
  });

  it("search: finds offer by description", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "expert React" });
    expect(result.offers.some((o) => o.id === offerAId)).toBe(true);
  });

  it("search: returns empty when no match", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "XyZ999NonExistent" });
    expect(result.candidates).toHaveLength(0);
    expect(result.offers).toHaveLength(0);
  });

  it("search: throws validation error when q has less than 2 chars", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.search.search({ q: "a" })).rejects.toThrow();
  });

  it("search: throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.search.search({ q: "test" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("search: company B does not see company A candidates or offers", async () => {
    const ctx = createContext(companyBId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.search.search({ q: "Dupont" });
    expect(result.candidates).toHaveLength(0);
    expect(result.offers).toHaveLength(0);
  });
});
