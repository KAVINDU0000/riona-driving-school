import { vehicles } from "@/data/landing";

/**
 * Sends contact-form enquiries to the school's staff through the WhatsApp Cloud API.
 *
 * The school's WhatsApp Business number (WHATSAPP_PHONE_NUMBER_ID) sends the message to a staff recipient
 * (WHATSAPP_STAFF_RECIPIENT). Meta does not allow a business number to message itself, so the recipient must be
 * a different number. Business-initiated messages must use an approved template.
 *
 * Required server-only environment variables:
 *   WHATSAPP_CLOUD_TOKEN       Permanent system-user access token. Never expose it to client code or commit it.
 *   WHATSAPP_PHONE_NUMBER_ID   Phone number ID of the sending business number (the Meta ID, not the phone number).
 *   WHATSAPP_STAFF_RECIPIENT   Staff number in international digits, for example 94771234567.
 *   WHATSAPP_CONTACT_TEMPLATE  Name of the approved template. Its body must have four variables, in this order:
 *                              {{1}} name, {{2}} phone, {{3}} vehicle category, {{4}} message (with the email).
 * Optional:
 *   WHATSAPP_TEMPLATE_LANGUAGE  Template language code. Defaults to "en".
 *   WHATSAPP_GRAPH_VERSION      Graph API version. Defaults to "v21.0".
 *
 * Personal details are never logged. Only the HTTP status is logged when Meta refuses a message.
 */

const REQUEST_TIMEOUT_MS = 10_000;
/** WhatsApp template variables may not contain new lines, tabs or runs of more than four spaces. */
const PARAM_MAX = 1000;

export type ContactEnquiry = {
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  message: string;
};

export class ContactInputError extends Error {}
export class ContactNotConfiguredError extends Error {}
export class ContactDeliveryError extends Error {}

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VEHICLE_KEYS = new Set(vehicles.map((vehicle) => vehicle.key));

/** Checks the enquiry on the server. Returns the cleaned values, or throws ContactInputError with a message that is safe to show. */
export function parseContactEnquiry(input: Record<string, unknown>): ContactEnquiry {
  const text = (key: string, max: number) => {
    const value = input[key];
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") throw new ContactInputError(`${key} must be text.`);
    if (value.length > max) throw new ContactInputError(`${key} is too long.`);
    return value.trim();
  };

  const name = text("name", 100);
  const phone = text("phone", 20);
  const email = text("email", 120);
  const vehicle = text("vehicle", 40);
  const message = text("message", 1000);

  if (!name) throw new ContactInputError("Please enter your name.");
  if (!PHONE_PATTERN.test(phone)) throw new ContactInputError("Please enter a valid phone or WhatsApp number.");
  if (email && !EMAIL_PATTERN.test(email)) throw new ContactInputError("Please enter a valid email address.");
  if (vehicle && !VEHICLE_KEYS.has(vehicle)) throw new ContactInputError("Please choose a vehicle category from the list.");

  return { name, phone, email, vehicle, message };
}

/** Collapses whitespace so the value is valid as a template variable. */
function templateParam(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, PARAM_MAX) || "-";
}

/**
 * Sends one enquiry as a template message. Resolves when Meta accepts it. Throws ContactNotConfiguredError when
 * the environment is incomplete, and ContactDeliveryError when Meta refuses or cannot be reached.
 */
export async function sendContactEnquiry(enquiry: ContactEnquiry) {
  const token = process.env.WHATSAPP_CLOUD_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const recipient = process.env.WHATSAPP_STAFF_RECIPIENT?.replace(/\D/g, "");
  const template = process.env.WHATSAPP_CONTACT_TEMPLATE?.trim();
  if (!token || !phoneNumberId || !recipient || !template) {
    throw new ContactNotConfiguredError("WhatsApp Cloud API is not configured.");
  }

  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en";
  const version = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v21.0";
  const vehicleLabel = vehicles.find((item) => item.key === enquiry.vehicle)?.label ?? "Not chosen";
  const messageWithEmail = enquiry.email ? `${enquiry.message} (Email: ${enquiry.email})` : enquiry.message;

  let response: Response;
  try {
    response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: template,
          language: { code: language },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: templateParam(enquiry.name) },
                { type: "text", text: templateParam(enquiry.phone) },
                { type: "text", text: templateParam(vehicleLabel) },
                { type: "text", text: templateParam(messageWithEmail || "-") },
              ],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("WhatsApp contact enquiry not sent:", error instanceof Error ? error.name : "unknown error");
    throw new ContactDeliveryError("WhatsApp could not be reached.");
  }

  if (!response.ok) {
    console.error("WhatsApp contact enquiry refused by Meta, HTTP status", response.status);
    throw new ContactDeliveryError("WhatsApp did not accept the message.");
  }
}
