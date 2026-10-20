/**
 * Training session-count rules for public registration. Pure: no database and no server-only imports, so the signup
 * form and the server use the same code. This module never reads or changes a price.
 *
 * Every package in the catalog has an explicit entry in PACKAGE_RULES, either a rule or a documented classification.
 * - REGULAR: exactly 15 sessions for each vehicle in the package. The student cannot choose or change it.
 * - TRIAL: the student chooses a count for each vehicle, within the Trial range.
 * - MIXED: one Regular vehicle (fixed at 15, set by the school) plus Trial vehicles (the student chooses 1 to 5 each).
 *   Used by the Additional vehicle packages.
 * - OUT_OF_SCOPE: not an online enrollment package. The reason is recorded with the entry.
 */

/** Sessions for each Regular vehicle. Fixed by the school. */
export const REGULAR_SESSIONS_PER_VEHICLE = 15;
/**
 * The Trial range per vehicle. PROPOSED, awaiting the business owner's confirmation. Change it only here.
 */
export const TRIAL_MIN_SESSIONS = 1;
export const TRIAL_MAX_SESSIONS = 5;

export type SessionVehicle = "CAR" | "VAN" | "MOTORCYCLE" | "THREE_WHEELER";
export type SessionTrainingType = "REGULAR" | "TRIAL_PREPARATION";

export type SessionRequirement = {
  vehicleType: SessionVehicle;
  trainingType: SessionTrainingType;
  requiredSessions: number;
};

const DAILY_OUT_OF_SCOPE =
  "Per-session individual training. Not an enrollment package: online registration and approval refuse DAILY packages.";

export type SessionPackageRule =
  | { kind: "REGULAR"; vehicles: readonly SessionVehicle[] }
  | { kind: "TRIAL"; vehicles: readonly SessionVehicle[] }
  | { kind: "MIXED"; regular: SessionVehicle; trial: readonly SessionVehicle[] };

export type PackageRuleEntry = SessionPackageRule | { kind: "OUT_OF_SCOPE"; reason: string };

/**
 * Every package in src/data/packages.ts, with its explicit rule or classification. The IDs match that file. A test
 * fails if a catalog package has no entry here, so a new package cannot be added without a decision.
 */
export const PACKAGE_RULES: Record<string, PackageRuleEntry> = {
  "regular-car-van": { kind: "REGULAR", vehicles: ["CAR", "VAN"] },

  "trial-three-wheeler": { kind: "TRIAL", vehicles: ["THREE_WHEELER"] },
  "trial-motorcycle": { kind: "TRIAL", vehicles: ["MOTORCYCLE"] },
  "trial-car": { kind: "TRIAL", vehicles: ["CAR"] },
  "trial-van": { kind: "TRIAL", vehicles: ["VAN"] },
  "trial-three-wheeler-motorcycle": { kind: "TRIAL", vehicles: ["THREE_WHEELER", "MOTORCYCLE"] },
  "trial-three-wheeler-van": { kind: "TRIAL", vehicles: ["VAN", "THREE_WHEELER"] },
  "trial-motorcycle-van": { kind: "TRIAL", vehicles: ["VAN", "MOTORCYCLE"] },
  "trial-van-three-wheeler-motorcycle": { kind: "TRIAL", vehicles: ["VAN", "THREE_WHEELER", "MOTORCYCLE"] },
  "trial-car-three-wheeler": { kind: "TRIAL", vehicles: ["CAR", "THREE_WHEELER"] },
  "trial-car-motorcycle": { kind: "TRIAL", vehicles: ["CAR", "MOTORCYCLE"] },
  "trial-car-three-wheeler-motorcycle": { kind: "TRIAL", vehicles: ["CAR", "THREE_WHEELER", "MOTORCYCLE"] },

  "extra-car-motorcycle": { kind: "MIXED", regular: "CAR", trial: ["MOTORCYCLE"] },
  "extra-car-three-wheeler": { kind: "MIXED", regular: "CAR", trial: ["THREE_WHEELER"] },
  "extra-car-three-wheeler-motorcycle": { kind: "MIXED", regular: "CAR", trial: ["THREE_WHEELER", "MOTORCYCLE"] },
  "extra-van-motorcycle": { kind: "MIXED", regular: "VAN", trial: ["MOTORCYCLE"] },
  "extra-van-three-wheeler": { kind: "MIXED", regular: "VAN", trial: ["THREE_WHEELER"] },
  "extra-van-three-wheeler-motorcycle": { kind: "MIXED", regular: "VAN", trial: ["THREE_WHEELER", "MOTORCYCLE"] },

  "daily-car": { kind: "OUT_OF_SCOPE", reason: DAILY_OUT_OF_SCOPE },
  "daily-van": { kind: "OUT_OF_SCOPE", reason: DAILY_OUT_OF_SCOPE },
  "daily-motorcycle": { kind: "OUT_OF_SCOPE", reason: DAILY_OUT_OF_SCOPE },
  "daily-three-wheeler": { kind: "OUT_OF_SCOPE", reason: DAILY_OUT_OF_SCOPE },
};

/** The explicit entry for a package, or undefined when the package is not classified. */
export function packageRuleFor(packageId: string): PackageRuleEntry | undefined {
  return Object.prototype.hasOwnProperty.call(PACKAGE_RULES, packageId) ? PACKAGE_RULES[packageId] : undefined;
}

/** The count rule for a package, or null when it carries no student-facing session counts (out of scope). */
export function sessionRuleFor(packageId: string): SessionPackageRule | null {
  const entry = packageRuleFor(packageId);
  return entry && entry.kind !== "OUT_OF_SCOPE" ? entry : null;
}

/** The vehicles the student chooses a Trial count for. Empty when the package has none. */
export function trialVehiclesOf(rule: SessionPackageRule | null): readonly SessionVehicle[] {
  if (!rule) return [];
  return rule.kind === "TRIAL" ? rule.vehicles : rule.kind === "MIXED" ? rule.trial : [];
}

/** The vehicles whose count is fixed at 15 by the school. Empty when the package has none. */
export function regularVehiclesOf(rule: SessionPackageRule | null): readonly SessionVehicle[] {
  if (!rule) return [];
  return rule.kind === "REGULAR" ? rule.vehicles : rule.kind === "MIXED" ? [rule.regular] : [];
}

/** Display names for the vehicles, used in the form. */
export const SESSION_VEHICLE_LABELS: Record<SessionVehicle, string> = {
  CAR: "Car",
  VAN: "Van",
  MOTORCYCLE: "Motorcycle",
  THREE_WHEELER: "Three-wheeler",
};

export type SessionResolution =
  | { ok: true; requirements: SessionRequirement[] | null }
  | { ok: false; message: string };

const SESSION_VEHICLE_VALUES: readonly string[] = ["CAR", "VAN", "MOTORCYCLE", "THREE_WHEELER"];

type TrialOutcome = { ok: true; requirements: SessionRequirement[] } | { ok: false; message: string };

/**
 * Validates one Trial selection per vehicle in `trialVehicles`. Each vehicle is chosen once, and only the listed
 * vehicles are accepted. `fixedVehicle` is the Regular vehicle of a MIXED package, which the student never chooses.
 */
function resolveTrialSelections(trialVehicles: readonly SessionVehicle[], submitted: unknown, fixedVehicle?: SessionVehicle): TrialOutcome {
  if (!Array.isArray(submitted)) {
    return { ok: false, message: "Choose a number of sessions for each vehicle in this package." };
  }
  if (submitted.length !== trialVehicles.length) {
    return { ok: false, message: "Choose a number of sessions for each vehicle in this package, and no others." };
  }

  const seen = new Set<string>();
  const requirements: SessionRequirement[] = [];
  for (const entry of submitted) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, message: "Each session selection must name a vehicle and a number of sessions." };
    }
    const { vehicleType, requiredSessions } = entry as { vehicleType?: unknown; requiredSessions?: unknown };
    if (fixedVehicle !== undefined && vehicleType === fixedVehicle) {
      return { ok: false, message: "The Regular vehicle's sessions are set by the school and are not chosen here." };
    }
    if (typeof vehicleType !== "string" || !SESSION_VEHICLE_VALUES.includes(vehicleType)) {
      return { ok: false, message: "A session selection names a vehicle that is not part of this package." };
    }
    if (!(trialVehicles as readonly string[]).includes(vehicleType)) {
      return { ok: false, message: "A session selection names a vehicle that is not part of this package." };
    }
    if (seen.has(vehicleType)) {
      return { ok: false, message: "Each vehicle can be chosen only once." };
    }
    seen.add(vehicleType);
    if (typeof requiredSessions !== "number" || !Number.isInteger(requiredSessions)) {
      return { ok: false, message: `Choose a whole number of sessions from ${TRIAL_MIN_SESSIONS} to ${TRIAL_MAX_SESSIONS}.` };
    }
    if (requiredSessions < TRIAL_MIN_SESSIONS || requiredSessions > TRIAL_MAX_SESSIONS) {
      return { ok: false, message: `Choose a whole number of sessions from ${TRIAL_MIN_SESSIONS} to ${TRIAL_MAX_SESSIONS} for each vehicle.` };
    }
    requirements.push({
      vehicleType: vehicleType as SessionVehicle,
      trainingType: "TRIAL_PREPARATION",
      requiredSessions,
    });
  }
  return { ok: true, requirements };
}

/**
 * Works out the session requirements for one registration. The result is the only source of counts for the
 * registration, so a value sent by the browser can never change a Regular count, and can only choose a Trial count
 * inside the Trial range.
 *
 * - Regular: every vehicle is 15. A submitted count other than 15 is refused.
 * - Trial: exactly one selection per vehicle in the package. Missing, duplicate, unsupported or unrelated vehicles, and
 *   counts that are not whole numbers within the Trial range, are refused.
 * - Mixed (Additional vehicle): the Regular vehicle is 15 and is generated here. The submitted list must hold exactly
 *   one selection per Trial vehicle, under the same rules as Trial. A selection for the Regular vehicle is refused.
 * - Out of scope packages: returns null requirements, and the existing behaviour applies.
 */
export function resolveSessionRequirements(packageId: string, submitted: unknown): SessionResolution {
  const rule = sessionRuleFor(packageId);
  if (!rule) return { ok: true, requirements: null };

  if (rule.kind === "REGULAR") {
    // The form sends no selections for Regular; the server generates the counts. If a list is sent anyway, it must
    // name exactly the package's vehicles, once each, with exactly 15 each. It never sets the counts.
    if (submitted !== undefined && submitted !== null) {
      const refusal = { ok: false as const, message: "Regular training is fixed at 15 sessions per vehicle." };
      if (!Array.isArray(submitted) || submitted.length !== rule.vehicles.length) return refusal;
      const named = new Set<string>();
      for (const entry of submitted) {
        if (!entry || typeof entry !== "object") return refusal;
        const { vehicleType, requiredSessions } = entry as { vehicleType?: unknown; requiredSessions?: unknown };
        if (typeof vehicleType !== "string" || !(rule.vehicles as readonly string[]).includes(vehicleType)) return refusal;
        if (named.has(vehicleType)) return refusal;
        named.add(vehicleType);
        if (requiredSessions !== REGULAR_SESSIONS_PER_VEHICLE) return refusal;
      }
    }
    return {
      ok: true,
      requirements: rule.vehicles.map((vehicleType) => ({
        vehicleType,
        trainingType: "REGULAR" as const,
        requiredSessions: REGULAR_SESSIONS_PER_VEHICLE,
      })),
    };
  }

  if (rule.kind === "TRIAL") {
    return resolveTrialSelections(rule.vehicles, submitted);
  }

  // MIXED: the Regular vehicle is generated here, and only the Trial vehicles are chosen by the student.
  const trial = resolveTrialSelections(rule.trial, submitted, rule.regular);
  if (!trial.ok) return trial;
  return {
    ok: true,
    requirements: [
      { vehicleType: rule.regular, trainingType: "REGULAR", requiredSessions: REGULAR_SESSIONS_PER_VEHICLE },
      ...trial.requirements,
    ],
  };
}
