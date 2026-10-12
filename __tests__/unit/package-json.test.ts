import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

const EXACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

type PackageJson = Partial<
  Record<(typeof DEPENDENCY_FIELDS)[number], Record<string, string>>
>;

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8")
) as PackageJson;

describe("package.json", () => {
  it("déclare toutes les dépendances en version exacte (ni ^, ni ~, ni version partielle)", () => {
    const nonExactDependencies = DEPENDENCY_FIELDS.flatMap((field) =>
      Object.entries(packageJson[field] ?? {})
        .filter(([, version]) => !EXACT_VERSION_PATTERN.test(version))
        .map(([name, version]) => `${field} › ${name}: ${version}`)
    );

    expect(nonExactDependencies).toEqual([]);
  });
});
