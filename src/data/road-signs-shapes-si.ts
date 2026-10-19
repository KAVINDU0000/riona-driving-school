/*
 * Sinhala text for the five sign-shape cards on the road signs page, keyed by the shape's glyph in src/data/road-rules.ts.
 * These were written for this page and should be checked by a Sinhala speaker.
 */
export const SIGN_SHAPES_SI: Record<string, { shape: string; type: string; body: string }> = {
  diamond: {
    shape: "කහ රොම්බස් හැඩය",
    type: "අනතුරු ඇඟවීමේ සලකුණු",
    body: "මාර්ගයේ ඉදිරියේ වංගුවක්, හන්දියක්, මංතීරුවක් හෝ වෙනත් අනතුරක් ගැන ඔබට අනතුරු ඇඟවයි.",
  },
  circle: {
    shape: "රතු කවාකාර රාමුව",
    type: "නියාමන සලකුණු (තහනම් හෝ සීමා කිරීම්)",
    body: "ඔබට කළ නොහැකි දෙයක් හෝ වේග සීමාව හෝ හැරවීමේ සීමාව වැනි සීමාවක් දක්වයි.",
  },
  triangle: {
    shape: "රතු ත්‍රිකෝණාකාර රාමුව",
    type: "ඉඩ දෙන්න සලකුණු",
    body: "හන්දි වැනි ස්ථානවල අනෙක් ගමනාගමනයට මුලින් යාමට ඉඩ දෙන්න කියා ඔබට පවසයි.",
  },
  octagon: {
    shape: "රතු අෂ්ටාස්‍රාකාර හැඩය",
    type: "නැවතුම් සලකුණ",
    body: "ඉදිරියට යාමට පෙර ඔබ සම්පූර්ණයෙන් නැවතිය යුතුය. නීතිය අනුව අවශ්‍ය නම් ඉඩ දී ඉදිරියට යන්න.",
  },
  square: {
    shape: "නිල් සමචතුරස්‍රාකාර හෝ සෘජුකෝණාස්‍රාකාර හැඩය",
    type: "තොරතුරු සලකුණු",
    body: "වාහන නැවැත්වීම, රෝහල්, බස් පථ සහ අධිවේගී මාර්ග වැනි පහසුකම් සහ සේවා පෙන්වයි.",
  },
};
