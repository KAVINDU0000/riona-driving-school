// Copy taken from the Riyona Academy · Desktop 1440 reference.
// Phone and WhatsApp values are placeholders read from the preview; confirm before launch.

export const site = {
  name: "Riyona Driving School",
  phone: "+94 71 889 4481",
  phoneHref: "tel:+94718894481",
  whatsapp: "https://wa.me/94717066759",
};

/** Public site navigation. Each entry is a real route, and the active item is chosen by pathname. */
export const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Packages", href: "/packages" },
  { label: "Vehicles", href: "/vehicles" },
  { label: "Driving Signs & Road Rules", href: "/road-signs" },
  { label: "Cash discount", href: "/cash-discount" },
  { label: "Contact", href: "/contact" },
];

export const trustPoints = [
  {
    icon: "shield-check",
    title: "Government Approved",
    sub: "Registered with DMT Sri Lanka",
  },
  {
    icon: "user",
    title: "Expert Instructors",
    sub: "Trained & certified staff",
  },
  {
    icon: "car",
    title: "Dual-Control Vehicles",
    sub: "Safety first on every lesson",
  },
  {
    icon: "calendar",
    title: "Flexible Scheduling",
    sub: "Evenings & weekends",
  },
];

export const learningStages = [
  {
    title: "Learn The Core Cockpit Dynamics",
    body: "Master clutch control, gears, steering and mirror habits in a calm, dual-control car.",
  },
  {
    title: "Practice Precise Maneuvers",
    body: "Execute 3-point turns, hill starts, reverse parking and the tests examiners look for.",
  },
  {
    title: "Build Safe Traffic Confidence",
    body: "Navigate busy Colombo junctions, roundabouts and merges with a guided instructor.",
  },
  {
    title: "Drive Independently",
    body: "Take full charge of the vehicle and prepare for your final driving test with confidence.",
  },
];

export const whyCards = [
  {
    icon: "shield-check",
    title: "Government Approved & Certified",
    body: "Officially registered with the Department of Motor Traffic. Our curriculum meets all DMT compliance requirements.",
    tag: "Accredited Training",
  },
  {
    icon: "user",
    title: "Patient, Highly Qualified Instructors",
    body: "Friendly, encouraging instructors who explain each step clearly, in English, Sinhala and Tamil.",
    tag: "English · Sinhala · Tamil",
  },
  {
    icon: "car",
    title: "Modern Dual-Control Fleet",
    body: "Automatic and manual hatchbacks, with dual-control pedals and recent safety features for every lesson.",
    tag: "Auto · Manual · Hybrid",
  },
  {
    icon: "flag",
    title: "Dedicated Practical Training Yard",
    body: "Practise on a closed training yard before moving onto public roads. Build confidence in a controlled space.",
    tag: "Track & Yard Practice",
  },
  {
    icon: "calendar",
    title: "Full Support on DMT Exam Day",
    body: "Our instructors guide you through every step on DMT exam day, from document checks to arriving at the test centre calm and ready.",
    tag: "Exam Day Support",
  },
  {
    icon: "wallet",
    title: "Flexible Instalment Payment Schemes",
    body: "Affordable, transparent pricing with instalment options to make driving lessons easier to plan for.",
    tag: "Transparent Pricing",
  },
];

export const vehicles = [
  {
    key: "car",
    label: "Car",
    tag: "Automatic & Manual",
    title: "Car Lessons (Auto & Manual)",
    body: "Complete mastery of clutch, gears, steering, parking and motorway-style highway control, with dual-control safety and recent vehicle features.",
    points: [
      "Dual-control safety and experienced instructors",
      "Automatic and manual transmission options",
      "Pickup and drop-off available in the Colombo area",
    ],
    image: "/images/car-swift.png",
  },
  {
    key: "van",
    label: "Van",
    tag: "Light Commercial",
    title: "Van Lessons",
    body: "Training for light commercial vans, covering load awareness, wider-body manoeuvring and the handling you need for work vehicles.",
    points: [
      "Load and blind-spot awareness",
      "Wider-body manoeuvring",
      "Dual-control van available",
    ],
    image: "/images/van.png",
  },
  {
    key: "motorbike",
    label: "Motorbike",
    tag: "A/L Bike",
    title: "Motorbike Lessons (A/L)",
    body: "Balance, braking and cornering skills on a motorbike, taught from the ground up with a focus on road safety.",
    points: [
      "Balance and low-speed control",
      "Braking and cornering technique",
      "Protective gear advice",
    ],
    image: "/images/motorbike.png",
  },
  {
    key: "three-wheeler",
    label: "Three-Wheeler",
    tag: "Tuk-Tuk",
    title: "Three-Wheeler Lessons",
    body: "Learn the three-wheeler controls, tight-space turns and traffic handling required for the three-wheeler licence.",
    points: [
      "Tight-space turning",
      "Traffic and junction handling",
      "Licence test preparation",
    ],
    image: "/images/three-wheeler.png",
  },
];

export const resources = {
  featured: {
    title: "Car Lessons (Auto & Manual)",
    body: "Our most popular package: step-by-step lessons from first pedal press to confident road driving.",
    image: "/images/car-lesson.jpg",
  },
  side: [
    {
      icon: "users",
      title: "Student Portal",
      body: "Manage scheduled lessons, track progress, access feedback, and view your learning materials in one place.",
      cta: "Access Portal Dashboard",
      href: "#faq",
    },
    {
      icon: "play",
      title: "Video Tutorials & Theory",
      body: "Watch step-by-step lesson videos covering road signs, junctions, parking and exam-day tips.",
      cta: "Watch Our Learning Videos",
      href: "#faq",
    },
    {
      icon: "signpost",
      title: "Driving Signs & Road Rules",
      body: "Browse the complete road sign library, with examples of every sign in the official DMT theory test.",
      cta: "Browse Signs Library",
      href: "/road-signs",
    },
  ],
};

export const licenceSteps = [
  {
    n: "01",
    title: "NTMI Medical Fitness",
    body: "Complete your official NTMI medical fitness test at a government-approved centre.",
    note: "Step 1 · Medical Fitness",
  },
  {
    n: "02",
    title: "DMT Written Exam",
    body: "Take the DMT computerised written test on road rules, signs and safe driving.",
    note: "Learner's Permit issued",
  },
  {
    n: "03",
    title: "3-Month Training Yard",
    body: "Master the core driving skills at our training yard, then move onto public roads.",
    note: "Hands-on road training",
  },
  {
    n: "04",
    title: "DMT Werahera Trial",
    body: "Pass the practical trial at Werahera with your instructor, then receive your licence.",
    note: "Official Licence Received",
  },
];

export const safetyPrinciples = [
  { icon: "eye", title: "Road Awareness", sub: "Read the road ahead" },
  {
    icon: "shield",
    title: "Defensive Driving",
    sub: "Anticipate other drivers",
  },
  { icon: "car", title: "Vehicle Handling", sub: "Control in every condition" },
  {
    icon: "users",
    title: "Responsible Driving",
    sub: "Respect every road user",
  },
];

export const testimonials = [
  {
    quote:
      "The instructors were really patient and helpful. Building my confidence from day one, the lessons on Colombo junctions were a game changer.",
    name: "Tharindu Weerasinghe",
    role: "Car · Automatic",
    initials: "TW",
  },
  {
    quote:
      "Absolutely worth every rupee. My instructor was calm, clear and made learning stress-free. The Werahera test-day transport was fantastic.",
    name: "Dinesh Cooray",
    role: "Car · Manual",
    initials: "DC",
  },
  {
    quote:
      "Good communication, professional staff and very flexible lesson times for a working professional. Riyona helped me transform my very first drive.",
    name: "Kenneth Padmasiri",
    role: "Car · Automatic",
    initials: "KP",
  },
];

export const faqs = [
  {
    q: "Which licence class should I choose?",
    a: "Choose by the vehicle you plan to drive. Car lessons cover the most common licence, while van, motorbike and three-wheeler lessons have their own classes. Our team will confirm the right class for you.",
  },
  {
    q: "Can I learn in an automatic or manual car?",
    a: "Yes. Our fleet includes both automatic and manual hatchbacks, so you can choose the transmission you plan to drive on.",
  },
  {
    q: "Where do lessons take place?",
    a: "Lessons take place in the Colombo area and on our practical training yard, with public-road practice as you progress.",
  },
  {
    q: "What do I need for the DMT exam?",
    a: "You will need your NTMI medical certificate, your learner's permit and the required identification. We will send you a full checklist when you enrol.",
  },
  {
    q: "How do I book a lesson or discuss pricing?",
    a: "Message us on WhatsApp or call during office hours. We will reply with available slots and a clear price breakdown.",
  },
];
