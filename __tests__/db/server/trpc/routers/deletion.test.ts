import { randomInt, randomUUID } from "crypto"
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { appRouter } from "@/server/trpc/routers/_app"
import type { Context } from "@/server/trpc/context"

const connectionString = process.env.DATABASE_URL

/** Faux Supabase admin : Storage en mémoire (clé `${bucket}:${path}`) et suppression Auth. */
const { storedFiles, deleteAuthUser } = vi.hoisted(() => ({
  storedFiles: new Map<string, string>(),
  deleteAuthUser: vi.fn(
    (_userId: string): Promise<{ error: { status: number } | null }> =>
      Promise.resolve({ error: null })
  ),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { deleteUser: (userId: string) => deleteAuthUser(userId) } },
    storage: {
      from: (bucket: string) => ({
        list: (prefix: string) => {
          const entries = new Map<string, { name: string; id: string | null }>()
          for (const key of storedFiles.keys()) {
            if (!key.startsWith(`${bucket}:${prefix}/`)) continue
            const [name, ...rest] = key
              .slice(`${bucket}:${prefix}/`.length)
              .split("/")
            entries.set(name, { name, id: rest.length > 0 ? null : name })
          }
          return Promise.resolve({ data: [...entries.values()], error: null })
        },
        remove: (paths: string[]) => {
          for (const path of paths) storedFiles.delete(`${bucket}:${path}`)
          return Promise.resolve({ error: null })
        },
      }),
    },
  }),
}))

describe("RGPD deletion", () => {
  let db: PrismaClient
  const createdCompanyIds: string[] = []

  const createContext = (userId: string, companyId: string): Context =>
    ({
      db,
      user: { id: userId, email: `${userId}@test.com` },
      companyId,
      headers: new Headers(),
    }) as unknown as Context

  /** Cabinet avec des membres créés dans l'ordre (le premier est le créateur). */
  const createCompany = async (memberCount: number) => {
    const company = await db.company.create({
      data: {
        name: `Cabinet RGPD ${randomUUID().slice(0, 8)}`,
        siren: String(randomInt(100_000_000, 999_999_999)),
      },
    })
    createdCompanyIds.push(company.id)
    const memberIds: string[] = []
    for (let index = 0; index < memberCount; index++) {
      const user = await db.user.create({
        data: {
          id: randomUUID(),
          email: `member-${randomUUID()}@test.com`,
          firstName: `Membre${index}`,
          lastName: "Test",
          companyId: company.id,
          createdAt: new Date(Date.now() - (memberCount - index) * 60_000),
        },
      })
      memberIds.push(user.id)
    }
    return { company, memberIds }
  }

  beforeAll(() => {
    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: connectionString! }),
    })
  })

  beforeEach(() => {
    storedFiles.clear()
    deleteAuthUser.mockClear()
  })

  afterAll(async () => {
    await db.company.deleteMany({ where: { id: { in: createdCompanyIds } } })
    await db.$disconnect()
  })

  // ─── company.deleteUser ───

  it("deleteUser: the owner removes a member, whose notes are kept without author", async () => {
    const { company, memberIds } = await createCompany(2)
    const [ownerId, memberId] = memberIds
    const note = await db.note.create({
      data: {
        content: "Note du membre",
        authorId: memberId,
        companyId: company.id,
      },
    })

    const result = await appRouter
      .createCaller(createContext(ownerId, company.id))
      .company.deleteUser({ userId: memberId })

    expect(result).toEqual({ success: true, isSelf: false })
    expect(deleteAuthUser).toHaveBeenCalledWith(memberId)
    expect(await db.user.findUnique({ where: { id: memberId } })).toBeNull()
    const keptNote = await db.note.findUniqueOrThrow({
      where: { id: note.id },
    })
    expect(keptNote.authorId).toBeNull()
  })

  it("deleteUser: a member deletes their own account", async () => {
    const { company, memberIds } = await createCompany(2)
    const [, memberId] = memberIds

    const result = await appRouter
      .createCaller(createContext(memberId, company.id))
      .company.deleteUser({ userId: memberId })

    expect(result).toEqual({ success: true, isSelf: true })
    expect(await db.user.findUnique({ where: { id: memberId } })).toBeNull()
  })

  it("deleteUser: a member cannot remove someone else", async () => {
    const { company, memberIds } = await createCompany(3)
    const [ownerId, memberId, otherMemberId] = memberIds
    const caller = appRouter.createCaller(createContext(memberId, company.id))

    await expect(
      caller.company.deleteUser({ userId: otherMemberId })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    await expect(
      caller.company.deleteUser({ userId: ownerId })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
    expect(deleteAuthUser).not.toHaveBeenCalled()
  })

  it("deleteUser: the last member must delete the company instead", async () => {
    const { company, memberIds } = await createCompany(1)

    await expect(
      appRouter
        .createCaller(createContext(memberIds[0], company.id))
        .company.deleteUser({ userId: memberIds[0] })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("supprimez le cabinet"),
    })
  })

  it("deleteUser: keeps the user when the Auth deletion fails", async () => {
    const { company, memberIds } = await createCompany(2)
    const [ownerId, memberId] = memberIds
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    deleteAuthUser.mockResolvedValueOnce({ error: { status: 500 } })

    try {
      await expect(
        appRouter
          .createCaller(createContext(ownerId, company.id))
          .company.deleteUser({ userId: memberId })
      ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" })
      expect(
        await db.user.findUnique({ where: { id: memberId } })
      ).not.toBeNull()
    } finally {
      consoleError.mockRestore()
    }
  })

  it("deleteUser: throws NOT_FOUND for a user of another company", async () => {
    const { company, memberIds } = await createCompany(1)
    const { memberIds: otherMemberIds } = await createCompany(1)

    await expect(
      appRouter
        .createCaller(createContext(memberIds[0], company.id))
        .company.deleteUser({ userId: otherMemberIds[0] })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  // ─── company.deleteCompany ───

  it("deleteCompany: removes data, Storage files and Auth accounts of the company only", async () => {
    const { company, memberIds } = await createCompany(2)
    const { company: otherCompany } = await createCompany(1)
    const candidate = await db.candidate.create({
      data: { firstName: "Jean", lastName: "Dupont", companyId: company.id },
    })
    storedFiles.set(
      `photos:${company.id}/candidates/${candidate.id}/photo.jpg`,
      "x"
    )
    storedFiles.set(
      `cvs:${company.id}/candidates/${candidate.id}/cv-${randomUUID()}.pdf`,
      "x"
    )
    storedFiles.set(`cvs:${company.id}/stray.txt`, "x")
    storedFiles.set(`cvs:${otherCompany.id}/candidates/other/cv.pdf`, "x")

    const result = await appRouter
      .createCaller(createContext(memberIds[0], company.id))
      .company.deleteCompany({ confirmName: ` ${company.name} ` })

    expect(result).toEqual({ success: true })
    expect(
      await db.company.findUnique({ where: { id: company.id } })
    ).toBeNull()
    expect(
      await db.candidate.findUnique({ where: { id: candidate.id } })
    ).toBeNull()
    expect(await db.user.count({ where: { id: { in: memberIds } } })).toBe(0)
    expect([...storedFiles.keys()]).toEqual([
      `cvs:${otherCompany.id}/candidates/other/cv.pdf`,
    ])
    expect(deleteAuthUser.mock.calls.map(([userId]) => userId).sort()).toEqual(
      [...memberIds].sort()
    )
  })

  it("deleteCompany: is reserved to the owner", async () => {
    const { company, memberIds } = await createCompany(2)

    await expect(
      appRouter
        .createCaller(createContext(memberIds[1], company.id))
        .company.deleteCompany({ confirmName: company.name })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(
      await db.company.findUnique({ where: { id: company.id } })
    ).not.toBeNull()
  })

  it("deleteCompany: requires the exact company name", async () => {
    const { company, memberIds } = await createCompany(1)

    await expect(
      appRouter
        .createCaller(createContext(memberIds[0], company.id))
        .company.deleteCompany({ confirmName: "Autre nom" })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Le nom saisi ne correspond pas au nom du cabinet.",
    })
    expect(
      await db.company.findUnique({ where: { id: company.id } })
    ).not.toBeNull()
  })

  // ─── client.delete / shareLink.delete ───

  it("clientCompany.delete: removes the client and keeps its offers without client", async () => {
    const { company, memberIds } = await createCompany(1)
    const client = await db.clientCompany.create({
      data: {
        name: "Client RGPD",
        companyId: company.id,
        contacts: { create: { firstName: "Paul", lastName: "Martin" } },
      },
      include: { contacts: true },
    })
    const offer = await db.jobOffer.create({
      data: {
        title: "Offre",
        companyId: company.id,
        clientCompanyId: client.id,
        clientContactId: client.contacts[0].id,
      },
    })

    await appRouter
      .createCaller(createContext(memberIds[0], company.id))
      .clientCompany.delete({ id: client.id })

    expect(
      await db.clientCompany.findUnique({ where: { id: client.id } })
    ).toBeNull()
    expect(
      await db.clientContact.count({ where: { clientCompanyId: client.id } })
    ).toBe(0)
    const keptOffer = await db.jobOffer.findUniqueOrThrow({
      where: { id: offer.id },
    })
    expect(keptOffer.clientCompanyId).toBeNull()
    expect(keptOffer.clientContactId).toBeNull()
  })

  it("clientCompany.delete: throws NOT_FOUND for a client of another company", async () => {
    const { company, memberIds } = await createCompany(1)
    const { company: otherCompany } = await createCompany(1)
    const otherClient = await db.clientCompany.create({
      data: { name: "Client autre cabinet", companyId: otherCompany.id },
    })

    await expect(
      appRouter
        .createCaller(createContext(memberIds[0], company.id))
        .clientCompany.delete({ id: otherClient.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(
      await db.clientCompany.findUnique({ where: { id: otherClient.id } })
    ).not.toBeNull()
  })

  it("shareLink.delete: removes the link of a candidate of the company", async () => {
    const { company, memberIds } = await createCompany(1)
    const candidate = await db.candidate.create({
      data: { firstName: "Marie", lastName: "Curie", companyId: company.id },
    })
    const shareLink = await db.shareLink.create({
      data: { candidateId: candidate.id, token: randomUUID(), type: "NORMAL" },
    })

    await appRouter
      .createCaller(createContext(memberIds[0], company.id))
      .shareLink.delete({ id: shareLink.id })

    expect(
      await db.shareLink.findUnique({ where: { id: shareLink.id } })
    ).toBeNull()
  })

  it("shareLink.delete: throws NOT_FOUND for a link of another company", async () => {
    const { company, memberIds } = await createCompany(1)
    const { company: otherCompany } = await createCompany(1)
    const otherCandidate = await db.candidate.create({
      data: {
        firstName: "Autre",
        lastName: "Cabinet",
        companyId: otherCompany.id,
      },
    })
    const otherLink = await db.shareLink.create({
      data: {
        candidateId: otherCandidate.id,
        token: randomUUID(),
        type: "NORMAL",
      },
    })

    await expect(
      appRouter
        .createCaller(createContext(memberIds[0], company.id))
        .shareLink.delete({ id: otherLink.id })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(
      await db.shareLink.findUnique({ where: { id: otherLink.id } })
    ).not.toBeNull()
  })
})
