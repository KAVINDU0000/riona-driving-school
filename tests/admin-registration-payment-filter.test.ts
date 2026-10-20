// Database-free. The dashboard's "Pending payment reviews" card links to the Registrations list with payment=PENDING.
import { describe, expect, it } from "vitest";
import { parseRegistrationListQuery } from "@/lib/admin/registration-review";

describe("Registrations list: payment awaiting review filter", () => {
  it("is off by default", () => {
    expect(parseRegistrationListQuery(new URLSearchParams()).paymentPending).toBe(false);
  });

  it("turns on for payment=PENDING, with any application status when status=ALL", () => {
    const query = parseRegistrationListQuery(new URLSearchParams("status=ALL&payment=PENDING"));
    expect(query.paymentPending).toBe(true);
    expect(query.status).toBe("ALL");
  });

  it("refuses any other payment value", () => {
    expect(() => parseRegistrationListQuery(new URLSearchParams("payment=APPROVED"))).toThrow();
  });
});
