import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const migrationsPath = join(process.cwd(), "prisma", "migrations");

const readMigration = (name: string) =>
  readFileSync(join(migrationsPath, name, "migration.sql"), "utf-8");

const allMigrationsSql = readdirSync(migrationsPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => readMigration(entry.name))
  .join("\n");

const extractPolicies = (content: string, statement: RegExp) =>
  [...content.matchAll(statement)].map(
    ([, policyName, tableName]) => `${tableName}.${policyName}`,
  );

describe("RLS migrations", () => {
  const createdPolicies = extractPolicies(
    readMigration("20300101000000_add_rls_policies"),
    /CREATE POLICY "([^"]+)" ON "([^"]+)"/g,
  );
  const dropMigration = readMigration("20300103000000_drop_unused_rls_policies");
  const droppedPolicies = extractPolicies(
    dropMigration,
    /DROP POLICY IF EXISTS "([^"]+)" ON "([^"]+)"/g,
  );

  it("supprime chaque policy créée par la migration RLS initiale", () => {
    expect(createdPolicies.length).toBeGreaterThan(0);
    expect(droppedPolicies.toSorted()).toEqual(createdPolicies.toSorted());
  });

  it("ne recrée aucune policy", () => {
    expect(dropMigration).not.toMatch(/CREATE POLICY/);
  });

  it("active la RLS sur chaque table créée par les migrations, sans jamais la désactiver", () => {
    const createdTables = [...allMigrationsSql.matchAll(/CREATE TABLE "([^"]+)"/g)].map(
      ([, tableName]) => tableName,
    );
    const tablesWithRls = new Set(
      [...allMigrationsSql.matchAll(/ALTER TABLE "([^"]+)" ENABLE ROW LEVEL SECURITY/g)].map(
        ([, tableName]) => tableName,
      ),
    );

    expect(createdTables.length).toBeGreaterThan(0);
    expect(createdTables.filter((tableName) => !tablesWithRls.has(tableName))).toEqual([]);
    expect(allMigrationsSql).not.toMatch(/DISABLE ROW LEVEL SECURITY/);
  });
});
