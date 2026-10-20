import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, readJsonObject } from "@/lib/auth/http";
import { getReminderSettings, saveReminderSettings } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse } from "@/lib/vehicles/maintenance-http";
import { parseReminderSettingsInput } from "@/lib/vehicles/maintenance-input";

/** The lead times per reminder category. Administrators only. */
export async function GET(request: Request) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    return NextResponse.json({ settings: await getReminderSettings() });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}

/** Replaces the lead times of one category (1 to 5 whole days, 1 to 365, each once). Audited. */
export async function PUT(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;
    const parsed = parseReminderSettingsInput(await readJsonObject(request));
    if (!parsed.ok) throw new AuthError(400, parsed.message);
    const settings = await saveReminderSettings(vehicleId, admin.userId, parsed.value.category, parsed.value.leadDays);
    return NextResponse.json({ settings });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
