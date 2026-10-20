"use client";

import MaintenanceForm, { type MaintenanceField } from "@/components/admin/maintenance/MaintenanceForm";

const CHECKLIST = ["ENGINE", "BRAKES", "SUSPENSION", "STEERING", "TYRES", "BATTERY", "LIGHTS", "LEAKS", "ELECTRICAL"] as const;
const CHECKLIST_LABELS: Record<(typeof CHECKLIST)[number], string> = {
  ENGINE: "Engine",
  BRAKES: "Brakes",
  SUSPENSION: "Suspension",
  STEERING: "Steering",
  TYRES: "Tyres",
  BATTERY: "Battery",
  LIGHTS: "Lights",
  LEAKS: "Leaks",
  ELECTRICAL: "Electrical",
};
const RESULT_OPTIONS = [
  ["PASS", "Pass"],
  ["ATTENTION", "Attention"],
  ["FAIL", "Fail"],
  ["NOT_CHECKED", "Not checked"],
] as const;

type Option = { value: string; label: string };
type FaultOption = Option & { status: string };

export type RecordFormsProps = {
  base: string;
  policies: Option[];
  licences: Option[];
  faults: Option[];
  openFaults: FaultOption[];
  reminderSettings: Record<string, number[]>;
};

const toOptions = (options: Option[]) => options.map((o) => [o.value, o.label] as const);

/** The record forms. Each one posts to its own API route, which validates everything and writes the audit record. */
export default function RecordForms({ base, policies, licences, faults, openFaults, reminderSettings }: RecordFormsProps) {
  const insuranceFields: MaintenanceField[] = [
    { name: "insurer", label: "Insurer", type: "text", required: true },
    { name: "policyNumber", label: "Policy number", type: "text", required: true },
    { name: "coverage", label: "Coverage type", type: "text", required: true },
    { name: "coverageDetails", label: "Coverage details", type: "text" },
    { name: "startsOn", label: "Start date", type: "date", required: true },
    { name: "expiresOn", label: "Expiry date", type: "date", required: true },
    { name: "premium", label: "Premium (LKR)", type: "number", required: true },
    { name: "renewsPolicyId", label: "Renews policy", type: "select", options: toOptions(policies), help: "Choose the period this one replaces." },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const vetFields: MaintenanceField[] = [
    { name: "testedOn", label: "Test date", type: "date", required: true },
    {
      name: "result",
      label: "Test result",
      type: "select",
      options: [
        ["PASS", "Pass"],
        ["FAIL", "Fail"],
      ],
      help: "Leave blank if the result is not recorded. A recorded fail is shown as failed whatever the dates say.",
    },
    { name: "issuedOn", label: "Certificate issue date", type: "date" },
    { name: "certificateExpiresOn", label: "Certificate expiry date", type: "date" },
    { name: "nextDueOn", label: "Next due date", type: "date" },
    { name: "certificateNumber", label: "Certificate number", type: "text" },
    { name: "testingCentre", label: "Testing centre", type: "text" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const decisionFields: MaintenanceField[] = [
    {
      name: "category",
      label: "Applies to",
      type: "select",
      required: true,
      options: [
        ["EMISSION_TEST", "Emission test"],
        ["REVENUE_LICENCE", "Revenue licence"],
      ],
    },
    {
      name: "decision",
      label: "Decision",
      type: "select",
      required: true,
      options: [
        ["NOT_APPLICABLE", "Not applicable"],
        ["EXCEPTION_DOCUMENTED", "Exception documented"],
      ],
    },
    { name: "reason", label: "Reason", type: "textarea", required: true, help: "Required, up to 1000 characters." },
  ];

  const revenueFields: MaintenanceField[] = [
    { name: "licenceNumber", label: "Licence number", type: "text" },
    { name: "issuedOn", label: "Issue date", type: "date" },
    { name: "dueOn", label: "Due date", type: "date", required: true, help: "Entered by the administrator. No renewal period is assumed." },
    { name: "renewsLicenceId", label: "Renews licence", type: "select", options: toOptions(licences) },
    { name: "renewedOn", label: "Renewal date", type: "date", help: "Required for a renewal. Prerequisites are checked on this date." },
    {
      name: "confirmRenewalWarnings",
      label: "I have reviewed the insurance and emission-test warnings for this renewal",
      type: "checkbox",
      help: "Only needed when a prerequisite is not valid on the renewal date. This is not a legal check of the licence.",
    },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const serviceFields: MaintenanceField[] = [
    {
      name: "category",
      label: "Type",
      type: "select",
      required: true,
      options: [
        ["ROUTINE_SERVICE", "Routine service"],
        ["MECHANICAL_INSPECTION", "Mechanical inspection"],
        ["CORRECTIVE_SERVICE", "Corrective service"],
      ],
    },
    { name: "serviceDate", label: "Service date", type: "date", required: true },
    { name: "odometerKm", label: "Odometer reading (km)", type: "number" },
    { name: "providerName", label: "Provider", type: "text" },
    { name: "partsCost", label: "Parts cost (LKR)", type: "number" },
    { name: "labourCost", label: "Labour cost (LKR)", type: "number", help: "The total is calculated from parts and labour." },
    { name: "nextServiceDate", label: "Next service date", type: "date" },
    { name: "nextServiceOdometerKm", label: "Next service odometer (km)", type: "number" },
    { name: "faultId", label: "Linked fault", type: "select", options: toOptions(faults), help: "Only for a corrective service, and only for a fault on this vehicle." },
    { name: "odometerExplanation", label: "Explanation if the reading is lower than before", type: "textarea" },
    { name: "workPerformed", label: "Work performed", type: "textarea" },
    { name: "notes", label: "Notes", type: "textarea" },
    ...CHECKLIST.map((item) => ({
      name: `checklist.${item}`,
      label: `Checklist: ${CHECKLIST_LABELS[item]}`,
      type: "select" as const,
      options: RESULT_OPTIONS,
      help: item === "ENGINE" ? "Items left as Not checked are recorded as not checked, never as a pass." : undefined,
    })),
  ];

  const faultFields: MaintenanceField[] = [
    {
      name: "severity",
      label: "Severity",
      type: "select",
      required: true,
      options: [
        ["LOW", "Low"],
        ["MEDIUM", "Medium"],
        ["HIGH", "High"],
        ["CRITICAL", "Critical"],
      ],
    },
    { name: "description", label: "What is wrong", type: "textarea", required: true },
    { name: "reportedOn", label: "Reported on", type: "date", required: true },
    { name: "workshop", label: "Workshop", type: "text" },
    { name: "repairCost", label: "Repair cost (LKR)", type: "number" },
    {
      name: "makesUnavailable",
      label: "This fault makes the vehicle unavailable",
      type: "checkbox",
      help: "A critical or unavailable fault shows an administrator warning. It does not block booking, and it does not change the vehicle's status.",
    },
  ];

  const reminderFields = (category: string): MaintenanceField[] => [
    { name: "leadDays", label: "Days before due date (comma separated)", type: "text", required: true, help: `Now: ${(reminderSettings[category] ?? []).join(", ")}. Up to 5 values, 1 to 365.` },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <MaintenanceForm title="Insurance period" description="Record a period. A renewal must start after the period it replaces." endpoint={`${base}/insurance`} fields={insuranceFields} submitLabel="Save insurance" />
      <MaintenanceForm
        title="Emission test"
        description="Record a test or certificate. Dates are entered as recorded; nothing is assumed."
        endpoint={`${base}/emission-tests`}
        fields={vetFields}
        submitLabel="Save emission test"
      />
      <MaintenanceForm
        title="Not applicable or exception"
        description="For an emission test or revenue licence that does not apply, with the reason."
        endpoint={`${base}/compliance-decisions`}
        fields={decisionFields}
        submitLabel="Save decision"
      />
      <MaintenanceForm
        title="Revenue licence"
        description="Record a licence period, or a renewal of one. Nothing here verifies the licence with any authority."
        endpoint={`${base}/revenue-licences`}
        fields={revenueFields}
        submitLabel="Save licence"
      />
      <MaintenanceForm
        title="Service or inspection"
        description="Record the work, the nine-item checklist and the next due point. Costs are in LKR."
        endpoint={`${base}/service-records`}
        fields={serviceFields}
        submitLabel="Save service record"
        note="The next service due-soon warnings use 14 days and 500 km. These are provisional, pending school confirmation."
        transform={(raw, values) => {
          const payload: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(values)) if (!key.startsWith("checklist.")) payload[key] = value;
          payload.checklist = CHECKLIST.map((item) => {
            const chosen = raw[`checklist.${item}`];
            return { item, result: typeof chosen === "string" && chosen !== "" ? chosen : "NOT_CHECKED" };
          });
          return payload;
        }}
      />
      <MaintenanceForm
        title="Report a fault"
        description="Faults are recorded for the school's safety. A critical fault warns the administrator and does not block booking."
        endpoint={`${base}/faults`}
        fields={faultFields}
        submitLabel="Report fault"
      />

      <div className="grid gap-5 lg:col-span-2">
        <h3 className="text-[1rem] font-bold text-ink">Update a repair</h3>
        {openFaults.length === 0 ? (
          <p className="text-[0.875rem] text-muted">No open repairs.</p>
        ) : (
          openFaults.map((fault) => (
            <MaintenanceForm
              key={fault.value}
              title={fault.label}
              description={`Current status: ${fault.status.replace(/_/g, " ").toLowerCase()}.`}
              endpoint={`${base}/faults/${fault.value}`}
              method="PATCH"
              submitLabel="Update repair"
              fields={[
                {
                  name: "status",
                  label: "New status",
                  type: "select",
                  required: true,
                  options: [
                    ["DIAGNOSED", "Diagnosed"],
                    ["IN_REPAIR", "In repair"],
                    ["COMPLETED", "Completed"],
                    ["CANCELLED", "Cancelled"],
                  ],
                },
                { name: "completedOn", label: "Completion date", type: "date", help: "Required only when completed." },
                { name: "diagnosis", label: "Diagnosis", type: "textarea" },
                { name: "workPerformed", label: "Work performed", type: "textarea" },
                { name: "repairCost", label: "Repair cost (LKR)", type: "number" },
                { name: "note", label: "Note for the repair history", type: "textarea" },
              ]}
            />
          ))
        )}
      </div>

      <div className="grid gap-5 lg:col-span-2">
        <h3 className="text-[1rem] font-bold text-ink">Reminder lead times</h3>
        {(["INSURANCE", "EMISSION_TEST", "REVENUE_LICENCE", "SERVICE"] as const).map((category) => (
          <MaintenanceForm
            key={category}
            title={`${category.replace(/_/g, " ").toLowerCase()} reminders`}
            description="Reminders are in-app only. Changing these applies to every vehicle."
            endpoint={`${base}/reminder-settings`}
            method="PUT"
            submitLabel="Save lead times"
            fields={reminderFields(category)}
            transform={(raw) => ({
              category,
              leadDays: String(raw.leadDays ?? "")
                .split(",")
                .map((value) => value.trim())
                .filter((value) => value !== "")
                .map(Number),
            })}
          />
        ))}
      </div>
    </div>
  );
}
