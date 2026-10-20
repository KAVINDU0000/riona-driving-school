import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminFrame from "@/components/admin/AdminFrame";
import { DocumentRemove, DocumentUpload, ReminderAcknowledge, ReminderGenerate, type RecordOption } from "@/components/admin/maintenance/MaintenanceActions";
import RecordForms from "@/components/admin/maintenance/RecordForms";
import { AuthError } from "@/lib/auth/http";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getMaintenanceHistory, getMaintenanceOverview } from "@/lib/vehicles/maintenance-data";
import { todayInSchool } from "@/lib/vehicles/maintenance-http";
import { isMaintenanceSchemaMissing } from "@/lib/vehicles/maintenance-schema";
import {
  CHECKLIST_ITEM_LABELS,
  CHECKLIST_RESULT_LABELS,
  DOCUMENT_KIND_LABELS,
  FAULT_SEVERITY_LABELS,
  INSURANCE_LABELS,
  REMINDER_CATEGORY_LABELS,
  REMINDER_STATUS_LABELS,
  REPAIR_STATUS_LABELS,
  REVENUE_LABELS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_STATE_LABELS,
  VET_LABELS,
  provisionalThresholdsText,
  vetDateLabel,
  vetResultLabel,
} from "@/lib/vehicles/maintenance-labels";
import { maintenanceStorageDir } from "@/lib/vehicles/document-storage";

export const metadata: Metadata = {
  title: "Vehicle maintenance | Admin Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

const CARD = "glass rounded-[22px] p-5";
const HEADING = "text-[1.125rem] font-bold text-ink";
const TONE: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warn: "bg-amber-50 text-amber-800 ring-amber-200",
  bad: "bg-red-50 text-red-700 ring-red-200",
  neutral: "bg-page text-ink ring-line",
};

function Badge({ tone, children }: { tone: keyof typeof TONE; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ring-1 ${TONE[tone]}`}>{children}</span>;
}

const insuranceTone = (state: string) => (state === "ACTIVE" ? "ok" : state === "EXPIRING_SOON" ? "warn" : state === "NOT_YET_STARTED" ? "neutral" : "bad");
const vetTone = (state: string) =>
  state === "VALID" || state === "NOT_APPLICABLE" || state === "EXCEPTION_DOCUMENTED"
    ? "ok"
    : state === "DUE_SOON"
      ? "warn"
      : state === "NOT_RECORDED"
        ? "neutral"
        : "bad";
const serviceTone = (state: string) => (state === "SCHEDULED" ? "ok" : state === "DUE_SOON" ? "warn" : state === "NOT_SET" ? "neutral" : "bad");

/**
 * Shown when this database does not have the vehicle maintenance tables yet. It names the cause in plain words and changes
 * nothing. No database detail is shown.
 */
function MaintenanceNotSetUp() {
  return (
    <AdminFrame
      title="Vehicle maintenance"
      description="Insurance, emission tests, service, faults, documents and reminders for each vehicle."
      active="/portal/admin/vehicles"
      crumbs={[{ label: "Vehicles", href: "/portal/admin/vehicles" }, { label: "Maintenance" }]}
    >
      <section role="status" aria-labelledby="not-set-up-heading" className={`${CARD} mt-6`}>
        <h2 id="not-set-up-heading" className={HEADING}>
          Vehicle maintenance is not set up in this database
        </h2>
        <p className="mt-2 text-[0.9375rem] text-muted">
          The vehicle maintenance tables have not been added to the database this site uses. Nothing was changed. Ask the person who
          manages the school database to apply the vehicle maintenance migration, then reload this page.
        </p>
        <Link href="/portal/admin/vehicles" className="mt-4 inline-block text-[0.875rem] font-semibold text-gold-ink underline underline-offset-2">
          Back to vehicles
        </Link>
      </section>
    </AdminFrame>
  );
}

function storageReady(): boolean {
  try {
    maintenanceStorageDir();
    return true;
  } catch {
    return false;
  }
}

/** Administrator page for one vehicle's maintenance. Every value is computed on the server for today's school date. */
export default async function VehicleMaintenancePage({ params }: { params: Promise<{ vehicleId: string }> }) {
  await requirePortalUser("ADMIN");
  const { vehicleId } = await params;
  const today = todayInSchool();

  let overview: Awaited<ReturnType<typeof getMaintenanceOverview>>;
  let history: Awaited<ReturnType<typeof getMaintenanceHistory>>;
  try {
    [overview, history] = await Promise.all([getMaintenanceOverview(vehicleId, today), getMaintenanceHistory(vehicleId)]);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    if (isMaintenanceSchemaMissing(error)) return <MaintenanceNotSetUp />;
    throw error;
  }

  const base = `/api/admin/vehicles/${vehicleId}/maintenance`;
  const ready = storageReady();
  const reg = overview.vehicle.registrationNumber;

  const currentPolicies = history.policies.filter((p) => !p.superseded);
  const currentLicences = history.licences.filter((l) => !l.superseded);
  const openFaults = history.faults.filter((f) => f.status !== "COMPLETED" && f.status !== "CANCELLED");
  const faultOptions = history.faults.map((f) => ({ value: f.id, label: `${f.description.slice(0, 60)} (${f.reportedOn})` }));
  const recordOptions: RecordOption[] = [
    ...currentPolicies.map((p) => ({ value: `insurancePolicyId:${p.id}`, label: `Insurance ${p.policyNumber} (${p.startsOn} to ${p.expiresOn})` })),
    ...history.tests.map((t) => ({ value: `emissionTestId:${t.id}`, label: `Emission test ${t.testedOn}` })),
    ...currentLicences.map((l) => ({ value: `revenueLicenceId:${l.id}`, label: `Revenue licence ${l.licenceNumber ?? "(no number)"} due ${l.dueOn}` })),
    ...history.services.map((s) => ({ value: `serviceRecordId:${s.id}`, label: `${SERVICE_CATEGORY_LABELS[s.category]} ${s.serviceDate}` })),
    ...history.faults.map((f) => ({ value: `faultId:${f.id}`, label: `Fault ${f.reportedOn}: ${f.description.slice(0, 40)}` })),
  ];

  return (
    <AdminFrame
      title={`Maintenance: ${reg}`}
      description="Insurance, emission test, Revenue Licence, service, faults, private documents and in-app reminders for this vehicle."
      active="/portal/admin/vehicles"
      crumbs={[{ label: "Vehicles", href: "/portal/admin/vehicles" }, { label: reg, href: `/portal/admin/vehicles/${vehicleId}` }, { label: "Maintenance" }]}
    >
      <section aria-labelledby="overview-heading" className={CARD}>
        <h2 id="overview-heading" className={HEADING}>
          Overview
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted">Status for {today} (school time). Warnings are for administrators and do not change the vehicle status.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Insurance</p>
            <p className="mt-2">
              <Badge tone={insuranceTone(overview.insurance.state)}>{INSURANCE_LABELS[overview.insurance.state]}</Badge>
            </p>
            <p className="mt-2 text-[0.8125rem] text-muted">{overview.insurance.policy ? `Ends ${overview.insurance.policy.expiresOn}` : "No period on record."}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Emission test</p>
            <p className="mt-2 flex flex-wrap gap-2">
              <Badge tone={vetTone(overview.vet.state)}>{VET_LABELS[overview.vet.state]}</Badge>
            </p>
            <p className="mt-2 text-[0.8125rem] text-ink">{vetResultLabel(overview.vet.result)}</p>
            <p className="text-[0.8125rem] text-muted">{vetDateLabel(overview.vet)}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Revenue licence</p>
            <p className="mt-2">
              <Badge tone={overview.revenue.state === "ACTIVE" ? "ok" : overview.revenue.state === "DUE_SOON" ? "warn" : overview.revenue.state === "OVERDUE" ? "bad" : "neutral"}>
                {REVENUE_LABELS[overview.revenue.state]}
              </Badge>
            </p>
            <p className="mt-2 text-[0.8125rem] text-muted">{overview.revenue.dueOn ? `Due ${overview.revenue.dueOn}` : "No due date recorded."}</p>
            <p className="mt-1 text-[0.75rem] text-muted">Application record only. Not verified with any authority.</p>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Service</p>
            <p className="mt-2">
              <Badge tone={serviceTone(overview.service.state)}>{SERVICE_STATE_LABELS[overview.service.state]}</Badge>
            </p>
            <p className="mt-2 text-[0.8125rem] text-muted">
              Current odometer: {overview.service.current === null ? "not known" : `${overview.service.current.toLocaleString()} km`}
            </p>
            <p className="text-[0.8125rem] text-muted">
              Next: {overview.service.nextServiceDate ?? "no date"}
              {overview.service.nextServiceOdometerKm !== null ? `, ${overview.service.nextServiceOdometerKm.toLocaleString()} km` : ""}
            </p>
            <p className="mt-1 text-[0.75rem] text-muted">
              {provisionalThresholdsText(overview.service.thresholds.dueSoonDays, overview.service.thresholds.dueSoonKm)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Lesson booking</p>
            <p className="mt-2 text-[0.9375rem] text-ink">
              {overview.lessonAvailability.available
                ? "Offered for lessons (status: active)."
                : `Not offered for lessons (status: ${overview.vehicle.status.replace(/_/g, " ").toLowerCase()}).`}
            </p>
            <p className="mt-1 text-[0.8125rem] text-muted">Booking depends on the vehicle status only. Open faults do not block booking.</p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Warnings</p>
            {overview.warnings.length === 0 ? (
              <p className="mt-2 text-[0.9375rem] text-ink">No warnings.</p>
            ) : (
              <ul className="mt-2 grid list-disc gap-1 pl-5 text-[0.9375rem] text-ink">
                {overview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="insurance-heading" className={`${CARD} mt-6`}>
        <h2 id="insurance-heading" className={HEADING}>
          Insurance periods
        </h2>
        {history.policies.length === 0 ? (
          <p className="mt-3 text-[0.9375rem] text-muted">No insurance period is recorded.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {history.policies.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-3 text-[0.875rem] text-ink ring-1 ring-line">
                <span>
                  {p.insurer}, policy {p.policyNumber}, {p.coverage}: {p.startsOn} to {p.expiresOn}, LKR {p.premium.toLocaleString()}
                </span>
                {p.superseded ? <span className="text-muted">Corrected (superseded)</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="record-forms-heading" className={`${CARD} mt-6`}>
        <h2 id="record-forms-heading" className={HEADING}>
          Add or correct records
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted">Corrections are new records that replace the old one. The history above keeps both.</p>
        <div className="mt-5">
          <RecordForms
            base={base}
            policies={currentPolicies.map((p) => ({ value: p.id, label: `${p.policyNumber} (${p.startsOn} to ${p.expiresOn})` }))}
            licences={currentLicences.map((l) => ({ value: l.id, label: `${l.licenceNumber ?? "No number"} (due ${l.dueOn})` }))}
            faults={faultOptions}
            openFaults={openFaults.map((f) => ({ value: f.id, label: `${f.description.slice(0, 60)} (${f.reportedOn})`, status: f.status }))}
            reminderSettings={overview.reminderSettings}
          />
        </div>
      </section>

      <section aria-labelledby="vet-heading" className={`${CARD} mt-6`}>
        <h2 id="vet-heading" className={HEADING}>
          Emission tests and decisions
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted">A recorded fail is shown as failed. Its dates are listed separately and are not used to hide the failure.</p>
        <ul className="mt-4 grid gap-2">
          {history.tests.length === 0 ? <li className="text-[0.9375rem] text-muted">No emission test is recorded.</li> : null}
          {history.tests.map((t) => (
            <li key={t.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-3 text-[0.875rem] text-ink ring-1 ring-line">
              <span>
                Tested {t.testedOn}: {t.result === "FAIL" ? "failed" : t.result === "PASS" ? "passed" : "result not recorded"}
                {t.certificateExpiresOn ? `, certificate expires ${t.certificateExpiresOn}` : ""}
                {t.nextDueOn ? `, next due ${t.nextDueOn}` : ""}
              </span>
              {t.superseded ? <span className="text-muted">Corrected (superseded)</span> : null}
            </li>
          ))}
          {history.decisions.map((d) => (
            <li key={d.id} className="rounded-xl bg-white p-3 text-[0.875rem] text-ink ring-1 ring-line">
              {d.category === "EMISSION_TEST" ? "Emission test" : "Revenue licence"}: {d.decision === "NOT_APPLICABLE" ? "not applicable" : "exception documented"}. Reason: {d.reason}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="licence-heading" className={`${CARD} mt-6`}>
        <h2 id="licence-heading" className={HEADING}>
          Revenue licences
        </h2>
        <ul className="mt-4 grid gap-2">
          {history.licences.length === 0 ? <li className="text-[0.9375rem] text-muted">No licence is recorded.</li> : null}
          {history.licences.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-3 text-[0.875rem] text-ink ring-1 ring-line">
              <span>
                {l.licenceNumber ?? "No number"}: issued {l.issuedOn ?? "—"}, renewed {l.renewedOn ?? "—"}, due {l.dueOn}
                {l.renewsLicenceId ? " (renewal)" : ""}
              </span>
              {l.superseded ? <span className="text-muted">Corrected (superseded)</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="service-heading" className={`${CARD} mt-6`}>
        <h2 id="service-heading" className={HEADING}>
          Service and inspection history
        </h2>
        <ul className="mt-4 grid gap-3">
          {history.services.length === 0 ? <li className="text-[0.9375rem] text-muted">No service is recorded.</li> : null}
          {history.services.map((s) => (
            <li key={s.id} className="rounded-xl bg-white p-4 text-[0.875rem] text-ink ring-1 ring-line">
              <p className="font-semibold">
                {SERVICE_CATEGORY_LABELS[s.category]}, {s.serviceDate}
                {s.odometerKm !== null ? `, ${s.odometerKm.toLocaleString()} km` : ""}, LKR {s.totalCost.toLocaleString()}
                {s.superseded ? " (corrected)" : ""}
              </p>
              {s.providerName ? <p className="text-muted">{s.providerName}</p> : null}
              <p className="mt-2 text-[0.8125rem] text-muted">
                {s.checklist.map((c) => `${CHECKLIST_ITEM_LABELS[c.item]}: ${CHECKLIST_RESULT_LABELS[c.result]}`).join(" · ")}
              </p>
              {s.nextServiceDate || s.nextServiceOdometerKm !== null ? (
                <p className="mt-1 text-[0.8125rem] text-muted">
                  Next: {s.nextServiceDate ?? "no date"}
                  {s.nextServiceOdometerKm !== null ? `, ${s.nextServiceOdometerKm.toLocaleString()} km` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fault-heading" className={`${CARD} mt-6`}>
        <h2 id="fault-heading" className={HEADING}>
          Faults and repairs
        </h2>
        <ul className="mt-4 grid gap-3">
          {history.faults.length === 0 ? <li className="text-[0.9375rem] text-muted">No fault is recorded.</li> : null}
          {history.faults.map((f) => (
            <li key={f.id} className="rounded-xl bg-white p-4 text-[0.875rem] text-ink ring-1 ring-line">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {f.description}
                {f.safetyCritical ? <Badge tone="bad">Safety-critical: administrator warning</Badge> : null}
              </p>
              <p className="mt-1 text-muted">
                Reported {f.reportedOn}{f.reportedByRole === "INSTRUCTOR" ? " by an instructor" : ""}, severity {FAULT_SEVERITY_LABELS[f.severity]}, status {REPAIR_STATUS_LABELS[f.status]}
                {f.completedOn ? `, completed ${f.completedOn}` : ""}
                {f.repairCost !== null ? `, repair cost LKR ${f.repairCost.toLocaleString()}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="documents-heading" className={`${CARD} mt-6`}>
        <h2 id="documents-heading" className={HEADING}>
          Private documents
        </h2>
        {ready ? (
          <p className="mt-1 text-[0.8125rem] text-muted">Files are stored privately. Downloads are for administrators only, and removed files are kept for the retention period.</p>
        ) : (
          <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-[0.875rem] text-amber-900">
            Document storage is not configured, so files cannot be uploaded. Set MAINTENANCE_DOCUMENT_STORAGE_DIR to an absolute folder outside the public site, then reload this page.
          </p>
        )}
        <ul className="mt-4 grid gap-3">
          {history.documents.length === 0 ? <li className="text-[0.9375rem] text-muted">No document is stored.</li> : null}
          {history.documents.map((d) => (
            <li key={d.id} className="rounded-xl bg-white p-4 text-[0.875rem] text-ink ring-1 ring-line">
              <p className="font-semibold">
                {DOCUMENT_KIND_LABELS[d.kind]}: {d.originalFileName}
              </p>
              <p className="text-muted">
                Uploaded {d.uploadedAt.slice(0, 10)}, {(d.fileSizeBytes / 1024).toFixed(0)} KB
                {d.deleted ? `, removed ${d.deletedAt?.slice(0, 10)} (${d.retention === "REVIEW_DUE" ? "review due" : "kept"})` : ""}
              </p>
              {d.deleted ? null : (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link href={`${base}/documents/${d.id}`} className="text-[0.875rem] font-semibold text-gold-ink underline underline-offset-2">
                    Download
                  </Link>
                  <DocumentRemove base={base} documentId={d.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {ready ? (
          <div className="mt-5">
            <DocumentUpload base={base} recordOptions={recordOptions} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="reminder-heading" className={`${CARD} mt-6`}>
        <h2 id="reminder-heading" className={HEADING}>
          Reminders (in-app only)
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted">
          Reminders appear here only. No email, SMS or WhatsApp message is sent. Acknowledging a reminder records who did it and when.
        </p>
        <div className="mt-4">
          <ReminderGenerate base={base} />
        </div>
        <ul className="mt-4 grid gap-2">
          {history.reminders.length === 0 ? <li className="text-[0.9375rem] text-muted">No reminder has been created.</li> : null}
          {history.reminders.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-[0.875rem] text-ink ring-1 ring-line">
              <span>
                {REMINDER_CATEGORY_LABELS[r.category]}: due {r.dueOn}, {r.leadDays} day(s) before. {REMINDER_STATUS_LABELS[r.status]}
              </span>
              {r.status === "OPEN" ? <ReminderAcknowledge base={base} reminderId={r.id} /> : null}
            </li>
          ))}
        </ul>
      </section>
    </AdminFrame>
  );
}
