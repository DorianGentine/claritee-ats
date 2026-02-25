import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;
const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;

describe.runIf(!!connectionString && hasSupabase)("auth.register", () => {
  let db: PrismaClient;
  const testSiren = "987654321";

  beforeAll(() => {
    const adapter = new PrismaPg({ connectionString: connectionString! });
    db = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await db.company.deleteMany({ where: { siren: testSiren } });
    await db.$disconnect();
  });

  const createContext = (): Context => ({
    db,
    user: null,
    companyId: null,
    headers: new Headers(),
  });

  it("creates Auth user, Company and User in one flow with valid input", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);
    const email = `test-register-${Date.now()}@example.com`;

    const result = await caller.auth.register({
      email,
      password: "password123",
      companyName: "Test Company",
      siren: testSiren,
      firstName: "Test",
      lastName: "User",
    });

    expect(result.companyId).toBeDefined();

    const company = await db.company.findUnique({
      where: { id: result.companyId },
      include: { users: true },
    });
    expect(company).not.toBeNull();
    expect(company?.name).toBe("Test Company");
    expect(company?.siren).toBe(testSiren);
    expect(company?.users).toHaveLength(1);
    expect(company?.users[0].email).toBe(email);
    expect(company?.users[0].firstName).toBe("Test");
    expect(company?.users[0].lastName).toBe("User");
  });

  it("throws with clear message when SIREN already exists", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        email: `test-register-dup-${Date.now()}@example.com`,
        password: "password123",
        companyName: "Other Company",
        siren: testSiren,
        firstName: "Other",
        lastName: "User",
      })
    ).rejects.toMatchObject({
      message: expect.stringMatching(/disponible/),
    });
  });
});
