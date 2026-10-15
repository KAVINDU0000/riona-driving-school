import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError } from "@/lib/auth/http";
import { completeLesson } from "@/lib/instructor/lessons";

/** Marks one of the instructor's scheduled lessons completed, once attendance is recorded. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const { id } = await context.params;
    const result = await completeLesson(user.userId, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
