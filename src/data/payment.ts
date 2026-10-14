// Payment options and slip rules for the payment step.

export const paymentMethods = [
  { value: "bank-transfer", label: "Online transfer", detail: "Transfer online or from any bank" },
  { value: "bank-deposit", label: "Bank deposit", detail: "Deposit cash at a bank branch" },
] as const;

export const allowedSlipTypes = ["image/jpeg", "image/png", "application/pdf"];
export const maxSlipBytes = 5 * 1024 * 1024;
