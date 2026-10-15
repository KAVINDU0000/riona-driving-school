// Display labels for vehicle enums. Client-safe: no database imports.

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  CAR: "Car",
  VAN: "Van",
  MOTORCYCLE: "Motorcycle",
  THREE_WHEELER: "Three-wheeler",
};

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Under maintenance",
  INACTIVE: "Inactive (retired)",
};

export const TRANSMISSION_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
  NOT_APPLICABLE: "Not applicable",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATED: "Vehicle added",
  UPDATED: "Details changed",
  STATUS_CHANGED: "Status changed",
};

/** Tailwind classes for a status badge. Active is green, maintenance amber, inactive grey. */
export const VEHICLE_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-success-soft text-success",
  MAINTENANCE: "bg-gold-soft text-gold-ink",
  INACTIVE: "bg-page text-muted ring-1 ring-line",
};

/** Shown whenever no activation rule is in force. It must never read as a confirmation that the vehicle is eligible. */
export const NO_RULES_IN_FORCE_NOTICE =
  "No activation rules are in force yet. Activating this vehicle is not checked against insurance or maintenance records, so this does not confirm that the vehicle is insured or roadworthy.";
