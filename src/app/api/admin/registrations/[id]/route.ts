import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { handleAuthRouteError } from "@/lib/auth/http";
import { getRegistration } from "@/lib/admin/registration-review";

/** Full details of one application, for admins only. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    const { id } = await context.params;
    const registration = await getRegistration(id);
    return NextResponse.json({ registration });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
