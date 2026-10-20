import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { deleteAvailability, updateAvailability } from "@/lib/instructor/availability";
import { parseAvailabilityInput } from "@/lib/instructor/availability-rules";

/** Changes the times or notes of one of the instructor's own windows. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const { id } = await context.params;
    const input = parseAvailabilityInput(await readJsonObject(request));
    const window = await updateAvailability(user.userId, id, input);
    return NextResponse.json({ ok: true, window });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

/** Removes one of the instructor's own windows. Refused while a lesson would be left outside every window. */
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
