import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("RLS migration", () => {
  const migrationsPath = join(
    process.cwd(),
    "prisma",
    "migrations",
  );

  const expectedPolicies = [
    "company_select_own",
    "company_update_own",
    "user_select_same_company",
    "user_update_self",
    "invitation_select",
    "invitation_insert",
    "invitation_update",
    "invitation_delete",
  ];

  it("has migration folder for RLS policies", () => {
    const rlsMigration = join(migrationsPath, "20300101000000_add_rls_policies");
    expect(existsSync(rlsMigration)).toBe(true);
  });

  it("enables RLS on Company, User, Invitation", () => {
    const rlsMigrationPath = join(
      migrationsPath,
      "20300101000000_add_rls_policies",
      "migration.sql",
    );
    const content = readFileSync(rlsMigrationPath, "utf-8");
    expect(content).toContain('ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('ALTER TABLE "User" ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY');
  });

  it("contains expected RLS policies", () => {
    const rlsMigrationPath = join(
      migrationsPath,
      "20300101000000_add_rls_policies",
      "migration.sql",
    );
    const content = readFileSync(rlsMigrationPath, "utf-8");

    for (const policy of expectedPolicies) {
      expect(content, `Missing policy: ${policy}`).toContain(
        `"${policy}"`,
      );
    }
  });
});
