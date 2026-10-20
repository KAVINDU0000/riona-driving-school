import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { updateSalaryMonth } from "@/lib/admin/instructor-salary";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/** Marks one recorded salary month as PAID (with a paid date) or UNPAID. Admins only. */
export async function PATCH(request: Request, context: { params: Promise<{ userId: string; rowId: string }> }) {
  try {
    assertSameOrigin(request);
    await requireUser(request, [UserRole.ADMIN]);
    const { userId, rowId } = await context.params;
    const body = await readJsonObject(request);
    const month = await updateSalaryMonth(userId, rowId, { status: body.status, paidOn: body.paidOn, note: body.note });
    return NextResponse.json({ month });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
