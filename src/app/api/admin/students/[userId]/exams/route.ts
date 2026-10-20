import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { createExam } from "@/lib/admin/appointments";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/** Adds a scheduled exam for a student. Admins only. */
export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    await requireUser(request, [UserRole.ADMIN]);
    const { userId } = await context.params;
    const body = await readJsonObject(request);
    const exam = await createExam(userId, body);
    return NextResponse.json({ exam }, { status: 201 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
