import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

describe.runIf(!!connectionString)("company", () => {
  let db: PrismaClient;
  let companyId: string;

  const createProtectedContext = (): Context =>
    ({
      db,
      user: { id: "test-user", email: "admin@test.com" },
      companyId,
      headers: new Headers(),
    }) as unknown as Context;

  const createUnauthorizedContext = (): Context =>
    ({
      db,
      user: null,
      companyId: null,
      headers: new Headers(),
    }) as unknown as Context;

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: connectionString! });
    db = new PrismaClient({ adapter });

    const company = await db.company.create({
      data: {
        name: "Test Company Dashboard",
        siren: `9${Date.now().toString().slice(-8)}`,
      },
    });
    companyId = company.id;
  });

  afterAll(async () => {
    await db.company.delete({ where: { id: companyId } });
    await db.$disconnect();
  });

  it("getMyCompany: returns id and name for authenticated user", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.company.getMyCompany();

    expect(result).toEqual({ id: companyId, name: "Test Company Dashboard" });
  });

  it("getMyCompany: throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = createUnauthorizedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.company.getMyCompany()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
