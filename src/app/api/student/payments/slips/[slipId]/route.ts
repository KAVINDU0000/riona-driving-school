import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, handleAuthRouteError } from "@/lib/auth/http";
import { readOwnedSlip } from "@/lib/student/payment-slips";

/**
 * Serves a slip only to the student who owns its payment. Anyone else gets the same 404 as a missing slip,
 * so the response does not reveal that the slip exists.
 */
export async function GET(request: Request, context: { params: Promise<{ slipId: string }> }) {
  try {
    const user = await requireUser(request, [UserRole.STUDENT]);
    const { slipId } = await context.params;
    const slip = await readOwnedSlip(user.userId, slipId);
    if (!slip) {
      throw new AuthError(404, "That file was not found.");
    }

    const safeName = slip.fileName.replace(/["\\]/g, "");
    return new Response(new Uint8Array(slip.bytes), {
      status: 200,
      headers: {
        "Content-Type": slip.mimeType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(slip.bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
