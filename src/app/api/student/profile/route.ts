import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { parseProfileUpdate, updateStudentProfile } from "@/lib/student/profile";

/** Updates the signed-in student's address and mobile number. Other fields in the body are ignored. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.STUDENT]);
    const body = await readJsonObject(request);
    await updateStudentProfile(user.userId, parseProfileUpdate(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
