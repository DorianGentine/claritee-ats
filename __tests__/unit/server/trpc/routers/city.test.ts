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

/** Réponse Photon vide (200, pas de feature), fraîche à chaque appel. */
const emptyPhotonResponse = () =>
  new Response(JSON.stringify({}), { status: 200 })

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
    // Les 3 bbox (Europe, Antilles/Guyane, Océan Indien) sont toujours
    // interrogées en parallèle : seule la 1ère (Europe) a une correspondance.
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(photonPayload), { status: 200 })
      )
      .mockResolvedValueOnce(emptyPhotonResponse())
      .mockResolvedValueOnce(emptyPhotonResponse())

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
    // Les 3 appels parallèles échouent tous (persistant, pas juste "once").
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"))

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
    // Nouvelle Response à chaque appel (le body ne se lit qu'une fois).
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
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
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(photonPayload), { status: 200 })
      )
      .mockResolvedValueOnce(emptyPhotonResponse())
      .mockResolvedValueOnce(emptyPhotonResponse())

    const result = await caller().autocomplete({ q: "Bad" })

    expect(result).toEqual([])
    expect(upsert).not.toHaveBeenCalled()
  })

  it("returns [] when Photon returns no features in any bbox", async () => {
    queryRaw.mockResolvedValueOnce([])
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => emptyPhotonResponse())

    const result = await caller().autocomplete({ q: "Emp" })

    expect(result).toEqual([])
    expect(upsert).not.toHaveBeenCalled()
    // Europe, Antilles/Guyane, Océan Indien : les 3 bbox sont interrogées.
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it("merges a match found only in the Antilles/Guyane bbox", async () => {
    queryRaw.mockResolvedValueOnce([])
    upsert.mockResolvedValueOnce({
      id: "city-fort-de-france",
      name: "Fort-de-France",
      region: null,
      country: "France",
    })

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(emptyPhotonResponse()) // Europe
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            features: [
              {
                properties: { name: "Fort-de-France", country: "France" },
                geometry: { coordinates: [-61.0742, 14.6161] },
              },
            ],
          }),
          { status: 200 }
        )
      ) // Antilles/Guyane
      .mockResolvedValueOnce(emptyPhotonResponse()) // Océan Indien

    const result = await caller().autocomplete({ q: "Fort" })

    expect(result).toEqual([
      {
        id: "city-fort-de-france",
        name: "Fort-de-France",
        region: null,
        country: "France",
      },
    ])
    // Les 3 bbox sont toujours interrogées en parallèle, pas d'arrêt anticipé.
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    const antillesCallUrl = fetchSpy.mock.calls[1][0] as string
    expect(antillesCallUrl).toContain("bbox=-62,2,-51,17")
  })

  it("merges a match found only in the Océan Indien bbox", async () => {
    queryRaw.mockResolvedValueOnce([])
    upsert.mockResolvedValueOnce({
      id: "city-saint-denis",
      name: "Saint-Denis",
      region: null,
      country: "France",
    })

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(emptyPhotonResponse()) // Europe
      .mockResolvedValueOnce(emptyPhotonResponse()) // Antilles/Guyane
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            features: [
              {
                properties: { name: "Saint-Denis", country: "France" },
                geometry: { coordinates: [55.4504, -20.8789] },
              },
            ],
          }),
          { status: 200 }
        )
      ) // Océan Indien

    const result = await caller().autocomplete({ q: "Saint-Denis" })

    expect(result).toEqual([
      {
        id: "city-saint-denis",
        name: "Saint-Denis",
        region: null,
        country: "France",
      },
    ])
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    const oceanIndienCallUrl = fetchSpy.mock.calls[2][0] as string
    expect(oceanIndienCallUrl).toContain("bbox=44.5,-22,56,-12")
  })

  it("still includes a DROM-COM match even when Europe also returns a coincidental match", async () => {
    // Non-régression : avant le correctif, la boucle s'arrêtait dès qu'une
    // bbox non-vide était trouvée (Europe contient presque toujours une
    // correspondance de préfixe), donc "Fort-de-France" n'était jamais
    // interrogé même quand la vraie ville visée était en Antilles/Guyane.
    queryRaw.mockResolvedValueOnce([])
    upsert
      .mockResolvedValueOnce({
        id: "city-forli",
        name: "Forlì",
        region: "Émilie-Romagne",
        country: "Italie",
      })
      .mockResolvedValueOnce({
        id: "city-fort-de-france",
        name: "Fort-de-France",
        region: null,
        country: "France",
      })

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            features: [
              {
                properties: {
                  name: "Forlì",
                  state: "Émilie-Romagne",
                  country: "Italie",
                },
                geometry: { coordinates: [12.0401, 44.2226] },
              },
            ],
          }),
          { status: 200 }
        )
      ) // Europe : un résultat non pertinent, mais NON vide
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            features: [
              {
                properties: { name: "Fort-de-France", country: "France" },
                geometry: { coordinates: [-61.0742, 14.6161] },
              },
            ],
          }),
          { status: 200 }
        )
      ) // Antilles/Guyane : la vraie correspondance recherchée
      .mockResolvedValueOnce(emptyPhotonResponse()) // Océan Indien

    const result = await caller().autocomplete({ q: "For" })

    expect(result).toEqual([
      {
        id: "city-forli",
        name: "Forlì",
        region: "Émilie-Romagne",
        country: "Italie",
      },
      {
        id: "city-fort-de-france",
        name: "Fort-de-France",
        region: null,
        country: "France",
      },
    ])
    expect(fetchSpy).toHaveBeenCalledTimes(3)
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
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(photonPayload), { status: 200 })
      )
      .mockResolvedValueOnce(emptyPhotonResponse())
      .mockResolvedValueOnce(emptyPhotonResponse())

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
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(photonPayload), { status: 200 })
      )
      .mockResolvedValueOnce(emptyPhotonResponse())
      .mockResolvedValueOnce(emptyPhotonResponse())

    const result = await caller().autocomplete({ q: "Nic" })

    // La première ville est conservée malgré l'échec de la seconde.
    expect(result).toEqual([
      { id: "city-nice", name: "Nice", region: "PACA", country: "France" },
    ])
    expect(consoleError).toHaveBeenCalledOnce()
  })
})
