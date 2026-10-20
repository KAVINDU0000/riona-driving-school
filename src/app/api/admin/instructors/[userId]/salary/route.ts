import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { recordSalaryMonth, setInstructorMonthlySalary } from "@/lib/admin/instructor-salary";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/** Sets an instructor's fixed monthly salary. Admins only. An empty amount clears it. */
export async function PUT(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    await requireUser(request, [UserRole.ADMIN]);
    const { userId } = await context.params;
    const body = await readJsonObject(request);
    const result = await setInstructorMonthlySalary(userId, body.monthlySalary);
    return NextResponse.json({ salary: result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

/** Records one salary month for an instructor. The amount defaults to the fixed monthly salary. Admins only. */
export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { userId } = await context.params;
    const body = await readJsonObject(request);
    const month = await recordSalaryMonth(userId, { month: body.month, amount: body.amount }, admin.userId);
    return NextResponse.json({ month }, { status: 201 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
