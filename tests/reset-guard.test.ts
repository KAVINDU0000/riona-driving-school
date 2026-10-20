// Database-free. Proves the destructive helpers refuse the shared team-testing branch before any query runs.
import { afterEach, describe, expect, it } from "vitest";
import { refuseSharedDatabase } from "./helpers";

const saved = process.env.TEST_TARGET;

afterEach(() => {
  if (saved === undefined) delete process.env.TEST_TARGET;
  else process.env.TEST_TARGET = saved;
});

describe("destructive helpers refuse the shared team-testing branch", () => {
  it("refuseSharedDatabase throws when the target is team-testing", () => {
    process.env.TEST_TARGET = "team-testing";
    expect(() => refuseSharedDatabase()).toThrow(/shared tables/);
  });

  it("does not refuse the local target", () => {
    delete process.env.TEST_TARGET;
    expect(() => refuseSharedDatabase()).not.toThrow();
  });
});
