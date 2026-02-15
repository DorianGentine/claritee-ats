import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

describe.runIf(!!connectionString)("invitation", () => {
  let db: PrismaClient;
  let companyId: string;
  let invitationId: string;
  let invitationToken: string;

  const createProtectedContext = (): Context =>
    ({
      db,
      user: { id: "test-user", email: "admin@test.com" },
      companyId,
      headers: new Headers(),
    }) as unknown as Context;

  const createPublicContext = (): Context =>
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
        name: "Test Invitation Company",
        siren: `9${Date.now().toString().slice(-8)}`,
      },
    });
    companyId = company.id;
  });

  afterAll(async () => {
    if (invitationId) {
      await db.invitation.deleteMany({ where: { id: invitationId } });
    }
    await db.invitation.deleteMany({ where: { companyId } });
    await db.company.delete({ where: { id: companyId } });
    await db.$disconnect();
  });

  it("create: creates invitation and returns url", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);
    const email = `invite-${Date.now()}@example.com`;

    const result = await caller.invitation.create({ email });

    expect(result.token).toBeDefined();
    expect(result.url).toContain("/invite/");
    expect(result.url).toContain(result.token);
    expect(result.expiresAt).toBeInstanceOf(Date);

    invitationId = result.id;
    invitationToken = result.token;

    const row = await db.invitation.findUnique({
      where: { id: result.id },
    });
    expect(row).not.toBeNull();
    expect(row?.email).toBe(email);
    expect(row?.companyId).toBe(companyId);
    expect(row?.usedAt).toBeNull();
  });

  it("getByToken: returns invitation when valid", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.invitation.getByToken({ token: invitationToken });

    expect(result).not.toBeNull();
    expect(result?.email).toContain("invite-");
    expect(result?.expiresAt).toBeInstanceOf(Date);
    expect(result?.usedAt).toBeNull();
  });

  it("getByToken: returns null for unknown token", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.invitation.getByToken({
      token: randomUUID(),
    });

    expect(result).toBeNull();
  });

  it("list: returns only company pending invitations", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);

    const list = await caller.invitation.list();

    expect(Array.isArray(list)).toBe(true);
    expect(list.some((inv) => inv.id === invitationId)).toBe(true);
    expect(list.every((inv) => inv.email.includes("invite-"))).toBe(true);
  });

  it("list: returns empty for other company", async () => {
    const otherCompany = await db.company.create({
      data: {
        name: "Other Company",
        siren: `8${Date.now().toString().slice(-8)}`,
      },
    });

    const ctx = {
      db,
      user: null,
      companyId: otherCompany.id,
      headers: new Headers(),
    } as unknown as Context;
    const caller = appRouter.createCaller(ctx);

    const list = await caller.invitation.list();

    expect(list).toHaveLength(0);

    await db.company.delete({ where: { id: otherCompany.id } });
  });

  it("revoke: marks invitation as revoked", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);

    await caller.invitation.revoke({ id: invitationId });

    const row = await db.invitation.findUnique({
      where: { id: invitationId },
    });
    expect(row?.revokedAt).not.toBeNull();
  });

  it("getByToken: returns revoked invitation (revokedAt set)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.invitation.getByToken({ token: invitationToken });

    expect(result).not.toBeNull();
    expect(result?.revokedAt).not.toBeNull();
  });

  it("list: excludes revoked invitations", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);

    const list = await caller.invitation.list();

    expect(list.some((inv) => inv.id === invitationId)).toBe(false);
  });
});
