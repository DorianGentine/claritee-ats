export const dynamic = "force-dynamic";

import { db } from "@/server/db";

export const GET = async () => {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "ok" });
  } catch {
    return Response.json({ ok: false, db: "unavailable" }, { status: 503 });
  }
};
