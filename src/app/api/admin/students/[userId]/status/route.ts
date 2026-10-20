import { NextResponse } from "next/server";
import { AccountStatus, UserRole } from "@/generated/prisma/enums";
import { setStudentAccountStatus } from "@/lib/admin/student-status";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/** Sets a student's account to ACTIVE or INACTIVE. Admins only. Records are kept. */
export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    await requireUser(request, [UserRole.ADMIN]);
    const { userId } = await context.params;
    const body = await readJsonObject(request);
    if (body.status !== AccountStatus.ACTIVE && body.status !== AccountStatus.INACTIVE) {
      throw new AuthError(400, "Choose ACTIVE or INACTIVE.");
    }
    const result = await setStudentAccountStatus(userId, body.status);
    return NextResponse.json({ student: result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
