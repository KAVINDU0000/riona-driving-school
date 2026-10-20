// Database-free. Checks the rules for salary amounts and months; the database writes are not run here.
import { describe, expect, it } from "vitest";
import { parseSalaryAmount, parseSalaryMonth } from "@/lib/admin/instructor-salary";

describe("salary amount", () => {
  it("accepts a whole or two-decimal amount above zero", () => {
    expect(parseSalaryAmount("45000")).toBe("45000.00");
    expect(parseSalaryAmount("45000.5")).toBe("45000.50");
    expect(parseSalaryAmount(26000)).toBe("26000.00");
  });

  it("refuses zero, negative, empty and malformed amounts", () => {
    expect(() => parseSalaryAmount("0")).toThrow();
    expect(() => parseSalaryAmount("-100")).toThrow();
    expect(() => parseSalaryAmount("")).toThrow();
    expect(() => parseSalaryAmount("12.345")).toThrow();
    expect(() => parseSalaryAmount("1,000")).toThrow();
  });
});

describe("salary month", () => {
  it("accepts a past month and returns its first day", () => {
    const { date, month } = parseSalaryMonth("2026-09");
    expect(month).toBe("2026-09");
    expect(date.toISOString().slice(0, 10)).toBe("2026-09-01");
  });

  it("refuses a month that has not started yet", () => {
    expect(() => parseSalaryMonth("2999-01")).toThrow();
  });

  it("refuses a value that is not a year and month", () => {
    expect(() => parseSalaryMonth("2026-9")).toThrow();
    expect(() => parseSalaryMonth("October 2026")).toThrow();
    expect(() => parseSalaryMonth(undefined)).toThrow();
  });
});
