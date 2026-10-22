import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { assignSessionSlot, listAvailability } from "@/lib/instructor/availability";
import { parseAvailabilityRange, parseSessionAssignment } from "@/lib/instructor/availability-rules";

/** The signed-in instructor's own availability windows between two dates. The instructor comes from the session. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const params = new URL(request.url).searchParams;
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    if (!from || !to) throw new AuthError(400, "Choose a start date and an end date.");
    const range = parseAvailabilityRange(from, to);
    return NextResponse.json({ windows: await listAvailability(user.userId, range.from, range.to) });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

/** Takes an open session slot on a date for the signed-in instructor. Students can book that slot once it exists. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const { date, startTime } = parseSessionAssignment(await readJsonObject(request));
    const window = await assignSessionSlot(user.userId, date, startTime);
    return NextResponse.json({ ok: true, window }, { status: 201 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
