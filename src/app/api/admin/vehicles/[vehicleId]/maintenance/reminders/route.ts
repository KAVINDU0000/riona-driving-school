import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin } from "@/lib/auth/http";
import { generateReminders } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse, todayInSchool } from "@/lib/vehicles/maintenance-http";

/**
 * Creates the in-app reminders that are open today. Idempotent: running it again creates nothing new. Nothing is sent to anyone.
 */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const result = await generateReminders(vehicleId, admin.userId, todayInSchool());
    return NextResponse.json({ result });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
