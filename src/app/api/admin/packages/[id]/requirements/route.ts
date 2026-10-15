import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { parseRequirementRows, replaceRequirements } from "@/lib/admin/requirements";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/**
 * Replaces a package's session requirement rows. Admins only. Any real change clears the package's confirmation,
 * so the school must confirm the new set again before approval can use it.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const rows = parseRequirementRows(body.rows);
    const result = await replaceRequirements(id, admin.userId, rows);
    return NextResponse.json({ requirements: result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
