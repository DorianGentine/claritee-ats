import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

describe.runIf(!!connectionString)("client", () => {
  let db: PrismaClient;
  let companyAId: string;
  let companyBId: string;
  let clientA1Id: string;
  let clientA2Id: string;
  let clientB1Id: string;

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
          name: "Test Company A Clients",
          siren: `9${Date.now().toString().slice(-8)}`,
        },
      }),
      db.company.create({
        data: {
          name: "Test Company B Clients",
          siren: `8${Date.now().toString().slice(-8)}`,
        },
      }),
    ]);
    companyAId = companyA.id;
    companyBId = companyB.id;

    const [cA1, cA2, cB1] = await Promise.all([
      db.clientCompany.create({
        data: {
          name: "Client A1",
          companyId: companyAId,
          siren: "123456789",
        },
      }),
      db.clientCompany.create({
        data: {
          name: "Client A2",
          companyId: companyAId,
          siren: "987654321",
        },
      }),
      db.clientCompany.create({
        data: {
          name: "Client B1",
          companyId: companyBId,
          siren: "111222333",
        },
      }),
    ]);
    clientA1Id = cA1.id;
    clientA2Id = cA2.id;
    clientB1Id = cB1.id;
  });

  afterAll(async () => {
    await db.clientCompany.deleteMany({
      where: { id: { in: [clientA1Id, clientA2Id, clientB1Id] } },
    });
    await db.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    });
    await db.$disconnect();
  });

  it("list: returns only clients for the caller company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clientCompany.list();

    expect(result).toHaveLength(2);
    const ids = result.map((c) => c.id).sort();
    expect(ids).toEqual([clientA1Id, clientA2Id].sort());
    expect(result.some((c) => c.id === clientB1Id)).toBe(false);
  });

  it("list: returns items sorted by createdAt desc", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clientCompany.list();

    expect(result.length).toBeGreaterThanOrEqual(2);
    const [cA1, cA2] = await Promise.all([
      db.clientCompany.findUniqueOrThrow({ where: { id: clientA1Id } }),
      db.clientCompany.findUniqueOrThrow({ where: { id: clientA2Id } }),
    ]);
    const expectedOrder =
      cA1.createdAt.getTime() >= cA2.createdAt.getTime()
        ? [cA1.id, cA2.id]
        : [cA2.id, cA1.id];
    expect(result[0].id).toBe(expectedOrder[0]);
    expect(result[1].id).toBe(expectedOrder[1]);
  });

  it("list: throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.clientCompany.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("create: creates client with caller companyId and optional siren", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.clientCompany.create({
      name: "New Client A",
      siren: "222333444",
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe("New Client A");
    expect(created.siren).toBe("222333444");
    expect(created.companyId).toBe(companyAId);

    const inDb = await db.clientCompany.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(inDb.companyId).toBe(companyAId);
    expect(inDb.siren).toBe("222333444");

    await db.clientCompany.delete({ where: { id: created.id } });
  });

  it("create: accepts undefined siren (optional)", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.clientCompany.create({
      name: "Client Without SIREN",
      siren: undefined,
    });

    expect(created.siren).toBeNull();

    const inDb = await db.clientCompany.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(inDb.siren).toBeNull();

    await db.clientCompany.delete({ where: { id: created.id } });
  });

  it("create: accepts empty string siren and stores as null", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.clientCompany.create({
      name: "Client Empty SIREN",
      siren: "",
    });

    expect(created.siren).toBeNull();

    const inDb = await db.clientCompany.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(inDb.siren).toBeNull();

    await db.clientCompany.delete({ where: { id: created.id } });
  });

  it("create: rejects invalid SIREN with PRD message", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.clientCompany.create({
        name: "Invalid SIREN Client",
        siren: "123",
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        "Le SIREN doit contenir exactement 9 chiffres.",
      ),
    });
  });

  it("getById: returns client for own company with counts and contacts", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clientCompany.getById({ id: clientA1Id });

    expect(result.id).toBe(clientA1Id);
    expect(result.name).toBe("Client A1");
    expect(result.contacts).toBeDefined();
    expect(Array.isArray(result.contacts)).toBe(true);
    expect(result.contactsCount).toBe(result.contacts.length);
    expect(result.offersCount).toBeGreaterThanOrEqual(0);
  });

  it("getById: throws NOT_FOUND when client belongs to another company", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.clientCompany.getById({ id: clientB1Id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("getById: throws NOT_FOUND for non-existent id", async () => {
    const ctx = createContext(companyAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.clientCompany.getById({
        id: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  describe("createContact", () => {
    it("creates contact for own company client", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      const created = await caller.clientCompany.createContact({
        clientCompanyId: clientA1Id,
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean.dupont@example.com",
        phone: "+33612345678",
        position: "DRH",
        linkedinUrl: "https://linkedin.com/in/jeandupont",
      });

      expect(created.id).toBeDefined();
      expect(created.firstName).toBe("Jean");
      expect(created.lastName).toBe("Dupont");
      expect(created.email).toBe("jean.dupont@example.com");
      expect(created.phone).toBe("+33612345678");
      expect(created.position).toBe("DRH");
      expect(created.linkedinUrl).toBe("https://linkedin.com/in/jeandupont");
      expect(created.clientCompanyId).toBe(clientA1Id);

      const getById = await caller.clientCompany.getById({ id: clientA1Id });
      expect(getById.contacts.some((c) => c.id === created.id)).toBe(true);

      await db.clientContact.delete({ where: { id: created.id } });
    });

    it("rejects when firstName is missing", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.clientCompany.createContact({
          clientCompanyId: clientA1Id,
          firstName: "",
          lastName: "Dupont",
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("prénom"),
      });
    });

    it("rejects when lastName is missing", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.clientCompany.createContact({
          clientCompanyId: clientA1Id,
          firstName: "Jean",
          lastName: "",
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("nom"),
      });
    });

    it("rejects invalid email format", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.clientCompany.createContact({
          clientCompanyId: clientA1Id,
          firstName: "Jean",
          lastName: "Dupont",
          email: "invalid-email",
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("email"),
      });
    });

    it("rejects invalid LinkedIn URL format", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.clientCompany.createContact({
          clientCompanyId: clientA1Id,
          firstName: "Jean",
          lastName: "Dupont",
          linkedinUrl: "https://example.com/not-linkedin",
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("LinkedIn"),
      });
    });

    it("throws NOT_FOUND when clientCompany belongs to another company", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.clientCompany.createContact({
          clientCompanyId: clientB1Id,
          firstName: "Jean",
          lastName: "Dupont",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND for non-existent clientCompanyId", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.clientCompany.createContact({
          clientCompanyId: "00000000-0000-0000-0000-000000000000",
          firstName: "Jean",
          lastName: "Dupont",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("updateContact", () => {
    it("updates contact for own company", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      const created = await caller.clientCompany.createContact({
        clientCompanyId: clientA1Id,
        firstName: "Jean",
        lastName: "Dupont",
      });

      const updated = await caller.clientCompany.updateContact({
        id: created.id,
        firstName: "Jean-Pierre",
        position: "DRH",
      });

      expect(updated.firstName).toBe("Jean-Pierre");
      expect(updated.lastName).toBe("Dupont");
      expect(updated.position).toBe("DRH");

      await db.clientContact.delete({ where: { id: created.id } });
    });

    it("throws NOT_FOUND when contact belongs to another company", async () => {
      const ctxA = createContext(companyAId);
      const ctxB = createContext(companyBId);
      const callerA = appRouter.createCaller(ctxA);
      const callerB = appRouter.createCaller(ctxB);

      const created = await callerB.clientCompany.createContact({
        clientCompanyId: clientB1Id,
        firstName: "Marie",
        lastName: "Martin",
      });

      await expect(
        callerA.clientCompany.updateContact({
          id: created.id,
          firstName: "Hacked",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await db.clientContact.delete({ where: { id: created.id } });
    });
  });

  describe("deleteContact", () => {
    it("deletes contact for own company", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      const created = await caller.clientCompany.createContact({
        clientCompanyId: clientA1Id,
        firstName: "ToDelete",
        lastName: "Contact",
      });

      const result = await caller.clientCompany.deleteContact({ id: created.id });
      expect(result.success).toBe(true);

      const inDb = await db.clientContact.findUnique({
        where: { id: created.id },
      });
      expect(inDb).toBeNull();
    });

    it("throws NOT_FOUND when contact belongs to another company", async () => {
      const ctxA = createContext(companyAId);
      const ctxB = createContext(companyBId);
      const callerA = appRouter.createCaller(ctxA);
      const callerB = appRouter.createCaller(ctxB);

      const created = await callerB.clientCompany.createContact({
        clientCompanyId: clientB1Id,
        firstName: "Marie",
        lastName: "Martin",
      });

      await expect(
        callerA.clientCompany.deleteContact({ id: created.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await db.clientContact.delete({ where: { id: created.id } });
    });

    it("throws NOT_FOUND for non-existent contact id", async () => {
      const ctx = createContext(companyAId);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.clientCompany.deleteContact({
          id: "00000000-0000-0000-0000-000000000000",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});

