import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/authorize";
import { assertSameOrigin, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { createVehicle, listVehicles, parseVehicleFields, vehicleListQuery } from "@/lib/admin/vehicles";

/** Lists vehicles with search and filters. Admins only. */
export async function GET(request: Request) {
  try {
    await requireUser(request, [UserRole.ADMIN]);
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const result = await listVehicles(vehicleListQuery(params));
    return NextResponse.json(result);
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

/** Creates a vehicle record. The registration number must be unique. Admins only. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireUser(request, [UserRole.ADMIN]);
    const parsed = parseVehicleFields(await readJsonObject(request), { requireStatus: true });
    if (!parsed.ok) {
      return NextResponse.json({ error: "Please check the highlighted fields.", fields: parsed.errors }, { status: 422 });
    }
    const vehicle = await createVehicle(admin.userId, parsed.fields, parsed.status);
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
