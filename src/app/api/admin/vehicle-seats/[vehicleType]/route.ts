import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { parseSeats, parseVehicleType, updateSeatLimit } from "@/lib/session-slots/seats";

/** Changes how many students one vehicle of this type can take in one session. Admins only. */
export async function PUT(request: Request, context: { params: Promise<{ vehicleType: string }> }) {
  try {
    assertSameOrigin(request);
    await requireUser(request, [UserRole.ADMIN]);
    const { vehicleType } = await context.params;
    const body = await readJsonObject(request);
    const limit = await updateSeatLimit(parseVehicleType(vehicleType), parseSeats(body.seats));
    return NextResponse.json({ ok: true, limit });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
