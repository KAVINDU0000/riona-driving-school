import React from "react";

/**
 * Thin outline icon set used across the home page. Each entry is the inner
 * markup of a 24x24 stroke icon; stroke colour is inherited via currentColor.
 */
const paths: Record<string, React.ReactNode> = {
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.4 2.4 4.6-4.8" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  "shield-check": (
    <>
      <path d="M12 3.2 5 6v5.4c0 4 2.9 7.6 7 9.4 4.1-1.8 7-5.4 7-9.4V6l-7-2.8Z" />
      <path d="m9.2 12.1 2 2 3.6-3.8" />
    </>
  ),
  shield: <path d="M12 3.2 5 6v5.4c0 4 2.9 7.6 7 9.4 4.1-1.8 7-5.4 7-9.4V6l-7-2.8Z" />,
  users: (
    <>
      <circle cx="9.5" cy="8.5" r="3.1" />
      <path d="M3.8 19.3c.6-3 2.9-4.8 5.7-4.8s5.1 1.8 5.7 4.8" />
      <path d="M16.4 6.2a3 3 0 0 1 0 5.7M17.6 14.9c2 .6 3.3 2.2 3.7 4.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.6" r="3.3" />
      <path d="M5.2 19.6c.8-3.3 3.4-5.3 6.8-5.3s6 2 6.8 5.3" />
    </>
  ),
  car: (
    <>
      <path d="M3.2 15.4h17.6M5.4 15.4v2.1a.9.9 0 0 1-.9.9H4a.9.9 0 0 1-.9-.9v-2.1M20.9 15.4v2.1a.9.9 0 0 1-.9.9h-.6a.9.9 0 0 1-.9-.9v-2.1" />
      <path d="M3.2 15.4v-3.1l1.9-4.6A2 2 0 0 1 7 6.4h10a2 2 0 0 1 1.9 1.3l1.9 4.6v3.1" />
      <path d="M6.4 12.2h3M14.6 12.2h3" />
    </>
  ),
  van: (
    <>
      <path d="M2.6 16.4V9.1a1.5 1.5 0 0 1 1.5-1.5h8.6v8.8M12.7 10.4h3.6l3.3 3.4v2.6" />
      <path d="M2.6 16.4h1.9M10 16.4h4.3M19.6 16.4h1.8" />
      <circle cx="6.9" cy="16.9" r="1.9" />
      <circle cx="17.1" cy="16.9" r="1.9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.6" y="5.4" width="16.8" height="14.2" rx="2.4" />
      <path d="M3.6 10h16.8M8.4 3.6v3.4M15.6 3.6v3.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.3V12l3.1 1.9" />
    </>
  ),
  wallet: (
    <>
      <path d="M3.6 8.4a2.2 2.2 0 0 1 2.2-2.2h11.4A2.2 2.2 0 0 1 19.4 8.4v9A2.2 2.2 0 0 1 17.2 19.6H5.8a2.2 2.2 0 0 1-2.2-2.2Z" />
      <path d="M19.4 11.3h-3.1a1.6 1.6 0 0 0 0 3.2h3.1" />
    </>
  ),
  flag: (
    <>
      <path d="M6.4 20.4V4.2M6.4 5.1h10.3l-1.8 3.5 1.8 3.5H6.4" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9.4 17.2a5.6 5.6 0 1 1 5.2 0v2a1.4 1.4 0 0 1-1.4 1.4h-2.4a1.4 1.4 0 0 1-1.4-1.4Z" />
      <path d="M9.8 17.2h4.4" />
    </>
  ),
  "badge-check": (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m8.4 12.1 2.4 2.4 4.8-5" />
    </>
  ),
  "file-check": (
    <>
      <path d="M13.4 3.6H7.2A1.8 1.8 0 0 0 5.4 5.4v13.2a1.8 1.8 0 0 0 1.8 1.8h9.6a1.8 1.8 0 0 0 1.8-1.8V8.2Z" />
      <path d="M13.4 3.6v4.6h5.2" />
      <path d="m9.3 14.6 1.9 1.9 3.6-3.8" />
    </>
  ),
  sliders: (
    <>
      <path d="M4.4 7.6h9.2M18 7.6h1.6M4.4 16.4h3.2M12 16.4h7.6" />
      <circle cx="16" cy="7.6" r="2" />
      <circle cx="9.9" cy="16.4" r="2" />
    </>
  ),
  "heart-pulse": (
    <>
      <path d="M12 19.7S4.4 15.4 4.4 10.1a3.9 3.9 0 0 1 7.6-1.3 3.9 3.9 0 0 1 7.6 1.3c0 5.3-7.6 9.6-7.6 9.6Z" />
      <path d="M4.9 12.3h3l1.4-2.3 1.9 4 1.5-2.6h6.4" />
    </>
  ),
  "heart-handshake": (
    <>
      <path d="M12 19.6S4.6 15.4 4.6 10.2A3.8 3.8 0 0 1 12 8.9a3.8 3.8 0 0 1 7.4 1.3c0 5.2-7.4 9.4-7.4 9.4Z" />
      <path d="m9.6 12.1 1.7 1.7a1 1 0 0 0 1.4 0l1.7-1.7" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6.3 6.4 12 6.4 21.2 12 21.2 12 17.7 17.6 12 17.6 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m9.3 9.3 5.4 5.4M14.7 9.3l-5.4 5.4" />
    </>
  ),
  grid: (
    <>
      <rect x="4.2" y="4.2" width="6.2" height="6.2" rx="1.6" />
      <rect x="13.6" y="4.2" width="6.2" height="6.2" rx="1.6" />
      <rect x="4.2" y="13.6" width="6.2" height="6.2" rx="1.6" />
      <rect x="13.6" y="13.6" width="6.2" height="6.2" rx="1.6" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M10.4 9.1 15 12l-4.6 2.9Z" />
    </>
  ),
  signpost: (
    <>
      <path d="M12 3.4v17.2" />
      <path d="M12 6.2h6.4l1.8 2.3-1.8 2.3H12M12 13h-6.4L3.8 15.3l1.8 2.3H12" />
    </>
  ),
  book: (
    <>
      <path d="M4.2 5.1a1.5 1.5 0 0 1 1.5-1.5h3.6A2.7 2.7 0 0 1 12 6.3v13a2.3 2.3 0 0 0-2.3-2.3H4.2Z" />
      <path d="M19.8 5.1a1.5 1.5 0 0 0-1.5-1.5h-3.6A2.7 2.7 0 0 0 12 6.3v13a2.3 2.3 0 0 1 2.3-2.3h5.5Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11.1v5.1M12 8.1h.01" />
    </>
  ),
  phone: (
    <path d="M7.1 3.9 9 3.6a1 1 0 0 1 1.1.6l1.1 2.6a1 1 0 0 1-.3 1.2l-1.3 1a11.3 11.3 0 0 0 5.4 5.4l1-1.3a1 1 0 0 1 1.2-.3l2.6 1.1a1 1 0 0 1 .6 1.1l-.3 1.9a1.3 1.3 0 0 1-1.4 1.1A15.6 15.6 0 0 1 5.9 5.3 1.3 1.3 0 0 1 7.1 3.9Z" />
  ),
  chat: (
    <path d="M20.4 11.6c0 4.1-3.8 7.4-8.4 7.4a9.7 9.7 0 0 1-2.6-.35L4.3 20.3l1.3-3.7a7 7 0 0 1-2-4.9c0-4.1 3.8-7.4 8.4-7.4s8.4 3.3 8.4 7.3Z" />
  ),
  "map-pin": (
    <>
      <path d="M19 10.3c0 5-7 10.3-7 10.3S5 15.3 5 10.3a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="10.1" r="2.5" />
    </>
  ),
  sparkle: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3.4v2.1M12 18.5v2.1M3.4 12h2.1M18.5 12h2.1M5.9 5.9l1.5 1.5M16.6 16.6l1.5 1.5M18.1 5.9l-1.5 1.5M7.4 16.6l-1.5 1.5" />
    </>
  ),
  "external-link": (
    <>
      <path d="M13.4 4.6h6v6M19.4 4.6 11 13" />
      <path d="M17.3 13.9v4.3a1.9 1.9 0 0 1-1.9 1.9H5.8a1.9 1.9 0 0 1-1.9-1.9V8.6a1.9 1.9 0 0 1 1.9-1.9h4.3" />
    </>
  ),
  "arrow-up-right": <path d="M7.4 16.6 16.6 7.4M8.6 7.4h8v8" />,
  "arrow-up": <path d="M12 19V5M5.8 11.2 12 5l6.2 6.2" />,
  "arrow-left": <path d="M19 12H5M11.2 5.8 5 12l6.2 6.2" />,
  "arrow-right": <path d="M5 12h14M12.8 5.8 19 12l-6.2 6.2" />,
  pause: <path d="M9.4 5.4v13.2M14.6 5.4v13.2" />,
  plus: <path d="M12 5.6v12.8M5.6 12h12.8" />,
  minus: <path d="M5.6 12h12.8" />,
  mail: (
    <>
      <rect x="3.4" y="5.6" width="17.2" height="12.8" rx="2.2" />
      <path d="m4.4 7.2 7.6 5.6 7.6-5.6" />
    </>
  ),
  lock: (
    <>
      <rect x="5.4" y="10.6" width="13.2" height="9.4" rx="2.2" />
      <path d="M8.4 10.6V8a3.6 3.6 0 0 1 7.2 0v2.6" />
    </>
  ),
  "id-card": (
    <>
      <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.4" />
      <circle cx="9" cy="10.6" r="1.9" />
      <path d="M6.6 15.8c.5-1.5 1.3-2.2 2.4-2.2s1.9.7 2.4 2.2M14.6 10h3.4M14.6 13.4h2.4" />
    </>
  ),
};

export type IconName = keyof typeof paths;

interface IconProps {
  name: string;
  className?: string;
  strokeWidth?: number;
}

export default function Icon({ name, className = "w-5 h-5", strokeWidth = 1.6 }: IconProps) {
  const d = paths[name];
  if (!d) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}
