import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Every .ts and .tsx file under a directory, skipping the generated Prisma client. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "generated" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

// Live prices come from the database. The price-list fixture is for tests and the seed script only, so a page that
// accidentally imports it could show stale prices without any error. This test stops that from happening.
describe("live code never reads the price-list fixture", () => {
  it("no file under src/ imports src/data/packages.ts", () => {
    const root = path.join(process.cwd(), "src");
    const fixture = path.join(root, "data", "packages.ts");
    const offenders = sourceFiles(root)
      .filter((file) => file !== fixture)
      .filter((file) => /["']@\/data\/packages["']/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });
});
