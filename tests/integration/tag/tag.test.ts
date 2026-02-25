import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

describe.runIf(!!connectionString)("tag", () => {
  let db: PrismaClient;
  let companyAId: string;
  let companyBId: string;

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
          name: "Test Company A Tags",
          siren: `7${Date.now().toString().slice(-8)}`,
        },
      }),
      db.company.create({
        data: {
          name: "Test Company B Tags",
          siren: `6${Date.now().toString().slice(-8)}`,
        },
      }),
    ]);
    companyAId = companyA.id;
    companyBId = companyB.id;
  });

  afterAll(async () => {
    await db.tag.deleteMany({
      where: { companyId: { in: [companyAId, companyBId] } },
    });
    await db.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    });
    await db.$disconnect();
  });

  it("list: returns only tags for the caller company", async () => {
    const tagA = await db.tag.create({
      data: {
        name: "Python",
        color: "#D4A5A5",
        companyId: companyAId,
      },
    });
    const tagB = await db.tag.create({
      data: {
        name: "Java",
        color: "#8FA89E",
        companyId: companyBId,
      },
    });

    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tag.list();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(tagA.id);
    expect(result[0].name).toBe("Python");
    expect(result[0].color).toBe("#D4A5A5");
    expect(result.some((t) => t.id === tagB.id)).toBe(false);

    await db.tag.deleteMany({
      where: { id: { in: [tagA.id, tagB.id] } },
    });
  });

  it("list: returns tags sorted by name asc", async () => {
    const [t1, t2, t3] = await Promise.all([
      db.tag.create({
        data: { name: "Zebra", color: "#D4A5A5", companyId: companyAId },
      }),
      db.tag.create({
        data: { name: "Alpha", color: "#8FA89E", companyId: companyAId },
      }),
      db.tag.create({
        data: { name: "Beta", color: "#C9B896", companyId: companyAId },
      }),
    ]);

    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tag.list();

    expect(result.map((t) => t.name)).toEqual(["Alpha", "Beta", "Zebra"]);

    await db.tag.deleteMany({
      where: { id: { in: [t1.id, t2.id, t3.id] } },
    });
  });

  it("list: throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tag.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
