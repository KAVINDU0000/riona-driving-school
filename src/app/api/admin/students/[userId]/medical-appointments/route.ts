import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { createMedicalAppointment } from "@/lib/admin/appointments";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/** Adds a scheduled medical appointment for a student. Admins only. The note is stored but never shown in admin lists. */
export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    await requireUser(request, [UserRole.ADMIN]);
    const { userId } = await context.params;
    const body = await readJsonObject(request);
    const appointment = await createMedicalAppointment(userId, body);
    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
