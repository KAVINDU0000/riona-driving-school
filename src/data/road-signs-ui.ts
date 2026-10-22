/*
 * Page text for the road signs pages in English, සිංහල and தமிழ். The English text is also written in the components, so
 * a missing translation falls back to English. The Sinhala and Tamil text was written for this site and should be checked
 * by a native speaker before it is published.
 */

export type RoadSignsLang = "en" | "si" | "ta";

export type RoadSignsUi = {
  eyebrow: string;
  title: string;
  description: string;
  categoriesLabel: string;
  categoriesHeading: string;
  entries: (count: number) => string;
  allCategories: string;
  categoryEyebrow: (number: string) => string;
  categoryEntries: (count: number) => string;
  shapesLabel: string;
  shapesHeading: string;
  speedLabel: string;
  speedHeading: string;
  speedNote: string;
  /** Speed limit places, keyed by the English place name in src/data/road-rules.ts. */
  speedPlaces: Record<string, { place: string; note: string }>;
  rulesLabel: string;
  rulesHeading: string;
  switchLabel: string;
};

export const ROAD_SIGNS_LANGUAGES: { value: RoadSignsLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "si", label: "සිංහල" },
  { value: "ta", label: "தமிழ்" },
];

export const ROAD_SIGNS_UI: Record<RoadSignsLang, RoadSignsUi> = {
  en: {
    eyebrow: "Driving Signs & Road Rules",
    title: "Road signs and road rules in Sri Lanka",
    description: "Choose a category to see every sign, marking or signal in it. The rules that apply when you drive are below.",
    categoriesLabel: "Categories",
    categoriesHeading: "Road sign categories",
    entries: (count) => `${count} entries`,
    allCategories: "← All categories",
    categoryEyebrow: (number) => `Category ${number}`,
    categoryEntries: (count) => `${count} ${count === 1 ? "entry" : "entries"} in this category`,
    shapesLabel: "Reading a sign",
    shapesHeading: "The shape and colour tell you what a sign means",
    speedLabel: "Speed",
    speedHeading: "Speed limits",
    speedNote:
      "Speed limits can change, and signs on the road always apply. Check the current rules with the Department of Motor Traffic (DMT) before you drive.",
    speedPlaces: {},
    rulesLabel: "Road rules",
    rulesHeading: "Key rules for drivers in Sri Lanka",
    switchLabel: "Language",
  },
  si: {
    eyebrow: "රිය පැදවීමේ සලකුණු සහ මාර්ග නීති",
    title: "ශ්‍රී ලංකාවේ මාර්ග සලකුණු සහ මාර්ග නීති",
    description: "එහි ඇති සෑම සලකුණක්, ලකුණක් හෝ සංඥාවක් බැලීමට කාණ්ඩයක් තෝරන්න. රිය පැදවීමේදී අදාළ වන නීති පහතින් ඇත.",
    categoriesLabel: "කාණ්ඩ",
    categoriesHeading: "මාර්ග සලකුණු කාණ්ඩ",
    entries: (count) => `${count} ඇතුළත්`,
    allCategories: "← සියලුම කාණ්ඩ",
    categoryEyebrow: (number) => `කාණ්ඩය ${number}`,
    categoryEntries: (count) => `මෙම කාණ්ඩයේ ${count} ඇතුළත්`,
    shapesLabel: "සලකුණක් කියවීම",
    shapesHeading: "හැඩය සහ වර්ණය සලකුණක් අදහස් කරන දේ ඔබට කියයි",
    speedLabel: "වේගය",
    speedHeading: "වේග සීමා",
    speedNote:
      "වේග සීමා වෙනස් විය හැකි අතර, මාර්ගයේ ඇති සලකුණු සැමවිටම අදාළ වේ. රිය පැදවීමට පෙර මෝටර් ට්‍රැෆික් දෙපාර්තමේන්තුවේ (DMT) වත්මන් නීති පරීක්ෂා කරන්න.",
    speedPlaces: {
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
    },
    rulesLabel: "මාර්ග නීති",
    rulesHeading: "ශ්‍රී ලංකාවේ රියදුරන් සඳහා ප්‍රධාන නීති",
    switchLabel: "භාෂාව",
  },
  ta: {
    eyebrow: "வாகனம் ஓட்டும் அடையாளங்கள் & சாலை விதிகள்",
    title: "இலங்கையின் சாலை அடையாளங்களும் சாலை விதிகளும்",
    description: "ஓர் அடையாளம், குறியீடு அல்லது சமிக்ஞையைப் பார்க்க ஒரு வகையைத் தேர்ந்தெடுங்கள். வாகனம் ஓட்டும்போது பொருந்தும் விதிகள் கீழே உள்ளன.",
    categoriesLabel: "வகைகள்",
    categoriesHeading: "சாலை அடையாள வகைகள்",
    entries: (count) => `${count} உள்ளீடுகள்`,
    allCategories: "← அனைத்து வகைகளும்",
    categoryEyebrow: (number) => `வகை ${number}`,
    categoryEntries: (count) => `இந்த வகையில் ${count} உள்ளீடுகள்`,
    shapesLabel: "அடையாளத்தைப் படித்தல்",
    shapesHeading: "வடிவமும் நிறமும் ஓர் அடையாளம் எதைக் குறிக்கிறது என்பதைச் சொல்கின்றன",
    speedLabel: "வேகம்",
    speedHeading: "வேக வரம்புகள்",
    speedNote:
      "வேக வரம்புகள் மாறக்கூடும்; சாலையிலுள்ள அடையாளங்கள் எப்போதும் பொருந்தும். வாகனம் ஓட்டுவதற்கு முன் மோட்டார் போக்குவரத்துத் திணைக்களத்தில் (DMT) தற்போதைய விதிகளைச் சரிபாருங்கள்.",
    speedPlaces: {
      "Built-up areas and towns": {
        place: "நகரங்களும் குடியிருப்புப் பகுதிகளும்",
        note: "பட்டியலிடப்பட்ட சாலைகளில் மோட்டார் வாகனங்கள். சில வாகனங்களுக்கும் இடங்களுக்கும் குறைந்த வரம்புகள் பொருந்தும்.",
      },
      "Roads outside built-up areas": {
        place: "குடியிருப்புப் பகுதிகளுக்கு வெளியே உள்ள சாலைகள்",
        note: "பெரும்பாலான மோட்டார் வாகனங்கள். மோட்டார் பேருந்துகளுக்கும் லாரிகளுக்கும் குறைந்த வரம்பு உண்டு.",
      },
      "Southern Expressway": {
        place: "தெற்கு அதிவேகச் சாலை",
        note: "இந்த அதிவேகச் சாலையின் அதிகபட்ச வேகம். ஒவ்வொரு பகுதிக்குமான வரம்புக்கு அடையாளங்களைப் பின்பற்றுங்கள்.",
      },
    },
    rulesLabel: "சாலை விதிகள்",
    rulesHeading: "இலங்கையில் ஓட்டுநர்களுக்கான முக்கிய விதிகள்",
    switchLabel: "மொழி",
  },
};
