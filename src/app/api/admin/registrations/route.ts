import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { handleAuthRouteError } from "@/lib/auth/http";
import { listRegistrations } from "@/lib/admin/registration-review";

/** Lists registration applications for admins. Pass ?status=PENDING (default), APPROVED, REJECTED or ALL. */
export async function GET(request: Request) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    const status = new URL(request.url).searchParams.get("status");
    const registrations = await listRegistrations(status);
    return NextResponse.json({ registrations });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
