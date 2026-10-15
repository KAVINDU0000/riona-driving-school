import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { parseMobileNumber } from "@/lib/instructor/profile-rules";
import { updateInstructorMobile } from "@/lib/instructor/profile";

/** Changes the signed-in instructor's mobile number. It is the only profile field an instructor may edit. */
export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const body = await readJsonObject(request);
    if (Object.keys(body).some((key) => key !== "phoneNumber")) {
      throw new AuthError(400, "Only the mobile number can be changed here.");
    }
    const result = await updateInstructorMobile(user.userId, parseMobileNumber(body.phoneNumber));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
