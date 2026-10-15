import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth/http";
import { gridWindow, layoutDay } from "@/lib/instructor/calendar";
import { parseMobileNumber } from "@/lib/instructor/profile-rules";

function rejects(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof AuthError && error.status === 400;
  }
}

describe("instructor mobile number", () => {
  it("accepts exactly 10 digits starting with 0", () => {
    expect(parseMobileNumber("0712345678")).toBe("0712345678");
  });

  it("removes spaces before checking, and nothing else", () => {
    expect(parseMobileNumber(" 071 234 5678 ")).toBe("0712345678");
  });

  it("rejects numbers that do not start with 0", () => {
    expect(rejects(() => parseMobileNumber("7123456789"))).toBe(true);
  });

  it("rejects numbers that are too short or too long", () => {
    expect(rejects(() => parseMobileNumber("071234567"))).toBe(true);
    expect(rejects(() => parseMobileNumber("07123456789"))).toBe(true);
  });

  it("rejects non-digit characters and non-string input", () => {
    expect(rejects(() => parseMobileNumber("071-234-5678"))).toBe(true);
    expect(rejects(() => parseMobileNumber("+94712345678"))).toBe(true);
    expect(rejects(() => parseMobileNumber(712345678))).toBe(true);
    expect(rejects(() => parseMobileNumber(undefined))).toBe(true);
  });
});

describe("calendar layout", () => {
  it("widens the grid window to whole hours so every lesson fits", () => {
    expect(gridWindow([])).toEqual({ start: 7 * 60, end: 19 * 60 });
    expect(gridWindow([{ id: "a", startTime: "06:30", endTime: "20:15" }])).toEqual({ start: 6 * 60, end: 21 * 60 });
  });

  it("keeps non-overlapping lessons in one lane", () => {
    const placed = layoutDay([
      { id: "a", startTime: "09:00", endTime: "09:30" },
      { id: "b", startTime: "09:30", endTime: "10:00" },
    ]);
    expect(placed.map((lesson) => lesson.lane)).toEqual([0, 0]);
    expect(placed.every((lesson) => lesson.lanes === 1)).toBe(true);
  });

  it("places overlapping lessons side by side, with equal widths", () => {
    const placed = layoutDay([
      { id: "a", startTime: "09:00", endTime: "10:00" },
      { id: "b", startTime: "09:30", endTime: "10:30" },
      { id: "c", startTime: "11:00", endTime: "11:30" },
    ]);
    const byId = Object.fromEntries(placed.map((lesson) => [lesson.id, lesson]));
    expect(byId.a.lane).not.toBe(byId.b.lane);
    expect(byId.a.lanes).toBe(2);
    expect(byId.b.lanes).toBe(2);
    expect(byId.c.lane).toBe(0);
  });

  it("returns one entry per lesson, with no duplicates", () => {
    const input = [
      { id: "a", startTime: "09:00", endTime: "09:30" },
      { id: "b", startTime: "09:00", endTime: "09:30" },
    ];
    const placed = layoutDay(input);
    expect(placed).toHaveLength(2);
    expect(new Set(placed.map((lesson) => lesson.id)).size).toBe(2);
  });
});
