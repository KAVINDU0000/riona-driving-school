// Database-free. Regular packages can be paid in two parts; other packages are paid in full.
import { describe, expect, it } from "vitest";
import { PackageType, RegistrationStatus } from "@/generated/prisma/enums";
import { balanceOwed, lastPaymentDay } from "@/lib/registration/instalments";
import { resolvePaymentAmount } from "@/lib/registration/payment-submission";

const regular = (requested: string, approvedTotal = 0, status: RegistrationStatus = RegistrationStatus.PENDING) =>
  resolvePaymentAmount({ packageType: PackageType.REGULAR, total: 26000, approvedTotal, requestedAmount: requested, applicationStatus: status });

describe("first payment on a Regular package", () => {
  it("accepts any part of the price, above zero", () => {
    expect(regular("13000")).toBe("13000.00");
    expect(regular("5000.5")).toBe("5000.50");
  });

  it("accepts the full price as a single payment", () => {
    expect(regular("26000")).toBe("26000.00");
  });

  it("refuses zero or more than the full price", () => {
    expect(() => regular("0")).toThrow();
    expect(() => regular("26001")).toThrow();
  });
});

describe("balance on a Regular package", () => {
  it("accepts exactly the amount still owed", () => {
    expect(regular("13000", 13000)).toBe("13000.00");
  });

  it("refuses any other amount", () => {
    expect(() => regular("5000", 13000)).toThrow();
    expect(() => regular("14000", 13000)).toThrow();
  });

  it("refuses a payment once the price is fully paid", () => {
    expect(() => regular("1000", 26000)).toThrow();
  });

  it("does not accept a first payment after the application is approved", () => {
    expect(() => regular("13000", 0, RegistrationStatus.APPROVED)).toThrow();
  });
});

describe("other packages", () => {
  const other = (requested: string, approvedTotal = 0) =>
    resolvePaymentAmount({
      packageType: PackageType.TRIAL_PREPARATION,
      total: 15000,
      approvedTotal,
      requestedAmount: requested,
      applicationStatus: RegistrationStatus.PENDING,
    });

  it("always uses the full price, whatever was typed", () => {
    expect(other("5000")).toBe("15000.00");
  });

  it("refuses a second payment once the price is paid", () => {
    expect(() => other("15000", 15000)).toThrow();
  });
});

describe("deadline and balance", () => {
  it("counts the enrollment day as day 1, so a 15-day package ends on day 15", () => {
    // Enrolled on the school date 20 October 2026: day 15 is 3 November 2026.
    expect(lastPaymentDay(new Date("2026-10-20T04:00:00.000Z"), 15)).toBe("2026-11-03");
  });

  it("has no deadline when the package has no period length", () => {
    expect(lastPaymentDay(new Date("2026-10-20T04:00:00.000Z"), null)).toBeNull();
  });

  it("works out what is still owed and never goes below zero", () => {
    expect(balanceOwed(26000, 13000)).toBe(13000);
    expect(balanceOwed(26000, 26000)).toBe(0);
    expect(balanceOwed(26000, 30000)).toBe(0);
  });
});
