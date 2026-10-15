import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, handleAuthRouteError } from "@/lib/auth/http";
import { parseDateRange, parseStatusFilter } from "@/lib/instructor/lesson-rules";
import { lessonsBetween } from "@/lib/instructor/lessons";

/**
 * The signed-in instructor's own lessons between two dates, optionally filtered by status. The instructor is taken
 * from the session, never from the request.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const params = new URL(request.url).searchParams;
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    if (!from || !to) {
      throw new AuthError(400, "Choose a start date and an end date.");
    }
    const range = parseDateRange(from, to);
    const status = parseStatusFilter(params.get("status"));
    const lessons = await lessonsBetween(user.userId, range.from, range.to, status);
    return NextResponse.json({ lessons });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
