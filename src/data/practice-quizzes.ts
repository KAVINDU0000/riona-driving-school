// Practice quiz questions taken from the driving licence past paper in public/practice-papers.
// The past paper has no answer key, so each correct answer was worked out from Sri Lankan road rules.
// Check the answers against the current DMT rules before relying on the marks.

export type Answer = 0 | 1 | 2 | 3;

type Options = [string, string, string, string];

export type LocalisedQuestion = {
  question: string;
  options: Options;
};

export type PracticeQuestion = {
  id: string;
  kind: "sign" | "rule";
  image?: string;
  answer: Answer;
  si: LocalisedQuestion;
  en: LocalisedQuestion;
};

export type PracticeQuiz = {
  title: string;
  questions: PracticeQuestion[];
};

const SIGN_STEM = {
  si: "මෙම මාර්ග සංඥාවෙන් දක්වෙන්නේ කුමක්ද?",
  en: "What does this road sign show?",
};

function signQuestion(
  n: number,
  answer: Answer,
  si: Options,
  en: Options,
  stem?: { si: string; en: string },
): PracticeQuestion {
  return {
    id: `sign-${n}`,
    kind: "sign",
    image: `/practice-papers/questions/q${String(n).padStart(3, "0")}.png`,
    answer,
    si: { question: stem?.si ?? SIGN_STEM.si, options: si },
    en: { question: stem?.en ?? SIGN_STEM.en, options: en },
  };
}

function ruleQuestion(
  n: number,
  answer: Answer,
  si: { question: string; options: Options },
  en: { question: string; options: Options },
): PracticeQuestion {
  return {
    id: `rule-${n}`,
    kind: "rule",
    answer,
    si,
    en,
  };
}

const SIGN_QUESTIONS: PracticeQuestion[] = [
  signQuestion(
    1,
    2,
    [
      "ඉරට්ටේ දිනවල වාහන ඇතුල්වීම තහනමයි",
      "ඔත්තේ දිනවල වාහන නැවැත්වීම තහනමයි",
      "ඉරට්ටේ දිනවල වාහන නැවැත්වීම තහනමයි",
      "ඔත්තේ දිනවල වාහන ඇතුල්වීම තහනමයි",
    ],
    [
      "No vehicle entry on even dates",
      "No vehicle parking on odd dates",
      "No vehicle parking on even dates",
      "No vehicle entry on odd dates",
    ],
  ),
  signQuestion(
    2,
    3,
    [
      "ඉදිරියෙන් නවතිනු",
      "එකිනෙක හරහා ගමන් කරන මාර්ගය ඉදිරියෙනි",
      "අනිවාර්ය වටරවුම ඉදිරියෙනි",
      "වටරවුම ඉදිරියෙනි",
    ],
    [
      "Stop ahead",
      "Road where vehicles cross each other ahead",
      "Compulsory roundabout ahead",
      "Roundabout ahead",
    ],
  ),
  signQuestion(
    3,
    0,
    [
      "මාර්ගය ඉඩදෙනු",
      "අනිවාර්ය ත්‍රිකෝණාකර මංසන්ධිය",
      "ඉදිරියෙන් මාර්ගය ඉඩදෙනු",
      "ප්‍රධාන මාර්ගය ඉදිරියෙනි",
    ],
    [
      "Give way",
      "Compulsory triangular junction",
      "Give way ahead",
      "Main road ahead",
    ],
  ),
  signQuestion(
    4,
    2,
    [
      "සතුන්ගේ අභය භූමිය ඉදිරියෙනි",
      "ගවයන් ඇති කරන ගොවිපළ ඉදිරියෙනි",
      "ගවයන් හෝ වෙනත් සතුන් මාර්ගය හරහා ගමන් කිරීමට ඉඩ ඇති ස්ථානය ඉදිරියෙනි",
      "ගවයන් සඳහා මාර්ගය මාරුවීමට වෙන්කළ ස්ථානය ඉදිරියෙනි",
    ],
    [
      "Animal sanctuary ahead",
      "Cattle farm ahead",
      "Place where cattle or other animals may cross the road ahead",
      "Place reserved for cattle to cross the road ahead",
    ],
  ),
  signQuestion(
    5,
    1,
    [
      "දකුණු පැත්තට ද්විත්ව වංගුව ඉදිරියෙනි",
      "U හැඩයට හැරවිය හැකි ස්ථානය ඉදිරියෙනි",
      "දකුණු පැත්තට වංගුව ඉදිරියෙනි",
      "දකුණු පැත්තට වැලමිට වංගුව ඉදිරියෙනි",
    ],
    [
      "Double bend to the right ahead",
      "U-turn place ahead",
      "Bend to the right ahead",
      "Elbow bend to the right ahead",
    ],
  ),
  signQuestion(
    6,
    2,
    [
      "ඉදිරියෙන් හතරමං හන්දිය",
      "ප්‍රමුඛතා මාර්ගය",
      "ප්‍රමුඛතා මාර්ගය ඉදිරියෙනි",
      "මංසන්ධි කොටුව",
    ],
    [
      "Four-way junction ahead",
      "Priority road",
      "Priority road ahead",
      "Box junction",
    ],
  ),
  signQuestion(
    7,
    0,
    [
      "මෙම පැත්තෙන් රථවාහන ප්‍රධාන මාර්ගයට එක්වන සන්ධිය ඉදිරියෙනි",
      "පළමුවෙන් මෙම පැත්තට විහිදෙන විසම සන්ධිය ඉදිරියෙනි",
      "මෙම පැත්තෙන් එන රථවාහන සඳහා ප්‍රමුඛතාවය දෙනු",
      "Y හැඩයේ මංසන්ධිය ඉදිරියෙනි",
    ],
    [
      "Junction ahead where traffic from this side joins the main road",
      "Uneven junction ahead spreading to this side",
      "Give priority to traffic coming from this side",
      "Y-junction ahead",
    ],
  ),
  signQuestion(
    8,
    2,
    [
      "ළමයින් මාරුවන ස්ථානය",
      "අන්ධ මිනිසුන් මාරුවන ස්ථානය ඉදිරියෙනි",
      "ළමයින් මාරුවන ස්ථානය ඉදිරියෙනි",
      "පාසල ඉදිරියෙනි",
    ],
    [
      "Children crossing place",
      "Blind people crossing place ahead",
      "Children crossing ahead",
      "School ahead",
    ],
  ),
  signQuestion(
    9,
    3,
    [
      "පදිකයින් මාරුවන ස්ථානය",
      "පොලිස් ස්ථානය",
      "ඉන්ධන පිරවුම්හල",
      "වාහන නවත්වන ස්ථානය",
    ],
    [
      "Pedestrian crossing place",
      "Police station",
      "Petrol station",
      "Vehicle parking place",
    ],
  ),
  signQuestion(
    10,
    2,
    [
      "දකුණු පැත්තට ද්විත්ව වංගුව ඉදිරියෙනි",
      "ඉදිරියෙන් දකුණට හරවනු",
      "දකුණු පැත්තට වංගුව ඉදිරියෙනි",
      "දකුණු පැත්තට වැලමිට වංගුව ඉදිරියෙනි",
    ],
    [
      "Double bend to the right ahead",
      "Turn right ahead",
      "Bend to the right ahead",
      "Elbow bend to the right ahead",
    ],
  ),
  signQuestion(
    11,
    1,
    [
      "තහනම් සංඥාවකි",
      "සීමාකාරී සංඥාවකි",
      "විධාන සංඥාවකි",
      "අනතුරු හැගවීමේ සංඥාවකි",
    ],
    ["Prohibitory sign", "Restrictive sign", "Mandatory sign", "Warning sign"],
  ),
  signQuestion(
    12,
    3,
    [
      "සියළුම වාහන සඳහා පාර වසා ඇත",
      "ඔත්තේ දිනවල නැවැත්වීම තහනමයි",
      "නැවැත්වීම හා පැටවීම තහනමයි",
      "වාහන නැවැත්වීම තහනමයි",
    ],
    [
      "Road closed to all vehicles",
      "No parking on odd dates",
      "No stopping and loading",
      "No vehicle parking",
    ],
  ),
  signQuestion(
    13,
    1,
    [
      "ඇක්සලයක් මත පැටවිය හැකි බර සීමාව",
      "වේග සීමාවේ අවසානය",
      "වේග සීමාවේ ආරම්භය",
      "වේග සීමාව",
    ],
    [
      "Axle load limit",
      "End of speed limit",
      "Start of speed limit",
      "Speed limit",
    ],
  ),
  signQuestion(
    14,
    2,
    [
      "පදිකයින් සඳහා වෙන්කළ මාර්ගයේ ආරම්භය",
      "පදිකයින් සඳහා ඉඩදෙන්න",
      "පදිකයින් මාරු වන ස්ථානය",
      "පදික මාරුව ඉදිරියෙනි",
    ],
    [
      "Start of a lane reserved for pedestrians",
      "Give way to pedestrians",
      "Pedestrian crossing place",
      "Pedestrian crossing ahead",
    ],
  ),
  signQuestion(
    15,
    2,
    [
      "මාර්ගය ලිස්සන සුළු ස්ථානය ඉදිරියෙනි",
      "ඉහළට අවදානම් බෑවුම ඉදිරියෙනි",
      "කාර් රථ ලිස්සන සුළු ස්ථානය ඉදිරියෙනි",
      "පහතට අවදානම් බෑවුම ඉදිරියෙනි",
    ],
    [
      "Slippery road ahead",
      "Uphill danger slope ahead",
      "Place where cars may skid ahead",
      "Downhill danger slope ahead",
    ],
  ),
  signQuestion(
    16,
    0,
    [
      "Y හැඩයේ මංසන්ධිය ඉදිරියෙනි",
      "ඉදිරියේදී මාර්ගය පටුය",
      "ප්‍රධාන මාර්ගයට දෙපසින් රථ වාහන පිවිසෙන මං සංධිය ඉදිරියෙනි",
      "ද්විත්ව රථ මාර්ගයේ ආරම්භය ඉදිරියෙනි",
    ],
    [
      "Y-junction ahead",
      "Road narrows ahead",
      "Junction ahead where vehicles join the main road from both sides",
      "Start of dual carriageway ahead",
    ],
  ),
  signQuestion(
    17,
    3,
    [
      "මෝටර් කාරය අනිවාර්යයෙන්ම ඉදිරියට යා යුතුය",
      "ත්‍රීරෝද රථයට කෙළින්ම ඉදිරියට යා හැකිය",
      "ත්‍රීරෝද රථයට දකුණට හැරවීම හෝ කෙළින්ම ඉදිරියට යා හැක",
      "මෝටර් කාරයට කෙළින්ම ඉදිරියට යාමට හෝ දකුණට හරවිය හැක",
    ],
    [
      "The car must go straight ahead",
      "The three-wheeler may go straight ahead",
      "The three-wheeler may turn right or go straight ahead",
      "The car may go straight ahead or turn right",
    ],
    {
      si: "රූපයේ පෙන්වා ඇති මංසන්ධියේදී කුමක් නිවැරදිද?",
      en: "At the junction shown in the picture, which statement is correct?",
    },
  ),
  signQuestion(
    18,
    1,
    [
      "තීරණය, සංඥා කිරීම සහ ක්‍රියා කිරීම",
      "නිරීක්ෂණය, තීරණය කිරීම සහ ක්‍රියා කිරීම",
      "සංඥා කිරීම, තීරණය කිරීම සහ ක්‍රියා කිරීම",
      "ඉහත සියල්ල නිවැරදියි",
    ],
    [
      "Decide, signal and act",
      "Observe, decide and act",
      "Signal, decide and act",
      "All of the above are correct",
    ],
    {
      si: "රූපයේ A, B හා C ලෙස දැක්වෙන ස්ථානවලදී මෙම මංසන්ධියේ හැරවීමට අදහස් කරන්නේ නම් පිළිවෙළින් කළ යුත්තේ කුමක්ද?",
      en: "If you plan to turn at this junction, what should you do at points A, B and C, in that order?",
    },
  ),
  signQuestion(
    19,
    1,
    ["රතු හා කහ", "රතු", "කොළ හා කහ", "කොළ"],
    ["Red and amber", "Red", "Green and amber", "Green"],
    {
      si: "පෙන්වා ඇති රථ වාහන ආලෝක සංඥා ලාම්පුවල ඊළඟට දැල්වෙන වර්ණය කුමක්ද?",
      en: "The signal lamp shown is amber. Which colour comes on next?",
    },
  ),
  signQuestion(
    20,
    3,
    [
      "ඉදිරියෙන් හා පසුපසින් පැමිණෙන වාහන නවතිනු",
      "පසුපසින් පැමිණෙන වාහන නවතිනු",
      "නවතිනු",
      "ඉදිරියෙන් පැමිණෙන වාහන නවතිනු",
    ],
    [
      "Stop vehicles coming from the front and from behind",
      "Stop vehicles coming from behind",
      "Stop",
      "Stop vehicles coming from the front",
    ],
    {
      si: "පෙන්වා ඇති පොලිස් නිලධාරියාගේ විධානය කුමක්ද?",
      en: "What does the police officer's signal shown mean?",
    },
  ),
  signQuestion(
    21,
    1,
    [
      "ධාවන තීරු සලකුණු",
      "මධ්‍ය රේඛාව",
      "දකුණට හැරීම හැර හරහා යෑම තහනම් කරන ආයත රේඛාව",
      "මාර්ගය හරහා ගමන් කිරීම තහනම් කිරීමේ ආයත රේඛාව",
    ],
    [
      "Lane markings",
      "Centre line",
      "Solid line prohibiting crossing except a right turn",
      "Solid line prohibiting crossing the road",
    ],
    {
      si: "මාර්ගය මත සලකුණු කර ඇති මෙම මාර්ග සලකුණ දක්වන්නේ කුමක්ද?",
      en: "What does this road marking show?",
    },
  ),
  signQuestion(
    24,
    1,
    [
      "ප්‍රධාන මාර්ගයේ වාහන නොමැති නම් නතර කළයුතු නැත",
      "අනිවාර්යයෙන් නතර කළ යුතුය",
      "දකුණට හරවන්නේ නම් පමණක් නතර කළ යුතුය",
      "වමට හැරවීමේදී නතර කළ යුතු නැත",
    ],
    [
      "Need not stop if there are no vehicles on the main road",
      "Must stop",
      "Must stop only when turning right",
      "Need not stop when turning left",
    ],
    {
      si: "රූපයේ පෙන්වා ඇති T හන්දියට ඇතුළු වන මෙම රියදුරා කළ යුත්තේ",
      en: "The driver shown is entering a T-junction. What must they do?",
    },
  ),
  signQuestion(
    26,
    3,
    [
      "ඉදිරියෙන් මාර්ගය වසා ඇත",
      "දුම්රිය හරස් මාර්ගය ඉදිරියෙනි",
      "ආරක්ෂා කර නොමැති දුම්රිය හරස් මාර්ගයක්",
      "ආරක්ෂා කර නොමැති දුම්රිය හරස් මාර්ග ඉදිරියෙනි",
    ],
    [
      "Road closed ahead",
      "Railway crossing ahead",
      "An unprotected railway crossing",
      "Unprotected railway crossing ahead",
    ],
  ),
  signQuestion(
    27,
    3,
    [
      "අනිවාර්ය වට රවුම",
      "ඇතුල්වීම තහනම්",
      "බස් හා ලොරි සඳහා පාර වසා ඇත",
      "මාර්ගය වසා ඇත",
    ],
    [
      "Compulsory roundabout",
      "No entry",
      "Road closed to buses and lorries",
      "Road closed",
    ],
  ),
  signQuestion(
    28,
    0,
    [
      "ලිස්සන සුළු මාර්ගය ඉදිරියෙනි",
      "වංගු සහිත මාර්ගය ඉදිරියෙනි",
      "අනතුරුදායක මංසන්ධිය ඉදිරියෙනි",
      "ඉදිරියෙන් මාර්ග පටුය",
    ],
    [
      "Slippery road ahead",
      "Winding road ahead",
      "Dangerous junction ahead",
      "Narrow road ahead",
    ],
  ),
  signQuestion(
    29,
    0,
    [
      "Y හැඩයේ මංසන්ධිය ඉදිරියෙනි",
      "ඉදිරියෙන් මාර්ගය පටුය",
      "ද්විත්ව රථ මාර්ගයේ අවසානය ඉදිරියෙනි",
      "පටු පාලම ඉදිරියෙනි",
    ],
    [
      "Y-junction ahead",
      "Narrow road ahead",
      "End of dual carriageway ahead",
      "Narrow bridge ahead",
    ],
  ),
  signQuestion(
    30,
    1,
    [
      "අනිවාර්ය වටරවුම ඉදිරියෙනි",
      "අනිවාර්ය වටරවුම",
      "වටරවුම ඉදිරියෙනි",
      "වටරවුම",
    ],
    [
      "Compulsory roundabout ahead",
      "Compulsory roundabout",
      "Roundabout ahead",
      "Roundabout",
    ],
  ),
  signQuestion(
    32,
    2,
    [
      "තොරතුරු සංඥාවකි",
      "අනතුරු හැගවීමේ සංඥාවකි",
      "තහනම් සංඥාවකි",
      "විධාන සංඥාවකි",
    ],
    ["Information sign", "Warning sign", "Prohibitory sign", "Mandatory sign"],
  ),
  signQuestion(
    33,
    3,
    [
      "දකුණු පැත්තට ද්විත්ව වංගුව ඉදිරියෙනි",
      "දකුණු පැත්තට වැලමිට වංගුව ඉදිරියෙනි",
      "දකුණු පැත්තට වංගුව ඉදිරියෙනි",
      "U හැඩයට හැරවිය හැකි ස්ථානය ඉදිරියෙනි",
    ],
    [
      "Double bend to the right ahead",
      "Elbow bend to the right ahead",
      "Bend to the right ahead",
      "U-turn place ahead",
    ],
  ),
  signQuestion(
    34,
    3,
    [
      "සියලුම වාහන සඳහා මාර්ගය වසා ඇත",
      "මාර්ගය වසා ඇත",
      "කාර් සහ යතුරු පැදි සඳහා මාර්ගය වසා ඇත",
      "කාර් සහ යතුරු පැදි ඇතුල්වීම තහනම්",
    ],
    [
      "Road closed to all vehicles",
      "Road closed",
      "Road closed to cars and motorcycles",
      "Cars and motorcycles prohibited from entering",
    ],
  ),
  signQuestion(
    35,
    3,
    ["වටරවුම ඉදිරියෙනි", "රථ වාහන නවත්වන ස්ථානය", "නවතිනු", "ඉදිරියෙන් නවතිනු"],
    ["Roundabout ahead", "Vehicle stopping place", "Stop", "Stop ahead"],
  ),
  signQuestion(
    36,
    0,
    [
      "ද්විත්ව රථ මාර්ගය ආරම්භය ඉදිරියෙනි",
      "ඉදිරියේදී මාර්ගය පටුය",
      "ද්විත්ව රථ මාර්ගය අවසානය ඉදිරියෙනි",
      "පටු පාලම ඉදිරියෙනි",
    ],
    [
      "Start of dual carriageway ahead",
      "Road narrows ahead",
      "End of dual carriageway ahead",
      "Narrow bridge ahead",
    ],
  ),
  signQuestion(
    37,
    0,
    ["වේග සීමාව", "සාමාන්‍ය වේගය", "අවම වේගය", "නගර සීමාව තුළ වේග සීමාව"],
    [
      "Speed limit",
      "Normal speed",
      "Minimum speed",
      "Speed limit within city limits",
    ],
  ),
  signQuestion(
    38,
    3,
    [
      "ඉදිරියෙන් මංසන්ධියක්",
      "ඔත්තේ දිනවල නැවැත්වීම හා පැටවීම තහනමයි",
      "ඉරට්ටේ දිනවල නැවැත්වීම හා පැටවීම තහනමයි",
      "නැවැත්වීම හා පැටවීම තහනමයි",
    ],
    [
      "Junction ahead",
      "No stopping and loading on odd dates",
      "No stopping and loading on even dates",
      "No stopping and loading",
    ],
  ),
  signQuestion(
    39,
    2,
    ["කොළ", "කහ", "රතු සහ කහ", "කහ සහ කොළ"],
    ["Green", "Amber", "Red and amber", "Amber and green"],
    {
      si: "පෙන්වා ඇති රථ වාහන මාර්ග සංඥා ලාම්පුවල ඊළඟට දැල්වෙන වර්ණය කුමක්ද?",
      en: "Which colour comes on next after the signal lamp shown?",
    },
  ),
  signQuestion(
    40,
    2,
    [
      "ඉදිරියෙන් එන වාහන වලට ප්‍රමුඛතාවය අවසන්",
      "ඇතුල්වීම තහනම්",
      "වාහන ඉස්සර කිරීම තහනම්",
      "ඉරට්ටේ දිනවල නැවැත්වීම තහනම්",
    ],
    [
      "End of priority for vehicles coming from the front",
      "No entry",
      "No overtaking",
      "No parking on even dates",
    ],
  ),
  signQuestion(
    41,
    1,
    [
      "ප්‍රධාන මාර්ගය ඉදිරියෙනි",
      "ඉදිරියෙන් මාර්ගය ඉඩදෙනු",
      "ත්‍රිකෝණාකාර මංසන්ධිය ඉදිරියෙනි",
      "මාර්ගය ඉඩදෙනු",
    ],
    [
      "Main road ahead",
      "Give way ahead",
      "Triangular junction ahead",
      "Give way",
    ],
  ),
  signQuestion(
    42,
    3,
    [
      "කලුගල් කඩන ස්ථානය ඉදිරියෙනි",
      "අවදානම් බෑවුම ඉදිරියෙනි",
      "මාර්ගය අලුත්වැඩියා කරන ස්ථානය ඉදිරියෙනි",
      "ගල් පර්වත කැබලි වැටෙන ස්ථානය ඉදිරියෙනි",
    ],
    [
      "Stone-crushing place ahead",
      "Dangerous slope ahead",
      "Road repair place ahead",
      "Place where rock fragments fall ahead",
    ],
  ),
  signQuestion(
    43,
    2,
    [
      "ඉරට්ටේ දිනවල වාහන ඇතුල්වීම තහනම්",
      "ඉරට්ටේ දිනවල වාහන නැවැත්වීම තහනම්",
      "ඔත්තේ දිනවල වාහන නැවැත්වීම තහනම්",
      "ඔත්තේ දිනවල වාහන ඇතුල්වීම තහනම්",
    ],
    [
      "No vehicle entry on even dates",
      "No vehicle parking on even dates",
      "No vehicle parking on odd dates",
      "No vehicle entry on odd dates",
    ],
  ),
  signQuestion(
    44,
    3,
    [
      "පසුපසින් පැමිණෙන වාහන නවතිනු",
      "ඉදිරියෙන් හා පසුපසින් පැමිණෙන වාහන නවතිනු",
      "ඉදිරියට එනු",
      "නවතිනු",
    ],
    [
      "Stop vehicles coming from behind",
      "Stop vehicles coming from the front and behind",
      "Come forward",
      "Stop",
    ],
    {
      si: "පෙන්වා ඇති පොලිස් නිලධාරියාගේ විධානය කුමක්ද?",
      en: "What does the police officer's signal shown mean?",
    },
  ),
  signQuestion(
    45,
    1,
    [
      "ඉඩදීමේ රේඛාව",
      "රථ වාහන සංඥා, ආලෝක සංඥා හෝ පොලිසියෙන් පාලනය වන මාර්ගය බෙදියන ස්ථානයක පිහිටුවන නැවතුම් රේඛාව",
      "නැවතීමේ සංඥාව අසල නැවතීමේ රේඛාව",
      "වටවංගුව අසල ඉඩදීමේ රේඛාව",
    ],
    [
      "Give-way line",
      "Stop line placed where traffic is controlled by vehicle signals, traffic lights or police",
      "Stop line next to a stop sign",
      "Give-way line near a roundabout",
    ],
    {
      si: "මාර්ගය මත හරස් අතට සලකුණු කර ඇති මෙම සලකුණෙන් අදහස් කරන්නේ කුමක්ද?",
      en: "What does this cross-hatched road marking mean?",
    },
  ),
  signQuestion(
    47,
    0,
    [
      "මංතීරු සලකුණ",
      "මාර්ගය හරහා ගමන් කිරීම තහනම් කිරීමේ ආයත රේඛාව",
      "දකුණට හැරීම හැර හරහා යෑම තහනම් කිරීමේ ආයත රේඛාව",
      "මධ්‍ය රේඛාව",
    ],
    [
      "Lane marking",
      "Solid line prohibiting crossing the road",
      "Solid line prohibiting crossing except a right turn",
      "Centre line",
    ],
    {
      si: "මාර්ගය මත සලකුණු කර ඇති මෙම මාර්ග සලකුණු දක්වන්නේ කුමක්ද?",
      en: "What do these road markings on the road show?",
    },
  ),
  signQuestion(
    48,
    3,
    [
      "ද්විත්ව මාර්ගය ඉදිරියෙන් ඇති බවයි",
      "පටු පාලමකි",
      "ඉදිරියේ මාර්ගය පටු බවයි",
      "පටු පාලම ඉදිරියෙන් ඇති බවයි",
    ],
    [
      "Dual carriageway ahead",
      "Narrow bridge",
      "Road narrows ahead",
      "Narrow bridge ahead",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    49,
    0,
    [
      "පදිකයින් මාරුවන ස්ථානය ඉදිරියෙන් ඇති බවයි",
      "පදික මාරුව ඉදිරියෙන් ඇති බවයි",
      "මගීන් මාරුවන ස්ථානයක් ඉදිරියෙන් ඇති බවයි",
      "ළමයින් මාරුවන ස්ථානය ඉදිරියෙන් බවයි",
    ],
    [
      "Pedestrian crossing place ahead",
      "Pedestrian crossing ahead",
      "Passenger crossing place ahead",
      "Children's crossing place ahead",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    51,
    3,
    [
      "ප්‍රධාන පාර ඉදිරියෙන් ඇති බවයි",
      "ත්‍රිකෝණාකර මංසන්ධිය ඉදිරියෙන් ඇති බවයි",
      "ඉදිරියෙන් ඉඩ දෙනු යන අදහසයි",
      "මාර්ගය ඉඩ දෙනු යන අදහසයි",
    ],
    [
      "Main road ahead",
      "Triangular junction ahead",
      "Give way ahead",
      "Give way",
    ],
    { si: "මෙම සලකුණෙන් පෙන්වා ඇත්තේ", en: "This sign shows:" },
  ),
  signQuestion(
    52,
    3,
    [
      "වාහන ඇතුල්වීම සීමා කර ඇති බවයි",
      "ඉදිරියෙන් ඉඩ දෙනු යන අදහසයි",
      "ප්‍රමුඛතා මාර්ගය බවයි",
      "ප්‍රමුඛතා මාර්ගයේ අවසානය බවයි",
    ],
    [
      "Vehicle entry is restricted",
      "Give way ahead",
      "Priority road",
      "End of priority road",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    53,
    1,
    [
      "ඉදිරියෙන් ප්‍රධාන මාර්ගයට අතුළුවන බවයි",
      "ඉදිරියෙන් එන වාහන වලට ප්‍රමුඛතාවය දිය යුතු බවයි",
      "ඉදිරියට යන වාහන වලට ප්‍රමුඛතාවය දිය යුතු බවයි",
      "ඉදිරියෙන් පැමිණෙන වාහනයෙන් ප්‍රවේශම් වන්න යන අදහසයි",
    ],
    [
      "Merging into the main road ahead",
      "Vehicles coming from ahead must be given priority",
      "Vehicles going ahead must be given priority",
      "Be careful of vehicles coming from ahead",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    54,
    3,
    [
      "දුම්රිය ඉදිරියෙන් පැමිණිය හැකි බැවින් ප්‍රවේශම් වන්න යන්නයි",
      "දුම්රියෙන් ප්‍රවේශම් විය යුතු බවයි",
      "ආරක්ෂා කර නොමැති දුම්රිය හරස් මාර්ගයක් බවයි",
      "ආරක්ෂා කර නොමැති දුම්රිය හරස් මාර්ගය ඉදිරියෙන් බවයි",
    ],
    [
      "Be careful because a train may come from ahead",
      "You must be careful of trains",
      "An unprotected railway crossing",
      "An unprotected railway crossing ahead",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    55,
    2,
    [
      "ඉදිරියෙන් මාර්ගය අවසානය බවයි",
      "වැලමිට වංගුව ඉදිරියෙන් ඇති බවයි",
      "U හැඩයට සිටින සේ හැරවීම තහනම් යන අදහසයි",
      "දකුණු පැත්තට හැරවීම තහනම් යන අදහසයි",
    ],
    ["End of road ahead", "Elbow bend ahead", "No U-turn", "No right turn"],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    56,
    2,
    [
      "වට රවුම ඉදිරියෙන් ඇති බවයි",
      "විදුලි ආලෝක සංඥාව යන අදහසයි",
      "නවතිනු යන අදහසයි",
      "ඉඩදෙනු යන අදහසයි",
    ],
    ["Roundabout ahead", "Traffic light signal ahead", "Stop", "Give way"],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    57,
    1,
    [
      "නාගරික ප්‍රදේශයකට ඇතුල්වන බවයි",
      "එම ප්‍ර දේශය තුළ පැදවිය හැකි උපරිම වේගය බවයි",
      "එම ප්‍ර දේශය තුළ පැදවිය හැකි සාමාන්‍යය වේගය බවයි",
      "සඳහන් වේගසීමාවේ අවසානය බවයි",
    ],
    [
      "You are entering an urban area",
      "The maximum speed allowed in that area",
      "The average speed allowed in that area",
      "The end of the stated speed limit",
    ],
    { si: "මෙම සලකුණෙන් දැනුම්දෙන්නේ", en: "This sign tells you:" },
  ),
  signQuestion(
    58,
    3,
    [
      "තහනම් සංඥාවකි",
      "අනතුරු හැගවීමේ සංඥාවකි",
      "පාලක සංඥාවකි",
      "තොරතුරු සංඥාවකි",
    ],
    ["Prohibitory sign", "Warning sign", "Control sign", "Information sign"],
    { si: "මෙම සංඥාව", en: "This sign is a:" },
  ),
  signQuestion(
    59,
    3,
    [
      "දුම්රිය මාර්ගය ඉදිරියෙන් ඇති බවයි",
      "රෝහලක් ඉදිරියෙන් ඇති බවයි",
      "පල්ලියක් ඉදිරියෙනි",
      "එකිනෙක හරහා ගමන් කරන මාර්ග ඉදිරියෙනි",
    ],
    [
      "Railway line ahead",
      "Hospital ahead",
      "Church ahead",
      "Roads crossing each other ahead",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    60,
    1,
    [
      "දකුණට හැරවිය යුතුය",
      "වමට වංගුව ඉදිරියෙනි",
      "දකුණට වංගුව ඉදිරියෙනි",
      "වමට හැරවිය යුතුය",
    ],
    [
      "Must turn right",
      "Left bend ahead",
      "Right bend ahead",
      "Must turn left",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    61,
    3,
    [
      "Y හැඩයට මංසන්ධිය ඉදිරියෙන් ඇති බවයි",
      "ඉදිරියෙන් ප්‍ර ධාන මාර්ගය ඇති බවයි",
      "වම් පැත්තෙන් එන වාහනවලට ප්‍රමුඛතාවය දෙන ලෙස දැනුම් දීමකි",
      "වම් පැත්තෙන් එන රථ වාහන ප්‍රධාන මාර්ගයට එක් වන සංධිය ඉදිරියෙනි",
    ],
    [
      "Y-junction ahead",
      "Main road ahead",
      "A notice to give priority to vehicles from the left",
      "Junction ahead where vehicles from the left join the main road",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    62,
    1,
    [
      "ඉදිරියෙන් දකුණට හැරවිය යුතුය",
      "දකුණු පැත්තට වැලමිට් වංගුව ඉදිරියෙනි",
      "ඉදිරියෙන් U හැඩයට හැරවීමට හැකිය",
      "වම් පැත්තට වැලමිට් වංගුව ඉදිරියෙනි",
    ],
    [
      "Must turn right ahead",
      "Elbow bend to the right ahead",
      "Can turn in a U-shape ahead",
      "Elbow bend to the left ahead",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    63,
    2,
    [
      "ඔත්තේ දින වල වාහන නැවැත්වීම තහනම් බවයි",
      "මාර්ගය වසා ඇති බවයි",
      "වාහන නැවැත්වීම තහනම් බවයි",
      "ඉදිරියෙන් වට රවුමක් ඇති බවයි",
    ],
    [
      "No vehicle parking on odd dates",
      "Road closed",
      "No vehicle parking",
      "Roundabout ahead",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    64,
    3,
    [
      "ඉරට්ටේ දින වල වාහන නැවැත්වීම තහනම් බවයි",
      "වාහන ඇතුල් වීම තහනම් බවයි",
      "වාහන නැවැත්වීම තහනම් බවයි",
      "වාහන නැවැත්වීම සහ පැටවීම තහනම් බවයි",
    ],
    [
      "No vehicle parking on even dates",
      "No vehicle entry",
      "No vehicle parking",
      "No vehicle parking and loading",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    65,
    1,
    [
      "ඉදිරියෙන් ආපසු හරවන්න",
      "වම් පැත්තට හරවන්න",
      "මේ පැත්තෙන් පසු කර යන්න",
      "ඉදිරියෙන් වම් පැත්තට හරවන්න",
    ],
    ["Turn back ahead", "Turn left", "Pass on this side", "Turn left ahead"],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
  signQuestion(
    66,
    0,
    [
      "ඉදිරියෙන් දකුණු පැත්තට හැරවිය යුතුයි",
      "වාහන නවතා තැබීමට පුළුවන් බවයි",
      "ඉදිරියෙන් අනතුරක් ඇති බැවින් හෙමින් ධාවනය කරන්න යන්නයි",
      "'නවතිනු' සංඥාවයි",
    ],
    [
      "Must turn right ahead",
      "Vehicles may be parked",
      "Drive slowly because of a danger ahead",
      "It is a 'Stop' sign",
    ],
    { si: "මෙම සලකුණෙන් දක්වෙන්නේ", en: "This sign shows:" },
  ),
];

const RULE_QUESTIONS: PracticeQuestion[] = [
  ruleQuestion(
    67,
    2,
    {
      question:
        "ශ්‍රී ලංකාවේ මාර්ග නීති සංග්‍රහයේ අනතුරු හැගවීමේ සංඥා දක්වා ඇත්තේ",
      options: [
        "නිල් පසුබිමෙහි සුදු වර්ණයෙනි",
        "රතු පසුබිමෙහි සුදු වර්ණයෙනි",
        "කහ පසුබිමෙහි කළු වර්ණයෙනි",
        "සුදු පසුබිමෙහි රතු වර්ණයෙනි",
      ],
    },
    {
      question: "In Sri Lanka's road rules, warning signs are shown as:",
      options: [
        "White on a blue background",
        "White on a red background",
        "Black on a yellow background",
        "Red on a white background",
      ],
    },
  ),
  ruleQuestion(
    68,
    0,
    {
      question: "වටරවුමක මූලික නීතිය වන්නේ",
      options: [
        "ඔබට දකුණින් පැමිණෙන රථවාහන වලට ඉඩදිය යුතුය",
        "ඔබට වමපසින් හෝ ආසන්නව පැමිණෙන රථවාහන වලට ඉඩදිය යුතුය",
        "අධික රථවාහන තදබදය සහිත දිශාවෙන් පැමිණෙන රථවාහන වලට ඉඩදිය යුතුය",
        "ඔබට වමපසින් හෝ ආසන්නව දකුණින් පැමිණෙන රථවාහන වලට ඉඩදිය යුතුය",
      ],
    },
    {
      question: "What is the basic rule at a roundabout?",
      options: [
        "You must give way to vehicles approaching from your right",
        "You must give way to vehicles approaching from your left or nearby",
        "You must give way to vehicles coming from directions with heavy traffic",
        "You must give way to vehicles approaching from the left or from close on the right",
      ],
    },
  ),
  ruleQuestion(
    70,
    1,
    {
      question:
        "ඔබේ වාහනය හා ඔබට ඉදිරියෙන් ධාවනය වන වාහනය අතර ප්‍රයෝජනවත් දුරක් තබා ගත යුත්තේ ඇයි?",
      options: [
        "ඔබට ඉදිරියෙන් ධාවනය වන වාහනයේ රියදුරු තැන හදිසියේ නතර කළහොත්, එම වාහනය පසුකර යාමට ඔබට වැඩි චේලාවක් ලැබෙන නිසාය.",
        "ඔබට ඉදිරියෙන් ධාවනය වන වාහනයේ රියදුරු තැන හදිසියේ නතර කළහොත්, ඔබට ඔබගේ වාහනය ආරක්ෂාකාරී ලෙස නතර කර ගැනීමට හැකිවන නිසාය.",
        "ඔබට ඉදිරියෙන් ධාවනය වන වාහනයට ඉස්සර කිරීමට වැඩි ඉඩක් ලැබෙන නිසාය.",
        "ඔබට ඉදිරියෙන් ධාවනය වන වාහනය පසුබසින් ධාවනය කිරීම වඩාත් පහසුවන නිසාය.",
      ],
    },
    {
      question: "Why should you keep a safe distance from the vehicle ahead?",
      options: [
        "If the vehicle ahead stops suddenly, you will have more time to pass it",
        "If the vehicle ahead stops suddenly, you can stop your own vehicle safely",
        "You get more room to overtake the vehicle ahead",
        "It is easier to reverse behind the vehicle ahead",
      ],
    },
  ),
  ruleQuestion(
    71,
    1,
    {
      question:
        "වාහනයක අවධානම හැඟවීමේ ලාම්පු (Hazard Lamps) භාවිතා කිරීම කළ යුත්තේ",
      options: [
        "වාහනය අබල තත්වයකට පත්ව නවතා තිබියදී පමණි",
        "වාහනයක් හදිසි තත්වයක් නිසා ධාවනය කරන බව දැක්වීම සඳහාය",
        "හන්දියකදී වාහනයක් කෙළින්ම ධාවනය කිරීමට අදහස් කරන අවස්ථාවේදීය",
        "ප්‍රමුඛතාවය ලබා ගැනීමටය",
      ],
    },
    {
      question: "When should hazard warning lamps be used?",
      options: [
        "Only when the vehicle has broken down and is stopped",
        "To show that a vehicle is driving because of an emergency",
        "When a vehicle plans to go straight at a junction",
        "To gain priority",
      ],
    },
  ),
  ruleQuestion(
    72,
    2,
    {
      question: "වෙනත් වාහනයක් විසින් ඔබගේ වාහනය පසු කර යන අවස්ථාවකදී,",
      options: [
        "ඔබ පසු කර යාමට ඉඩ දීමට කැමැත්තෙක් නොදක්වන්නේ නම් ඔබගේ වාහනයේ දකුණු පස සංඥා දැල්විය යුතුය.",
        "ඔබගේ වාහනය අඩු ගියරයකට යොදා නතර කිරීමට සූදානම් විය යුතුය.",
        "ඔබගේ වාහනයේ වේගය වැඩි නොකර පසුකරන්නාට ඔබගේ වාහනය පසුකර යාමට ඉඩ දිය යුතුය.",
        "ඔබ පසු කර යාමට ඉඩ දීමට කැමැත්තක් නොදක්වන්නේ නම් ඔබට වාහනයේ වේගය වැඩි කළ හැක.",
      ],
    },
    {
      question: "When another vehicle is overtaking your vehicle:",
      options: [
        "If you do not want to let it pass, signal with your right indicator",
        "Change to a low gear and prepare to stop",
        "Do not increase your speed and let it pass",
        "If you do not want to let it pass, you may increase your speed",
      ],
    },
  ),
  ruleQuestion(
    73,
    1,
    {
      question: "මංසන්ධි කොටුවේ සලකුණු කර ඇති ස්ථානයකදී,",
      options: [
        "ඔබ කෙළින්ම ඉදිරියට ගමන් කරන්නේ නම් ඔබට මංසන්ධි කොටුව තුළට ඇතුල් විය හැක.",
        "දකුණට හැරවීමේදී හැර පිටවීමට ඇති මාර්ගය අවහිර නම් මංසන්ධි කොටුව තුළට ඇතුල් නොවිය යුතුය.",
        "දකුණට හැරවීමට හැර ඕනෑම අවස්ථාවකදී ඔබට මංසන්ධි කොටුව තුළට ඇතුල් විය හැක.",
        "ඕනෑම අවස්ථාවක ඔබට මංසන්ධි කොටුව තුළට ඇතුල් විය හැක.",
      ],
    },
    {
      question: "At a box junction marked on the road:",
      options: [
        "If you are going straight ahead, you may enter the box junction",
        "When turning right, do not enter if the exit is blocked",
        "You may enter the box junction at any time except when turning right",
        "You may enter the box junction at any time",
      ],
    },
  ),
  ruleQuestion(
    77,
    3,
    {
      question: "රාත්‍රී කාලයේදී ඔබ වාහනය සැමවිටම නතර කළයුත්තේ",
      options: [
        "රථ වාහන තදබදය අවම දිශාවට මුහුණලා",
        "රථ වාහන ගමනාගමනයට ප්‍රතිවිරුද්ධ දිශාවට මුහුණලා",
        "රථ වාහන තදබදය අධික දිශාවට මුහුණලා",
        "රථ වාහන ගමනාගමනය ඇති දිශාවට මුහුණලා",
      ],
    },
    {
      question: "At night, you should always park your vehicle:",
      options: [
        "Facing the direction with the least traffic",
        "Facing against the direction of traffic",
        "Facing the direction with heavy traffic",
        "Facing the direction of the traffic flow",
      ],
    },
  ),
  ruleQuestion(
    79,
    0,
    {
      question: "මත්පැන් හෝ මත්ද්‍රව්‍ය භාවිතා කර ඇති විටකදී",
      options: [
        "අනතුරක් වළක්වා ගැනීමට ගතවන කාලය වැඩිවේ",
        "අනතුරක් වළක්වා ගැනීමට ගතවන කාලය අඩුවේ",
        "අනතුරක් වළක්වා ගැනීම කෙරෙහි බලපෑමක් නැත",
        "අනතුරක් වැළැක්වීමට ඇති හැකියාව වැඩි කරයි",
      ],
    },
    {
      question: "When a driver has taken alcohol or drugs:",
      options: [
        "The time needed to avoid an accident increases",
        "The time needed to avoid an accident decreases",
        "It has no effect on avoiding accidents",
        "It increases the chance of avoiding an accident",
      ],
    },
  ),
  ruleQuestion(
    80,
    0,
    {
      question:
        "රථ වාහන නීති පිළිබඳව විටදී ප්‍රමුඛත්වය දිය යුතු නිවැරදි ආකාරය වන්නේ කුමක්ද?",
      options: [
        "පොලිස් සංඥා, රථ වාහන ආලෝක සංඥා, මාර්ග සංඥා, මාර්ගය මත පිහිටුවන සලකුණු",
        "මාර්ගය මත පිහිටුවන සංඥා, පොලිස් සංඥා, රථ වාහන ආලෝක සංඥා, මාර්ග සංඥා",
        "මාර්ග සංඥා, මාර්ගය මත පිහිටුවන ඉරි, පොලිස් සංඥා, රථ වාහන ආලෝක සංඥා",
        "රථ වාහන ආලෝක සංඥා, මාර්ග සංඥා, මාර්ග මත පිහිටුවන ඉරි, පොලිස් සංඥා",
      ],
    },
    {
      question: "What is the correct order of priority for road signals?",
      options: [
        "Police signals, traffic light signals, road signs, road markings",
        "Road markings, police signals, traffic light signals, road signs",
        "Road signs, road-marking lines, police signals, traffic light signals",
        "Traffic light signals, road signs, road-marking lines, police signals",
      ],
    },
  ),
  ruleQuestion(
    84,
    2,
    {
      question:
        "ඔබ වාහනයක් පසු කර යාමට අදහස් කරන්නේ නම් ගත යුතු පළමුවැනි ක්‍රියාමාර්ගය කුමක්ද?",
      options: [
        "වාහනය නිවැරදි මං තීරුවට ගැනීම",
        "සංඥා යෙදීම",
        "නිරීක්ෂණය කිරීම",
        "අවස්ථාවට ගැලපෙන පරිදි වේගය පාලනය කිරීම",
      ],
    },
    {
      question:
        "If you plan to overtake a vehicle, what is the first action to take?",
      options: [
        "Move the vehicle into the correct lane",
        "Give a signal",
        "Observe (check the mirrors and the road ahead)",
        "Adjust your speed to suit the situation",
      ],
    },
  ),
  ruleQuestion(
    85,
    2,
    {
      question: "වාහනයක් නතර කිරීමේදී නැවැත්වීමේ දුර ලෙස හඳුන්වන්නේ",
      options: [
        "සිතීමේ දුරෙහි සහ තිරිංග යෙදීමේ දුර යන දෙකෙන් අඩු දුරයි",
        "සිතීමේ දුරෙහි සහ තිරිංග දුරෙහි මෙනසයි",
        "සිතීමේ දුරෙහි සහ තිරිංග යෙදීමේ දුරෙහි එකතුවයි",
        "සිතීමේ දුරෙහි සහ තිරිංග යෙදීමේ දුර යන දෙකෙන් වැඩි දුරයි",
      ],
    },
    {
      question: "When a vehicle stops, what is the stopping distance?",
      options: [
        "Less than the reaction distance and the braking distance",
        "The difference between the reaction distance and the braking distance",
        "The sum of the reaction distance and the braking distance",
        "More than the reaction distance and the braking distance",
      ],
    },
  ),
  ruleQuestion(
    86,
    2,
    {
      question:
        "වාහනය මහා මාර්ගයේ පදවාගෙන යන ඔබ මගීන් මාරුවන ස්ථානයක් ඉදිරියෙන් ඇති බවට මාර්ග සංඥාවක් දුටු විගසම",
      options: [
        "මහා මාර්ගයේ මගී තදබදයක් නොමැති නම් තමාට රිසි සේ ධාවනය කළ හැක",
        "ඉක්මනින් මගීන් පැමිණීමට පෙර මගීන් මාරුවන ස්ථානය පසුකර යාම සඳහා වේගය වැඩි කළ යුතුයි.",
        "වාහනය නතර කර ගැනීමට බලාපොරොත්තුවෙන් වේගය පාලනය කර ධාවනය කළ යුතුයි.",
        "නලාව ශබ්ද කර තමා එන බව මගීන්ට දන්වා නොනවත්වාම යා යුතුයි.",
      ],
    },
    {
      question:
        "While driving on a main road, you see a sign that a pedestrian crossing is ahead. You should:",
      options: [
        "Drive as you like if there are no crowds on the main road",
        "Increase speed to pass the crossing before pedestrians arrive",
        "Control your speed so you can stop if needed",
        "Sound the horn and keep going so pedestrians know you are coming",
      ],
    },
  ),
  ruleQuestion(
    87,
    3,
    {
      question: "ඉදිරියෙන් යන වාහනය ඉස්සර කිරීමට ඔබට අවශ්‍යා නම්",
      options: [
        "ඉදිරි වාහනයේ රියදුරු ඉස්සර කිරීමට සංඥා කළ විට එය කිරීම අවශ්‍යය නැත.",
        "ඉදිරි මාර්ගය පැහැදිලිව පෙනෙන්නේ දැයි පරීක්ෂා කළ යුතුයි.",
        "මහා මාර්ගය ඉඩ තිබෙන ස්ථානයක්දැයි පරීක්ෂා කළ යුතුයි.",
        "මහා මාර්ගය හොඳින් නිරීක්ෂණය කර ඉස්සර කිරීමට හැකිදැයි පරීක්ෂා කර තීරණය කළ යුතුයි.",
      ],
    },
    {
      question: "If you need to overtake the vehicle ahead:",
      options: [
        "There is no need if the vehicle ahead signals to you",
        "Check that the road ahead is clearly visible",
        "Check that there is room on the main road",
        "Watch the main road carefully, check whether you can overtake safely, then decide",
      ],
    },
  ),
  ruleQuestion(
    88,
    3,
    {
      question: "ඔබ ඉදිරියේදී දකුණට හැරවිය යුතු නම් ගමන් කළ යුත්තේ",
      options: [
        "තමා කැමති මං තීරුවක් භාවිතා කළ හැක.",
        "මාර්ගයේ වම් පස තීරුවේය.",
        "දකුණු පැත්තට ගෙන යා යුතුයි.",
        "මාර්ගයේ මධ්‍ය රේඛාවට ආසන්නම ධාවන තීරුවේය.",
      ],
    },
    {
      question: "If you are going to turn right ahead, you should travel:",
      options: [
        "In any lane you like",
        "In the left lane",
        "Towards the right side of the road",
        "In the lane nearest the centre line",
      ],
    },
  ),
  ruleQuestion(
    89,
    0,
    {
      question:
        "ඔබ ඉදිරියේදී වම් පැත්තේ නතර කළ යුතුබව දන්නේ නම් වාහනය ගමන් කරවිය යුත්තේ",
      options: [
        "මාර්ගයේ වම් පස තීරුවේය",
        "මං තීරු භාවිතා කිරීමට අවශ්‍ය නැත",
        "මාර්ගයේ මැද තීරුවේය",
        "මාර්ගයේ දකුණු පැත්තේය",
      ],
    },
    {
      question:
        "If you know you will need to stop on the left ahead, you should drive:",
      options: [
        "In the left lane of the road",
        "There is no need to use lanes",
        "In the middle lane of the road",
        "On the right side of the road",
      ],
    },
  ),
  ruleQuestion(
    90,
    3,
    {
      question: "අතුරු මාර්ගයකින් ප්‍රධාන මාර්ගයට ඔබ පිවිසෙන විට",
      options: [
        "ප්‍රධාන පාරේ වාහන තදබදයක් නොමැති නම් වමෙන් ඇතුලු විය හැක.",
        "දකුණු පැත්ත බලා වාහන නොමැති නම් මාර්ගයට ගැනීම සුදුසුය",
        "වම් පැත්ත බලා වාහන නොමැතිනම් මාර්ගයට ගැනීම සදුසුය",
        "මාර්ගයේ දෙපසම සාර්ථකව නිරීක්ෂණය කිරීමෙන් පසු මාර්ගයට ගැනීම සුදුසුයි",
      ],
    },
    {
      question: "When you enter a main road from a side road:",
      options: [
        "You may enter from the left if there is no heavy traffic on the main road",
        "It is best to enter when there are no vehicles from the right",
        "It is best to enter when there are no vehicles from the left",
        "It is best to enter after checking both sides of the road carefully",
      ],
    },
  ),
  ruleQuestion(
    91,
    1,
    {
      question:
        "ඔබට පසුපසින් පැමිණෙන වාහනයට ඔබව ඉස්සර කිරීමට අවශ්‍යැ බව හැඟී ගියහොත් ඔබ විසින් කළ යුතු වන්නේ",
      options: [
        "පසු පසින් එන වාහනය ගැන සැලකිලිමත් වීම අවශ්‍ය නැත.",
        "වාහනයේ වේගය අඩු කර වම් පසින් ධාවනය කර ඉස්සර කිරීමට ඉඩ දීමයි.",
        "වම්පස සිග්නල් ලාම්පු දල්වා ඔහුට යන ලෙස දැන්වීමය.",
        "වාහනය තවත් පාර මැදට ගෙන ඔහුට ඉස්සර වීමට අවශ්‍යම ඉඩ නොදී ගමන් කිරීමයි.",
      ],
    },
    {
      question:
        "If you sense that a vehicle behind wants to overtake you, you should:",
      options: [
        "Pay no attention to the vehicle behind",
        "Reduce speed, keep to the left and let it pass",
        "Switch on the left indicator to tell it to go",
        "Move to the centre of the road so it cannot pass",
      ],
    },
  ),
  ruleQuestion(
    92,
    2,
    {
      question: "ඔබ වාහනය පදවාගෙන යන අවස්ථාවකදී ඔබගේ ජංගම දුරකතනය නාද වුවහොත්",
      options: [
        "නාගරික ප්‍රදේශවලදී පමණක් දුරකතනය ගෙන ප්‍රතිචාර දැක්විය හැක.",
        "එක් අතකින් සුක්කානම හසුරුවාගෙන අනිත් අතින් දුරකතනය ගෙන ප්‍රතිචාර දැක්විය යුතුය.",
        "දුරකතනයට ප්‍රතිචාර දැක්වීමට අවශ්‍ය නම් වාහනය අයින් කර නවත්වා දුරකතනයට ප්‍රතිචාර දැක්විය යුතුය.",
        "ජංගම දුරකතනය රැගෙන යාම නොකළ යුතුයි.",
      ],
    },
    {
      question: "While driving, if your mobile phone rings:",
      options: [
        "You may answer only in urban areas",
        "Hold the steering wheel with one hand and answer with the other",
        "If you need to answer, stop the vehicle safely and then answer",
        "Do not carry a mobile phone",
      ],
    },
  ),
  ruleQuestion(
    93,
    2,
    {
      question:
        "ඔබ වාහනය පදවාගෙන යන අවස්ථාවකදී මාර්ගයේ ඉදිරියේ බාධකයක් නිසා වාහන පේළියක් එක් වාහනයක් පිටුපස එක් එක් වාහන නතර කර තිබෙන විට ඔබ විසින් කළ යුත්තේ",
      options: [
        "විරුද්ධ දිශාවෙන් වාහන නොමැති නම් මාර්ගයේ දකුණු පැත්තෙන් ගමන් කළ හැක",
        "සියලුම වාහන ඉස්සර කර ගෙන ගොස් බාධකය ඇති තැනට පිවිසීමයි",
        "මාර්ගයේ නතර වී ඇති අවසාන වාහනයට පසු පසින් නතර කර සිටීමයි",
        "නලාව ශබ්ද කර තමාට ඉක්මනින් යා යුතු බව දැන්වීමයි",
      ],
    },
    {
      question:
        "A line of vehicles is stopped behind an obstruction ahead. You should:",
      options: [
        "Drive on the right side if there are no oncoming vehicles",
        "Overtake all the vehicles and drive to the obstruction",
        "Stop behind the last stopped vehicle",
        "Sound the horn to tell others you need to pass quickly",
      ],
    },
  ),
  ruleQuestion(
    94,
    3,
    {
      question:
        "ඔබ වාහනය පදවාගෙන යන අවස්ථාවක ඉදිරියේ මාර්ගය අයිතේ බස් රථයක් නතර කර මගීන් බසිමින් සිටී නම් ඔබ කළ යුත්තේ",
      options: [
        "නතර කර ඇති වාහන ගැන සැලකිලිමත් වීම අවශ්‍යද නැත",
        "මගීන් පාර මාරු වීමට ප්‍රකටම හැකි ඉක්මනින් බස් රථය ඉස්සර කර යෑමය",
        "බස් රථයට පසුපසින් ඔබද නතර කර සිටීමෙ",
        "මගීන් මාරු වේ යයි බලාපොරොත්තුවෙන් නතර කර ගැනීමට හැකි වනසේ වේගය අඩුකර ධාවනය කිරීමයි",
      ],
    },
    {
      question:
        "A bus is stopped ahead on your side of the road with passengers getting on and off. You should:",
      options: [
        "Pay no attention to the stopped vehicle",
        "Pass the bus quickly before passengers cross",
        "Stop behind the bus",
        "Reduce speed so you can stop if passengers cross",
      ],
    },
  ),
  ruleQuestion(
    96,
    2,
    {
      question: "රාත්‍රීග කාලයේදී වාහනයක් ධාවනය කිරීමේදී",
      options: [
        "වාහනයේ නලාව හැකි පමණ පාවිච්චි කළ යුතුය",
        "වාහන තද බදය අඩු නිසා වේගයෙන් ධාවනය කළ හැකිය",
        "පෙනීම සීමා සහිත බැවින් වඩා සුපරික්ෂාකාරීව ධාවනය කළ යුතුය",
        "ප්‍රධාන පහන් හොඳන් ඇති විට සැලකිලිමත්වීම අවශ්‍යල නැත",
      ],
    },
    {
      question: "When driving a vehicle at night:",
      options: [
        "You should use the horn as much as possible",
        "You may drive fast because traffic is light",
        "Drive more carefully because visibility is limited",
        "There is no need to be careful when the main lights are on",
      ],
    },
  ),
  ruleQuestion(
    97,
    1,
    {
      question:
        "සංඥා එළි සහිත මං සංධියකදී පොලිස් නිලධාරී මහතෙකු වාහන පාලනය කරයි නම්, ඔබ ක්‍රියා කළ යුත්තේ",
      options: [
        "දකුණට හැරවීමේදී පමණක් පොලිස් නිලධාරියාගේ අණට අවනත විය යුතුය.",
        "පොලිස් නිලධාරී මහතාගේ අණ අනුව",
        "සංඥා එළියෙන් දැක්වෙන අණ පරිදිය",
        "ඔබට රිසි පරිදිය",
      ],
    },
    {
      question:
        "At a junction with traffic lights, a police officer is directing traffic. You should:",
      options: [
        "Follow the officer's orders only when turning right",
        "Follow the police officer's orders",
        "Follow the orders shown by the traffic lights",
        "Do as you wish",
      ],
    },
  ),
  ruleQuestion(
    98,
    0,
    {
      question: "ඔබ පදවන වාහනය අතර මගදී ආපදාවකට ලක්වුවහොත් ඔබ කළ යුත්තේ",
      options: [
        "හැකි උපරිම මට්ටමින් මාර්ගය අවහිර නොවන පරිදි වාහනය නතර කිරීමය",
        "වාහනයේ පහන් දල්වා නතර කළ හැක",
        "ආපදාවකට ලක් වූ තැනම නතර කිරීමය",
        "හැකිතාක් දුරට වාහනය ධාවනය කර යාමය",
      ],
    },
    {
      question:
        "If your vehicle breaks down or is in an accident on the road, you should:",
      options: [
        "Stop as far as possible so that it does not block the road",
        "Stop with the lights on",
        "Stop exactly where the accident happened",
        "Keep driving the vehicle as far as possible",
      ],
    },
  ),
  ruleQuestion(
    99,
    1,
    {
      question:
        "වැසි සහිත කාලගුණයක් ඇති අවස්ථාවක, වාහනය පදවන විටදී, සෑම විටම කළ යුත්තේ",
      options: [
        "වාහනයේ ටයර් හොඳින් ඇති විට සැලකිලිමත්වීම අවශ්‍යය නැත",
        "අඩු ගියරයක් හෙමින් පැදවීම",
        "වැඩි ගියරයක වේගයෙන් පැදවීම",
        "වැඩි ගියරයක හෙමින් පැදවීම",
      ],
    },
    {
      question: "In rainy weather, when driving, you should always:",
      options: [
        "Be careful only when the tyres are worn",
        "Drive slowly in a low gear",
        "Drive fast in a high gear",
        "Drive slowly in a high gear",
      ],
    },
  ),
  ruleQuestion(
    100,
    1,
    {
      question: "බෑවුම් සහිත මාර්ගයක වාහනය ධාවනය කිරීමේදී",
      options: [
        "හැකි තරම් වේගයෙන් පැදවිය යුතුය",
        "අඩු ගියරයක පැදවිය යුතුය",
        "වැඩි ගියරයක පැදවිය යුතුය",
        "ගියර් නොමැතිව (නියුටල්) තත්වයේ පැදවිය යුතුය",
      ],
    },
    {
      question: "When driving on a sloping road:",
      options: [
        "As fast as possible",
        "In a low gear",
        "In a high gear",
        "In neutral",
      ],
    },
  ),
  ruleQuestion(
    101,
    1,
    {
      question:
        "තනිතලා බිමක වාහන නවතා තැබීමේදී ඔබ කළ යුතු වැදගත් කාරණයක් වන්නේ",
      options: [
        "දොර අගුළු හොඳින් වසා තැබීමයි",
        "නවතා තැබීමේ තිරිංග නිසි පරිදි යෙදීමයි",
        "දිවා කාලයේදී වුවද නැවතුම් පහන් දල්වා තැබීමයි",
        "ඉදිරි රෝද දකුණට හරවා නවතා තැබීමයි",
      ],
    },
    {
      question:
        "When parking a vehicle on flat ground, an important point is to:",
      options: [
        "Lock the doors well",
        "Apply the parking brake properly",
        "Keep the parking lights on even in daytime",
        "Turn the front wheels to the right",
      ],
    },
  ),
  ruleQuestion(
    102,
    3,
    {
      question: "අවදානම් හැඟවීමේ පහන් දැල්විය යුතු වන්නේ",
      options: [
        "වාහනයක රෝගී පුද්ගලයන් ගෙන යන අවස්ථාවකදී",
        "හතර මං සන්ධියකදී ඉදිරියට ගමන් කරන විටය",
        "අවදානම් ස්ථානයකදී වාහනයකට ඉස්සර කරන විටය",
        "මහා මාර්ගයේ ආපදාවකට ලක් වූ වාහනයක් නවතා තබන විටදීය",
      ],
    },
    {
      question: "When should you switch on hazard warning lights?",
      options: [
        "When carrying sick passengers in the vehicle",
        "When going straight through a four-way junction",
        "When overtaking at a dangerous place",
        "When a vehicle has broken down and is stopped on a highway",
      ],
    },
  ),
  ruleQuestion(
    103,
    2,
    {
      question: "මෝටර් වාහනයකට ඉන්ධන පිරවීමේදී",
      options: [
        "ඉන්ධන ලබා ගැනීමේදී එන්ජිම ගැන සැලකිලිමත්වීම අවශ්‍ය නැත",
        "වාහනයේ එන්ජිම පණ ගන්වා තිබියදී ඉන්ධන පිරවිය යුතුයි",
        "ඉන්ධන පුරවන අවස්ථාවේදී එන්ජිම නතර කළ යුතුයි",
        "එන්ජිමේ තෙල් නියමිත ප්‍රතිමාණයට ඇත්දැයි අනිවාර්යයෙන් පරීක්ෂා කළ යුතුයි",
      ],
    },
    {
      question: "When refuelling a motor vehicle:",
      options: [
        "There is no need to be concerned about the engine",
        "Refuel while the engine is running",
        "Switch off the engine while refuelling",
        "Check that the oil is at the correct level",
      ],
    },
  ),
  ruleQuestion(
    106,
    2,
    {
      question: "වාහනයක් ඉස්සර කිරීමේදී අනුගමනය කළ යුත්තේ",
      options: [
        "3, 4 වැනි වැඩි ගියරයක් තෝරා ගැනීම මගින් වැඩි බලයක් ලබාදීම",
        "3, 4 වැනි වැඩි ගියරයක් තෝරා ගැනීම මගින් වැඩි වේගයක් ලබාදීම",
        "1, 2 වැනි අඩු ගියරයක් තෝරා ගැනීම මගින් වැඩි බලයක් ලබාදීම",
        "1, 2 වැනි අඩු ගියරයක් තෝරා ගැනීම මගින් අඩු බලයක් ලබාදීම",
      ],
    },
    {
      question: "When overtaking, you should:",
      options: [
        "Select 3rd or 4th gear to give more power",
        "Select 3rd or 4th gear to give more speed",
        "Select 1st or 2nd gear to give more power",
        "Select 1st or 2nd gear to give less power",
      ],
    },
  ),
  ruleQuestion(
    107,
    3,
    {
      question: "ධාවන තීරු තුනකින් යුතු මාර්ගයක තුන් වන තීරුව භාවිතා කළ යුත්තේ",
      options: [
        "දකුණට හැරවීමට",
        "අධික වේගයෙන් ධාවනය කිරීම සඳහාය",
        "වෙනත් වාහනයක් පසුකර යෑමට",
        "වෙනත් වාහනයක් පසුකර යෑමට හෝ දකුණට හැරවීමට හෝ අනතුරක් වලක්වා ගැනීමටය",
      ],
    },
    {
      question: "On a three-lane road, the third lane should be used for:",
      options: [
        "Turning right",
        "Driving at high speed",
        "Overtaking another vehicle",
        "Overtaking another vehicle, turning right or avoiding an accident",
      ],
    },
  ),
  ruleQuestion(
    108,
    3,
    {
      question: "මහා මාර්ගෝපදේශ සංග්‍රහයේ අනතුරු හැගවීමේ සංඥා වල වර්ණය වන්නේ",
      options: [
        "රතු, සුදු හා කලු පැහැය",
        "රතු, සුදු හා නිල් පැහැය",
        "සුදු පසුතලයේ රතු පැහැය",
        "කහ පසුතලයේ කලු පැහැය",
      ],
    },
    {
      question: "According to the road guide, what colours are warning signs?",
      options: [
        "Red, white and black",
        "Red, white and blue",
        "Red on a white background",
        "Black on a yellow background",
      ],
    },
  ),
  ruleQuestion(
    109,
    2,
    {
      question: "ප්‍රධාන මාර්ගයට ඇතුළු වීමේදී ඔබ ඉඩදිය යුත්තේ",
      options: [
        "වමෙන් එන වාහන වලටය",
        "දකුණෙන් එන වාහන වලටය",
        "දකුණෙන් සහ වමෙන් එන වාහන වලටය",
        "ඉදිරියෙන් එන වාහන වලටය",
      ],
    },
    {
      question: "When entering a main road, you must give way to:",
      options: [
        "Vehicles from the left",
        "Vehicles from the right",
        "Vehicles from both the right and the left",
        "Vehicles coming from the front",
      ],
    },
  ),
  ruleQuestion(
    113,
    3,
    {
      question: "ඉස්සර කිරීම නොකළ යුත්තේ",
      options: [
        "පැසැලක් ඉදිරියෙන් ඇති අවස්ථාවකය",
        "රෝහලක් ඉදිරියෙන් ඇති අවස්ථාවකය",
        "පාර මැද ඇති සුදු පාට කඩ ඉර ඇති අවස්ථාවකය",
        "කන්දක් මුදුනින් ඇති අවස්ථාවකය",
      ],
    },
    {
      question: "You must not overtake:",
      options: [
        "When there is a school ahead",
        "When there is a hospital ahead",
        "When there is a broken white line in the middle of the road",
        "At the top of a hill",
      ],
    },
  ),
  ruleQuestion(
    115,
    2,
    {
      question: "යාමට සූදානම් වීම සඳහා ආලෝක සංඥා වල",
      options: [
        "රතු පාට පහන් දැල්වේ",
        "කොළ පාට පහන් දැල්වේ",
        "කහ පාට පහන් දැල්වේ",
        "කහ පාට සමඟ රතු පාට පහන් දැල්වේ",
      ],
    },
    {
      question: "Which signal light means get ready to stop or go?",
      options: [
        "Red light",
        "Green light",
        "Amber light",
        "Amber with red light",
      ],
    },
  ),
  ruleQuestion(
    118,
    2,
    {
      question:
        "වාහන වල අඳුරු පැහැ ගත්වනු ලබන විදුරු සඳහා දැනට ඇති රෙගුලාසි වන්නේ",
      options: [
        "වාමුවා හැර අනෙකුත් සියලුම විදුරු අඳුරු කළ හැක",
        "සියලුම විදුරු අඳුරු කළ නොහැක",
        "ඉදිරි දොර දෙකෙහි විදුරු හා ඉදිරි වාමුවාවේ උසින් පහෙන්හතර පංගුවක් යට කොටසින් අඳුරු කළ නොහැක",
        "සියලුම විදුරු අඳුරු කළ හැක",
      ],
    },
    {
      question: "What are the current rules for tinted vehicle windows?",
      options: [
        "All windows except the windscreen may be tinted",
        "No windows may be tinted",
        "The front two door windows and the windscreen below the upper quarter may not be tinted",
        "All windows may be tinted",
      ],
    },
  ),
  ruleQuestion(
    119,
    3,
    {
      question: "රථ වාහන ආලෝක සංඥා වල කොළ බල්බය දැල්වේ නම් ඊළඟ අවස්ථාව වන්නේ",
      options: [
        "කොළ නිවී රතු හා කහ එකවර දැල්වීමයි",
        "කොළ තිබියදී කහ පැහැය දැල්වීමයි",
        "කොළ නිවී ගොස් රතු පැහැය දැල්වීමයි",
        "කොළ නිවී ගොස් කහ පැහැය දැල්වීමයි",
      ],
    },
    {
      question: "If the green light is on, what is the next state?",
      options: [
        "Green goes off, and red and amber come on together",
        "Green stays on and amber comes on",
        "Green goes off and red comes on",
        "Green goes off and amber comes on",
      ],
    },
  ),
  ruleQuestion(
    120,
    2,
    {
      question: "රථ වාහන ආලෝක සංඥාවල රතු බල්බය දැල්වේ නම් ඊළඟ අවස්ථාව වන්නේ",
      options: [
        "රතු නිවී කොළ හා කහ එකවර දැල්වීමයි",
        "රතු නිවී ගොස් කහ බල්බය දැල්වීමයි",
        "රතු එසේම තිබියදී කහ බල්බය දැල්වීමයි",
        "රතු නිවී ගොස් කොළ දැල්වීමයි",
      ],
    },
    {
      question: "If the red light is on, what is the next state?",
      options: [
        "Red goes off, and green and amber come on together",
        "Red goes off and amber comes on",
        "Red stays on and amber comes on",
        "Red goes off and green comes on",
      ],
    },
  ),
  ruleQuestion(
    122,
    2,
    {
      question: "වාහනයක් මාර්ගයේ අනතුරකට පත් වූ විටක",
      options: [
        "කිසිම හේතුවක් නිසාවත් වාහන ඉවත් කළ නොහැක",
        "එම වාහනය එම ස්ථානයේම තැබිය යුතුය",
        "අන් වාහන වලට අවහිර වීම වළකා මාර්ගයෙන් අයින් කිරීම සඳහා අවසර ඇත",
        "එම වාහනයේ පිහිටීම සලකුණු කොට රෝගීන් ප්‍රථමාහනය කිරීම සඳහා අවසර ඇත",
      ],
    },
    {
      question: "When a vehicle has been involved in an accident on the road:",
      options: [
        "It may not be removed for any reason",
        "The vehicle must stay where it is",
        "It may be removed from the road to prevent other vehicles being blocked",
        "Its position may be marked and injured people taken away",
      ],
    },
  ),
  ruleQuestion(
    124,
    0,
    {
      question: "මහාමාර්ගයේ ධාවනය කිරීමට සුදුසු වාහනයක් වන්නේ",
      options: [
        "එහි සියලුම අංග මනා කාර්මික තත්වයෙන් යුතු බව, රක්ෂණ සහතිකය ආදායම් බලපත්‍රකය සමඟ අවශ්‍ය ලේඛන තිබිය යුතුය",
        "වලංගු ආදායම් බලපත්‍රකය හා රක්ෂණ සහතිකය පමණක් තිබිය යුතුය",
        "සුක්කානම, තිරිංග හා ටයර් පමණක් මනා තත්වයෙන් යුතුය",
        "රියදුරාට පාලනය කර ගත හැකි නම් කුමන වාහනයක් වුවද ධාවනය කළ හැකිය",
      ],
    },
    {
      question: "Which vehicle is suitable for driving on a highway?",
      options: [
        "A vehicle with all parts in good mechanical condition and the necessary documents, including insurance and revenue licence",
        "A vehicle with only a valid revenue licence and insurance",
        "A vehicle with only good steering, brakes and tyres",
        "Any vehicle the driver can control",
      ],
    },
  ),
  ruleQuestion(
    125,
    3,
    {
      question: "ආලෝක සංඥා මගින් පාලනය වන මංසන්ධි කොටුව සලකුණු කර ඇත්තේ",
      options: [
        "මංසන්ධියක් නිතරම වාහන තදබද ඇතිබව දැන්වීමට",
        "මංසන්ධියෙන් දකුණට හැරවීම හැර ඕනැම අවස්ථාවක ඇතුලු වීමට අවශ්‍යක",
        "මංසන්ධිය කෙරෙහි අවධානය වැඩි කිරීමට",
        "කොළ පැහැති ආලෝකය දැල්වුත් මංසන්ධි කොටුවෙන් පිටවීමට නොහැකි නම් දකුණට හරවන වාහන හැර අනිත් කිසිදු වාහනයක් ඇතුලු නොකිරීමට",
      ],
    },
    {
      question: "A box junction controlled by traffic lights is marked to:",
      options: [
        "Warn that there is always heavy traffic at the junction",
        "Allow entry in any case except turning right",
        "Increase attention at the junction",
        "Stop vehicles entering if they cannot leave the box when the green light is on, except vehicles turning right",
      ],
    },
  ),
  ruleQuestion(
    131,
    3,
    {
      question: "වෙනත් වාහනයකට ඉස්සර කිරීමේදී මුලින්ම කළ යුත්තේ",
      options: [
        "වාහනය නිවැරදිව මාර්ග තීරුවට ගැනීමය",
        "තමාගේ වේගය නිසි ප්‍රමාණයට සකසා ගැනීමය",
        "සංඥා දැමීමය",
        "කණ්ණාඩියෙන් පිටුපස බැලීමය",
      ],
    },
    {
      question: "Before overtaking another vehicle, what should you do first?",
      options: [
        "Move the vehicle correctly into the lane",
        "Adjust your speed correctly",
        "Give a signal",
        "Look in the mirror",
      ],
    },
  ),
  ruleQuestion(
    136,
    0,
    {
      question: "පදික මාරුවක් ඇති විට",
      options: [
        "පදික මාරුව හරහා පමණක් පදිකයන්ට මාරු විය හැක",
        "මීටර් 25 ක් අතුලත ඕනෑම ස්ථානයකින් පදිකයන්ට මාරු විය හැක",
        "මීටර් 50 ක් ඇතුලත ඕනෑම ස්ථානයකින් පදිකයන්ට මාරු විය නොහැක",
        "මීටර් 50 ක් ඇතුලත ඕනෑම ස්ථානයකින් පදිකයන්ට මාරුවිය හැක",
      ],
    },
    {
      question: "When there is a pedestrian crossing:",
      options: [
        "Pedestrians may cross only at the crossing",
        "Pedestrians may cross from any point within 25 m",
        "Pedestrians may not cross from any point within 50 m",
        "Pedestrians may cross from any point within 50 m",
      ],
    },
  ),
  ruleQuestion(
    137,
    2,
    {
      question: "රථ වාහන ආලෝක සංඥා වල කහ එළිය පමණක් දැල්වේ නම්,",
      options: [
        "රතු එළිය වැටීමට ප්‍රනරම වේගයෙන් ධාවනය කළ යුතුය",
        "ඊළඟට කොළ පාට එළිය දැල්වෙන බැවින් යාමට සූදානම් විය යුතුය",
        "ඊළඟට රතු එළිය දැල්වෙන බැවින් නැවත්විය යුතුය",
        "ඊළඟට කොළ පාට එළිය දැල්වෙන බැවින් ඉදිරියට ගමන් කළ යුතුය",
      ],
    },
    {
      question: "If only the amber light is on:",
      options: [
        "Speed up to get through before red",
        "Get ready to go, because green comes on next",
        "Stop, because red comes on next",
        "Go ahead, because green comes on next",
      ],
    },
  ),
  ruleQuestion(
    138,
    2,
    {
      question:
        "ඔබ ගමන් කරන මාර්ගයේ ඉදිරිය නොපෙනෙන වංගුවක් ඇති විට ඔබ කළ යුත්තේ",
      options: [
        "වාහනය හැමවිටම මාර්ගය මැදින් ගමන් කිරීමය",
        "පැමිණි වේගයෙන්ම නලාව ශබ්ද කරගෙන යාමය",
        "නතර කිරීමට බලාපොරොත්තුවෙන් වේගය අඩු කර වරක් නලාව ශබ්ද කර ගෙන යාමය",
        "වාහනයේ නලාව ශබ්ද නොකර වේගයෙන් යාමය",
      ],
    },
    {
      question:
        "When approaching a bend where you cannot see ahead, you should:",
      options: [
        "Always drive down the centre of the road",
        "Keep driving at the same speed while sounding the horn",
        "Slow down so you can stop, and sound the horn once",
        "Drive fast without sounding the horn",
      ],
    },
  ),
  ruleQuestion(
    144,
    1,
    {
      question: "පාරේ මැද තනි සුදු ඉරක් ඇති විට",
      options: [
        "වංගුවක අවදානම පෙන්වීම සඳහා යොදා ඇත",
        "සුදු ඉර කැපෙන සේ ඉස්සර කිරීම තහනමය",
        "දකුණට හැරවීම තහනමය",
        "මාර්ගය බෙදීමට ඉර යොදා ඇත",
      ],
    },
    {
      question:
        "When there is a single solid white line in the middle of the road:",
      options: [
        "It is used to show danger at a bend",
        "Overtaking across the solid white line is prohibited",
        "Turning right is prohibited",
        "It is used to divide the road",
      ],
    },
  ),
  ruleQuestion(
    145,
    0,
    {
      question: "පාරේ මැද එක ළඟින් වූ සුදු ඉරි 2 ක් ඇති විට",
      options: [
        "ඉරි කැපෙන සේ ඉස්සර කිරීම හෝ දකුණට හැරවීම තහනමය",
        "දකුණට හැරවීමට හැකිය",
        "ඉස්සර කිරීමට පුළුවන",
        "දකුණට හැරවීමට හා ඉස්සර කිරීම කළ හැක",
      ],
    },
    {
      question:
        "When two solid white lines are close together in the middle of the road:",
      options: [
        "Overtaking across the lines or turning right is prohibited",
        "Turning right is allowed",
        "Overtaking is allowed",
        "Turning right and overtaking are both allowed",
      ],
    },
  ),
  ruleQuestion(
    146,
    1,
    {
      question: "මෝටර් වාහනයක ඉදිරි පස බම්පරය මත ලෝහමය ආරක්ෂක වැටක් සවි කිරීම",
      options: [
        "ඉදිරි පස බම්පරය ගැලවීයාමට ඉඩ ඇත",
        "නීත්‍යානුකූල නොවේ",
        "හදිසි අනතුරකදී අනෙක් පාර්ශවයට සිදු වන හානිය වැඩි වේ",
        "රියදුරුගේ දර්ශණයට බාධා ඇති වේ",
      ],
    },
    {
      question: "Fitting a metal guard on the front bumper of a motor vehicle:",
      options: [
        "May cause the bumper to come loose",
        "Is not lawful",
        "Increases damage to the other party in a sudden accident",
        "Blocks the driver's view",
      ],
    },
  ),
  ruleQuestion(
    147,
    1,
    {
      question:
        "රියදුරු විසින් වාහනයක් පදවන සෑම විටම තම රියදුරු බලපත්‍රඩය තමා සන්තකයේ තබා ගැනීම",
      options: [
        "නීතිමය අවශ්‍යතාවයක් නොවේ",
        "නීතිමය අවශ්‍යතාවයකි",
        "ඡායා පිටපතක් තබා ගැනීම ප්‍රමාණවත් වේ",
        "අවශ්‍ය විටක ඉදිරිපත් කිරීමට හැකි වන පරිදි නිවසේ තබා ගැනීම වඩා ආරක්ෂාකාරී වේ",
      ],
    },
    {
      question: "Carrying your driving licence at all times while driving:",
      options: [
        "Is not a legal requirement",
        "Is a legal requirement",
        "A photocopy is enough",
        "Keeping it at home is safer",
      ],
    },
  ),
  ruleQuestion(
    148,
    1,
    {
      question:
        "තම වාහනයට ඉදිරියෙන් ගමන් කරන වාහනයකට වම් පසින් පසු කර යා හැකි වන්නේ",
      options: [
        "වම් පසින් ඉස්සර කිරීම සම්පූර්ණයෙන්ම තහනමය",
        "ඉදිරියෙන් ගමන් කරන වාහනය දකුණට හරවන බවට සංඥා කොට ඇති විටයි",
        "වම් පසින් පසු කර යාම ආරක්ෂා සහිත බව හැගෙන විටයි",
        "ඉහත කුමන අවස්ථාවකදී වුවද වම්පසින් යා හැකියි",
      ],
    },
    {
      question: "You may overtake a vehicle ahead on the left when:",
      options: [
        "Overtaking on the left is completely prohibited",
        "The vehicle ahead is signalling that it will turn right",
        "It feels safe to pass on the left",
        "You may pass on the left in any of these situations",
      ],
    },
  ),
  ruleQuestion(
    154,
    1,
    {
      question: "ටයරයේ වායු පීඩනය නියමිත ප්‍රමාණයට වඩා අඩුව විට",
      options: [
        "ටයරයේ තැනින් තැන වැඩි වැඩියෙන් ගෙවී යයි",
        "ටයරය දෙපැත්ත ඉක්මනින් ගෙවී යයි",
        "ටයරය ඉක්මනින් ගෙවී යයි",
        "ටයරය මැද ඉක්මනින් ගෙවී යයි",
      ],
    },
    {
      question: "When tyre air pressure is lower than the correct level:",
      options: [
        "It wears unevenly in places",
        "Its edges wear quickly",
        "It wears quickly",
        "Its middle wears quickly",
      ],
    },
  ),
  ruleQuestion(
    156,
    0,
    {
      question:
        "ස්වයංක්‍රීයය නොවන ගියර පෙට්ටියක් ඇති වාහනයක ගියර් මාරු කිරීමේ අපහසුතාවයක් ඇත්නම් වඩාත්ම හේතු වන්නේ",
      options: [
        "ක්ලච් එක නිසි පරිදි ක්‍රියා නොකිරීමය",
        "ගියර් පෙට්ටියේ ඇති රෝද කැඩි තිබීම",
        "එන්ජිමේ ක්‍රියාකාරිත්වය සුමට නොවීම",
        "වාහනයේ ඩිපරන්සරය දෝෂ සහිත වීම",
      ],
    },
    {
      question:
        "In a manual gearbox vehicle, the most likely cause of difficulty changing gears is:",
      options: [
        "The clutch is not being operated properly",
        "Broken teeth in the gearbox",
        "The engine is not running smoothly",
        "A fault in the differential",
      ],
    },
  ),
  ruleQuestion(
    160,
    1,
    {
      question: "එන්ජිමකට ලිහිසි තෙල් භාවිතා කරනු ලබන්නේ",
      options: [
        "එන්ජිම තුළ ඇති වායු සංසරණ වේගය වැඩි කිරීම",
        "චලනය වන කොටස් වල ගෙවීම් අවම කර ගැනීම සඳහා",
        "ඉන්ධන දහනයේදී එහි කාර්යක්ෂමතාවය වැඩි කිරීමට",
        "එන්ජිමෙහි කාර්යක්ෂමතාවය වැඩිකිරීමටය",
      ],
    },
    {
      question: "Lubricating oil is used in an engine to:",
      options: [
        "Increase the speed of air circulation inside the engine",
        "Reduce wear on moving parts",
        "Increase efficiency when fuel burns",
        "Increase the engine's efficiency",
      ],
    },
  ),
  ruleQuestion(
    161,
    0,
    {
      question: "ඩිෆරන්සලයේ ක්‍රියාකාරිත්වය කුමක්ද?",
      options: [
        "වාහනය වංගුවක ධාවනය කිරීමේදී රෝද වල වේගය සමාන කිරීමය",
        "ටයර් වලට හානියක් නොවී වැඩි බරක් ගෙනයාම පිණිසය",
        "ටයර් වල අක්‍රියමත් ගෙවීම අඩුකිරීමය",
        "වාහනය වංගුවක ධාවනය කිරීමේදී රෝද වල වේගය වෙනස් කිරීමය",
      ],
    },
    {
      question: "What is the function of the differential?",
      options: [
        "It equalises the speed of the wheels when the vehicle turns a corner",
        "It carries heavier loads without damaging the tyres",
        "It reduces uneven wear on the tyres",
        "It changes the speed of the wheels when the vehicle turns a corner",
      ],
    },
  ),
  ruleQuestion(
    163,
    1,
    {
      question: "වාහනයක ජල පොම්පයේ ක්‍රියාකාරිත්වය වන්නේ",
      options: [
        "එන්ජිමේ තෙල් සංසරණය සහසු කිරීමය",
        "එන්ජිම තුළ ජලය සංසරණය ඇති කිරීමය",
        "එන්ජිමේ භාවිතා කරන ජලය සිසිල් කිරීමය",
        "රේඩියේටරය සිසිල් කිරීමය",
      ],
    },
    {
      question: "The function of a vehicle's water pump is to:",
      options: [
        "Make the oil circulate more easily",
        "Circulate water inside the engine",
        "Cool the water the engine uses",
        "Cool the radiator",
      ],
    },
  ),
  ruleQuestion(
    164,
    2,
    {
      question:
        "වාහනය පදවාගෙන යන අවස්ථාවක එක විටම තිරිංග පද්ධතියට සම්බන්ධ පාලන බල්බය දැල්වුනහොත් ඔබ විසින් කළ යුත්තේ",
      options: [
        "වාහනය ආසන්නයේම ඇති ගරාජයට ගෙන යාමයි",
        "ගමනාන්තය දක්වා ප්‍රෙවේශමෙන් ගමන් කිරීම",
        "වාහනය වහාම නවත්වා තිරිංග තෙල් ඇතිදැයි පරීක්ෂා කිරීම",
        "කාර්මිකයෙකු ගෙන්වා පරීක්ෂා කරන තුරු වාහනය නතර කර තැබීමය",
      ],
    },
    {
      question:
        "If the brake system warning light comes on while driving, you should:",
      options: [
        "Take the vehicle to the nearest garage",
        "Continue carefully to your destination",
        "Stop immediately and check whether there is brake fluid",
        "Keep the vehicle stopped until a mechanic checks it",
      ],
    },
  ),
  ruleQuestion(
    168,
    1,
    {
      question:
        "ඔබ පදවන වාහනයේ විදුලි දෝෂයක් නිසා වයර් පිලිස්සෙන ගඳක් ඇති වුවහොත් වහාම කළ යුත්තේ",
      options: [
        "වාහනයේ සියලුම පහන් නිවා දැමීමය",
        "ප්‍රධානධාන ස්විචය ක්‍රියා විරහිත කිරීමය",
        "පියුස් (විලායක) ගැලවීමය",
        "බැටරි වයර ගැලවීමය",
      ],
    },
    {
      question:
        "If an electrical fault causes a smell of burning wires, you should first:",
      options: [
        "Switch off all the lights",
        "Switch off the main switch",
        "Remove the fuse",
        "Disconnect the battery wire",
      ],
    },
  ),
  ruleQuestion(
    169,
    3,
    {
      question: "වාහනයක් ලිස්සා යන අවස්ථාවේදී අවධානම අඩු කර ගැනීම සඳහා",
      options: [
        "ලිස්සා යන අවස්ථාවේදී අවධානම අඩු කල නොහැක",
        "එකවර තිරිංග යොදා වේගය පාලනය කළ යුතුය",
        "තිරිංග නොයොදා ලිස්සා යන දිශාවට විරුද්ධ දිශාවටම සුක්කානම හැරවිය යුතුය",
        "ගියර් මගින් පාලනය කර ලිස්සා යන දිශාවට ක්‍රමානුකූලව සුක්කානම පාලනය කල යුතුය",
      ],
    },
    {
      question: "When a vehicle is skidding, to reduce the risk you should:",
      options: [
        "Nothing can be done to reduce the risk while skidding",
        "Apply all the brakes at once to control speed",
        "Turn the steering wheel in the opposite direction to the skid without braking",
        "Control the gears and steer gradually in the direction of the skid",
      ],
    },
  ),
  ruleQuestion(
    170,
    0,
    {
      question:
        "තිරිංග තෙල් භාවිතා කරන වාහනයක තිරිංග පැඩලය පහතටම බැසීමක් සිදුවේ නම් ඉන් අදහස් වන්නේ",
      options: [
        "තිරිංග පැඩලයේ දෝෂයක් ඇති බවයි",
        "බ්‍රේක් බයින්ඩ් (තිරිංග හිර වීමක්) ඇති බවයි",
        "තිරිංග නිසි පරිදි ක්‍රියා කරන බවයි",
        "තිරිංග තෙල් කාන්දු වීමක් ඇති බවයි",
      ],
    },
    {
      question:
        "If the brake pedal goes all the way to the floor in a vehicle with hydraulic brakes, this means:",
      options: [
        "There is a fault in the brake pedal",
        "The brakes are locked",
        "The brakes are working properly",
        "Brake fluid is leaking",
      ],
    },
  ),
  ruleQuestion(
    171,
    1,
    {
      question:
        "වාහනයට තිරිංග යෙදීමේදී වම් පැත්තට ඇදී යන්නේ නම්, එයින් අදහස් වන්නේ",
      options: [
        "රෝද වල වායු පීඩනය එකිනෙකට වෙනස් බවයි",
        "ඉදිරි පස වම් පැත්තේ රෝදයේ තිරිංග තෙල් කාන්දු වීමයි",
        "ඉදිරි පස දකුණු පැත්තේ රෝදයේ තිරිංග තෙල් කාන්දු වීමයි",
        "පසු පස රෝද වලට තිරිංග නොමැති බවයි",
      ],
    },
    {
      question: "If the vehicle pulls to the left when braking, this means:",
      options: [
        "The tyre pressures are different from each other",
        "There is a brake fluid leak at the front left wheel",
        "There is a brake fluid leak at the front right wheel",
        "The rear wheels have no brakes",
      ],
    },
  ),
  ruleQuestion(
    172,
    1,
    {
      question:
        "ධාවනය කිරීමේදී ගියර් මාරු කිරීමේ අපහසුතාවයක් ඇත්නම් වඩාත්ම විය හැක්කේ",
      options: [
        "වාහනයේ ගියර් ලීවරයේ දෝෂයක් ඇති බවයි",
        "ක්ලච් එක නිසි පරිදි ක්‍රියා නොකිරීමයි",
        "එන්ජිමේ වේගය නිසි පරිදි නොමැති වීමයි",
        "ගියර් පෙට්ටියේ දෝෂයක් ඇති බවයි",
      ],
    },
    {
      question:
        "If there is difficulty changing gears while driving, the most likely cause is:",
      options: [
        "A fault in the gear lever",
        "The clutch is not being operated properly",
        "The engine speed is not correct",
        "A fault in the gearbox",
      ],
    },
  ),
];

// The picture questions and the text questions are each split across the three quizzes, 20 per quiz.
const SIGN_SORTED = [...SIGN_QUESTIONS].sort((a, b) => sortKey(a) - sortKey(b));
const RULE_SORTED = [...RULE_QUESTIONS].sort((a, b) => sortKey(a) - sortKey(b));

function sortKey(question: PracticeQuestion): number {
  return Number(question.id.split("-")[1]);
}

export const PRACTICE_QUIZZES: PracticeQuiz[] = [0, 1, 2].map((index) => ({
  title: `Quiz ${index + 1}`,
  questions: [
    ...SIGN_SORTED.slice(index * 20, index * 20 + 20),
    ...RULE_SORTED.slice(index * 20, index * 20 + 20),
  ],
}));
