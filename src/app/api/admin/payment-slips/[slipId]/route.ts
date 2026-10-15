import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, handleAuthRouteError } from "@/lib/auth/http";
import { readSlipForAdmin } from "@/lib/student/payment-slips";

/** Serves a payment slip to an admin reviewing its application. Students and instructors get 403, never the file. */
export async function GET(request: Request, context: { params: Promise<{ slipId: string }> }) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    const { slipId } = await context.params;
    const slip = await readSlipForAdmin(slipId);
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
