import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError, readJsonObject, readString } from "@/lib/auth/http";
import { createInstructorAccount } from "@/lib/auth/instructor-provisioning";

const INVALID_DETAILS = "Check the instructor details and try again.";

/** Creates an instructor account and sends the invitation. Only admins may call it. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireUser(request, [UserRole.ADMIN]);

    const body = await readJsonObject(request);
    const instructorId = readString(body, "instructorId", 32);
    const email = readString(body, "email", 254);
    const fullName = readString(body, "fullName", 120);
    const phoneNumber = readString(body, "phoneNumber", 20);
    const hireDate = readString(body, "hireDate", 10);
    if (!instructorId || !email || !fullName || !phoneNumber || !hireDate) {
      throw new AuthError(400, INVALID_DETAILS);
    }

    const created = await createInstructorAccount({ instructorId, email, fullName, phoneNumber, hireDate });
    return NextResponse.json({ ok: true, instructor: created, inviteSent: true }, { status: 201 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
