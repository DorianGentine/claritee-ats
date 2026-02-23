import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "@/server/trpc/context";

const connectionString = process.env.DATABASE_URL;

/** Minimal BlockNote document (one paragraph) */
const blockNoteContent = JSON.stringify([
  { id: "block-1", type: "paragraph", content: [{ type: "text", text: "Note de test", styles: {} }], children: [] },
]);

describe.runIf(!!connectionString)("note", () => {
  let db: PrismaClient;
  let companyAId: string;
  let companyBId: string;
  let userAId: string;
  let userBId: string;
  let userCId: string;
  let candidateA1Id: string;
  let candidateB1Id: string;

  const createContext = (companyId: string | null, userId?: string): Context =>
    ({
      db,
      user: companyId ? { id: userId ?? "user-a-id", email: "a@test.com" } : null,
      companyId,
      headers: new Headers(),
    }) as unknown as Context;

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: connectionString! });
    db = new PrismaClient({ adapter });

    const [companyA, companyB] = await Promise.all([
      db.company.create({
        data: {
          name: "Test Company A Notes",
          siren: `9${Date.now().toString().slice(-8)}`,
        },
      }),
      db.company.create({
        data: {
          name: "Test Company B Notes",
          siren: `8${Date.now().toString().slice(-8)}`,
        },
      }),
    ]);
    companyAId = companyA.id;
    companyBId = companyB.id;

    [userAId, userBId, userCId] = ["user-a-id", "user-b-id", "user-c-id"];
    await Promise.all([
      db.user.create({
        data: {
          id: userAId,
          email: "usera@test.com",
          firstName: "User",
          lastName: "A",
          companyId: companyAId,
        },
      }),
      db.user.create({
        data: {
          id: userBId,
          email: "userb@test.com",
          firstName: "User",
          lastName: "B",
          companyId: companyAId,
        },
      }),
      db.user.create({
        data: {
          id: userCId,
          email: "userc@test.com",
          firstName: "User",
          lastName: "C",
          companyId: companyBId,
        },
      }),
    ]);

    const [cA1, cB1] = await Promise.all([
      db.candidate.create({
        data: {
          firstName: "Alice",
          lastName: "A1",
          companyId: companyAId,
        },
      }),
      db.candidate.create({
        data: {
          firstName: "Bob",
          lastName: "B1",
          companyId: companyBId,
        },
      }),
    ]);
    candidateA1Id = cA1.id;
    candidateB1Id = cB1.id;
  });

  afterAll(async () => {
    await db.note.deleteMany({
      where: {
        candidateId: { in: [candidateA1Id, candidateB1Id] },
      },
    });
    await db.candidate.deleteMany({
      where: { id: { in: [candidateA1Id, candidateB1Id] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [userAId, userBId, userCId] } },
    });
    await db.company.deleteMany({
      where: { id: { in: [companyAId, companyBId] } },
    });
    await db.$disconnect();
  });

  it("list: returns notes for candidate scoped by companyId, ordered createdAt asc (chat style)", async () => {
    const ctx = createContext(companyAId, userAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.note.create({
      candidateId: candidateA1Id,
      content: blockNoteContent,
    });
    expect(created.id).toBeDefined();

    const list = await caller.note.list({ candidateId: candidateA1Id });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((n) => n.id === created.id)).toBe(true);
    expect(list[0]).toMatchObject({
      content: blockNoteContent,
      author: { firstName: "User", lastName: "A" },
    });

    await db.note.delete({ where: { id: created.id } });
  });

  it("list: returns empty when candidate belongs to another company", async () => {
    const ctx = createContext(companyAId, userAId);
    const caller = appRouter.createCaller(ctx);

    const list = await caller.note.list({ candidateId: candidateB1Id });
    expect(list).toHaveLength(0);
  });

  it("list: throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.note.list({ candidateId: candidateA1Id })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("create: creates note with authorId and companyId", async () => {
    const ctx = createContext(companyAId, userAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.note.create({
      candidateId: candidateA1Id,
      content: blockNoteContent,
    });

    expect(created.id).toBeDefined();
    expect(created.authorId).toBe(userAId);
    expect(created.companyId).toBe(companyAId);
    expect(created.candidateId).toBe(candidateA1Id);
    expect(created.content).toBe(blockNoteContent);
    expect(created.author).toEqual({ firstName: "User", lastName: "A" });

    await db.note.delete({ where: { id: created.id } });
  });

  it("create: throws NOT_FOUND when candidate belongs to another company", async () => {
    const ctx = createContext(companyAId, userAId);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.note.create({
        candidateId: candidateB1Id,
        content: blockNoteContent,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("update: allows author to update own note", async () => {
    const ctx = createContext(companyAId, userAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.note.create({
      candidateId: candidateA1Id,
      content: blockNoteContent,
    });

    const updatedContent = JSON.stringify([
      { id: "block-2", type: "paragraph", content: [{ type: "text", text: "Note modifiée", styles: {} }], children: [] },
    ]);
    const updated = await caller.note.update({
      id: created.id,
      content: updatedContent,
    });

    expect(updated.content).toBe(updatedContent);

    await db.note.delete({ where: { id: created.id } });
  });

  it("update: throws FORBIDDEN when non-author tries to update", async () => {
    const ctxA = createContext(companyAId, userAId);
    const callerA = appRouter.createCaller(ctxA);
    const created = await callerA.note.create({
      candidateId: candidateA1Id,
      content: blockNoteContent,
    });

    const ctxB = createContext(companyAId, userBId);
    const callerB = appRouter.createCaller(ctxB);

    await expect(
      callerB.note.update({
        id: created.id,
        content: JSON.stringify([{ id: "x", type: "paragraph", content: [], children: [] }]),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await db.note.delete({ where: { id: created.id } });
  });

  it("update: throws NOT_FOUND when note belongs to another company", async () => {
    const ctxA = createContext(companyAId, userAId);
    const callerA = appRouter.createCaller(ctxA);
    const created = await callerA.note.create({
      candidateId: candidateA1Id,
      content: blockNoteContent,
    });

    const ctxC = createContext(companyBId, userCId);
    const callerC = appRouter.createCaller(ctxC);

    await expect(
      callerC.note.update({
        id: created.id,
        content: blockNoteContent,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await db.note.delete({ where: { id: created.id } });
  });

  it("delete: allows author to delete own note", async () => {
    const ctx = createContext(companyAId, userAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.note.create({
      candidateId: candidateA1Id,
      content: blockNoteContent,
    });

    const result = await caller.note.delete({ id: created.id });
    expect(result.success).toBe(true);

    const inDb = await db.note.findUnique({ where: { id: created.id } });
    expect(inDb).toBeNull();
  });

  it("delete: throws FORBIDDEN when non-author tries to delete", async () => {
    const ctxA = createContext(companyAId, userAId);
    const callerA = appRouter.createCaller(ctxA);
    const created = await callerA.note.create({
      candidateId: candidateA1Id,
      content: blockNoteContent,
    });

    const ctxB = createContext(companyAId, userBId);
    const callerB = appRouter.createCaller(ctxB);

    await expect(callerB.note.delete({ id: created.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await db.note.delete({ where: { id: created.id } });
  });

  it("delete: throws NOT_FOUND when note belongs to another company", async () => {
    const ctxA = createContext(companyAId, userAId);
    const callerA = appRouter.createCaller(ctxA);
    const created = await callerA.note.create({
      candidateId: candidateA1Id,
      content: blockNoteContent,
    });

    const ctxC = createContext(companyBId, userCId);
    const callerC = appRouter.createCaller(ctxC);

    await expect(callerC.note.delete({ id: created.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    await db.note.delete({ where: { id: created.id } });
  });

  it("create: creates free note without candidateId or offerId (Story 3.11)", async () => {
    const ctx = createContext(companyAId, userAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.note.create({
      content: blockNoteContent,
      title: "Ma note libre",
    });

    expect(created.id).toBeDefined();
    expect(created.candidateId).toBeNull();
    expect(created.offerId).toBeNull();
    expect(created.title).toBe("Ma note libre");
    expect(created.content).toBe(blockNoteContent);

    await db.note.delete({ where: { id: created.id } });
  });

  it("listFree: returns free notes ordered by updatedAt desc", async () => {
    const ctx = createContext(companyAId, userAId);
    const caller = appRouter.createCaller(ctx);

    const n1 = await caller.note.create({ content: blockNoteContent, title: "Note 1" });
    const n2 = await caller.note.create({
      content: JSON.stringify([{ id: "b2", type: "paragraph", content: [{ type: "text", text: "Note 2", styles: {} }], children: [] }]),
      title: "Note 2",
    });

    const list = await caller.note.listFree();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].id).toBe(n2.id);
    expect(list[1].id).toBe(n1.id);

    await db.note.deleteMany({ where: { id: { in: [n1.id, n2.id] } } });
  });

  it("update: accepts title (Story 3.11)", async () => {
    const ctx = createContext(companyAId, userAId);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.note.create({
      content: blockNoteContent,
      title: "Titre initial",
    });

    const updated = await caller.note.update({
      id: created.id,
      title: "Titre modifié",
    });

    expect(updated.title).toBe("Titre modifié");

    await db.note.delete({ where: { id: created.id } });
  });
});
