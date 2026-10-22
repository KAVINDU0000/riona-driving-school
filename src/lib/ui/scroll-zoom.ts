/**
 * How far an item's centre is from the centre of the visible area, and the scale that follows from it. The item
 * reaches `maxScale` when its centre is in the middle of the area and returns to 1 as it moves away. The curve is
 * ease-in-out, so the change has no sharp start or stop. Only the middle part of the area counts, so items near the
 * top and bottom edges stay at 1.
 */
const REACH = 0.6;

export function zoomScale(top: number, bottom: number, areaTop: number, areaBottom: number, maxScale: number): number {
  const halfArea = (areaBottom - areaTop) / 2;
  if (halfArea <= 0) return 1;

  const distance = Math.min(1, Math.abs((top + bottom) / 2 - (areaTop + areaBottom) / 2) / (halfArea * REACH));
  const closeness = 1 - distance;
  const eased = closeness * closeness * (3 - 2 * closeness);
  return 1 + (maxScale - 1) * eased;
}
