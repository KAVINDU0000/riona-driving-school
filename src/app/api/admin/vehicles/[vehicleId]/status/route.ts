import { NextResponse } from "next/server";
import { UserRole, VehicleStatus } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError, readJsonObject, readString } from "@/lib/auth/http";
import { changeVehicleStatus, parseResolutions, previewStatusChange } from "@/lib/admin/vehicles";

function parseStatus(value: unknown): VehicleStatus {
  if (value === VehicleStatus.ACTIVE || value === VehicleStatus.MAINTENANCE || value === VehicleStatus.INACTIVE) return value;
  throw new AuthError(400, "Choose ACTIVE, MAINTENANCE or INACTIVE.");
}

/**
 * Shows what a status change would affect: each scheduled lesson, with the free vehicles of the same type that could
 * take it. Nothing is saved. Admins only.
 */
export async function GET(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const status = parseStatus(new URL(request.url).searchParams.get("status"));
    const preview = await previewStatusChange(vehicleId, status);
    return NextResponse.json(preview);
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

/**
 * Applies a status change. Every scheduled lesson that would be affected must have a resolution in the same request.
 * The change and all lesson updates are saved together, or not at all.
 */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const body = await readJsonObject(request);
    const status = parseStatus(body.status);
    const expectedUpdatedAt = readString(body, "expectedUpdatedAt", 40);
    const resolutions = parseResolutions(body.resolutions);
    const result = await changeVehicleStatus(vehicleId, admin.userId, { status, expectedUpdatedAt, resolutions });
    return NextResponse.json({ result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
