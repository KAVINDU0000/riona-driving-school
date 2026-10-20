import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, readJsonObject } from "@/lib/auth/http";
import { createFault } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse, todayInSchool } from "@/lib/vehicles/maintenance-http";
import { parseFaultInput } from "@/lib/vehicles/maintenance-input";

/** Reports a fault. A safety-critical fault is an administrator warning only. It never changes the vehicle's status. */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const parsed = parseFaultInput(await readJsonObject(request), todayInSchool());
    if (!parsed.ok) throw new AuthError(400, parsed.message);
    const result = await createFault(vehicleId, admin.userId, parsed.value);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
