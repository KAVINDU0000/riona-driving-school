import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { handleAuthRouteError } from "@/lib/auth/http";
import { listSessionSlotsForAdmin } from "@/lib/session-slots/store";

/** The fixed session times, with how many instructors and lessons are on each one from today onward. Admins only. */
export async function GET(request: Request) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    return NextResponse.json({ slots: await listSessionSlotsForAdmin() });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
