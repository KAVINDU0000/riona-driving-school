// TEST AND SEED FIXTURE ONLY. The live price list is the database (src/lib/packages/catalog.ts).
// Nothing in src/ may import this file. tests/package-source-guard.test.ts enforces that.
// Used by: the Playwright global setup, scripts/seed-packages.ts (local database only), and the tests.

export interface PackageOption {
  id: string;
  name: string;
  /** LKR. For "per-session" options this is the rate for one session, not a registration fee. */
  price: number;
  detail?: string;
  /** Omitted for fixed-fee packages. Per-session packages cannot be registered online yet. */
  pricing?: "per-session";
}

export interface PackageGroup {
  label: string;
  options: PackageOption[];
}

export const packageGroups: PackageGroup[] = [
  {
    label: "Regular training package",
    options: [{ id: "regular-car-van", name: "Car and Van Training", detail: "15 days", price: 26000 }],
  },
  {
    label: "Official driving trial preparation",
    options: [
      { id: "trial-three-wheeler", name: "Three-Wheeler Trial Preparation", price: 10000 },
      { id: "trial-motorcycle", name: "Motorcycle Trial Preparation", price: 8000 },
      { id: "trial-car", name: "Car Trial Preparation", price: 15000 },
      { id: "trial-van", name: "Van Trial Preparation", price: 15000 },
      { id: "trial-three-wheeler-motorcycle", name: "(Three-Wheeler + Motorcycle) Trial Preparation", price: 15000 },
      { id: "trial-three-wheeler-van", name: "(Van + Three-Wheeler) Trial Preparation", price: 17000 },
      { id: "trial-motorcycle-van", name: "(Van + Motorcycle) Trial Preparation", price: 16000 },
      { id: "trial-van-three-wheeler-motorcycle", name: "(Van + Three-Wheeler + Motorcycle) Trial Preparation", price: 20000 },
      { id: "trial-car-three-wheeler", name: "(Car + Three-Wheeler) Trial Preparation", price: 17000 },
      { id: "trial-car-motorcycle", name: "(Car + Motorcycle) Trial Preparation", price: 16000 },
      { id: "trial-car-three-wheeler-motorcycle", name: "(Car + Three-Wheeler + Motorcycle) Trial Preparation", price: 20000 },
    ],
  },
  {
    label: "Additional vehicle training",
    options: [
      { id: "extra-car-motorcycle", name: "Car Regular Training + Motorcycle Trial Preparation", price: 30000 },
      { id: "extra-car-three-wheeler", name: "Car Regular Training + Three-Wheeler Trial Preparation", price: 31000 },
      { id: "extra-car-three-wheeler-motorcycle", name: "Car Regular Training + Three-Wheeler and Motorcycle Trial Preparation", price: 35000 },
      { id: "extra-van-motorcycle", name: "Van Regular Training + Motorcycle Trial Preparation", price: 30000 },
      { id: "extra-van-three-wheeler", name: "Van Regular Training + Three-Wheeler Trial Preparation", price: 31000 },
      { id: "extra-van-three-wheeler-motorcycle", name: "Van Regular Training + Three-Wheeler and Motorcycle Trial Preparation", price: 35000 },
    ],
  },
  {
    label: "Daily individual training",
    options: [
      { id: "daily-car", name: "Car Daily Training", detail: "per 30-minute session", price: 2000, pricing: "per-session" },
      { id: "daily-van", name: "Van Daily Training", detail: "per 30-minute session", price: 2000, pricing: "per-session" },
      { id: "daily-motorcycle", name: "Motorcycle Daily Training", detail: "per 60-minute session", price: 1000, pricing: "per-session" },
      { id: "daily-three-wheeler", name: "Three-Wheeler Daily Training", detail: "per 60-minute session", price: 1500, pricing: "per-session" },
    ],
  },
];
