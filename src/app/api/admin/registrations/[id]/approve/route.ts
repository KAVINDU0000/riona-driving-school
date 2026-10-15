import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError } from "@/lib/auth/http";
import { approveRegistration } from "@/lib/admin/registration-review";

/** Approves a pending application and creates the student's account, profile and enrollment. Admins only. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { id } = await context.params;
    const result = await approveRegistration(id, admin.userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
