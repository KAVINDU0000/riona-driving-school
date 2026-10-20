/**
 * Recognises the one database error that means "the vehicle maintenance tables are not in this database yet": Prisma code P2021
 * (table does not exist) or P2022 (column does not exist), naming one of the maintenance models. Any other error is not
 * recognised, so it is still shown as a failure. Pure: no database.
 */
const MISSING_SCHEMA_CODES = new Set(["P2021", "P2022"]);

export const MAINTENANCE_MODEL_NAMES = [
  "VehicleInsurancePolicy",
  "VehicleComplianceDecision",
  "VehicleEmissionTest",
  "VehicleRevenueLicence",
  "VehicleServiceRecord",
  "VehicleServiceChecklistItem",
  "VehicleFault",
  "VehicleRepairEvent",
  "VehicleMaintenanceDocument",
  "VehicleMaintenanceReminder",
  "VehicleMaintenanceReminderSetting",
  "VehicleMaintenanceAuditLog",
] as const;

export function isMaintenanceSchemaMissing(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code !== "string" || !MISSING_SCHEMA_CODES.has(code)) return false;
  const text = typeof message === "string" ? message : "";
  return MAINTENANCE_MODEL_NAMES.some((name) => text.includes(name));
}
