export const dynamic = "force-dynamic";

import { db } from "@/server/db";

// Maintient la DB Supabase active (plan gratuit : pause après 7 j d'inactivité).
// Écrit une ligne unique dans _keepalive pour générer une activité réelle et
// observable. Déclenché par un cron GitHub Actions (~1×/jour).
// Protégé par un bearer secret si KEEPALIVE_SECRET est défini.
export const GET = async (request: Request) => {
  const secret = process.env.KEEPALIVE_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const row = await db.keepAlive.upsert({
      where: { id: 1 },
      create: { id: 1, pingCount: 1 },
      update: { pingCount: { increment: 1 } },
    });
    return Response.json({
      ok: true,
      db: "ok",
      lastPingAt: row.lastPingAt,
      pingCount: row.pingCount,
    });
  } catch {
    return Response.json({ ok: false, db: "unavailable" }, { status: 503 });
  }
};
