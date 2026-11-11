import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

/**
 * L'API REST Supabase (Data API) reste fermée sur `public` : l'app passe par Prisma
 * (rôle propriétaire) et le client admin, jamais par anon / authenticated.
 * `scripts/test-db.sh` reproduit les droits par défaut d'un projet Supabase avant
 * les migrations : ce test vérifie donc que les migrations referment tout, et
 * détecte une future migration qui rouvrirait un droit ou oublierait la RLS.
 */
const API_ROLES = ["anon", "authenticated"] as const;
const TABLE_PRIVILEGES =
  "SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER";
const SEQUENCE_PRIVILEGES = "USAGE, SELECT, UPDATE";

type ExposedObject = { name: string; role: string };

describe.runIf(!!connectionString)("Supabase Data API closed on public", () => {
  let db: PrismaClient;

  beforeAll(() => {
    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: connectionString! }),
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("checks the tables of every migration", async () => {
    const [{ count }] = await db.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    `;
    // Garde-fou : un test qui ne verrait aucune table passerait à vide.
    expect(count).toBeGreaterThan(15);
  });

  it("grants no privilege on tables and views to anon / authenticated", async () => {
    const exposed: ExposedObject[] = [];
    for (const role of API_ROLES) {
      exposed.push(
        ...(await db.$queryRaw<ExposedObject[]>`
          SELECT c.relname AS name, ${role} AS role FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
            AND has_table_privilege(${role}, c.oid, ${TABLE_PRIVILEGES})
        `)
      );
    }
    expect(exposed).toEqual([]);
  });

  it("enables RLS on every table", async () => {
    const withoutRls = await db.$queryRaw<{ name: string }[]>`
      SELECT c.relname AS name FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
    `;
    expect(withoutRls).toEqual([]);
  });

  it("grants no privilege on sequences to anon / authenticated", async () => {
    const exposed: ExposedObject[] = [];
    for (const role of API_ROLES) {
      exposed.push(
        ...(await db.$queryRaw<ExposedObject[]>`
          SELECT c.relname AS name, ${role} AS role FROM pg_sequence s
          JOIN pg_class c ON c.oid = s.seqrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND has_sequence_privilege(${role}, c.oid, ${SEQUENCE_PRIVILEGES})
        `)
      );
    }
    expect(exposed).toEqual([]);
  });

  it("lets anon / authenticated execute no function of the app", async () => {
    const exposed: ExposedObject[] = [];
    for (const role of API_ROLES) {
      // Fonctions des extensions (unaccent, pg_trgm) exclues : hors de nos migrations.
      exposed.push(
        ...(await db.$queryRaw<ExposedObject[]>`
          SELECT p.oid::regprocedure::text AS name, ${role} AS role FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND NOT EXISTS (
              SELECT 1 FROM pg_depend d
              WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
            )
            AND has_function_privilege(${role}, p.oid, 'EXECUTE')
        `)
      );
    }
    expect(exposed).toEqual([]);
  });

  it("keeps objects created by future migrations closed", async () => {
    const rollback = new Error("rollback");
    let probe: { role: string; table: boolean; func: boolean }[] = [];

    // Table et fonction créées puis annulées : elles reçoivent les droits par défaut.
    await db
      .$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          'CREATE TABLE public."_data_api_probe" (id int)'
        );
        await tx.$executeRawUnsafe(
          'CREATE FUNCTION public."_data_api_probe_fn"() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$'
        );
        probe = await tx.$queryRaw<typeof probe>`
          SELECT role,
            has_table_privilege(role, 'public."_data_api_probe"', ${TABLE_PRIVILEGES}) AS table,
            has_function_privilege(role, 'public."_data_api_probe_fn"()', 'EXECUTE') AS func
          FROM unnest(ARRAY['anon', 'authenticated']) AS role
        `;
        throw rollback;
      })
      .catch((error: unknown) => {
        if (error !== rollback) throw error;
      });

    expect(probe).toEqual([
      { role: "anon", table: false, func: false },
      { role: "authenticated", table: false, func: false },
    ]);
  });
});
