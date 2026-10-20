import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { completeLesson } from "@/lib/instructor/lessons";

/** Marks one of the instructor's scheduled lessons completed, once attendance is recorded. The body may carry outcome notes. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, [UserRole.INSTRUCTOR]);
    const { id } = await context.params;
    // The body is optional: an empty request completes the lesson without touching its notes.
    const raw = await request.text();
    const body = raw.trim() ? await readJsonObject(new Request(request.url, { method: "POST", body: raw })) : {};
    const result = await completeLesson(user.userId, id, body.notes);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
