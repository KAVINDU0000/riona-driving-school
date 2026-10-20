import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, readJsonObject } from "@/lib/auth/http";
import { createServiceRecord } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse } from "@/lib/vehicles/maintenance-http";
import { parseServiceInput } from "@/lib/vehicles/maintenance-input";

/**
 * Records a service or inspection with its nine-item checklist. Items not sent are NOT_CHECKED. A lower odometer reading needs
 * odometerExplanation. A fault link is allowed only for a corrective service on the same vehicle.
 */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const parsed = parseServiceInput(await readJsonObject(request));
    if (!parsed.ok) throw new AuthError(400, parsed.message);
    const result = await createServiceRecord(vehicleId, admin.userId, parsed.value);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
