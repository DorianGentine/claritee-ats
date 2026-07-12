import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  }),
}));

describe.runIf(!!connectionString)("settings", () => {
  let db: PrismaClient;
  let companyAId: string;
  let companyBId: string;
  let userAId: string;
  let userBId: string;

  const createContext = (companyId: string | null, userId?: string): Context =>
    ({
      db,
      user: companyId ? { id: userId ?? "test-user", email: "admin@test.com" } : null,
      companyId,
      headers: new Headers(),
    }) as unknown as Context;

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: connectionString! });
    db = new PrismaClient({ adapter });

    const sirenBase = Date.now().toString().slice(-7);

    const [companyA, companyB] = await Promise.all([
      db.company.create({
        data: { name: "Settings Test Company A", siren: `9${sirenBase}0` },
      }),
      db.company.create({
        data: { name: "Settings Test Company B", siren: `9${sirenBase}1` },
      }),
    ]);
    companyAId = companyA.id;
    companyBId = companyB.id;

    const [userA, userB] = await Promise.all([
      db.user.create({
        data: {
          id: `settings-user-a-${Date.now()}`,
          email: `settings-a-${Date.now()}@test.com`,
          firstName: "Alice",
          lastName: "A",
          companyId: companyAId,
        },
      }),
      db.user.create({
        data: {
          id: `settings-user-b-${Date.now()}`,
          email: `settings-b-${Date.now()}@test.com`,
          firstName: "Bob",
          lastName: "B",
          companyId: companyBId,
        },
      }),
    ]);
    userAId = userA.id;
    userBId = userB.id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { companyId: { in: [companyAId, companyBId] } } });
    await db.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });
    await db.$disconnect();
  });

  describe("company.updateCompany", () => {
    it("met à jour le nom et retourne le cabinet mis à jour", async () => {
      const caller = appRouter.createCaller(createContext(companyAId, userAId));

      const result = await caller.company.updateCompany({ name: "Nouveau Nom A" });

      expect(result.name).toBe("Nouveau Nom A");
      expect(result.id).toBe(companyAId);

      // Vérifier en base
      const company = await db.company.findUnique({ where: { id: companyAId } });
      expect(company?.name).toBe("Nouveau Nom A");
    });

    it("UNAUTHORIZED si non connecté", async () => {
      const caller = appRouter.createCaller(createContext(null));

      await expect(caller.company.updateCompany({ name: "Hack" })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("company.listUsers", () => {
    it("retourne les utilisateurs du bon cabinet", async () => {
      const caller = appRouter.createCaller(createContext(companyAId, userAId));

      const users = await caller.company.listUsers();

      expect(users.some((u) => u.id === userAId)).toBe(true);
    });

    it("ne retourne pas les utilisateurs d'un autre cabinet", async () => {
      const caller = appRouter.createCaller(createContext(companyAId, userAId));

      const users = await caller.company.listUsers();

      expect(users.some((u) => u.id === userBId)).toBe(false);
    });
  });

  describe("auth.getMe", () => {
    it("retourne le profil Prisma de l'utilisateur connecté", async () => {
      const caller = appRouter.createCaller(createContext(companyAId, userAId));

      const profile = await caller.auth.getMe();

      expect(profile.id).toBe(userAId);
      expect(profile.firstName).toBe("Alice");
      expect(profile.email).toBeDefined();
    });
  });

  describe("auth.updateProfile", () => {
    it("met à jour firstName et lastName en base", async () => {
      const caller = appRouter.createCaller(createContext(companyAId, userAId));

      await caller.auth.updateProfile({ firstName: "Alicia", lastName: "Updated" });

      const user = await db.user.findUnique({ where: { id: userAId } });
      expect(user?.firstName).toBe("Alicia");
      expect(user?.lastName).toBe("Updated");
    });
  });
});
