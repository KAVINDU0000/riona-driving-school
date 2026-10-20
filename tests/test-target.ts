/**
 * The only database targets that browser specs, seed scripts and the session helper accept. Each is an exact match on host,
 * port and database name, with the postgresql: protocol. The local target keeps its original rule: only sslmode and
 * channel_binding are allowed. The disposable target allows no query parameters at all.
 *
 * Nothing here connects to a database. Team-testing is not accepted by these checks, and the team-testing run stays
 * on its own guard (tests/setup.ts and playwright.team-testing.config.ts).
 */
export const LOCAL_TEST_TARGET = { hostname: "localhost", port: "15432", pathname: "/riona_fresh_test" };
export const DISPOSABLE_TEST_TARGET = { hostname: "127.0.0.1", port: "15435", pathname: "/riona_c3_disposable" };

export function isApprovedTestUrl(url: URL): boolean {
  if (url.protocol !== "postgresql:" || url.hash !== "") return false;
  const local =
    url.hostname === LOCAL_TEST_TARGET.hostname &&
    url.port === LOCAL_TEST_TARGET.port &&
    url.pathname === LOCAL_TEST_TARGET.pathname &&
    [...url.searchParams.keys()].every((k, i, all) => (k === "sslmode" || k === "channel_binding") && all.indexOf(k) === i);
  const disposable =
    url.hostname === DISPOSABLE_TEST_TARGET.hostname &&
    url.port === DISPOSABLE_TEST_TARGET.port &&
    url.pathname === DISPOSABLE_TEST_TARGET.pathname &&
    url.search === "" &&
    url.username !== "" &&
    url.password !== "";
  return local || disposable;
}

/** Which approved target a URL is, or null. Used by messages and by configs that must run on one target only. */
export function approvedTestTargetName(url: URL): "local" | "disposable" | null {
  if (!isApprovedTestUrl(url)) return null;
  return url.hostname === DISPOSABLE_TEST_TARGET.hostname ? "disposable" : "local";
}
