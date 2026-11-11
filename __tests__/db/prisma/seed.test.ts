import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import {
  DEV_INVITATION_TOKEN,
  DEV_USER_ID,
  seedDevData,
} from "../../../prisma/seed-dev-data"

const connectionString = process.env.DATABASE_URL

/** SIREN du cabinet de démo créé par le seed. */
const DEV_COMPANY_SIREN = "123456789"

describe("Prisma seed", () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: connectionString! })
    prisma = new PrismaClient({ adapter })
    // Base de test neuve : le seed n'a pas tourné. Les villes (Photon, réseau) sont exclues.
    await seedDevData(prisma)
  })

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { siren: DEV_COMPANY_SIREN } })
    await prisma.$disconnect()
  })

  it("creates the demo company, its user and an invitation", async () => {
    const company = await prisma.company.findUniqueOrThrow({
      where: { siren: DEV_COMPANY_SIREN },
    })
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: DEV_USER_ID },
    })
    const invitation = await prisma.invitation.findUniqueOrThrow({
      where: { token: DEV_INVITATION_TOKEN },
    })

    expect(user.companyId).toBe(company.id)
    expect(invitation.companyId).toBe(company.id)
  })

  it("is idempotent", async () => {
    await seedDevData(prisma)

    expect(
      await prisma.company.count({ where: { siren: DEV_COMPANY_SIREN } })
    ).toBe(1)
    expect(await prisma.user.count({ where: { id: DEV_USER_ID } })).toBe(1)
    expect(
      await prisma.invitation.count({ where: { token: DEV_INVITATION_TOKEN } })
    ).toBe(1)
  })

  it("User.companyId matches Company.id", async () => {
    const users = await prisma.user.findMany({ include: { company: true } })

    for (const user of users) {
      expect(user.company).toBeDefined()
      expect(user.companyId).toBe(user.company?.id)
    }
  })
})
