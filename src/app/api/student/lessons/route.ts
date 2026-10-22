import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError, readJsonObject, readString } from "@/lib/auth/http";
import { bookPracticalLesson, findBookingOptions } from "@/lib/student/lesson-booking";

/** Booking options: the open session slots still free for a requirement on a date. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request, [UserRole.STUDENT]);
    const params = new URL(request.url).searchParams;
    const enrollmentId = params.get("enrollmentId") ?? "";
    const requirementId = params.get("requirementId") ?? "";
    const lessonDate = params.get("date") ?? "";
    if (!enrollmentId || !requirementId || !/^\d{4}-\d{2}-\d{2}$/.test(lessonDate)) {
      throw new AuthError(400, "Choose an enrollment, requirement and date.");
    }

    const options = await findBookingOptions({
      studentUserId: user.userId,
      enrollmentId,
      requirementId,
      lessonDate,
    });
    return NextResponse.json(options);
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

/**
 * Books a practical lesson in an open session slot. The client sends the slot's start time only. The end time, length,
 * instructor and vehicle are decided on the server.
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
    if (!enrollmentId || !requirementId || !lessonDate || !startTime) {
      throw new AuthError(400, "Choose an enrollment, requirement, date and session time.");
    }

    const lesson = await bookPracticalLesson({
      studentUserId: user.userId,
      enrollmentId,
      requirementId,
      lessonDate,
      startTime,
    });
    return NextResponse.json({ ok: true, lesson }, { status: 201 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
