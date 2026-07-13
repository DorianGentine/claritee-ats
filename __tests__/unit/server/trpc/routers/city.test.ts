import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { cityRouter } from "@/server/trpc/routers/city"
import type { Context } from "@/server/trpc/context"

const queryRaw = vi.fn()
const upsert = vi.fn()
const findUnique = vi.fn()

const makeCtx = (): Context =>
  ({
    db: {
      $queryRaw: queryRaw,
      city: { upsert, findUnique },
    },
    user: null,
    companyId: null,
    headers: new Headers(),
  }) as unknown as Context

const caller = () => cityRouter.createCaller(makeCtx())

describe("city.autocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns [] without hitting the DB when q has fewer than 3 chars", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const result = await caller().autocomplete({ q: "Pa" })

    expect(result).toEqual([])
    expect(queryRaw).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("returns local DB results directly without calling Photon", async () => {
    const paris = {
      id: "city-paris",
      name: "Paris",
      region: "Île-de-France",
      country: "France",
    }
    queryRaw.mockResolvedValueOnce([paris])
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const result = await caller().autocomplete({ q: "Par" })

    expect(result).toEqual([paris])
    expect(queryRaw).toHaveBeenCalledOnce()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })

  it("falls back to Photon, upserts new cities and returns them", async () => {
    queryRaw.mockResolvedValueOnce([])
    upsert.mockResolvedValueOnce({
      id: "city-bratislava",
      name: "Bratislava",
      region: "Bratislavský kraj",
      country: "Slovaquie",
    })

    const photonPayload = {
      features: [
        {
          properties: {
            name: "Bratislava",
            state: "Bratislavský kraj",
            country: "Slovaquie",
          },
          geometry: { coordinates: [17.1077, 48.1486] },
        },
      ],
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(photonPayload), { status: 200 })
    )

    const result = await caller().autocomplete({ q: "Bra" })

    expect(upsert).toHaveBeenCalledOnce()
    expect(upsert).toHaveBeenCalledWith({
      where: { name_country: { name: "Bratislava", country: "Slovaquie" } },
      update: {},
      create: {
        name: "Bratislava",
        region: "Bratislavský kraj",
        country: "Slovaquie",
        latitude: 48.1486,
        longitude: 17.1077,
      },
    })
    expect(result).toEqual([
      {
        id: "city-bratislava",
        name: "Bratislava",
        region: "Bratislavský kraj",
        country: "Slovaquie",
      },
    ])
    // AC 9 — pas de coordonnées exposées
    expect(result[0]).not.toHaveProperty("latitude")
    expect(result[0]).not.toHaveProperty("longitude")
  })

  it("returns [] when Photon is unreachable", async () => {
    queryRaw.mockResolvedValueOnce([])
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("network error")
    )

    const result = await caller().autocomplete({ q: "Xyz" })

    expect(result).toEqual([])
    expect(upsert).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it("returns [] without upserting when Photon responds non-2xx", async () => {
    queryRaw.mockResolvedValueOnce([])
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ features: [] }), { status: 429 })
    )

    const result = await caller().autocomplete({ q: "Too" })

    expect(result).toEqual([])
    expect(upsert).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it("skips Photon features missing name/country or coordinates", async () => {
    queryRaw.mockResolvedValueOnce([])
    const photonPayload = {
      features: [
        { properties: { name: "  ", country: "France" } }, // nom vide
        { properties: { name: "Nulltown" } }, // pays manquant
        {
          properties: { name: "NoCoords", country: "France" },
          geometry: { coordinates: ["x", "y"] },
        }, // coords non numériques
      ],
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(photonPayload), { status: 200 })
    )

    const result = await caller().autocomplete({ q: "Bad" })

    expect(result).toEqual([])
    expect(upsert).not.toHaveBeenCalled()
  })

  it("returns [] when Photon returns no features", async () => {
    queryRaw.mockResolvedValueOnce([])
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const result = await caller().autocomplete({ q: "Emp" })

    expect(result).toEqual([])
    expect(upsert).not.toHaveBeenCalled()
  })

  it("recovers a concurrently-created city when upsert fails (P2002 race)", async () => {
    queryRaw.mockResolvedValueOnce([])
    upsert.mockRejectedValueOnce(new Error("Unique constraint failed"))
    findUnique.mockResolvedValueOnce({
      id: "city-lyon",
      name: "Lyon",
      region: "Auvergne-Rhône-Alpes",
      country: "France",
    })

    const photonPayload = {
      features: [
        {
          properties: { name: "Lyon", state: "Auvergne-Rhône-Alpes", country: "France" },
          geometry: { coordinates: [4.8357, 45.764] },
        },
      ],
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(photonPayload), { status: 200 })
    )

    const result = await caller().autocomplete({ q: "Lyo" })

    expect(findUnique).toHaveBeenCalledOnce()
    expect(result).toEqual([
      {
        id: "city-lyon",
        name: "Lyon",
        region: "Auvergne-Rhône-Alpes",
        country: "France",
      },
    ])
  })

  it("keeps already-collected cities when one upsert fails unrecoverably", async () => {
    queryRaw.mockResolvedValueOnce([])
    upsert
      .mockResolvedValueOnce({
        id: "city-nice",
        name: "Nice",
        region: "PACA",
        country: "France",
      })
      .mockRejectedValueOnce(new Error("db down"))
    findUnique.mockResolvedValueOnce(null)
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    const photonPayload = {
      features: [
        {
          properties: { name: "Nice", state: "PACA", country: "France" },
          geometry: { coordinates: [7.2619, 43.7102] },
        },
        {
          properties: { name: "Nancy", state: "Grand Est", country: "France" },
          geometry: { coordinates: [6.1844, 48.6921] },
        },
      ],
    }
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(photonPayload), { status: 200 })
    )

    const result = await caller().autocomplete({ q: "Nic" })

    // La première ville est conservée malgré l'échec de la seconde.
    expect(result).toEqual([
      { id: "city-nice", name: "Nice", region: "PACA", country: "France" },
    ])
    expect(consoleError).toHaveBeenCalledOnce()
  })
})
