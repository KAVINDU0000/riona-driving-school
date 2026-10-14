import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/authorize";
import { handleAuthRouteError } from "@/lib/auth/http";

/** Returns the signed-in user's identity and role. Used by the client to choose what to show. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ user: { userId: user.userId, email: user.email, role: user.role } });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
