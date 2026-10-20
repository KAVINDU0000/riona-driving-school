import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, readJsonObject } from "@/lib/auth/http";
import { updateFault } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse, todayInSchool } from "@/lib/vehicles/maintenance-http";
import { parseFaultUpdateInput } from "@/lib/vehicles/maintenance-input";

/**
 * Moves a repair forward and records the event. Completing a repair never reactivates the vehicle: the status is changed
 * separately, by an administrator, through the existing vehicle status change.
 */
export async function PATCH(request: Request, context: { params: Promise<{ vehicleId: string; faultId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId, faultId } = await context.params;
    const parsed = parseFaultUpdateInput(await readJsonObject(request), todayInSchool());
    if (!parsed.ok) throw new AuthError(400, parsed.message);
    const result = await updateFault(vehicleId, faultId, admin.userId, parsed.value, todayInSchool());
    return NextResponse.json({ result: { id: result.id, status: result.status } });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
