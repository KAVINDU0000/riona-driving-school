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

/** One line on what each category covers, in Sinhala. The English intro is in src/data/road-rules.ts. */
export const CATEGORY_INTROS_SI: Record<string, string> = {
  warning: "ඉදිරියේ ඇති අනතුරක් හෝ මාර්ගයේ වෙනසක් ගැන ඔබට අනතුරු ඇඟවන කහ රොම්බස් හැඩැති සලකුණු. වේගය අඩු කර ක්‍රියා කිරීමට සූදානම් වන්න.",
  prohibitory: "ඔබ කළ යුතු නොවන දේ ඔබට පවසන රතු රාමුගත කවාකාර සලකුණු.",
  restrictive: "පළල, උස, බර හෝ වේගය සීමා කරන රතු රාමුගත කවාකාර සලකුණු.",
  mandatory: "කළ යුතු ගමන් දිශාව හෝ පසු කරන ආකාරය ඔබට පවසන කළු ඊතලයක් සහිත රතු රාමුගත කවාකාර සලකුණු.",
  priority: "හන්දියක හෝ පටු මාර්ගයක පළමුව යා යුත්තේ කවුද යන්න තීරණය කරන සලකුණු.",
  useful: "පහසුකම්, මංතීරු සහ මාර්ග පෙන්වන නිල් සලකුණු.",
  markings: "මාර්ගයේ ඇඳ ඇති රේඛා, ඊතල සහ වචන. ඒවාට සලකුණුවල බලයම ඇත.",
  lights: "රියදුරෙකු සඳහා එක් එක් ආලෝකයේ අර්ථය.",
  police: "හන්දියක හෝ මාර්ග වැඩ ස්ථානයක පොලිස් නිලධාරියාගේ සංඥා. ආලෝක සංඥාවලට වඩා නිලධාරියාගේ සංඥාව අනුගමනය කරන්න.",
};
