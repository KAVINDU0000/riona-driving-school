import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError } from "@/lib/auth/http";
import { cancelLesson } from "@/lib/instructor/lessons";

/** Cancels one of the instructor's scheduled lessons. The lesson record is kept. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const { id } = await context.params;
    const result = await cancelLesson(user.userId, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
