// Database-free. Pure session-count rules and the registration parser. No database connection is opened.
import { describe, expect, it } from "vitest";
import { TRIAL_MAX_SESSIONS, TRIAL_MIN_SESSIONS, resolveSessionRequirements, sessionRuleFor } from "@/lib/registration/session-rules";
import { parseRegistrationInput } from "@/lib/registration/validation";

const VALID = {
  fullName: "Kasun Silva",
  birthday: "2001-03-04",
  nicNumber: "200112345678",
  phoneNumber: "0771234567",
  email: "kasun.silva@example.com",
  password: "correct-horse-battery",
  address: "No. 8, Temple Road, Galle",
};

const trial = (packageId: string, selections: unknown) => resolveSessionRequirements(packageId, selections);

describe("Regular training is fixed at 15 sessions per vehicle", () => {
  it("resolves Car and Van to 15 Car and 15 Van, with no client input", () => {
    const result = trial("regular-car-van", undefined);
    expect(result).toEqual({
      ok: true,
      requirements: [
        { vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 15 },
        { vehicleType: "VAN", trainingType: "REGULAR", requiredSessions: 15 },
      ],
    });
  });

  it("refuses a client-supplied count other than 15, so the browser cannot change the Regular count", () => {
    const tampered = [
      { vehicleType: "CAR", requiredSessions: 3 },
      { vehicleType: "VAN", requiredSessions: 15 },
    ];
    expect(trial("regular-car-van", tampered).ok).toBe(false);
    expect(trial("regular-car-van", [{ vehicleType: "CAR", requiredSessions: 15 }, { vehicleType: "VAN", requiredSessions: 15 }]).ok).toBe(true);
  });

  it("refuses a non-list value for a Regular package", () => {
    expect(trial("regular-car-van", "15").ok).toBe(false);
  });

  it("accepts a valid Car + Van list with exactly 15 each, in either order", () => {
    const result = trial("regular-car-van", [
      { vehicleType: "VAN", requiredSessions: 15 },
      { vehicleType: "CAR", requiredSessions: 15 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.requirements?.map((r) => r.vehicleType).sort()).toEqual(["CAR", "VAN"]);
  });

  it("refuses a duplicate vehicle identity, even when the list has the right length", () => {
    expect(
      trial("regular-car-van", [
        { vehicleType: "CAR", requiredSessions: 15 },
        { vehicleType: "CAR", requiredSessions: 15 },
      ]).ok,
    ).toBe(false);
  });

  it("refuses an unrelated vehicle in a Car + Van package, even with the right count", () => {
    expect(
      trial("regular-car-van", [
        { vehicleType: "CAR", requiredSessions: 15 },
        { vehicleType: "MOTORCYCLE", requiredSessions: 15 },
      ]).ok,
    ).toBe(false);
  });

  it("refuses a Car + Van list that is missing the Car or the Van", () => {
    expect(trial("regular-car-van", [{ vehicleType: "CAR", requiredSessions: 15 }]).ok).toBe(false);
    expect(trial("regular-car-van", [{ vehicleType: "VAN", requiredSessions: 15 }]).ok).toBe(false);
  });

  it("refuses an empty selection list", () => {
    expect(trial("regular-car-van", []).ok).toBe(false);
  });

  it.each([14, 16, 0, 2.5, "15", null])("refuses an incorrect Regular count of %s", (count) => {
    expect(
      trial("regular-car-van", [
        { vehicleType: "CAR", requiredSessions: count },
        { vehicleType: "VAN", requiredSessions: 15 },
      ]).ok,
    ).toBe(false);
  });

  it("refuses an entry that is not an object", () => {
    expect(trial("regular-car-van", ["CAR", { vehicleType: "VAN", requiredSessions: 15 }]).ok).toBe(false);
  });

  it("with no client selections, the server generates 15 for Car and Van", () => {
    expect(trial("regular-car-van", undefined)).toEqual({
      ok: true,
      requirements: [
        { vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 15 },
        { vehicleType: "VAN", trainingType: "REGULAR", requiredSessions: 15 },
      ],
    });
  });
});

describe("Trial Preparation: the student chooses 1 to 5 sessions per vehicle", () => {
  it("uses the proposed range 1 to 5, held in one place", () => {
    expect([TRIAL_MIN_SESSIONS, TRIAL_MAX_SESSIONS]).toEqual([1, 5]);
  });

  it.each([1, 5])("accepts the minimum and maximum (%i) for a single-vehicle Trial", (count) => {
    expect(trial("trial-car", [{ vehicleType: "CAR", requiredSessions: count }])).toEqual({
      ok: true,
      requirements: [{ vehicleType: "CAR", trainingType: "TRIAL_PREPARATION", requiredSessions: count }],
    });
  });

  it.each([0, 6, 15, -1])("refuses %i for a Trial vehicle", (count) => {
    expect(trial("trial-car", [{ vehicleType: "CAR", requiredSessions: count } ]).ok).toBe(false);
  });

  it.each([2.5, "3", null, undefined, Number.NaN])("refuses %s as a Trial count", (count) => {
    expect(trial("trial-car", [{ vehicleType: "CAR", requiredSessions: count }]).ok).toBe(false);
  });

  it("refuses a missing selection for a Trial package", () => {
    expect(trial("trial-car", undefined).ok).toBe(false);
    expect(trial("trial-car", []).ok).toBe(false);
  });
});

describe("combined Trial packages: each vehicle is validated independently", () => {
  it("keeps a different count for each vehicle, and one vehicle does not change another", () => {
    const result = trial("trial-car-motorcycle", [
      { vehicleType: "CAR", requiredSessions: 2 },
      { vehicleType: "MOTORCYCLE", requiredSessions: 5 },
    ]);
    expect(result).toEqual({
      ok: true,
      requirements: [
        { vehicleType: "CAR", trainingType: "TRIAL_PREPARATION", requiredSessions: 2 },
        { vehicleType: "MOTORCYCLE", trainingType: "TRIAL_PREPARATION", requiredSessions: 5 },
      ],
    });
  });

  it("refuses a missing vehicle", () => {
    expect(trial("trial-car-motorcycle", [{ vehicleType: "CAR", requiredSessions: 2 }]).ok).toBe(false);
  });

  it("refuses a duplicate vehicle, even when the list is the right length", () => {
    expect(
      trial("trial-car-motorcycle", [
        { vehicleType: "CAR", requiredSessions: 2 },
        { vehicleType: "CAR", requiredSessions: 3 },
      ]).ok,
    ).toBe(false);
  });

  it("refuses a vehicle that is not in the package", () => {
    expect(
      trial("trial-car-motorcycle", [
        { vehicleType: "CAR", requiredSessions: 2 },
        { vehicleType: "VAN", requiredSessions: 2 },
      ]).ok,
    ).toBe(false);
  });

  it("refuses an extra vehicle beyond the package", () => {
    expect(
      trial("trial-car", [
        { vehicleType: "CAR", requiredSessions: 2 },
        { vehicleType: "VAN", requiredSessions: 2 },
      ]).ok,
    ).toBe(false);
  });

  it("refuses an unsupported vehicle name", () => {
    expect(trial("trial-car", [{ vehicleType: "BUS", requiredSessions: 2 }]).ok).toBe(false);
  });
});

describe("other packages keep their existing behaviour", () => {
  it("returns no session requirements for per-session packages", () => {
    expect(sessionRuleFor("daily-car")).toBeNull();
    expect(trial("daily-car", undefined)).toEqual({ ok: true, requirements: null });
  });

  it("gives an Additional vehicle package a mixed rule: Regular vehicle fixed, Trial vehicle chosen", () => {
    expect(sessionRuleFor("extra-car-motorcycle")).toEqual({ kind: "MIXED", regular: "CAR", trial: ["MOTORCYCLE"] });
  });

  it("returns no requirements for an unknown package, so package-availability checks still decide", () => {
    expect(sessionRuleFor("does-not-exist")).toBeNull();
    expect(trial("does-not-exist", undefined)).toEqual({ ok: true, requirements: null });
  });
});

describe("the registration parser applies the same rule", () => {
  it("parses a Regular application with no selections and attaches the fixed 15", () => {
    const parsed = parseRegistrationInput({ ...VALID, packageId: "regular-car-van" });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.input.sessionRequirements?.every((r) => r.requiredSessions === 15)).toBe(true);
  });

  it("refuses a Trial application with an out-of-range count and names the field", () => {
    const parsed = parseRegistrationInput({ ...VALID, packageId: "trial-car", sessionSelections: [{ vehicleType: "CAR", requiredSessions: 9 }] });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors.sessionSelections).toBeTruthy();
  });

  it("accepts a valid Trial application and keeps its counts", () => {
    const parsed = parseRegistrationInput({ ...VALID, packageId: "trial-car", sessionSelections: [{ vehicleType: "CAR", requiredSessions: 4 }] });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.input.sessionRequirements).toEqual([{ vehicleType: "CAR", trainingType: "TRIAL_PREPARATION", requiredSessions: 4 }]);
  });
});
