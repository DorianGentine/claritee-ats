import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

describe.runIf(!!connectionString)("auth.completeRegistration", () => {
  let db: PrismaClient;
  const testUserId = "00000000-0000-0000-0000-000000000001";
  const testSiren = "987654321";

  beforeAll(() => {
    const adapter = new PrismaPg({ connectionString: connectionString! });
    db = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: testUserId } });
    await db.company.deleteMany({ where: { siren: testSiren } });
    await db.$disconnect();
  });

  const createContext = (): Context => ({
    db,
    user: {
      id: testUserId,
      email: "test-register@example.com",
    } as Context["user"],
    companyId: null,
    headers: new Headers(),
  });

  it("creates Company and User in one transaction with valid input", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.completeRegistration({
      companyName: "Test Company",
      siren: testSiren,
      firstName: "Test",
      lastName: "User",
    });

    expect(result.companyId).toBeDefined();

    const company = await db.company.findUnique({
      where: { id: result.companyId },
    });
    expect(company).not.toBeNull();
    expect(company?.name).toBe("Test Company");
    expect(company?.siren).toBe(testSiren);

    const user = await db.user.findUnique({
      where: { id: testUserId },
    });
    expect(user).not.toBeNull();
    expect(user?.companyId).toBe(result.companyId);
    expect(user?.email).toBe("test-register@example.com");
    expect(user?.firstName).toBe("Test");
    expect(user?.lastName).toBe("User");
  });

  it("throws with clear message when SIREN already exists", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.completeRegistration({
        companyName: "Other Company",
        siren: testSiren,
        firstName: "Other",
        lastName: "User",
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("SIREN est déjà enregistré"),
    });
  });
});
