export const trustItems = [
  {
    id: 1,
    icon: "✓",
    title: "Government Approved",
    description: "Registered & certified by Sri Lankan authorities",
  },
  {
    id: 2,
    icon: "👨‍🏫",
    title: "Experienced Instructors",
    description: "Professional & patient driving instructors",
  },
  {
    id: 3,
    icon: "🚗",
    title: "Dual-Control Vehicles",
    description: "Modern, well-maintained dual-control cars",
  },
  {
    id: 4,
    icon: "⏰",
    title: "Flexible Scheduling",
    description: "Learn at your own pace and convenience",
  },
];

export const moreThanDrivingItems = [
  {
    number: "01",
    title: "Learn The Correct Driving Dynamics",
    description: "Master fundamental driving techniques and vehicle control",
  },
  {
    number: "02",
    title: "Practise In Real-World Environments",
    description: "Train in actual traffic conditions and diverse road scenarios",
  },
  {
    number: "03",
    title: "Build Active Traffic Confidence",
    description: "Develop confidence handling challenging driving situations",
  },
  {
    number: "04",
    title: "Drive Independently",
    description: "Master all skills needed for independent, safe driving",
  },
];

export const whyChooseRiyonaCards = [
  {
    number: "01",
    title: "Government Approved & Certified",
    description: "Licensed and recognized by Sri Lankan transport authorities",
    icon: "🏛️",
  },
  {
    number: "02",
    title: "Patient, Highly Qualified Instructors",
    description: "Experienced professionals dedicated to your success",
    icon: "👨‍🏫",
  },
  {
    number: "03",
    title: "Modern Dual-Control Fleet",
    description: "Well-maintained vehicles with latest safety features",
    icon: "🚗",
  },
  {
    number: "04",
    title: "Dedicated Practical Training Yard",
    description: "Secure, well-equipped training facility for basic skills",
    icon: "🏗️",
  },
  {
    number: "05",
    title: "Full Transport on DMT Exam Day",
    description: "We provide transportation to your practical exam",
    icon: "🚐",
  },
  {
    number: "06",
    title: "Flexible Installment Payment Schemes",
    description: "Convenient payment plans to suit your budget",
    icon: "💰",
  },
];

export const vehicleCategories = [
  {
    id: "car",
    title: "Car Lessons",
    subtitle: "Auto & Manual",
    description:
      "Comprehensive driving lessons in automatic and manual transmission cars. Perfect for beginners and experienced drivers alike.",
    features: [
      "Basic vehicle controls and handling",
      "Manual and automatic transmission training",
      "Road positioning and lane discipline",
      "Emergency braking techniques",
      "Night driving practice",
    ],
    image: "/images/car-lessons.jpg",
    cta: "Book Car Lessons",
  },
  {
    id: "van",
    title: "Van Lessons",
    subtitle: "Commercial Vehicle Training",
    description:
      "Specialized training for commercial van driving. Learn how to handle larger vehicles safely and professionally.",
    features: [
      "Large vehicle handling",
      "Heavy steering and braking techniques",
      "Mirror and blind spot awareness",
      "Commercial road regulations",
      "Safety regulations for cargo transport",
    ],
    image: "/images/van-lessons.jpg",
    cta: "Book Van Lessons",
  },
  {
    id: "motorbike",
    title: "Motorbike Lessons",
    subtitle: "Two-Wheeler Mastery",
    description:
      "Professional motorbike training for safe and confident two-wheeler riding. Suitable for all experience levels.",
    features: [
      "Balance and bike control techniques",
      "Gear shifting and throttle control",
      "Braking and cornering skills",
      "Traffic navigation on two wheels",
      "Weather and road condition awareness",
    ],
    image: "/images/motorbike-lessons.jpg",
    cta: "Book Motorbike Lessons",
  },
  {
    id: "threewheeler",
    title: "Three-Wheeler Lessons",
    subtitle: "Auto-Rickshaw Training",
    description:
      "Specialized training for three-wheeler operation. Learn professional driving for commercial use.",
    features: [
      "Three-wheeler vehicle dynamics",
      "Passenger safety procedures",
      "Route planning and navigation",
      "Vehicle maintenance basics",
      "Commercial driving regulations",
    ],
    image: "/images/threewheeler-lessons.jpg",
    cta: "Book Three-Wheeler Lessons",
  },
];

export const packages = [
  {
    id: "starter",
    name: "Starter Package",
    price: "Rs. 8,500",
    description: "Perfect for absolute beginners",
    features: [
      "5 practical driving lessons",
      "Basic vehicle control training",
      "Yard practice included",
      "Theory materials",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    id: "standard",
    name: "Standard Package",
    price: "Rs. 15,000",
    description: "Most popular choice",
    features: [
      "10 practical driving lessons",
      "Road experience training",
      "DMT exam preparation",
      "Personalized learning plan",
      "Emergency handling techniques",
    ],
    cta: "Select Plan",
    popular: true,
  },
  {
    id: "complete",
    name: "Complete Package",
    price: "Rs. 22,500",
    description: "Comprehensive learning program",
    features: [
      "15 practical driving lessons",
      "Intensive road training",
      "Advanced techniques",
      "DMT exam day transport",
      "Post-exam follow-up support",
      "Flexible scheduling",
    ],
    cta: "Choose Complete",
    popular: false,
  },
];

export const learningResources = [
  {
    id: "exams",
    title: "Online Exam Papers & Theory Practice",
    description: "Access comprehensive exam papers and theory materials to prepare for your DMT written exam.",
    icon: "📚",
    featured: true,
    image: "/images/exam-papers.jpg" as const,
  },
  {
    id: "portal",
    title: "Student Portal",
    description: "Manage your bookings, track progress, and access course materials in one place.",
    icon: "📱",
    featured: false,
  },
  {
    id: "videos",
    title: "Video Tutorials & Theory",
    description: "Learn from professional video tutorials covering all aspects of safe driving.",
    icon: "🎥",
    featured: false,
  },
  {
    id: "signs",
    title: "Driving Signs & Road Rules",
    description: "Master all road signs and traffic regulations required for safe driving in Sri Lanka.",
    icon: "🛑",
    featured: false,
  },
] as const;

export const licenceSteps = [
  {
    number: "01",
    title: "NTMI Medical Fitness",
    description: "Complete your medical examination to ensure fitness for driving",
  },
  {
    number: "02",
    title: "DMT Written Exam",
    description: "Pass the theoretical knowledge test on traffic rules and road safety",
  },
  {
    number: "03",
    title: "3-Month Training",
    description: "Complete your practical driving lessons over three months",
  },
  {
    number: "04",
    title: "DMT Werahera Trial",
    description: "Pass your final practical driving test at the DMT examination center",
  },
];

export const roadSafetyPrinciples = [
  {
    icon: "👀",
    title: "Road Awareness",
    description: "Stay alert and aware of your surroundings at all times",
  },
  {
    icon: "🛡️",
    title: "Defensive Driving",
    description: "Anticipate hazards and drive defensively to avoid accidents",
  },
  {
    icon: "🎮",
    title: "Vehicle Handling",
    description: "Master your vehicle's controls and dynamics",
  },
  {
    icon: "⚖️",
    title: "Responsible Driving",
    description: "Follow rules and drive with consideration for others",
  },
];

export const testimonials = [
  {
    rating: 5,
    quote: "Riyona Academy provided excellent training. The instructors were patient and professional. I passed my DMT exam on the first attempt!",
    name: "Anura Perera",
    category: "DMT Pass - Car",
  },
  {
    rating: 5,
    quote: "Best driving school in Colombo! The instructors are experienced and the lessons are well-structured. Highly recommended.",
    name: "Priya Silva",
    category: "DMT Pass - Car",
  },
  {
    rating: 5,
    quote: "Professional service, quality training, and flexible scheduling. Riyona Academy helped me achieve my driving license with confidence.",
    name: "Rajesh Kumar",
    category: "DMT Pass - Van",
  },
];

export const faqs = [
  {
    question: "How much do lessons cost?",
    answer:
      "We offer flexible packages starting from Rs. 8,500 for the Starter Package. Our Standard Package (Rs. 15,000) is the most popular option with 10 lessons included. See our pricing section for details.",
  },
  {
    question: "Can I learn automatic or manual transmission?",
    answer:
      "Yes! We offer training for both automatic and manual transmission vehicles. You can choose based on your preference and the vehicle you plan to use.",
  },
  {
    question: "What documents do I need to start learning?",
    answer:
      "You'll need a valid ID, medical fitness certificate from NTMI, and proof of payment. Our team will guide you through the process when you book your first lesson.",
  },
  {
    question: "What should I do after the DMT exam?",
    answer:
      "After passing your DMT exam, you can visit the Transport Board office to collect your driving license. We provide guidance and support throughout this final step.",
  },
  {
    question: "How do I book a lesson?",
    answer:
      "You can book through our website, call us directly, or message us on WhatsApp. We'll confirm your preferred time and instructor. Flexible scheduling is available to suit your needs.",
  },
];
