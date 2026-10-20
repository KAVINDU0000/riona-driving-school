import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, readJsonObject } from "@/lib/auth/http";
import { createComplianceDecision } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse } from "@/lib/vehicles/maintenance-http";
import { parseComplianceDecisionInput } from "@/lib/vehicles/maintenance-input";

/** Records "not applicable" or a documented exception for the emission test or the Revenue Licence. A reason is required. */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const parsed = parseComplianceDecisionInput(await readJsonObject(request));
    if (!parsed.ok) throw new AuthError(400, parsed.message);
    const result = await createComplianceDecision(vehicleId, admin.userId, parsed.value);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
