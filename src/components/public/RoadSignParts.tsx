import Image from "next/image";
import { Surface } from "@/components/landing/primitives";
import DangerSignImage from "@/components/public/DangerSignImage";
import type { SignCategory, SignGlyph } from "@/data/road-rules";
import { PICTURE_NAMES } from "@/data/road-signs-picture-names";
import type { RoadSignsLang } from "@/data/road-signs-ui";
import { SINHALA_DANGER_SIGNS } from "@/data/road-signs-sinhala-danger";
import { SINHALA_PROHIBITORY_SIGNS } from "@/data/road-signs-sinhala-prohibitory";
import { SINHALA_MANDATORY_SIGNS } from "@/data/road-signs-sinhala-mandatory";
import { SINHALA_PRIORITY_SIGNS } from "@/data/road-signs-sinhala-priority";
import { SINHALA_RESTRICTIVE_SIGNS } from "@/data/road-signs-sinhala-restrictive";
import { SINHALA_USEFUL_SIGNS } from "@/data/road-signs-sinhala-useful";
import { SINHALA_MARKINGS_SIGNS } from "@/data/road-signs-sinhala-markings";
import { SINHALA_LIGHTS_SIGNS } from "@/data/road-signs-sinhala-lights";
import { SINHALA_POLICE_SIGNS } from "@/data/road-signs-sinhala-police";

const SINHALA_SIGNS_BY_CATEGORY: Record<
  string,
  { image: string; name: string }[]
> = {
  prohibitory: SINHALA_PROHIBITORY_SIGNS,
  restrictive: SINHALA_RESTRICTIVE_SIGNS,
  mandatory: SINHALA_MANDATORY_SIGNS,
  priority: SINHALA_PRIORITY_SIGNS,
  useful: SINHALA_USEFUL_SIGNS,
  markings: SINHALA_MARKINGS_SIGNS,
  lights: SINHALA_LIGHTS_SIGNS,
  police: SINHALA_POLICE_SIGNS,
};

/** Drawn sign shape. Its colour and outline show the type of sign. Decorative only; the sign name is always written out. */
export function SignShape({
  glyph,
  className = "h-10 w-10",
}: {
  glyph: SignGlyph;
  className?: string;
}) {
  const body = (() => {
    switch (glyph) {
      case "diamond":
        return (
          <rect
            x="11"
            y="11"
            width="26"
            height="26"
            transform="rotate(45 24 24)"
            fill="#facc15"
            stroke="#111827"
            strokeWidth="2.5"
          />
        );
      case "circle":
        return (
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="#ffffff"
            stroke="#dc2626"
            strokeWidth="4.5"
          />
        );
      case "triangle":
        return (
          <path
            d="M5 9 L43 9 L24 41 Z"
            fill="#ffffff"
            stroke="#dc2626"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
        );
      case "octagon":
        return (
          <polygon
            points="16,4 32,4 44,16 44,32 32,44 16,44 4,32 4,16"
            fill="#dc2626"
          />
        );
      case "square":
        return (
          <rect x="4" y="4" width="40" height="40" rx="6" fill="#1d4ed8" />
        );
      default:
        return null;
    }
  })();

  return (
    <svg
      viewBox="0 0 48 48"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}

/** Icon for a category card. Danger signs use a drawn sign; the other categories use their sign shape or a small drawing. */
/** One clear sign picture per category, shown on the Road Signs index cards. */
const CATEGORY_PICTURE: Record<string, string> = {
  warning: "/road-signs/DWS-32.png",
  prohibitory: "/road-signs/prohibitory/01.png",
  restrictive: "/road-signs/restrictive/01.png",
  mandatory: "/road-signs/mandatory/01.png",
  priority: "/road-signs/priority/01.png",
  useful: "/road-signs/useful/04.png",
  markings: "/road-signs/markings/03.png",
  lights: "/road-signs/lights/03.png",
  police: "/road-signs/police/02.png",
};

export function CategoryIcon({
  category,
  className = "h-12 w-12",
}: {
  category: SignCategory;
  className?: string;
}) {
  const picture = CATEGORY_PICTURE[category.id];
  if (picture) {
    return (
      <Image
        src={picture}
        alt=""
        width={96}
        height={96}
        className={`shrink-0 object-contain ${className}`}
      />
    );
  }
  if (category.id === "warning") {
    return (
      <DangerSignImage name="Pedestrian crossing ahead" className={className} />
    );
  }
  if (category.id === "lights") {
    return (
      <svg
        viewBox="0 0 48 48"
        className={`shrink-0 ${className}`}
        aria-hidden="true"
      >
        <rect x="16" y="6" width="16" height="36" rx="4" fill="#111827" />
        <circle cx="24" cy="14" r="4" fill="#dc2626" />
        <circle cx="24" cy="24" r="4" fill="#facc15" />
        <circle cx="24" cy="34" r="4" fill="#16a34a" />
      </svg>
    );
  }
  if (category.id === "markings") {
    return (
      <svg
        viewBox="0 0 48 48"
        className={`shrink-0 ${className}`}
        aria-hidden="true"
      >
        <rect x="6" y="6" width="36" height="36" rx="4" fill="#111827" />
        <line
          x1="24"
          y1="10"
          x2="24"
          y2="16"
          stroke="#ffffff"
          strokeWidth="3"
        />
        <line
          x1="24"
          y1="20"
          x2="24"
          y2="28"
          stroke="#ffffff"
          strokeWidth="3"
        />
        <line
          x1="24"
          y1="32"
          x2="24"
          y2="38"
          stroke="#ffffff"
          strokeWidth="3"
        />
      </svg>
    );
  }
  if (category.id === "police") {
    return (
      <svg
        viewBox="0 0 48 48"
        className={`shrink-0 ${className}`}
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="22" fill="#f1f5f9" />
        <circle cx="24" cy="16" r="5" fill="#111827" />
        <line
          x1="24"
          y1="22"
          x2="24"
          y2="34"
          stroke="#111827"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="24"
          y1="26"
          x2="14"
          y2="18"
          stroke="#111827"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="24"
          y1="26"
          x2="34"
          y2="18"
          stroke="#111827"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return <SignShape glyph={category.glyph} className={className} />;
}

/** Sign pictures for each category, with the Sinhala name of each picture. English and Tamil names come from PICTURE_NAMES. */
const PICTURE_LISTS: Record<string, { image: string; name: string }[]> = {
  warning: SINHALA_DANGER_SIGNS,
  ...SINHALA_SIGNS_BY_CATEGORY,
};

/** The name of a sign picture in the chosen language. Sinhala is stored with the picture; English and Tamil are in PICTURE_NAMES. */
export function pictureName(sign: { image: string; name: string }, lang: RoadSignsLang): string {
  if (lang === "si") return sign.name;
  return PICTURE_NAMES[sign.image]?.[lang] ?? sign.name;
}

/** All signs in one category, as picture tiles. Each name is written in the chosen language only. */
export function CategorySignGrid({ category, lang }: { category: SignCategory; lang: RoadSignsLang }) {
  const signs = PICTURE_LISTS[category.id] ?? [];
  return (
    <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {signs.map((sign) => (
        <li key={sign.image}>
          <Surface lift className="flex h-full flex-col items-center gap-3 p-4 text-center">
            <Image
              src={sign.image}
              alt=""
              width={96}
              height={96}
              className="h-20 w-20 shrink-0 object-contain"
            />
            <span lang={lang} className="text-[0.875rem] font-semibold leading-snug text-ink">
              {pictureName(sign, lang)}
            </span>
          </Surface>
        </li>
      ))}
    </ul>
  );
}
