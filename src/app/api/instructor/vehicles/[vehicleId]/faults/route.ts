import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, readJsonObject } from "@/lib/auth/http";
import { reportVehicleFault } from "@/lib/instructor/vehicle-faults";
import { maintenanceErrorResponse } from "@/lib/vehicles/maintenance-http";

/** An instructor reports a fault on a vehicle used in their lessons. It never changes the vehicle's status. */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const { vehicleId } = await context.params;
    const result = await reportVehicleFault(user.userId, vehicleId, await readJsonObject(request));
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
