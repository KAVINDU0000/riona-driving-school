import { NextResponse } from "next/server";
import { assertSameOrigin, clientIp, handleAuthRouteError, readJsonObject } from "@/lib/auth/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import {
  ContactDeliveryError,
  ContactInputError,
  ContactNotConfiguredError,
  parseContactEnquiry,
  sendContactEnquiry,
} from "@/lib/contact/whatsapp-cloud";

const HOUR_MS = 60 * 60 * 1000;
const IP_LIMIT = 10;
const RATE_MESSAGE = "Too many messages from this connection. Try again later, or message us on WhatsApp.";

/**
 * Contact-form enquiry. The message goes to the school's WhatsApp staff through the Cloud API and is not stored.
 * Status codes: 200 sent, 400 invalid input, 429 rate limited, 503 not configured (the form then offers WhatsApp
 * directly), 502 Meta refused or could not be reached.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const byIp = consumeRateLimit(`contact:ip:${clientIp(request)}`, IP_LIMIT, HOUR_MS);
    if (!byIp.allowed) {
      return NextResponse.json({ error: RATE_MESSAGE }, { status: 429, headers: { "Retry-After": String(byIp.retryAfterSeconds) } });
    }

    const body = await readJsonObject(request);
    let enquiry;
    try {
      enquiry = parseContactEnquiry(body);
    } catch (error) {
      if (error instanceof ContactInputError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    await sendContactEnquiry(enquiry);
    return NextResponse.json({ sent: true });
  } catch (error) {
    if (error instanceof ContactNotConfiguredError) {
      return NextResponse.json({ error: "Online sending is not available right now.", code: "NOT_CONFIGURED" }, { status: 503 });
    }
    if (error instanceof ContactDeliveryError) {
      return NextResponse.json({ error: "We could not send your message. Please message us on WhatsApp.", code: "DELIVERY_FAILED" }, { status: 502 });
    }
    return handleAuthRouteError(error);
  }
}
