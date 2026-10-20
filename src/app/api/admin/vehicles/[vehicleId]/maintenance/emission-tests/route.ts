import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, readJsonObject } from "@/lib/auth/http";
import { createEmissionTest } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse } from "@/lib/vehicles/maintenance-http";
import { parseVetTestInput } from "@/lib/vehicles/maintenance-input";

/** Records an emission test. A FAIL result is shown as FAILED whatever the dates say. A correction sends supersedesId. */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const parsed = parseVetTestInput(await readJsonObject(request));
    if (!parsed.ok) throw new AuthError(400, parsed.message);
    const result = await createEmissionTest(vehicleId, admin.userId, parsed.value);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
