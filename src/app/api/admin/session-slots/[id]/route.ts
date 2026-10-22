import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { updateSessionSlot } from "@/lib/session-slots/store";

/**
 * Changes one session time's start, end, or open/closed state. Refused while instructors or lessons are on the time from
 * today onward (for a time change), or while lessons are booked on it (for closing). Admins only.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireUser(request, [UserRole.ADMIN]);
    const { id } = await context.params;
    const slot = await updateSessionSlot(id, await readJsonObject(request));
    return NextResponse.json({ ok: true, slot });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
