/*
 * Sinhala names for the nine road sign topics, keyed by category ID in src/data/road-rules.ts. The English title is shown
 * in brackets after the Sinhala name. These names were typed from the school's topic list and should be checked by a
 * Sinhala speaker.
 */
export const CATEGORY_TITLES_SI: Record<string, string> = {
  warning: "අනතුරු ඇඟවීමේ සලකුණු",
  prohibitory: "නියාමන සලකුණු",
  restrictive: "සීමාකාරී සලකුණු",
  mandatory: "විධාන සලකුණු",
  priority: "ප්‍රමුඛතා සලකුණු",
  useful: "රියැදුරන් හට ප්‍රයෝජනවත් අනෙකුත් සලකුණු",
  markings: "මාර්ග ලකුණු කිරීම්",
  lights: "රථ වාහන ආලෝක සංඥා",
  police: "පොලිස් නිලධාරීන් විසින් කරනු ලබන හස්ත සංඥා",
};

/** The Sinhala topic name with the English title in brackets, for headings that take plain text. */
export function categoryTitleWithEnglish(id: string, englishTitle: string) {
  const si = CATEGORY_TITLES_SI[id];
  return si ? `${si} (${englishTitle})` : englishTitle;
}
