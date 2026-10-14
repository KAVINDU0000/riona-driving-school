// Training packages and prices from the school's price list.
// Three-wheeler daily training has no price yet, so it is not listed.

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
      { id: "trial-three-wheeler-van", name: "(Three-Wheeler + Van) Trial Preparation", price: 16000 },
      { id: "trial-motorcycle-van", name: "(Motorcycle + Van) Trial Preparation", price: 15000 },
      { id: "trial-van-three-wheeler-motorcycle", name: "(Van + Three-Wheeler + Motorcycle) Trial Preparation", price: 20000 },
      { id: "trial-car-three-wheeler", name: "(Car + Three-Wheeler) Trial Preparation", price: 15000 },
      { id: "trial-car-three-wheeler-motorcycle", name: "(Car + Three-Wheeler + Motorcycle) Trial Preparation", price: 20000 },
    ],
  },
  {
    label: "Additional vehicle training",
    options: [
      { id: "extra-car-motorcycle", name: "Car Trial Preparation + Motorcycle Daily Training", price: 30000 },
      { id: "extra-car-three-wheeler", name: "Car Trial Preparation + Three-Wheeler Daily Training", price: 31000 },
      { id: "extra-car-three-wheeler-motorcycle", name: "Car Trial Preparation + Three-Wheeler and Motorcycle Daily Training", price: 35000 },
      { id: "extra-van-motorcycle", name: "Van Trial Preparation + Motorcycle Daily Training", price: 30000 },
      { id: "extra-van-three-wheeler", name: "(Van + Three-Wheeler) Daily Training", price: 31000 },
      { id: "extra-van-three-wheeler-motorcycle", name: "(Van + Three-Wheeler + Motorcycle) Daily Training", price: 35000 },
    ],
  },
  {
    label: "Daily individual training (per day)",
    options: [
      { id: "daily-car", name: "Car Daily Training", price: 1500 },
      { id: "daily-van", name: "Van Daily Training", price: 750 },
      { id: "daily-motorcycle", name: "Motorcycle Daily Training", price: 500 },
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
