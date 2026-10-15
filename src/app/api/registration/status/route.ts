import { NextResponse } from "next/server";
import { assertSameOrigin, clientIp, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { parseStatusInput, readApplicationStatus } from "@/lib/registration/application-status";

const HOUR_MS = 60 * 60 * 1000;
const IP_LIMIT = 60;
const REFERENCE_LIMIT = 20;
const RATE_MESSAGE = "Too many attempts. Try again later.";

/**
 * Applicant status check: the reference number and password, in a JSON body. Nothing is stored, and the page
 * keeps the password only in memory while it is open.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const byIp = consumeRateLimit(`status:ip:${clientIp(request)}`, IP_LIMIT, HOUR_MS);
    if (!byIp.allowed) {
      return NextResponse.json({ error: RATE_MESSAGE }, { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } });
    }

    const input = parseStatusInput(await readJsonObject(request));

    const byReference = consumeRateLimit(`status:ref:${input.referenceNumber}`, REFERENCE_LIMIT, HOUR_MS);
    if (!byReference.allowed) {
      return NextResponse.json({ error: RATE_MESSAGE }, { status: 429, headers: { "Retry-After": String(byReference.retryAfterSeconds) } });
    }

    const status = await readApplicationStatus(input.referenceNumber, input.password);
    return NextResponse.json({ status });
  } catch (error) {
    return handleAuthRouteError(error);
  }
}
