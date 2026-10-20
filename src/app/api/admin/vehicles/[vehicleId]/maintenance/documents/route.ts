import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { AuthError, assertSameOrigin } from "@/lib/auth/http";
import { uploadMaintenanceDocument, type DocumentLink } from "@/lib/vehicles/maintenance-data";
import { maintenanceErrorResponse } from "@/lib/vehicles/maintenance-http";
import { parseDocumentKind } from "@/lib/vehicles/maintenance-input";

const LINKS: readonly DocumentLink[] = ["insurancePolicyId", "emissionTestId", "revenueLicenceId", "serviceRecordId", "faultId"];

/**
 * Uploads a private document (form fields: kind, linkTo, linkId, file). The browser's file type and name are not trusted: the
 * type is read from the bytes. Administrators only. The file is never served by URL.
 */
export async function POST(request: Request, context: { params: Promise<{ vehicleId: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const { vehicleId } = await context.params;

    const form = await request.formData().catch(() => null);
    if (!form) throw new AuthError(400, "Send the document as a form with the file attached.");
    const file = form.get("file");
    if (!(file instanceof File)) throw new AuthError(400, "Choose a file to upload.");

    const kind = parseDocumentKind(form.get("kind"));
    if (!kind.ok) throw new AuthError(400, kind.message);
    const linkTo = form.get("linkTo");
    const link = typeof linkTo === "string" && linkTo !== "" ? (LINKS.find((l) => l === linkTo) ?? null) : null;
    if (typeof linkTo === "string" && linkTo !== "" && link === null) throw new AuthError(400, "Choose a valid record type to link the document to.");
    const linkIdValue = form.get("linkId");
    const linkId = typeof linkIdValue === "string" && linkIdValue !== "" ? linkIdValue : null;
    if (linkId !== null && !/^[A-Za-z0-9_-]{1,64}$/.test(linkId)) throw new AuthError(400, "The linked record is not valid.");

    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await uploadMaintenanceDocument(vehicleId, admin.userId, {
      kind: kind.value,
      link,
      linkId,
      originalFileName: file.name,
      bytes,
    });
    return NextResponse.json({ result: { id: stored.id } }, { status: 201 });
  } catch (error) {
    return maintenanceErrorResponse(error);
  }
}
