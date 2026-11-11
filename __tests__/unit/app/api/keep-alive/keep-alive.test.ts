import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GET, HEAD } from "@/app/api/keep-alive/route"

vi.mock("@/server/db", () => ({
  db: { keepAlive: { upsert: vi.fn() } },
}))

import { db } from "@/server/db"

const makeRequest = (headers: Record<string, string> = {}, method = "GET") =>
  new Request("http://localhost/api/keep-alive", { headers, method })

describe("GET /api/keep-alive", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.KEEPALIVE_SECRET
  })

  afterEach(() => {
    delete process.env.KEEPALIVE_SECRET
  })

  it("upserts the keep-alive row and returns 200", async () => {
    const lastPingAt = new Date("2026-07-12T06:17:00.000Z")
    vi.mocked(db.keepAlive.upsert).mockResolvedValueOnce({
      id: 1,
      lastPingAt,
      pingCount: 42,
    })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      db: "ok",
      lastPingAt: lastPingAt.toISOString(),
      pingCount: 42,
    })
    expect(db.keepAlive.upsert).toHaveBeenCalledOnce()
  })

  it("returns 503 with db unavailable when the write throws", async () => {
    vi.mocked(db.keepAlive.upsert).mockRejectedValueOnce(
      new Error("connection refused")
    )

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body).toEqual({ ok: false, db: "unavailable" })
  })

  it("returns 401 when a secret is set and the bearer token is missing or wrong", async () => {
    process.env.KEEPALIVE_SECRET = "s3cret"

    const res = await GET(makeRequest({ authorization: "Bearer wrong" }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toEqual({ ok: false, error: "unauthorized" })
    expect(db.keepAlive.upsert).not.toHaveBeenCalled()
  })

  it("allows the request when the secret is set and the bearer token matches", async () => {
    process.env.KEEPALIVE_SECRET = "s3cret"
    vi.mocked(db.keepAlive.upsert).mockResolvedValueOnce({
      id: 1,
      lastPingAt: new Date("2026-07-12T06:17:00.000Z"),
      pingCount: 1,
    })

    const res = await GET(makeRequest({ authorization: "Bearer s3cret" }))

    expect(res.status).toBe(200)
    expect(db.keepAlive.upsert).toHaveBeenCalledOnce()
  })

  it("HEAD pings the DB too and returns the status without a body", async () => {
    process.env.KEEPALIVE_SECRET = "s3cret"
    vi.mocked(db.keepAlive.upsert).mockResolvedValueOnce({
      id: 1,
      lastPingAt: new Date("2026-07-12T06:17:00.000Z"),
      pingCount: 2,
    })

    const res = await HEAD(
      makeRequest({ authorization: "Bearer s3cret" }, "HEAD")
    )

    expect(res.status).toBe(200)
    expect(await res.text()).toBe("")
    expect(db.keepAlive.upsert).toHaveBeenCalledOnce()
  })

  it("HEAD returns 401 without the bearer token", async () => {
    process.env.KEEPALIVE_SECRET = "s3cret"

    const res = await HEAD(makeRequest({}, "HEAD"))

    expect(res.status).toBe(401)
    expect(db.keepAlive.upsert).not.toHaveBeenCalled()
  })
})
