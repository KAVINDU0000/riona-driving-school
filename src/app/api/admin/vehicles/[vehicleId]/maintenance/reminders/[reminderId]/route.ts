import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin } from "@/lib/auth/http";
import { acknowledgeReminder } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse } from "@/lib/vehicles/maintenance-http";

/** Acknowledges an open reminder. Records who acknowledged it and when. */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string; reminderId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId, reminderId } = await context.params;
    const result = await acknowledgeReminder(vehicleId, reminderId, admin.userId);
    return NextResponse.json({ result });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
