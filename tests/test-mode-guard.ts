// Import this first in a non-destructive test file. It has no imports of its own, so it runs before any module that
// creates a Prisma client. It does not replace tests/setup.ts: the target checks there still run for every test file.
if (process.env.TEST_MODE !== "non-destructive") {
  throw new Error("Refusing to run: set TEST_MODE=non-destructive to run this test. It does not touch tests/setup.ts target checks.");
}
