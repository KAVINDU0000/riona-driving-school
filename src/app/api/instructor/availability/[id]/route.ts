import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError } from "@/lib/auth/http";
import { deleteAvailability } from "@/lib/instructor/availability";

/**
 * Releases one of the instructor's own sessions. Refused while a lesson would be left outside every window.
 * Times cannot be edited: an instructor takes or releases a fixed session slot instead.
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const { id } = await context.params;
    await deleteAvailability(user.userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
