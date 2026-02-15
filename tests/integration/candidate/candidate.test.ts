import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

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
});
