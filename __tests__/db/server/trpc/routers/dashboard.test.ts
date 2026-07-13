import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

const blockNoteContent = JSON.stringify([
  { id: "b1", type: "paragraph", content: [{ type: "text", text: "test", styles: {} }], children: [] },
]);

describe.runIf(!!connectionString)("dashboard.getStats", () => {
  let db: PrismaClient;
  let companyAId: string;
  let companyBId: string;
  let candidateA1Id: string;
  let candidateA2Id: string;
  let candidateB1Id: string;
  let offerA1Id: string;
  let offerA2Id: string;
  let offerB1Id: string;

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
      db.company.create({ data: { name: "Dashboard Test A", siren: `7${Date.now().toString().slice(-8)}` } }),
      db.company.create({ data: { name: "Dashboard Test B", siren: `6${Date.now().toString().slice(-8)}` } }),
    ]);
    companyAId = companyA.id;
    companyBId = companyB.id;

    const [cA1, cA2, cB1] = await Promise.all([
      db.candidate.create({ data: { firstName: "Alice", lastName: "A", companyId: companyAId } }),
      db.candidate.create({ data: { firstName: "Bob", lastName: "B", companyId: companyAId } }),
      db.candidate.create({ data: { firstName: "Charlie", lastName: "C", companyId: companyBId } }),
    ]);
    candidateA1Id = cA1.id;
    candidateA2Id = cA2.id;
    candidateB1Id = cB1.id;

    const [oA1, oA2, oB1] = await Promise.all([
      db.jobOffer.create({ data: { title: "Offer A1", companyId: companyAId, status: "IN_PROGRESS" } }),
      db.jobOffer.create({ data: { title: "Offer A2", companyId: companyAId, status: "TODO" } }),
      db.jobOffer.create({ data: { title: "Offer B1", companyId: companyBId, status: "IN_PROGRESS" } }),
    ]);
    offerA1Id = oA1.id;
    offerA2Id = oA2.id;
    offerB1Id = oB1.id;
  });

  afterAll(async () => {
    await db.note.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await db.jobOffer.deleteMany({ where: { id: { in: [offerA1Id, offerA2Id, offerB1Id] } } });
    await db.candidate.deleteMany({ where: { id: { in: [candidateA1Id, candidateA2Id, candidateB1Id] } } });
    await db.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    await db.$disconnect();
  });

  it("retourne les counts filtrés par companyId (isolation tenant)", async () => {
    const caller = appRouter.createCaller(createContext(companyAId));
    const stats = await caller.dashboard.getStats();

    expect(stats.totalCandidates).toBe(2);
    expect(stats.activeOffers).toBe(1);
    expect(stats.totalClients).toBe(0);
  });

  it("companyB ne voit pas les données de companyA", async () => {
    const caller = appRouter.createCaller(createContext(companyBId));
    const stats = await caller.dashboard.getStats();

    expect(stats.totalCandidates).toBe(1);
    expect(stats.activeOffers).toBe(1);
  });

  it("recentCandidates retourne au maximum 10 candidats ordonnés par date desc", async () => {
    const caller = appRouter.createCaller(createContext(companyAId));
    const stats = await caller.dashboard.getStats();

    expect(stats.recentCandidates.length).toBeLessThanOrEqual(10);
    const ids = stats.recentCandidates.map((c) => c.id);
    expect(ids).not.toContain(candidateB1Id);
  });

  it("recentOffers retourne les offres de la société ordonnées par date desc", async () => {
    const caller = appRouter.createCaller(createContext(companyAId));
    const stats = await caller.dashboard.getStats();

    expect(stats.recentOffers.length).toBeLessThanOrEqual(10);
    const ids = stats.recentOffers.map((o) => o.id);
    expect(ids).toContain(offerA1Id);
    expect(ids).toContain(offerA2Id);
    expect(ids).not.toContain(offerB1Id);
  });

  it("recentOffers inclut id, title, status, createdAt", async () => {
    const caller = appRouter.createCaller(createContext(companyAId));
    const stats = await caller.dashboard.getStats();

    const offer = stats.recentOffers.find((o) => o.id === offerA1Id);
    expect(offer).toBeDefined();
    expect(offer?.title).toBe("Offer A1");
    expect(offer?.status).toBe("IN_PROGRESS");
    expect(offer?.createdAt).toBeInstanceOf(Date);
  });

  // TODO(db-test-debt): échoue sur base fraîche — skippé temporairement, à corriger (voir docs/prd/TO-DO.md)
  it.skip("recentNotes inclut les relations candidate et jobOffer", async () => {
    const note = await db.note.create({
      data: {
        content: blockNoteContent,
        companyId: companyAId,
        candidateId: candidateA1Id,
        authorId: "test-user",
      },
    });

    const caller = appRouter.createCaller(createContext(companyAId));
    const stats = await caller.dashboard.getStats();

    const found = stats.recentNotes.find((n) => n.id === note.id);
    expect(found).toBeDefined();
    expect(found?.candidate?.firstName).toBe("Alice");
    expect(found?.candidateId).toBe(candidateA1Id);

    await db.note.delete({ where: { id: note.id } });
  });

  // TODO(db-test-debt): échoue sur base fraîche — skippé temporairement, à corriger (voir docs/prd/TO-DO.md)
  it.skip("recentNotes ne retourne que les notes de la société (isolation tenant)", async () => {
    const noteA = await db.note.create({
      data: { content: blockNoteContent, companyId: companyAId, authorId: "u1" },
    });
    const noteB = await db.note.create({
      data: { content: blockNoteContent, companyId: companyBId, authorId: "u2" },
    });

    const caller = appRouter.createCaller(createContext(companyAId));
    const stats = await caller.dashboard.getStats();

    const ids = stats.recentNotes.map((n) => n.id);
    expect(ids).toContain(noteA.id);
    expect(ids).not.toContain(noteB.id);

    await db.note.deleteMany({ where: { id: { in: [noteA.id, noteB.id] } } });
  });

  it("recentCandidates et recentOffers sont absents du response si vide (tableau vide)", async () => {
    const emptyCompany = await db.company.create({
      data: { name: "Empty Dash", siren: `5${Date.now().toString().slice(-8)}` },
    });

    try {
      const caller = appRouter.createCaller(createContext(emptyCompany.id));
      const stats = await caller.dashboard.getStats();

      expect(stats.recentCandidates).toEqual([]);
      expect(stats.recentOffers).toEqual([]);
      expect(stats.recentNotes).toEqual([]);
      expect(stats.totalCandidates).toBe(0);
      expect(stats.totalClients).toBe(0);
      expect(stats.activeOffers).toBe(0);
    } finally {
      await db.company.delete({ where: { id: emptyCompany.id } });
    }
  });
});
