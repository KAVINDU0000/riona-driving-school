// Training packages and prices from the school's price list.

export interface PackageOption {
  id: string;
  name: string;
  price: number;
  detail?: string;
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
      { id: "extra-car-motorcycle", name: "Car Daily Training + Motorcycle Trial Preparation", price: 30000 },
      { id: "extra-car-three-wheeler", name: "Car Daily Training + Three-Wheeler Trial Preparation", price: 31000 },
      { id: "extra-car-three-wheeler-motorcycle", name: "Car Daily Training + Three-Wheeler and Motorcycle Trial Preparation", price: 35000 },
      { id: "extra-van-motorcycle", name: "Van Daily Training + Motorcycle Trial Preparation", price: 30000 },
      { id: "extra-van-three-wheeler", name: "Van Daily Training + Three-Wheeler Trial Preparation", price: 31000 },
      { id: "extra-van-three-wheeler-motorcycle", name: "Van Daily Training + Three-Wheeler and Motorcycle Trial Preparation", price: 35000 },
    ],
  },
  {
    label: "Daily individual training",
    options: [
      { id: "daily-car", name: "Car Daily Training", detail: "per 30 minutes", price: 2000 },
      { id: "daily-van", name: "Van Daily Training", detail: "per 30 minutes", price: 2000 },
      { id: "daily-motorcycle", name: "Motorcycle Daily Training", detail: "per hour", price: 1000 },
      { id: "daily-three-wheeler", name: "Three-Wheeler Daily Training", detail: "per hour", price: 1500 },
    ],
  },
];

export const packageDiscountNote = "5% discount when the full eligible package fee is paid in cash at once.";

/** Formats a price as "LKR 26,000" without locale-dependent output, so server and browser render the same text. */
export function formatLkr(amount: number) {
  return `LKR ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** Finds a package option by id, with the name of its group. Returns undefined for unknown ids. */
export function findPackage(id: string) {
  for (const group of packageGroups) {
    const option = group.options.find((item) => item.id === id);
    if (option) return { ...option, group: group.label };
  }
  return undefined;
}
