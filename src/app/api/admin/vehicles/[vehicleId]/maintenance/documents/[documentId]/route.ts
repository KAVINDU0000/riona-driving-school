import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin, readJsonObject } from "@/lib/auth/http";
import { readMaintenanceDocument, softDeleteMaintenanceDocument } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse } from "@/lib/vehicles/maintenance-http";
import { parseDeletionReason } from "@/lib/vehicles/maintenance-input";

type Params = { params: Promise<{ vehicleId: string; documentId: string }> };

/**
 * Downloads a private document as an attachment, never inline. Administrators only. Not cached, and never sniffed as another type.
 */
export async function GET(request: Request, context: Params) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId, documentId } = await context.params;
    const file = await readMaintenanceDocument(vehicleId, documentId);
    const safeName = file.fileName.replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 120) || "document";
    return new NextResponse(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "Content-Length": String(file.bytes.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}

/** Soft-deletes a document with a reason. The row and the file are kept. A document can be removed once. */
export async function DELETE(request: Request, context: Params) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId, documentId } = await context.params;
    const parsed = parseDeletionReason(await readJsonObject(request));
    if (!parsed.ok) throw new AuthError(400, parsed.message);
    const result = await softDeleteMaintenanceDocument(vehicleId, documentId, admin.userId, parsed.value);
    return NextResponse.json({ result });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
