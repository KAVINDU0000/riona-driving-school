import type { ReactNode } from "react";

/*
 * Drawn danger warning signs: a yellow diamond with a simplified black symbol. They are drawn for this site and are not
 * copies of any other website's images. The symbols are simplified, so check the official sign designs in the Manual on
 * Traffic Control Devices. Each key matches a sign name in src/data/road-rules.ts.
 */

const STROKE = { stroke: "#111827", strokeWidth: 3.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

/** A simple stick figure: head, body, arms and legs, around the point (x, y) at the top of the head. */
function Person({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = scale;
  return (
    <g {...STROKE} strokeWidth={3 * s}>
      <circle cx={x} cy={y + 4 * s} r={3 * s} fill="#111827" stroke="none" />
      <line x1={x} y1={y + 8 * s} x2={x} y2={y + 20 * s} />
      <line x1={x - 5 * s} y1={y + 12 * s} x2={x + 5 * s} y2={y + 12 * s} />
      <line x1={x} y1={y + 20 * s} x2={x - 4 * s} y2={y + 28 * s} />
      <line x1={x} y1={y + 20 * s} x2={x + 4 * s} y2={y + 28 * s} />
    </g>
  );
}

function Arrow({ x, y, dir }: { x: number; y: number; dir: "up" | "down" | "left" | "right" }) {
  const points: Record<string, string> = {
    up: `${x - 4},${y + 4} ${x},${y - 2} ${x + 4},${y + 4}`,
    down: `${x - 4},${y - 4} ${x},${y + 2} ${x + 4},${y - 4}`,
    left: `${x + 4},${y - 4} ${x - 2},${y} ${x + 4},${y + 4}`,
    right: `${x - 4},${y - 4} ${x + 2},${y} ${x - 4},${y + 4}`,
  };
  return <polyline points={points[dir]} {...STROKE} strokeWidth={3} />;
}

const GLYPHS: Record<string, ReactNode> = {
  "Left bend ahead": (
    <g {...STROKE}>
      <path d="M16 36 V26 Q16 16 26 16 H32" />
      <Arrow x={34} y={16} dir="right" />
    </g>
  ),
  "Right bend ahead": (
    <g {...STROKE}>
      <path d="M32 36 V26 Q32 16 22 16 H16" />
      <Arrow x={14} y={16} dir="left" />
    </g>
  ),
  "Double bend to the left ahead": <polyline points="18,36 18,28 30,24 30,12" {...STROKE} />,
  "Double bend to the right ahead": <polyline points="30,36 30,28 18,24 18,12" {...STROKE} />,
  "Hairpin bend to the right ahead": <path d="M18 36 V16 Q18 12 24 12 Q30 12 30 18 V30" {...STROKE} />,
  "Hairpin bend to the left ahead": <path d="M30 36 V16 Q30 12 24 12 Q18 12 18 18 V30" {...STROKE} />,
  "Dual carriageway starts ahead": (
    <g {...STROKE}>
      <line x1="24" y1="36" x2="24" y2="26" />
      <line x1="24" y1="26" x2="16" y2="13" />
      <line x1="24" y1="26" x2="32" y2="13" />
    </g>
  ),
  "Dual carriageway ends": (
    <g {...STROKE}>
      <line x1="16" y1="13" x2="24" y2="26" />
      <line x1="32" y1="13" x2="24" y2="26" />
      <line x1="24" y1="26" x2="24" y2="36" />
    </g>
  ),
  "Road narrows ahead": (
    <g {...STROKE}>
      <line x1="17" y1="36" x2="22" y2="12" />
      <line x1="31" y1="36" x2="26" y2="12" />
    </g>
  ),
  "Road narrows on the left side ahead": (
    <g {...STROKE}>
      <line x1="18" y1="36" x2="18" y2="12" />
      <line x1="30" y1="36" x2="26" y2="18" />
    </g>
  ),
  "Road narrows on the right side ahead": (
    <g {...STROKE}>
      <line x1="30" y1="36" x2="30" y2="12" />
      <line x1="18" y1="36" x2="22" y2="18" />
    </g>
  ),
  "Cross roads ahead": (
    <g {...STROKE} strokeWidth={5}>
      <line x1="24" y1="12" x2="24" y2="36" />
      <line x1="12" y1="24" x2="36" y2="24" />
    </g>
  ),
  "Staggered junction ahead, side road to the left": (
    <g {...STROKE} strokeWidth={5}>
      <line x1="24" y1="12" x2="24" y2="36" />
      <line x1="14" y1="24" x2="24" y2="24" />
    </g>
  ),
  "Staggered junction ahead, side road to the right": (
    <g {...STROKE} strokeWidth={5}>
      <line x1="24" y1="12" x2="24" y2="36" />
      <line x1="24" y1="24" x2="34" y2="24" />
    </g>
  ),
  "T-junction ahead": (
    <g {...STROKE} strokeWidth={5}>
      <line x1="12" y1="16" x2="36" y2="16" />
      <line x1="24" y1="16" x2="24" y2="36" />
    </g>
  ),
  "Y-junction ahead": (
    <g {...STROKE} strokeWidth={5}>
      <line x1="24" y1="36" x2="24" y2="26" />
      <line x1="24" y1="26" x2="14" y2="12" />
      <line x1="24" y1="26" x2="34" y2="12" />
    </g>
  ),
  "Traffic from the left merges ahead": (
    <g {...STROKE}>
      <line x1="18" y1="36" x2="24" y2="12" />
      <line x1="32" y1="36" x2="26" y2="22" />
    </g>
  ),
  "Traffic from the right merges ahead": (
    <g {...STROKE}>
      <line x1="30" y1="36" x2="24" y2="12" />
      <line x1="16" y1="36" x2="22" y2="22" />
    </g>
  ),
  "Narrow bridge ahead": (
    <g {...STROKE}>
      <path d="M18 12 Q12 24 18 36" />
      <path d="M30 12 Q36 24 30 36" />
    </g>
  ),
  "Two-way traffic ahead": (
    <g {...STROKE}>
      <line x1="17" y1="12" x2="17" y2="36" />
      <Arrow x={17} y={12} dir="up" />
      <line x1="31" y1="36" x2="31" y2="12" />
      <Arrow x={31} y={36} dir="down" />
    </g>
  ),
  "Stop ahead": <polygon points="16,12 32,12 38,18 38,30 32,36 16,36 10,30 10,18" fill="#111827" />,
  "Give way ahead": <polygon points="11,14 37,14 24,37" {...STROKE} strokeWidth={4} />,
  "Roundabout ahead": (
    <g {...STROKE}>
      <circle cx="24" cy="24" r="9" strokeDasharray="34 8" strokeWidth={3.5} />
    </g>
  ),
  "Traffic light signals ahead": (
    <g>
      <rect x="18" y="10" width="12" height="28" rx="3" fill="#111827" />
      <circle cx="24" cy="16" r="3" fill="#dc2626" />
      <circle cx="24" cy="24" r="3" fill="#facc15" />
      <circle cx="24" cy="32" r="3" fill="#16a34a" />
    </g>
  ),
  "Dangerous descent ahead": (
    <g>
      <polygon points="10,16 38,34 10,34" fill="#111827" />
      <Arrow x={34} y={14} dir="down" />
    </g>
  ),
  "Dangerous ascent ahead": (
    <g>
      <polygon points="38,16 10,34 38,34" fill="#111827" />
      <Arrow x={14} y={14} dir="up" />
    </g>
  ),
  "Slippery road ahead": (
    <path d="M14 38 Q24 30 16 24 Q8 18 26 12 M26 12 L30 8" {...STROKE} strokeWidth={3.5} />
  ),
  "Loose gravel ahead": (
    <g fill="#111827">
      <circle cx="14" cy="30" r="2.2" />
      <circle cx="22" cy="26" r="2.2" />
      <circle cx="30" cy="32" r="2.2" />
      <circle cx="26" cy="20" r="2.2" />
      <circle cx="34" cy="22" r="2.2" />
      <circle cx="18" cy="38" r="2.2" />
    </g>
  ),
  "Falling rocks ahead": (
    <g>
      <polygon points="12,36 34,36 22,14" fill="#111827" />
      <circle cx="34" cy="16" r="2.5" fill="#111827" />
      <circle cx="38" cy="24" r="2" fill="#111827" />
    </g>
  ),
  "Pedestrian crossing ahead": (
    <g>
      <Person x={24} y={10} scale={1.2} />
      <g fill="#111827">
        <rect x="10" y="34" width="28" height="3" />
        <rect x="10" y="38" width="28" height="0" />
      </g>
    </g>
  ),
  "Children crossing ahead": (
    <g>
      <Person x={16} y={10} scale={1} />
      <Person x={30} y={12} scale={0.8} />
    </g>
  ),
  "Blind people crossing ahead": (
    <g>
      <Person x={22} y={10} scale={1} />
      <line x1="30" y1="22" x2="36" y2="36" {...STROKE} strokeWidth={2.5} />
    </g>
  ),
  "Road work ahead": (
    <g>
      <Person x={22} y={10} scale={1.1} />
      <line x1="30" y1="26" x2="36" y2="36" {...STROKE} strokeWidth={2.5} />
    </g>
  ),
  "Level crossing with gates ahead": (
    <g {...STROKE} strokeWidth={3}>
      <line x1="12" y1="18" x2="36" y2="18" />
      <line x1="12" y1="30" x2="36" y2="30" />
      <line x1="16" y1="14" x2="16" y2="34" />
      <line x1="22" y1="14" x2="22" y2="34" />
      <line x1="28" y1="14" x2="28" y2="34" />
      <line x1="34" y1="14" x2="34" y2="34" />
    </g>
  ),
  "Level crossing without gates ahead": (
    <g>
      <rect x="10" y="20" width="28" height="8" rx="2" fill="#111827" />
      <circle cx="16" cy="32" r="3" fill="#111827" />
      <circle cx="32" cy="32" r="3" fill="#111827" />
    </g>
  ),
  "Bus lane ahead": (
    <g>
      <rect x="12" y="18" width="24" height="14" rx="3" fill="#111827" />
      <circle cx="17" cy="34" r="3" fill="#111827" />
      <circle cx="31" cy="34" r="3" fill="#111827" />
    </g>
  ),
  "Cycle lane ahead": (
    <g {...STROKE} strokeWidth={3}>
      <circle cx="16" cy="30" r="6" />
      <circle cx="32" cy="30" r="6" />
      <polyline points="16,30 22,20 32,30 26,20 22,20" />
    </g>
  ),
  "Cyclists crossing ahead": (
    <g>
      <circle cx="16" cy="32" r="5" {...STROKE} strokeWidth={2.5} />
      <circle cx="32" cy="32" r="5" {...STROKE} strokeWidth={2.5} />
      <line x1="16" y1="32" x2="24" y2="22" {...STROKE} strokeWidth={2.5} />
      <line x1="24" y1="22" x2="32" y2="32" {...STROKE} strokeWidth={2.5} />
      <circle cx="24" cy="14" r="3" fill="#111827" />
    </g>
  ),
  "Cattle crossing ahead": (
    <g>
      <ellipse cx="24" cy="26" rx="12" ry="7" fill="#111827" />
      <circle cx="36" cy="20" r="4" fill="#111827" />
      <rect x="16" y="30" width="3" height="6" fill="#111827" />
      <rect x="28" y="30" width="3" height="6" fill="#111827" />
    </g>
  ),
  "Road ahead on a quay": (
    <g {...STROKE} strokeWidth={3}>
      <path d="M12 18 Q24 10 36 18" />
      <path d="M12 26 Q18 22 24 26 T36 26" />
      <path d="M12 34 Q18 30 24 34 T36 34" />
    </g>
  ),
  "Dangerous side slopes ahead": (
    <g>
      <polygon points="12,12 36,12 36,36" fill="#111827" />
      <rect x="22" y="22" width="10" height="6" rx="1" fill="#facc15" />
    </g>
  ),
  "Road hump ahead": <path d="M10 32 Q24 14 38 32 Z" fill="#111827" />,
  "Uneven road ahead": (
    <g>
      <path d="M10 34 Q17 22 24 30 Q31 22 38 34 Z" fill="#111827" />
    </g>
  ),
  "Dip ahead": <path d="M10 16 Q24 32 38 16 L38 20 Q24 36 10 20 Z" fill="#111827" />,
  "Humped bridge ahead": (
    <g>
      <rect x="10" y="30" width="28" height="4" fill="#111827" />
      <path d="M14 30 Q24 14 34 30" {...STROKE} strokeWidth={4} />
    </g>
  ),
  "Tunnel ahead": <path d="M12 36 V24 Q12 12 24 12 Q36 12 36 24 V36 Z" fill="#111827" />,
};

/* Two signs use the same drawing as the merge signs they are named after. */
GLYPHS["Traffic from the left joins at a right angle"] = GLYPHS["Traffic from the left merges ahead"];
GLYPHS["Traffic from the right joins at a right angle"] = GLYPHS["Traffic from the right merges ahead"];

/** Returns the drawn danger sign for a sign name, or null when no drawing exists for it. */
export function hasDangerSignImage(name: string) {
  return name in GLYPHS;
}

/** A yellow diamond with the drawn symbol for a danger warning sign. */
export default function DangerSignImage({ name, className = "h-16 w-16" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} role="img" aria-label={name}>
      <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" fill="#facc15" stroke="#111827" strokeWidth="2" />
      {GLYPHS[name] ?? null}
    </svg>
  );
}
