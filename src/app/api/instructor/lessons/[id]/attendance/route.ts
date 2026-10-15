import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { parseAttendance } from "@/lib/instructor/lesson-rules";
import { recordAttendance } from "@/lib/instructor/lessons";

/** Records attendance for one of the instructor's lessons. Only the assigned instructor may call it. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const result = await recordAttendance(user.userId, id, parseAttendance(body.attendance));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
