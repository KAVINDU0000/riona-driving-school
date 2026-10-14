// Payment details shown on the payment step.
// The bank details are placeholders: replace them with the school's real account details before launch.

export const bankDetails = [
  { label: "Bank name", value: "To be confirmed" },
  { label: "Account name", value: "To be confirmed" },
  { label: "Account number", value: "To be confirmed" },
  { label: "Branch", value: "To be confirmed" },
];

export const paymentMethods = [
  { value: "bank-transfer", label: "Bank transfer", detail: "Transfer online or from any bank" },
  { value: "bank-deposit", label: "Bank deposit", detail: "Deposit cash at a bank branch" },
] as const;

export const allowedSlipTypes = ["image/jpeg", "image/png", "application/pdf"];
export const maxSlipBytes = 5 * 1024 * 1024;
