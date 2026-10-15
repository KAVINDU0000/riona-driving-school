import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { confirmRequirements } from "@/lib/admin/requirements";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError } from "@/lib/auth/http";

/**
 * Records that the school has confirmed a package's complete set of session requirements. Admins only. Refused
 * while any row is missing a count.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { id } = await context.params;
    const result = await confirmRequirements(id, admin.userId);
    return NextResponse.json({ confirmation: result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
