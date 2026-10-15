import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { parseFeedback } from "@/lib/instructor/lesson-rules";
import { saveLessonFeedback } from "@/lib/instructor/lessons";

/** Creates or updates the feedback for one of the instructor's completed lessons. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const feedback = await saveLessonFeedback(user.userId, id, parseFeedback(body));
    return NextResponse.json({ ok: true, feedback });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
