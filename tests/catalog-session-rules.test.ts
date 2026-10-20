// Database-free. Covers every package in the source catalog (src/data/packages.ts) against its explicit rule or classification.
import { describe, expect, it } from "vitest";
import { packageGroups } from "@/data/packages";
import {
  PACKAGE_RULES,
  TRIAL_MAX_SESSIONS,
  TRIAL_MIN_SESSIONS,
  packageRuleFor,
  resolveSessionRequirements,
  sessionRuleFor,
  trialVehiclesOf,
  type SessionVehicle,
} from "@/lib/registration/session-rules";
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

const allOptions = packageGroups.flatMap((group) => group.options.map((option) => ({ ...option, group: group.label })));
const ALL_VEHICLES: SessionVehicle[] = ["CAR", "VAN", "MOTORCYCLE", "THREE_WHEELER"];

// The vehicles a Trial title names. Used only to check the explicit table against the catalog titles in this test.
function vehiclesNamedIn(name: string): SessionVehicle[] {
  const found: SessionVehicle[] = [];
  if (/\bCar\b/.test(name)) found.push("CAR");
  if (/\bVan\b/.test(name)) found.push("VAN");
  if (/Motorcycle/.test(name)) found.push("MOTORCYCLE");
  if (/Three-Wheeler/.test(name)) found.push("THREE_WHEELER");
  return found.sort();
}

const trialOptions = allOptions.filter((o) => o.group === "Official driving trial preparation");
const regularOptions = allOptions.filter((o) => o.group === "Regular training package");
const additionalOptions = allOptions.filter((o) => o.group === "Additional vehicle training");
const dailyOptions = allOptions.filter((o) => o.group === "Daily individual training");

describe("catalog coverage: every package has an explicit rule or classification", () => {
  it("covers the four package titles", () => {
    expect(packageGroups.map((g) => g.label)).toEqual([
      "Regular training package",
      "Official driving trial preparation",
      "Additional vehicle training",
      "Daily individual training",
    ]);
  });

  it.each(allOptions.map((o) => [o.id, o.name]))("%s (%s) has an entry", (id) => {
    expect(packageRuleFor(id as string)).toBeDefined();
  });

  it("has no entry for a package that is not in the catalog", () => {
    const catalogIds = new Set(allOptions.map((o) => o.id));
    const extra = Object.keys(PACKAGE_RULES).filter((id) => !catalogIds.has(id));
    expect(extra).toEqual([]);
  });

  it("counts every catalog package: 1 Regular, 11 Trial, 6 Additional vehicle, 4 Daily", () => {
    expect([regularOptions.length, trialOptions.length, additionalOptions.length, dailyOptions.length]).toEqual([1, 11, 6, 4]);
  });
});

describe("Regular training package", () => {
  it("is classified REGULAR for Car and Van, with 15 sessions per vehicle", () => {
    expect(packageRuleFor("regular-car-van")).toEqual({ kind: "REGULAR", vehicles: ["CAR", "VAN"] });
    expect(resolveSessionRequirements("regular-car-van", undefined)).toEqual({
      ok: true,
      requirements: [
        { vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 15 },
        { vehicleType: "VAN", trainingType: "REGULAR", requiredSessions: 15 },
      ],
    });
  });

  it.each([14, 16, 1, 5, 0, null, "15", 15.5])("rejects a submitted Regular count of %s", (count) => {
    expect(
      resolveSessionRequirements("regular-car-van", [
        { vehicleType: "CAR", requiredSessions: count },
        { vehicleType: "VAN", requiredSessions: 15 },
      ]).ok,
    ).toBe(false);
  });

  it("rejects an extra vehicle, a duplicate and a missing vehicle", () => {
    expect(resolveSessionRequirements("regular-car-van", [{ vehicleType: "CAR", requiredSessions: 15 }, { vehicleType: "VAN", requiredSessions: 15 }, { vehicleType: "MOTORCYCLE", requiredSessions: 15 }]).ok).toBe(false);
    expect(resolveSessionRequirements("regular-car-van", [{ vehicleType: "CAR", requiredSessions: 15 }, { vehicleType: "CAR", requiredSessions: 15 }]).ok).toBe(false);
    expect(resolveSessionRequirements("regular-car-van", [{ vehicleType: "CAR", requiredSessions: 15 }]).ok).toBe(false);
  });
});

describe("Official driving trial preparation: each vehicle is independent", () => {
  it.each(trialOptions.map((o) => [o.id, o.name]))("%s has a rule that matches its title", (id, name) => {
    expect(packageRuleFor(id as string)?.kind).toBe("TRIAL");
    expect([...trialVehiclesOf(sessionRuleFor(id as string))].sort()).toEqual(vehiclesNamedIn(name as string));
  });

  it.each(trialOptions.map((o) => o.id))("%s accepts 1 to 5 per vehicle, stored per vehicle", (id) => {
    const vehicles = [...trialVehiclesOf(sessionRuleFor(id))];
    const selections = vehicles.map((vehicleType, i) => ({ vehicleType, requiredSessions: (i % 5) + 1 }));
    const result = resolveSessionRequirements(id, selections);
    expect(result).toEqual({
      ok: true,
      requirements: vehicles.map((vehicleType, i) => ({ vehicleType, trainingType: "TRIAL_PREPARATION", requiredSessions: (i % 5) + 1 })),
    });
  });

  it.each(trialOptions.map((o) => o.id))("%s: changing one vehicle leaves every other vehicle unchanged", (id) => {
    const vehicles = [...trialVehiclesOf(sessionRuleFor(id))];
    vehicles.forEach((target, index) => {
      const selections = vehicles.map((vehicleType) => ({ vehicleType, requiredSessions: vehicleType === target ? TRIAL_MAX_SESSIONS : TRIAL_MIN_SESSIONS }));
      const result = resolveSessionRequirements(id, selections);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const byVehicle = Object.fromEntries((result.requirements ?? []).map((r) => [r.vehicleType, r.requiredSessions]));
        expect(byVehicle[target]).toBe(TRIAL_MAX_SESSIONS);
        for (const other of vehicles.filter((_, i) => i !== index)) expect(byVehicle[other]).toBe(TRIAL_MIN_SESSIONS);
      }
    });
  });

  it.each(trialOptions.map((o) => o.id))("%s rejects missing, duplicate, extra, unsupported and malformed selections", (id) => {
    const vehicles = [...trialVehiclesOf(sessionRuleFor(id))];
    const valid = vehicles.map((vehicleType) => ({ vehicleType, requiredSessions: 2 }));
    const unrelated = ALL_VEHICLES.find((v) => !vehicles.includes(v))!;
    const refused = (selections: unknown) => resolveSessionRequirements(id, selections).ok;

    expect(refused(undefined)).toBe(false);
    expect(refused(null)).toBe(false);
    expect(refused([])).toBe(false);
    expect(refused("2")).toBe(false);
    if (vehicles.length > 1) expect(refused(valid.slice(1))).toBe(false); // missing
    expect(refused([...valid, valid[0]])).toBe(false); // duplicate, extra
    expect(refused([...valid, { vehicleType: unrelated, requiredSessions: 2 }])).toBe(false); // extra vehicle
    expect(refused([{ vehicleType: "BUS", requiredSessions: 2 }, ...valid.slice(1)])).toBe(false); // unsupported
    for (const bad of [0, 6, 2.5, -1, "3", null, undefined, Number.NaN]) {
      expect(refused(valid.map((v, i) => (i === 0 ? { ...v, requiredSessions: bad } : v)))).toBe(false);
    }
  });
});

describe("Additional vehicle training: Regular vehicle fixed at 15, each Trial vehicle chosen 1 to 5", () => {
  const mixedOf = (id: string) => {
    const rule = sessionRuleFor(id);
    if (!rule || rule.kind !== "MIXED") throw new Error(`${id} is not a MIXED rule`);
    return rule;
  };

  it.each(additionalOptions.map((o) => [o.id, o.name]))("%s is MIXED and matches its title", (id, name) => {
    const rule = mixedOf(id as string);
    const [left, right] = (name as string).split(" + ");
    expect(left).toContain("Regular Training");
    expect(right).toContain("Trial Preparation");
    expect(vehiclesNamedIn(left)).toEqual([rule.regular]);
    expect([...rule.trial].sort()).toEqual(vehiclesNamedIn(right));
  });

  it.each(additionalOptions.map((o) => o.id))("%s: the Regular vehicle is 15 and the Trial vehicles are chosen", (id) => {
    const rule = mixedOf(id);
    const selections = rule.trial.map((vehicleType, i) => ({ vehicleType, requiredSessions: (i % 5) + 1 }));
    expect(resolveSessionRequirements(id, selections)).toEqual({
      ok: true,
      requirements: [
        { vehicleType: rule.regular, trainingType: "REGULAR", requiredSessions: 15 },
        ...rule.trial.map((vehicleType, i) => ({ vehicleType, trainingType: "TRIAL_PREPARATION", requiredSessions: (i % 5) + 1 })),
      ],
    });
  });

  it.each(additionalOptions.map((o) => o.id))("%s: changing one Trial vehicle leaves the others unchanged", (id) => {
    const rule = mixedOf(id);
    rule.trial.forEach((target) => {
      const selections = rule.trial.map((vehicleType) => ({ vehicleType, requiredSessions: vehicleType === target ? TRIAL_MAX_SESSIONS : TRIAL_MIN_SESSIONS }));
      const result = resolveSessionRequirements(id, selections);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const byVehicle = Object.fromEntries((result.requirements ?? []).map((r) => [r.vehicleType, r.requiredSessions]));
        expect(byVehicle[target]).toBe(TRIAL_MAX_SESSIONS);
        for (const other of rule.trial.filter((v) => v !== target)) expect(byVehicle[other]).toBe(TRIAL_MIN_SESSIONS);
        expect(byVehicle[rule.regular]).toBe(15);
      }
    });
  });

  it.each(additionalOptions.map((o) => o.id))("%s: a client count for the Regular vehicle is refused, and cannot change its 15", (id) => {
    const rule = mixedOf(id);
    const replaced = [{ vehicleType: rule.regular, requiredSessions: 3 }, ...rule.trial.slice(1).map((vehicleType) => ({ vehicleType, requiredSessions: 2 }))];
    const result = resolveSessionRequirements(id, replaced);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/set by the school/);
  });

  it.each(additionalOptions.map((o) => o.id))("%s rejects missing, duplicate, extra, unsupported and malformed selections", (id) => {
    const rule = mixedOf(id);
    const valid = rule.trial.map((vehicleType) => ({ vehicleType, requiredSessions: 2 }));
    const unrelated = ALL_VEHICLES.find((v) => v !== rule.regular && !rule.trial.includes(v))!;
    const refused = (selections: unknown) => resolveSessionRequirements(id, selections).ok;

    expect(refused(undefined)).toBe(false);
    expect(refused(null)).toBe(false);
    expect(refused([])).toBe(false);
    expect(refused("2")).toBe(false);
    if (valid.length > 1) expect(refused(valid.slice(1))).toBe(false); // missing
    expect(refused([...valid, valid[0]])).toBe(false); // duplicate
    expect(refused([...valid, { vehicleType: unrelated, requiredSessions: 2 }])).toBe(false); // extra vehicle
    expect(refused([{ vehicleType: "BUS", requiredSessions: 2 }, ...valid.slice(1)])).toBe(false); // unsupported
    expect(refused([null, ...valid.slice(1)])).toBe(false); // malformed entry
    for (const bad of [0, 6, 15, 2.5, -1, "3", null, undefined, Number.NaN]) {
      expect(refused(valid.map((v, i) => (i === 0 ? { ...v, requiredSessions: bad } : v)))).toBe(false);
    }
  });

  it.each(additionalOptions.map((o) => o.id))("%s: the parser refuses a Regular-vehicle selection and keeps the Trial counts", (id) => {
    const rule = mixedOf(id);
    const sent = [{ vehicleType: rule.regular, requiredSessions: 15 }, ...rule.trial.map((vehicleType) => ({ vehicleType, requiredSessions: 2 }))];
    expect(parseRegistrationInput({ ...VALID, packageId: id, sessionSelections: sent }).ok).toBe(false);
  });

  it("the parser stores the Regular 15 with the Trial counts for a mixed package", () => {
    const parsed = parseRegistrationInput({
      ...VALID,
      packageId: "extra-car-three-wheeler-motorcycle",
      sessionSelections: [
        { vehicleType: "THREE_WHEELER", requiredSessions: 4 },
        { vehicleType: "MOTORCYCLE", requiredSessions: 1 },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.input.sessionRequirements).toEqual([
        { vehicleType: "CAR", trainingType: "REGULAR", requiredSessions: 15 },
        { vehicleType: "THREE_WHEELER", trainingType: "TRIAL_PREPARATION", requiredSessions: 4 },
        { vehicleType: "MOTORCYCLE", trainingType: "TRIAL_PREPARATION", requiredSessions: 1 },
      ]);
    }
  });

  it("the corrected titles no longer say Daily Training for any of the six packages", () => {
    expect(additionalOptions.map((o) => o.name)).toEqual([
      "Car Regular Training + Motorcycle Trial Preparation",
      "Car Regular Training + Three-Wheeler Trial Preparation",
      "Car Regular Training + Three-Wheeler and Motorcycle Trial Preparation",
      "Van Regular Training + Motorcycle Trial Preparation",
      "Van Regular Training + Three-Wheeler Trial Preparation",
      "Van Regular Training + Three-Wheeler and Motorcycle Trial Preparation",
    ]);
    for (const option of additionalOptions) expect(option.name).not.toMatch(/Daily Training/);
  });
});

describe("standalone Daily Individual Training products are unchanged", () => {
  it("keeps their names", () => {
    expect(dailyOptions.map((o) => [o.id, o.name])).toEqual([
      ["daily-car", "Car Daily Training"],
      ["daily-van", "Van Daily Training"],
      ["daily-motorcycle", "Motorcycle Daily Training"],
      ["daily-three-wheeler", "Three-Wheeler Daily Training"],
    ]);
  });
});

describe("Daily individual training: out of scope, per-session", () => {
  it.each(dailyOptions.map((o) => o.id))("%s is classified OUT_OF_SCOPE with a stated reason", (id) => {
    const rule = packageRuleFor(id);
    expect(rule?.kind).toBe("OUT_OF_SCOPE");
    expect((rule as { reason: string }).reason).toMatch(/Per-session/);
    expect(sessionRuleFor(id)).toBeNull();
    expect(resolveSessionRequirements(id, undefined)).toEqual({ ok: true, requirements: null });
  });
});

describe("source prices are unchanged", () => {
  const expectedPrices: Record<string, number> = {
    "regular-car-van": 26000,
    "trial-three-wheeler": 10000,
    "trial-motorcycle": 8000,
    "trial-car": 15000,
    "trial-van": 15000,
    "trial-three-wheeler-motorcycle": 15000,
    "trial-three-wheeler-van": 17000,
    "trial-motorcycle-van": 16000,
    "trial-van-three-wheeler-motorcycle": 20000,
    "trial-car-three-wheeler": 17000,
    "trial-car-motorcycle": 16000,
    "trial-car-three-wheeler-motorcycle": 20000,
    "extra-car-motorcycle": 30000,
    "extra-car-three-wheeler": 31000,
    "extra-car-three-wheeler-motorcycle": 35000,
    "extra-van-motorcycle": 30000,
    "extra-van-three-wheeler": 31000,
    "extra-van-three-wheeler-motorcycle": 35000,
    "daily-car": 2000,
    "daily-van": 2000,
    "daily-motorcycle": 1000,
    "daily-three-wheeler": 1500,
  };

  it("matches the expected price for every catalog package", () => {
    expect(Object.fromEntries(allOptions.map((o) => [o.id, o.price]))).toEqual(expectedPrices);
  });
});
