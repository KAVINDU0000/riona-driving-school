import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { updateExam } from "@/lib/admin/appointment-edits";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/** Changes a scheduled exam: its type, vehicle type, date or outcome. Admins only. Date changes are recorded. */
export async function PATCH(request: Request, context: { params: Promise<{ userId: string; examId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { userId, examId } = await context.params;
    const body = await readJsonObject(request);
    const result = await updateExam(userId, examId, admin.userId, body);
    return NextResponse.json({ exam: result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
