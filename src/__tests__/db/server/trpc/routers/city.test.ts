import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { cityRouter } from "@/server/trpc/routers/city"
import type { Context } from "@/server/trpc/context"

const connectionString = process.env.DATABASE_URL

// Pays fictif pour isoler les données de test de la table partagée `cities` (seed inclus).
const TEST_COUNTRY = "Testland"

describe.runIf(!!connectionString)("city.autocomplete (integration)", () => {
  let db: PrismaClient

  // publicProcedure : pas d'auth requise pour l'autocomplétion.
  const caller = () =>
    cityRouter.createCaller({
      db,
      user: null,
      companyId: null,
      headers: new Headers(),
    } as unknown as Context)

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: connectionString! })
    db = new PrismaClient({ adapter })

    await db.city.deleteMany({ where: { country: TEST_COUNTRY } })
    await db.city.createMany({
      data: [
        {
          name: "Zzztestborg",
          region: "Test Region",
          country: TEST_COUNTRY,
          latitude: 48.0,
          longitude: 2.0,
        },
        {
          // accent volontaire pour tester la recherche via unaccent()
          name: "Zzïtestville",
          region: "Test Region",
          country: TEST_COUNTRY,
          latitude: 49.0,
          longitude: 3.0,
        },
      ],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await db.city.deleteMany({ where: { country: TEST_COUNTRY } })
    await db.$disconnect()
  })

  it("returns [] when q has fewer than 3 chars (no DB hit)", async () => {
    const result = await caller().autocomplete({ q: "Zz" })
    expect(result).toEqual([])
  })

  it("finds local cities by prefix, sorted, without lat/long", async () => {
    const result = await caller().autocomplete({ q: "Zzz" })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: "Zzztestborg",
      region: "Test Region",
      country: TEST_COUNTRY,
    })
    expect(result[0]).not.toHaveProperty("latitude")
    expect(result[0]).not.toHaveProperty("longitude")
  })

  it("matches accented names via unaccent (query without accent)", async () => {
    // unaccent("Zzïtestville") = "Zzitestville" → "Zzi%" matche
    const result = await caller().autocomplete({ q: "Zzi" })

    expect(result.map((city) => city.name)).toEqual(["Zzïtestville"])
  })

  it("falls back to Photon and persists the city when nothing is found locally", async () => {
    const photonPayload = {
      features: [
        {
          properties: {
            name: "Qqqfallbackville",
            state: "Fallback Region",
            country: TEST_COUNTRY,
          },
          geometry: { coordinates: [5.0, 50.0] }, // [lon, lat]
        },
      ],
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(photonPayload), { status: 200 })
    )

    const result = await caller().autocomplete({ q: "Qqq" })

    expect(result.map((city) => city.name)).toEqual(["Qqqfallbackville"])

    // La ville a bien été créée en base (upsert), avec ses coordonnées.
    const persisted = await db.city.findUnique({
      where: {
        name_country: { name: "Qqqfallbackville", country: TEST_COUNTRY },
      },
    })
    expect(persisted).not.toBeNull()
    expect(Number(persisted!.latitude)).toBe(50.0)
    expect(Number(persisted!.longitude)).toBe(5.0)
  })

  it("returns [] when Photon is unreachable", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("network error")
    )

    const result = await caller().autocomplete({ q: "Wwwunreachable" })

    expect(result).toEqual([])
    expect(consoleError).toHaveBeenCalledOnce()
  })
})
