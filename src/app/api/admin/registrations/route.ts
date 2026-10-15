import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { handleAuthRouteError } from "@/lib/auth/http";
import { listRegistrations, parseRegistrationListQuery } from "@/lib/admin/registration-review";

/**
 * Lists registration applications for admins, one page at a time. Query parameters, all optional:
 * status (PENDING default, APPROVED, REJECTED, ALL), q (name, reference, email, NIC or phone), package,
 * from and to (submission dates, YYYY-MM-DD, school time), order (oldest default, or newest), page (1 default).
 */
export async function GET(request: Request) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    const query = parseRegistrationListQuery(new URL(request.url).searchParams);
    const result = await listRegistrations(query);
    return NextResponse.json(result);
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
