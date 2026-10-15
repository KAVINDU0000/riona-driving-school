import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { parsePackageId, parsePriceEdit, updatePackage } from "@/lib/admin/packages";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";

/**
 * Changes one package's price, display order and whether it is offered. Admins only. The body must carry the
 * price the admin saw (expectedPrice), so a concurrent change is refused with 409 instead of being overwritten.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const id = parsePackageId((await context.params).id);
    const edit = parsePriceEdit(await readJsonObject(request));
    const result = await updatePackage(id, admin.userId, edit);
    return NextResponse.json({ package: result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
