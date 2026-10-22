import type { Metadata, Viewport } from "next";
import { Outfit, Geist_Mono, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

// Sinhala text (lang="si") uses this font; Outfit has no Sinhala letters.
const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-sinhala",
  subsets: ["sinhala", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// Tamil text (lang="ta") uses this font; Outfit has no Tamil letters.
const notoTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Riyona Driving School | Professional Driving School in Sri Lanka",
  description:
    "Government approved driver education in Sri Lanka. Car, van, motorcycle and three-wheeler lessons with patient instructors, dual-control vehicles and full transport on DMT exam day.",
  keywords:
    "driving school, driving lessons, Sri Lanka, DMT exam, driving licence, Werahera, dual control, Colombo",
  authors: [{ name: "Riyona Driving School" }],
  robots: "index, follow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${notoSinhala.variable} ${notoTamil.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page text-ink">{children}</body>
    </html>
  );
}
