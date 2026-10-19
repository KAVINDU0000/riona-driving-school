/*
 * Sinhala text for the road signs page: the hero, the section headings, the speed limits and the closing note.
 * The shape cards and the road rules have their own files. The categories section keeps its own Sinhala names.
 * These were written for this page and should be checked by a Sinhala speaker.
 */
export const ROAD_SIGNS_PAGE_SI = {
  shapes: {
    label: "සලකුණක් කියවීම",
    heading: "හැඩය සහ වර්ණය සලකුණක් අදහස් කරන දේ ඔබට කියයි",
  },
  speed: {
    label: "වේගය",
    heading: "වේග සීමා",
    note: "වේග සීමා වෙනස් විය හැකි අතර, මාර්ගයේ ඇති සලකුණු සැමවිටම අදාළ වේ. රිය පැදවීමට පෙර මෝටර් ට්‍රැෆික් දෙපාර්තමේන්තුවේ (DMT) වත්මන් නීති පරීක්ෂා කරන්න.",
  },
  speedLimits: {
    "Built-up areas and towns": {
      place: "නගර සහ ජනාවාස ප්‍රදේශ",
      note: "ලැයිස්තුගත මාර්ගවල මෝටර් වාහන. සමහර වාහන සහ ස්ථාන සඳහා පහත් සීමා අදාළ වේ.",
    },
    "Roads outside built-up areas": {
      place: "ජනාවාස ප්‍රදේශවලින් පිටත මාර්ග",
      note: "බොහෝ මෝටර් වාහන. මෝටර් කෝච් සහ ලොරි සඳහා පහත් සීමාවක් ඇත.",
    },
    "Southern Expressway": {
      place: "දකුණු අධිවේගී මාර්ගය",
      note: "මෙම අධිවේගී මාර්ගයේ උපරිම වේගය. එක් එක් කොටසේ සීමාව සඳහා සලකුණු අනුගමනය කරන්න.",
    },
  } as Record<string, { place: string; note: string }>,
  rules: {
    label: "මාර්ග නීති",
    heading: "ශ්‍රී ලංකාවේ රියදුරන් සඳහා ප්‍රධාන නීති",
  },
};
