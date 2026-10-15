import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject, readString } from "@/lib/auth/http";
import { getVehicleDetail, parseVehicleFields, updateVehicle } from "@/lib/admin/vehicles";

/** One vehicle with its lesson history and audit history. Admins only. */
export async function GET(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const vehicle = await getVehicleDetail(vehicleId);
    return NextResponse.json({ vehicle });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

/**
 * Edits the vehicle's details. Status is not changed here, so it always goes through the status workflow.
 * `expectedUpdatedAt` (from the page that was loaded) stops two admins overwriting each other.
 */
export async function PATCH(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const body = await readJsonObject(request);
    const parsed = parseVehicleFields(body, { requireStatus: false });
    if (!parsed.ok) {
      return NextResponse.json({ error: "Please check the highlighted fields.", fields: parsed.errors }, { status: 422 });
    }
    const expectedUpdatedAt = readString(body, "expectedUpdatedAt", 40);
    const vehicle = await updateVehicle(vehicleId, admin.userId, parsed.fields, expectedUpdatedAt);
    return NextResponse.json({ vehicle: { id: vehicle.id, updatedAt: vehicle.updatedAt.toISOString() } });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
