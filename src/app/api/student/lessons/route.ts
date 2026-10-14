import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError, readJsonObject, readString } from "@/lib/auth/http";
import { bookPracticalLesson, findBookingOptions } from "@/lib/student/lesson-booking";

/** Booking options: the start times still free for a requirement, on a date, at a duration. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request, [UserRole.STUDENT]);
    const params = new URL(request.url).searchParams;
    const enrollmentId = params.get("enrollmentId") ?? "";
    const requirementId = params.get("requirementId") ?? "";
    const lessonDate = params.get("date") ?? "";
    const durationMinutes = Number(params.get("durationMinutes"));
    if (!enrollmentId || !requirementId || !/^\d{4}-\d{2}-\d{2}$/.test(lessonDate) || !Number.isInteger(durationMinutes)) {
      throw new AuthError(400, "Choose an enrollment, requirement, date and lesson length.");
    }

    const options = await findBookingOptions({
      studentUserId: user.userId,
      enrollmentId,
      requirementId,
      lessonDate,
      durationMinutes,
    });
    return NextResponse.json(options);
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

/**
 * Books a practical lesson. The client sends the start time and duration only. The end time, instructor and
 * vehicle are decided on the server.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.STUDENT]);
    const body = await readJsonObject(request);

    const enrollmentId = readString(body, "enrollmentId", 64);
    const requirementId = readString(body, "requirementId", 64);
    const lessonDate = readString(body, "lessonDate", 10);
    const startTime = readString(body, "startTime", 5);
    const durationMinutes = typeof body.durationMinutes === "number" ? body.durationMinutes : Number.NaN;
    if (!enrollmentId || !requirementId || !lessonDate || !startTime || !Number.isInteger(durationMinutes)) {
      throw new AuthError(400, "Choose an enrollment, requirement, date, start time and lesson length.");
    }

    const lesson = await bookPracticalLesson({
      studentUserId: user.userId,
      enrollmentId,
      requirementId,
      lessonDate,
      startTime,
      durationMinutes,
    });
    return NextResponse.json({ ok: true, lesson }, { status: 201 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
