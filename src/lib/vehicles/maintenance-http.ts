/** Shared route helpers for vehicle maintenance: error mapping and "today" in school time. */
import { handleAuthRouteError, jsonError } from "@/lib/auth/http";
import { StorageNotConfiguredError } from "@/lib/vehicles/document-storage";
import { schoolNow } from "@/lib/student/time";

/** Maps storage configuration errors to 503, with the setup message. Everything else follows the existing auth error mapping. */
export function maintenanceErrorResponse(error: unknown) {
  if (error instanceof StorageNotConfiguredError) return jsonError(503, error.message);
  return handleAuthRouteError(error);
}

/** The current school date, "YYYY-MM-DD". Every rule takes it as an argument, so the routes pass it in. */
export function todayInSchool(): string {
  return schoolNow().date;
}
