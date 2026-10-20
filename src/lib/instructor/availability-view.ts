import { formatMinutes, minutesOfDay } from "@/lib/student/time";

/** The gaps between consecutive windows of one day. These are the instructor's breaks: nothing can be booked in them. */
export function breaksBetween(windows: { startTime: string; endTime: string }[]): { startTime: string; endTime: string }[] {
  const ordered = [...windows].sort((a, b) => minutesOfDay(a.startTime) - minutesOfDay(b.startTime));
  const gaps: { startTime: string; endTime: string }[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const from = minutesOfDay(ordered[index - 1].endTime);
    const to = minutesOfDay(ordered[index].startTime);
    if (to > from) gaps.push({ startTime: formatMinutes(from), endTime: formatMinutes(to) });
  }
  return gaps;
}
