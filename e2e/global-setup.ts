import { packageGroups } from "../src/data/packages";

// The project has no type declarations for pg, so the small part used here is typed locally.
type PgClient = {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<unknown>;
  end(): Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports -- pg has no types here, and an import would fail type checking.
const { Client } = require("pg") as { Client: new (config: { connectionString: string }) => PgClient };

/**
 * Before the browser tests, the disposable test database gets the 22 packages from src/data/packages.ts,
 * so the registration API has real packages to check. Other test files clear these tables, so this runs
 * once per Playwright run. It refuses to run anywhere except localhost:15432/riona_fresh_test.
 */
const PACKAGE_TYPE_BY_GROUP: Record<string, "REGULAR" | "TRIAL_PREPARATION" | "ADDITIONAL_VEHICLE" | "DAILY"> = {
  "Regular training package": "REGULAR",
  "Official driving trial preparation": "TRIAL_PREPARATION",
  "Additional vehicle training": "ADDITIONAL_VEHICLE",
  "Daily individual training": "DAILY",
};

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set.");
  const parsed = new URL(url);
  if (!(parsed.hostname === "localhost" && parsed.port === "15432" && parsed.pathname === "/riona_fresh_test")) {
    throw new Error("Refusing to seed: target is not localhost:15432/riona_fresh_test.");
  }

  const rows = packageGroups.flatMap((group) =>
    group.options.map((option) => {
      const packageType = PACKAGE_TYPE_BY_GROUP[group.label];
      if (!packageType) throw new Error(`Unmapped package group: ${group.label}`);
      const isDaily = packageType === "DAILY";
      return {
        id: option.id,
        name: option.name,
        packageType,
        price: `${option.price}.00`,
        durationDays: option.id === "regular-car-van" ? 15 : null,
        sessionDurationMinutes: isDaily ? (option.id.startsWith("daily-car") || option.id.startsWith("daily-van") ? 30 : 60) : null,
      };
    }),
  );

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query('TRUNCATE TABLE "RegistrationRequest", "TrainingPackage" CASCADE');
    for (const [index, row] of rows.entries()) {
      await client.query(
        `insert into "TrainingPackage" (id, name, "packageType", description, price, "durationDays", "sessionDurationMinutes", "isActive", "sortOrder", "updatedAt")
         values ($1, $2, $3::"PackageType", null, $4::numeric, $5, $6, true, $7, now())`,
        [row.id, row.name, row.packageType, row.price, row.durationDays, row.sessionDurationMinutes, index + 1],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}
