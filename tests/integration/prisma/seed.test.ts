import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

describe.runIf(!!connectionString)("Prisma seed", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    const adapter = new PrismaPg({ connectionString: connectionString! });
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("has at least one Company, one User, one Invitation after seed", async () => {
    const companies = await prisma.company.findMany();
    const users = await prisma.user.findMany();
    const invitations = await prisma.invitation.findMany();

    expect(companies.length).toBeGreaterThanOrEqual(1);
    expect(users.length).toBeGreaterThanOrEqual(1);
    expect(invitations.length).toBeGreaterThanOrEqual(1);
  });

  it("User.companyId matches Company.id", async () => {
    const users = await prisma.user.findMany({ include: { company: true } });

    for (const user of users) {
      expect(user.company).toBeDefined();
      expect(user.companyId).toBe(user.company?.id);
    }
  });
});
