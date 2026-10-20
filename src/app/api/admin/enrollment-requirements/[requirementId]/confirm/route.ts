import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { confirmRequiredSessions } from "@/lib/admin/entitlements";

/**
 * Confirms or changes the session count of one enrollment requirement. Body: { requiredSessions, reason,
 * expectedUpdatedAt }. Admins only. The change and its audit row are saved together, or not at all.
 */
export async function POST(request: Request, context: { params: Promise<{ requirementId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { requirementId } = await context.params;
    const body = await readJsonObject(request);
    const result = await confirmRequiredSessions(requirementId, admin.userId, {
      count: body.requiredSessions,
      reason: body.reason,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
    return NextResponse.json({ result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
