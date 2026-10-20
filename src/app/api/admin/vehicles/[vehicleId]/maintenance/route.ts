import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { getMaintenanceHistory, getMaintenanceOverview } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse, todayInSchool } from "@/lib/vehicles/maintenance-http";

/** The maintenance overview (computed statuses and warnings) and the full history. Administrators only. */
export async function GET(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const today = todayInSchool();
    const [overview, history] = await Promise.all([getMaintenanceOverview(vehicleId, today), getMaintenanceHistory(vehicleId)]);
    return NextResponse.json({ overview, history });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
