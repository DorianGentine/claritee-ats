export const dynamic = "force-dynamic"

import { db } from "@/server/db"

// Maintient la DB Supabase active (plan gratuit : pause après 7 j d'inactivité).
// Écrit une ligne unique dans _keepalive pour générer une activité réelle et
// observable. Appelé par un moniteur UptimeRobot (auth Bearer), en GET ou en HEAD.
// Protégé par un bearer secret si KEEPALIVE_SECRET est défini.
const ping = async (request: Request) => {
  const secret = process.env.KEEPALIVE_SECRET
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  try {
    const row = await db.keepAlive.upsert({
      where: { id: 1 },
      create: { id: 1, pingCount: 1 },
      update: { pingCount: { increment: 1 } },
    })
    return Response.json({
      ok: true,
      db: "ok",
      lastPingAt: row.lastPingAt,
      pingCount: row.pingCount,
    })
  } catch {
    return Response.json({ ok: false, db: "unavailable" }, { status: 503 })
  }
}

export const GET = ping

/** Même ping que GET, sans corps (les moniteurs envoient souvent des HEAD). */
export const HEAD = async (request: Request) => {
  const response = await ping(request)
  return new Response(null, { status: response.status })
}
