// Database-free. Input rules for admin-added medical appointments and exams.
import { describe, expect, it } from "vitest";
import { parseExamInput, parseMedicalInput, parseSchoolDateTime } from "@/lib/admin/appointments";

const FUTURE = "2099-06-01T09:30";

describe("school-time date and time", () => {
  it("reads a datetime-local value as Asia/Colombo time", () => {
    expect(parseSchoolDateTime("2099-06-01T09:30", "Date").toISOString()).toBe("2099-06-01T04:00:00.000Z");
  });

  it("refuses anything that is not a real date and time", () => {
    expect(() => parseSchoolDateTime("2099-02-30T09:30", "Date")).toThrow();
    expect(() => parseSchoolDateTime("2099-06-01T25:00", "Date")).toThrow();
    expect(() => parseSchoolDateTime("2099-06-01", "Date")).toThrow();
    expect(() => parseSchoolDateTime(undefined, "Date")).toThrow();
  });
});

describe("medical appointment input", () => {
  it("accepts a future time and an optional note", () => {
    const input = parseMedicalInput({ appointmentDate: FUTURE, description: "  Bring glasses  " });
    expect(input.description).toBe("Bring glasses");
  });

  it("stores an empty note as null", () => {
    expect(parseMedicalInput({ appointmentDate: FUTURE, description: "   " }).description).toBeNull();
  });

  it("refuses a time in the past and a note over 500 characters", () => {
    expect(() => parseMedicalInput({ appointmentDate: "2000-01-01T09:00" })).toThrow();
    expect(() => parseMedicalInput({ appointmentDate: FUTURE, description: "x".repeat(501) })).toThrow();
  });
});

describe("exam input", () => {
  it("accepts a known exam type with or without a vehicle type", () => {
    expect(parseExamInput({ examType: "WRITTEN", vehicleType: null, scheduledDate: FUTURE }).vehicleType).toBeNull();
    expect(parseExamInput({ examType: "OFFICIAL_DRIVING_TRIAL", vehicleType: "CAR", scheduledDate: FUTURE }).vehicleType).toBe("CAR");
  });

  it("refuses an unknown exam type or vehicle type", () => {
    expect(() => parseExamInput({ examType: "DRIVING_LICENCE", scheduledDate: FUTURE })).toThrow();
    expect(() => parseExamInput({ examType: "WRITTEN", vehicleType: "TRUCK", scheduledDate: FUTURE })).toThrow();
  });
});
