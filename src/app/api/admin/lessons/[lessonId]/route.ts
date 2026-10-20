import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { cancelAdminLesson, recordAdminAttendance, rescheduleAdminLesson } from "@/lib/admin/lessons";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/**
 * Admin actions on one lesson. The body's `action` is one of: attendance, cancel, reschedule.
 * Every action is checked again on the server, and each one writes only its own fields.
 */
export async function PATCH(request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { lessonId } = await context.params;
    const body = await readJsonObject(request);

    if (body.action === "attendance") {
      return NextResponse.json({ lesson: await recordAdminAttendance(lessonId, admin.userId, body.attendance) });
    }
    if (body.action === "cancel") {
      return NextResponse.json({ lesson: await cancelAdminLesson(lessonId, admin.userId, body.reason) });
    }
    if (body.action === "reschedule") {
      return NextResponse.json({ lesson: await rescheduleAdminLesson(lessonId, body.date, body.startTime) });
    }
    throw new AuthError(400, "Choose an action: attendance, cancel or reschedule.");
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
