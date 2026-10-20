import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, readJsonObject } from "@/lib/auth/http";
import { createInsurancePolicy } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse } from "@/lib/vehicles/maintenance-http";
import { parseInsuranceInput } from "@/lib/vehicles/maintenance-input";

/** Records an insurance period. A renewal sends renewsPolicyId. Overlaps are refused under the vehicle lock. */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const parsed = parseInsuranceInput(await readJsonObject(request));
    if (!parsed.ok) throw new AuthError(400, parsed.message);
    const result = await createInsurancePolicy(vehicleId, admin.userId, parsed.value);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
