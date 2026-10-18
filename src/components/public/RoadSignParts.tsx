import Image from "next/image";
import { Surface } from "@/components/landing/primitives";
import DangerSignImage from "@/components/public/DangerSignImage";
import {
  SIGN_IMAGES,
  type SignCategory,
  type SignGlyph,
} from "@/data/road-rules";
import { SIGN_NAMES_SI } from "@/data/road-signs-si";
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

/** The official sign picture for a sign name, or null when the sign has none. Decorative; the name is always written out. */
function SignPicture({ name, className }: { name: string; className: string }) {
  const src = SIGN_IMAGES[name];
  if (!src) return null;
  return (
    <Image
      src={src}
      alt=""
      width={96}
      height={96}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

/** The Sinhala name of a sign, shown under the English name. Renders nothing when there is no Sinhala name. */
function SinhalaName({ name, className }: { name: string; className: string }) {
  const text = SIGN_NAMES_SI[name];
  if (!text) return null;
  return (
    <span lang="si" className={className}>
      {text}
    </span>
  );
}

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

/** All signs in one category, as tiles. Warning signs are drawn; other shape-based signs use their shape. */
/** A grid of sign pictures with their Sinhala names only. Used for categories that have a Sinhala picture list. */
function SinhalaSignGrid({
  signs,
}: {
  signs: { image: string; name: string }[];
}) {
  return (
    <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {signs.map((sign) => (
        <li key={sign.image}>
          <Surface className="flex h-full items-center gap-4 p-4">
            <Image
              src={sign.image}
              alt=""
              width={240}
              height={160}
              className="h-24 w-28 shrink-0 object-contain"
            />
            <span
              lang="si"
              className="text-[0.9375rem] font-semibold leading-snug text-ink"
            >
              {sign.name}
            </span>
          </Surface>
        </li>
      ))}
    </ul>
  );
}

export function CategorySignGrid({ category }: { category: SignCategory }) {
  if (category.glyph === "none") {
    const sinhalaList = SINHALA_SIGNS_BY_CATEGORY[category.id];
    if (sinhalaList) {
      return <SinhalaSignGrid signs={sinhalaList} />;
    }
    return (
      <ul className="mt-10 grid gap-3 md:grid-cols-2">
        {category.signs.map((name) => (
          <li key={name}>
            <Surface className="flex h-full items-start gap-3 p-4">
              {SIGN_IMAGES[name] ? (
                <SignPicture name={name} className="h-12 w-12" />
              ) : (
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold"
                  aria-hidden="true"
                />
              )}
              <div className="flex flex-col gap-1">
                <span className="text-[0.9375rem] leading-[1.6] text-ink">
                  {name}
                </span>
                <SinhalaName
                  name={name}
                  className="text-[0.875rem] leading-[1.6] text-muted"
                />
              </div>
            </Surface>
          </li>
        ))}
      </ul>
    );
  }

  if (category.id === "warning") {
    return (
      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {SINHALA_DANGER_SIGNS.map((sign) => (
          <li key={sign.image}>
            <Surface
              lift
              className="flex h-full flex-col items-center gap-3 p-4 text-center"
            >
              <Image
                src={sign.image}
                alt=""
                width={96}
                height={96}
                className="h-20 w-20 shrink-0 object-contain"
              />
              <span
                lang="si"
                className="text-[0.875rem] font-semibold leading-snug text-ink"
              >
                {sign.name}
              </span>
            </Surface>
          </li>
        ))}
      </ul>
    );
  }

  // Categories with a Sinhala picture list show only that list; the English tiles are replaced by it.
  const sinhalaSigns = SINHALA_SIGNS_BY_CATEGORY[category.id];

  return (
    <>
      {!sinhalaSigns && (
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {category.signs.map((name) => (
            <li key={name}>
              <Surface className="flex h-full items-center gap-4 p-4">
                {SIGN_IMAGES[name] ? (
                  <SignPicture name={name} className="h-12 w-12" />
                ) : (
                  <SignShape glyph={category.glyph} />
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-[0.9375rem] font-semibold leading-snug text-ink">
                    {name}
                  </span>
                  <SinhalaName
                    name={name}
                    className="text-[0.875rem] leading-snug text-muted"
                  />
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      )}
      {sinhalaSigns && (
        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {sinhalaSigns.map((sign) => (
            <li key={sign.image}>
              <Surface
                lift
                className="flex h-full flex-col items-center gap-3 p-4 text-center"
              >
                <Image
                  src={sign.image}
                  alt=""
                  width={96}
                  height={96}
                  className="h-20 w-20 shrink-0 object-contain"
                />
                <span
                  lang="si"
                  className="text-[0.875rem] font-semibold leading-snug text-ink"
                >
                  {sign.name}
                </span>
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
