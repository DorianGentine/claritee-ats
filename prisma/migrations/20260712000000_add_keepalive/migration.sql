-- Table système de keep-alive : une seule ligne (id = 1), mise à jour par
-- /api/keep-alive via un cron quotidien pour empêcher la mise en pause
-- hebdomadaire de la DB Supabase (plan gratuit).

-- CreateTable
CREATE TABLE "_keepalive" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastPingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "_keepalive_pkey" PRIMARY KEY ("id")
);

-- RLS : activé sans policy → seul le rôle postgres (Prisma, BYPASSRLS) y accède.
-- Les rôles anon/authenticated (client Supabase) sont refusés par défaut.
ALTER TABLE "_keepalive" ENABLE ROW LEVEL SECURITY;
