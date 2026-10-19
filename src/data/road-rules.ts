/*
 * Road signs and road rules for the public "Driving Signs & Road Rules" page. This is a general guide to Sri Lankan
 * traffic rules. Sign names are written for this page. The speed limits come from the 2012 gazette and later news
 * reports; the Department of Motor Traffic (DMT) reviews them, so the page tells readers to check the current official
 * rules before they drive or sit a test.
 */

/** How a sign is drawn on the page. The shape and colour show the type of sign. */
export type SignGlyph = "diamond" | "circle" | "triangle" | "octagon" | "square" | "none";

export type SignCategory = {
  id: string;
  number: string;
  title: string;
  intro: string;
  glyph: SignGlyph;
  signs: string[];
};

/** One card per sign shape: the shape's name, the type of sign it means, and what the sign tells the driver. */
export const SIGN_SHAPES: { glyph: SignGlyph; shape: string; type: string; body: string }[] = [
  {
    glyph: "diamond",
    shape: "Yellow diamond",
    type: "Warning signs",
    body: "Warn you of a hazard or road condition ahead, such as a bend, junction, crossing or other danger.",
  },
  {
    glyph: "circle",
    shape: "Red-bordered circle",
    type: "Regulatory signs (Prohibition or restriction)",
    body: "Indicate something you must not do, or a limitation such as a speed limit or turning restriction.",
  },
  {
    glyph: "triangle",
    shape: "Red-bordered triangle",
    type: "Give way signs",
    body: "Tell you to give way and let other traffic go first at junctions or other locations.",
  },
  {
    glyph: "octagon",
    shape: "Red octagon",
    type: "Stop sign",
    body: "You must stop completely and give way before continuing, where required by the rules.",
  },
  {
    glyph: "square",
    shape: "Blue square or rectangle",
    type: "Information signs",
    body: "Provide information and indicate facilities or services, such as parking, hospitals, bus lanes and expressways.",
  },
];

/*
 * Sign pictures from the school's "Sign Board Details" list, keyed by the sign name used in the categories below. The
 * code after the name is the sign number on that list. A sign without an entry shows its drawn shape instead.
 */
export const SIGN_IMAGES: Record<string, string> = {
  "Left bend ahead": "/road-signs/DWS-01.png",
  "Right bend ahead": "/road-signs/DWS-02.png",
  "Double bend to the left ahead": "/road-signs/DWS-03.png",
  "Double bend to the right ahead": "/road-signs/DWS-04.png",
  "Hairpin bend to the right ahead": "/road-signs/DWS-05.png",
  "Hairpin bend to the left ahead": "/road-signs/DWS-06.png",
  "Cross roads ahead": "/road-signs/DWS-12.png",
  "T-junction ahead": "/road-signs/DWS-15.png",
  "Traffic from the left merges ahead": "/road-signs/DWS-17.png",
  "Traffic from the left joins at a right angle": "/road-signs/DWS-18.png",
  "Traffic from the right merges ahead": "/road-signs/DWS-19.png",
  "Traffic from the right joins at a right angle": "/road-signs/DWS-20.png",
  "Narrow bridge ahead": "/road-signs/DWS-21.png",
  "Roundabout ahead": "/road-signs/DWS-25.png",
  "Pedestrian crossing ahead": "/road-signs/DWS-32.png",
  "Children crossing ahead": "/road-signs/DWS-33.png",
  "Pass on the left side": "/road-signs/MNS-06.png",
  "Pass on the right side": "/road-signs/MNS-07.png",
  "Side obstacle markers": "/road-signs/MS-03.png",
  "Chevron markers (double)": "/road-signs/MS-05.png",
  "Pedestrian crossing": "/road-signs/OSD-01.png",
  "Hospital": "/road-signs/OSD-03.png",
  "Bus stop": "/road-signs/OSD-06.png",
  "Cycle-only lane begins or continues": "/road-signs/OSD-09.png",
  "Parking": "/road-signs/OSD-04.png",
};

/* Danger warning pictures made by the school (infographic set). Used where the official list above has no picture. */
const DANGER_INFOGRAPHIC_IMAGES: Record<string, string> = {
  "Road narrows ahead": "/road-signs/infographic/road-narrows-ahead.png",
  "Road work ahead": "/road-signs/infographic/road-work-ahead.png",
  "Two-way traffic ahead": "/road-signs/infographic/two-way-traffic-ahead.png",
  "Uneven road ahead": "/road-signs/infographic/uneven-road-ahead.png",
  "Slippery road ahead": "/road-signs/infographic/slippery-road-ahead.png",
  "School zone ahead": "/road-signs/infographic/school-zone-ahead.png",
  "Animal crossing ahead": "/road-signs/infographic/animal-crossing-ahead.png",
  "Wild animals ahead": "/road-signs/infographic/wild-animals-ahead.png",
  "Low clearance ahead": "/road-signs/infographic/low-clearance-ahead.png",
  "Narrow road ahead": "/road-signs/infographic/narrow-road-ahead.png",
  "Railway crossing ahead": "/road-signs/infographic/railway-crossing-ahead.png",
  "Dual carriageway starts ahead": "/road-signs/infographic/dual-carriageway-starts-ahead.png",
  "Airport ahead": "/road-signs/infographic/airport-ahead.png",
  "Side winds ahead": "/road-signs/infographic/side-winds-ahead.png",
  "Winding road ahead": "/road-signs/infographic/winding-road-ahead.png",
  "Y-junction ahead": "/road-signs/infographic/y-junction-ahead.png",
  "Traffic light signals ahead": "/road-signs/infographic/traffic-light-signals-ahead.png",
  "Road narrows on the left side ahead": "/road-signs/infographic/road-narrows-left-side-ahead.png",
  "Road narrows on the right side ahead": "/road-signs/infographic/road-narrows-right-side-ahead.png",
  "Loose gravel ahead": "/road-signs/infographic/loose-gravel-ahead.png",
  "Dangerous ascent ahead": "/road-signs/infographic/dangerous-ascent-ahead.png",
  "Dangerous descent ahead": "/road-signs/infographic/dangerous-descent-ahead.png",
};

for (const [name, src] of Object.entries(DANGER_INFOGRAPHIC_IMAGES)) {
  SIGN_IMAGES[name] ??= src;
}

/** Danger warnings are yellow diamonds. Each sign is named as it appears in the category. */
export const SIGN_CATEGORIES: SignCategory[] = [
  {
    id: "warning",
    number: "01",
    title: "Danger warning signs",
    intro: "Yellow diamonds that warn you of a hazard or a change in the road ahead. Slow down and be ready to act.",
    glyph: "diamond",
    signs: [
      "Left bend ahead",
      "Right bend ahead",
      "Double bend to the left ahead",
      "Double bend to the right ahead",
      "Hairpin bend to the right ahead",
      "Hairpin bend to the left ahead",
      "Dual carriageway ends",
      "Dual carriageway starts ahead",
      "Road narrows ahead",
      "Road narrows on the left side ahead",
      "Road narrows on the right side ahead",
      "Cross roads ahead",
      "Staggered junction ahead, side road to the left",
      "Staggered junction ahead, side road to the right",
      "T-junction ahead",
      "Y-junction ahead",
      "Traffic from the left merges ahead",
      "Traffic from the left joins at a right angle",
      "Traffic from the right merges ahead",
      "Traffic from the right joins at a right angle",
      "Narrow bridge ahead",
      "Two-way traffic ahead",
      "Stop ahead",
      "Give way ahead",
      "Roundabout ahead",
      "Traffic light signals ahead",
      "Dangerous descent ahead",
      "Dangerous ascent ahead",
      "Slippery road ahead",
      "Loose gravel ahead",
      "Falling rocks ahead",
      "Pedestrian crossing ahead",
      "Children crossing ahead",
      "Blind people crossing ahead",
      "Road work ahead",
      "Level crossing with gates ahead",
      "Level crossing without gates ahead",
      "Bus lane ahead",
      "Cycle lane ahead",
      "Cyclists crossing ahead",
      "Cattle crossing ahead",
      "Road ahead on a quay",
      "Dangerous side slopes ahead",
      "Road hump ahead",
      "Uneven road ahead",
      "Dip ahead",
      "Humped bridge ahead",
      "Tunnel ahead",
      "School zone ahead",
      "Animal crossing ahead",
      "Wild animals ahead",
      "Low clearance ahead",
      "Narrow road ahead",
      "Railway crossing ahead",
      "Airport ahead",
      "Side winds ahead",
      "Winding road ahead",
    ],
  },
  {
    id: "prohibitory",
    number: "02",
    title: "Regulatory signs: prohibitory",
    intro: "Red-bordered circles that tell you what you must not do.",
    glyph: "circle",
    signs: [
      "No entry",
      "No left turn",
      "No right turn",
      "No U-turn",
      "No overtaking",
      "No horning",
      "Road closed for all vehicles",
      "Road closed for motor vehicles",
      "Road closed for buses",
      "Road closed for lorries",
      "Road closed for articulated vehicles",
      "Road closed for power-driven agricultural vehicles",
      "Road closed for pedestrians",
      "Road closed for cycles",
      "Road closed for motorcycles",
      "No parking",
      "No parking and no standing",
      "No parking on odd days",
      "No parking on even days",
    ],
  },
  {
    id: "restrictive",
    number: "03",
    title: "Restrictive signs",
    intro: "Red-bordered circles that set a limit on width, height, weight or speed.",
    glyph: "circle",
    signs: [
      "Width limit",
      "Height limit",
      "Weight limit",
      "Weight limit on one axle",
      "Speed limit within built-up areas (50 km/h, except three-wheelers and land vehicles)",
      "End of speed limit",
    ],
  },
  {
    id: "mandatory",
    number: "04",
    title: "Mandatory signs",
    intro: "Red-bordered circles with a black arrow. They tell you which way you must go or how you must pass.",
    glyph: "circle",
    signs: [
      "Turn left",
      "Turn right",
      "Keep straight ahead",
      "Turn left ahead",
      "Turn right ahead",
      "Pass on the left side",
      "Pass on the right side",
      "Compulsory roundabout",
    ],
  },
  {
    id: "priority",
    number: "05",
    title: "Priority signs",
    intro: "Signs that decide who goes first at a junction or on a narrow road.",
    glyph: "triangle",
    signs: [
      "Stop to give priority to vehicles on the adjacent road",
      "Give way to vehicles on the adjacent road",
      "Priority road: vehicles on the major road have priority",
      "End of priority for vehicles on the major road",
      "Priority for oncoming traffic",
      "Priority over oncoming traffic vehicles",
    ],
  },
  {
    id: "useful",
    number: "06",
    title: "Other signs useful for drivers",
    intro: "Blue signs that show facilities, lanes and routes.",
    glyph: "square",
    signs: [
      "Pedestrian crossing",
      "One-way traffic flow",
      "Hospital",
      "Parking",
      "Parking for disabled persons",
      "Bus stop",
      "Bus-only lane begins or continues",
      "Bus-only lane ends",
      "Cycle-only lane begins or continues",
      "Cycle-only lane ends",
      "Cycle and pedestrian lane begins or continues",
      "Cycle and pedestrian lane ends",
      "Pedestrian underpass",
      "Pedestrian overpass",
      "Entrance to an expressway",
      "End of expressway",
      "Street for pedestrians only",
      "Road for motor vehicles only",
    ],
  },
  {
    id: "markings",
    number: "07",
    title: "Road markings",
    intro: "Lines, arrows and words painted on the road. They have the same force as signs.",
    glyph: "none",
    signs: [
      "Side obstacle markers",
      "Chevron markers (double)",
      "Centre line, solid: do not cross or overtake over it",
      "Centre line, broken: overtaking is allowed when it is safe",
      "Centre line, broken and solid together: the lane nearer the solid line may not cross it",
      "Double continuous centre line: no crossing either way",
      "Lane dividing lines",
      "Edge lines of the carriageway",
      "Stop line: stop behind it at a junction or light",
      "Zebra crossing: give way to pedestrians on it",
      "Hatched lines for traffic in the opposite direction",
      "Hatched lines for traffic in the same direction",
      "Double yellow lines: no parking or stopping",
      "Lane arrow: compulsory straight ahead",
      "Lane arrow: compulsory left turn",
      "Lane arrow: compulsory right turn",
      "Bus lane marking",
      "Cycle lane marking",
      "Word markings such as STOP, SLOW and BUS LANE",
    ],
  },
  {
    id: "lights",
    number: "08",
    title: "Traffic light signals",
    intro: "What each light means for a driver.",
    glyph: "none",
    signs: [
      "Red: stop behind the stop line and wait",
      "Red and amber together: wait; do not move until the green light",
      "Green: go only when the way ahead is clear",
      "Amber: stop if you can do so safely",
      "Flashing amber: proceed with caution",
      "Pedestrian signal, red figure: do not cross",
      "Pedestrian signal, green figure: you may cross",
    ],
  },
  {
    id: "police",
    number: "09",
    title: "Hand signals by police officers",
    intro: "Signals from a police officer at a junction or road works. Follow the officer's signal over the traffic lights.",
    glyph: "none",
    signs: [
      "Traffic approaching from the front: stop",
      "All traffic: stop",
      "Traffic approaching from the front and from behind: stop",
      "Traffic from the right: proceed",
      "Traffic from the front: proceed",
      "Traffic from the left: proceed",
    ],
  },
];

export const SPEED_LIMITS: { place: string; limit: string; note: string }[] = [
  { place: "Built-up areas and towns", limit: "50 km/h", note: "Motor vehicles on the listed roads. Lower limits apply to some vehicles and in some places." },
  { place: "Roads outside built-up areas", limit: "70 km/h", note: "Most motor vehicles. Motor coaches and lorries have a lower limit." },
  { place: "Southern Expressway", limit: "100 km/h", note: "The maximum on this expressway. Follow the signs for the limit on each section." },
];

export const ROAD_RULES: { icon: string; title: string; body: string }[] = [
  {
    icon: "car",
    title: "Drive on the left",
    body: "Drive on the left side of the road. Overtake on the right when it is safe and permitted. Check mirrors and blind spots before changing lanes.",
  },
  {
    icon: "shield-check",
    title: "Wear a seat belt",
    body: "Wear your seat belt correctly. On Sri Lankan expressways, all occupants must wear seat belts, including passengers in the rear seats.",
  },
  {
    icon: "shield",
    title: "Wear a proper helmet",
    body: "Motorcycle riders and pillion passengers must wear a properly fitted, securely fastened helmet that meets the required standards.",
  },
  {
    icon: "eye",
    title: "Do not use a phone while driving",
    body: "Do not hold or use a mobile phone while driving. Stop in a safe, permitted place before making a call or sending a message.",
  },
  {
    icon: "heart-pulse",
    title: "Never drive under the influence",
    body: "Never drive after drinking alcohol or using drugs that impair your ability to drive. Arrange a safe alternative such as a designated driver or public transport.",
  },
  {
    icon: "id-card",
    title: "Keep required documents valid",
    body: "Carry your valid driving licence and ensure the vehicle has a valid revenue licence, insurance and any required emission or fitness certificates.",
  },
  {
    icon: "users",
    title: "Protect pedestrians",
    body: "Slow down near pedestrian crossings, schools and busy public areas. Watch for pedestrians and stop when required to let them cross safely.",
  },
  {
    icon: "signpost",
    title: "Obey traffic lights and police directions",
    body: "Follow traffic lights, road signs and road markings. Stop at a red light, and obey directions given by a police officer even when they differ from the usual signal.",
  },
  {
    icon: "lightbulb",
    title: "Use your indicators",
    body: "Signal before turning, changing lanes or moving away from the roadside. Check mirrors and make sure the manoeuvre is safe.",
  },
  {
    icon: "map-pin",
    title: "Park only where permitted",
    body: "Do not park where signs or road markings forbid it. Keep clear of junctions, pedestrian crossings, bus stops and other places where parking is prohibited.",
  },
  {
    icon: "clock",
    title: "Follow speed limits",
    body: "Obey the posted speed limit and adjust your speed for traffic, weather and road conditions. Speed limits vary by road type and vehicle class.",
  },
  {
    icon: "flag",
    title: "Give way safely",
    body: "Follow give way signs, junction rules and roundabout markings. Check carefully and let other traffic go first when required.",
  },
];
