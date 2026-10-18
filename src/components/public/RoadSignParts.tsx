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
export function CategoryIcon({
  category,
  className = "h-12 w-12",
}: {
  category: SignCategory;
  className?: string;
}) {
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
export function CategorySignGrid({ category }: { category: SignCategory }) {
  if (category.glyph === "none") {
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

  return (
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
  );
}
