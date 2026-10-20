import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { updateMedicalAppointment } from "@/lib/admin/appointment-edits";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/** Changes a scheduled medical appointment: its date, note or outcome. Admins only. Date changes are recorded. */
export async function PATCH(request: Request, context: { params: Promise<{ userId: string; appointmentId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { userId, appointmentId } = await context.params;
    const body = await readJsonObject(request);
    const result = await updateMedicalAppointment(userId, appointmentId, admin.userId, body);
    return NextResponse.json({ appointment: result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
