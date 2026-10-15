import { minutesOfDay } from "@/lib/student/time";

/** The grid shows at least this window, and widens it when a lesson falls outside it. */
export const DEFAULT_DAY_START = 7 * 60;
export const DEFAULT_DAY_END = 19 * 60;

type Timed = { id: string; startTime: string; endTime: string };

/**
 * Chooses the visible hours for a week grid. It covers the default window and widens it to whole hours so that every
 * lesson fits.
 */
export function gridWindow(lessons: Timed[]): { start: number; end: number } {
  let start = DEFAULT_DAY_START;
  let end = DEFAULT_DAY_END;
  for (const lesson of lessons) {
    start = Math.min(start, Math.floor(minutesOfDay(lesson.startTime) / 60) * 60);
    end = Math.max(end, Math.ceil(minutesOfDay(lesson.endTime) / 60) * 60);
  }
  return { start, end };
}

/**
 * Places the lessons of one day side by side when they overlap. Each lesson gets a lane, and every lane in the day
 * has the same width. Lessons that do not overlap share a lane. The result has one entry per lesson, in input order.
 */
export function layoutDay<T extends Timed>(lessons: T[]): (T & { lane: number; lanes: number; top: number; height: number })[] {
  const ordered = [...lessons].sort((a, b) => minutesOfDay(a.startTime) - minutesOfDay(b.startTime));
  const laneEnds: number[] = [];
  const placed = new Map<string, { lane: number }>();

  for (const lesson of ordered) {
    const start = minutesOfDay(lesson.startTime);
    const end = minutesOfDay(lesson.endTime);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    placed.set(lesson.id, { lane });
  }

  const lanes = Math.max(1, laneEnds.length);
  return lessons.map((lesson) => ({
    ...lesson,
    lane: placed.get(lesson.id)?.lane ?? 0,
    lanes,
    top: minutesOfDay(lesson.startTime),
    height: minutesOfDay(lesson.endTime) - minutesOfDay(lesson.startTime),
  }));
}
