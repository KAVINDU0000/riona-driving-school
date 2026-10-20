/**
 * Server-side vehicle maintenance: reads, writes, audit and documents. Every write runs in one transaction that locks the vehicle
 * row first, so overlapping insurance periods, supersessions and reminder generation are serialised per vehicle. Every write
 * also writes a VehicleMaintenanceAuditLog row in the same transaction. Routes check the administrator role before calling
 * these functions; the actor id passed in is always the authenticated user, never a value from the request body.
 *
 * Business rules live in the pure modules (maintenance-rules, compliance-rules, record-validation); this file applies them.
 */
import type { Prisma } from "@/generated/prisma/client";
import {
  ChecklistItem,
  ChecklistResult,
  ComplianceCategory,
  ComplianceDecisionKind,
  EmissionTestResult,
  FaultSeverity,
  MaintenanceDocumentKind,
  RepairStatus,
  ReminderCategory,
  ReminderStatus,
  ServiceCategory,
} from "@/generated/prisma/enums";
import { AuthError } from "@/lib/auth/http";
import { prisma } from "@/lib/prisma";
import { detectSlipType, safeDisplayName, MAX_SLIP_BYTES } from "@/lib/student/payment-slips";
import {
  DEFAULT_MAINTENANCE_SETTINGS,
  DEFAULT_REMINDER_LEAD_DAYS,
  canLinkServiceToFault,
  checkOdometerReading,
  currentOdometerKm,
  latestNextService,
  renewalPrerequisites,
  requireRenewalConfirmation,
  reminderOpenOn,
  revenueStatus,
  vetStatus,
  type MaintenanceSettings,
} from "@/lib/vehicles/compliance-rules";
import {
  canMoveRepair,
  checkDocumentMeta,
  checkPolicyPeriod,
  checkRepairDates,
  insuranceStatus,
  isSafetyCriticalOpenFault,
  maintenanceWarnings,
  openFaultWarnings,
  retentionState,
  serviceState,
  vehicleAvailability,
  type FaultLite,
  type PolicyPeriod,
  type RepairStatusValue,
} from "@/lib/vehicles/maintenance-rules";
import type {
  ComplianceDecisionInput,
  FaultInput,
  FaultUpdateInput,
  InsuranceInput,
  RevenueLicenceInput,
  ServiceInput,
  VetTestInput,
} from "@/lib/vehicles/maintenance-input";
import { maintenanceStorageDir, readMaintenanceFile, removeMaintenanceFile, sha256Hex, storeMaintenanceFile } from "@/lib/vehicles/document-storage";

type Tx = Prisma.TransactionClient;
const REMINDER_CATEGORY_LIST = ["INSURANCE", "EMISSION_TEST", "REVENUE_LICENCE", "SERVICE"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A stored DATE as "YYYY-MM-DD". Prisma returns @db.Date values at UTC midnight. */
export function dateString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** Locks the vehicle row for the rest of the transaction, and refuses an unknown vehicle. */
async function lockVehicle(tx: Tx, vehicleId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Vehicle" WHERE id = ${vehicleId} FOR UPDATE`;
  if (rows.length === 0) throw new AuthError(404, "That vehicle was not found.");
}

async function audit(
  tx: Tx,
  input: {
    vehicleId: string;
    entityType: string;
    entityId: string;
    action: string;
    actorUserId: string;
    reason?: string | null;
    summary?: Prisma.InputJsonValue;
  },
) {
  await tx.vehicleMaintenanceAuditLog.create({
    data: {
      vehicleId: input.vehicleId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorUserId: input.actorUserId,
      reason: input.reason ?? null,
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
    },
  });
}

/** Rows that another row has superseded (corrected). Superseded rows never count as current. */
function supersededIds(rows: { supersedesId: string | null }[]): Set<string> {
  return new Set(rows.map((row) => row.supersedesId).filter((id): id is string => id !== null));
}

async function loadAll(tx: Tx, vehicleId: string) {
  const [policies, decisions, tests, licences, services, faults, documents, reminders] = await Promise.all([
    tx.vehicleInsurancePolicy.findMany({ where: { vehicleId }, orderBy: { startsOn: "asc" } }),
    tx.vehicleComplianceDecision.findMany({ where: { vehicleId }, orderBy: { decidedAt: "desc" } }),
    tx.vehicleEmissionTest.findMany({ where: { vehicleId }, orderBy: [{ testedOn: "desc" }, { recordedAt: "desc" }] }),
    tx.vehicleRevenueLicence.findMany({ where: { vehicleId }, orderBy: { recordedAt: "desc" } }),
    tx.vehicleServiceRecord.findMany({ where: { vehicleId }, include: { checklistItems: true }, orderBy: { serviceDate: "desc" } }),
    tx.vehicleFault.findMany({ where: { vehicleId }, include: { reportedBy: { select: { role: true } } }, orderBy: { reportedAt: "desc" } }),
    tx.vehicleMaintenanceDocument.findMany({ where: { vehicleId }, orderBy: { uploadedAt: "desc" } }),
    tx.vehicleMaintenanceReminder.findMany({ where: { vehicleId }, orderBy: [{ status: "asc" }, { dueOn: "asc" }] }),
  ]);
  return { policies, decisions, tests, licences, services, faults, documents, reminders };
}

type Loaded = Awaited<ReturnType<typeof loadAll>>;

function currentPolicies(loaded: Loaded): PolicyPeriod[] {
  const superseded = supersededIds(loaded.policies);
  return loaded.policies
    .filter((p) => !superseded.has(p.id))
    .map((p) => ({ id: p.id, startsOn: dateString(p.startsOn)!, expiresOn: dateString(p.expiresOn)!, renewsPolicyId: p.renewsPolicyId }));
}

function latestDecision(loaded: Loaded, category: ComplianceCategory) {
  return loaded.decisions.find((d) => d.category === category) ?? null;
}

function currentTests(loaded: Loaded) {
  const superseded = supersededIds(loaded.tests);
  return loaded.tests.filter((t) => !superseded.has(t.id));
}

function currentLicences(loaded: Loaded) {
  const superseded = supersededIds(loaded.licences);
  return loaded.licences.filter((l) => !superseded.has(l.id));
}

function currentServices(loaded: Loaded) {
  const superseded = supersededIds(loaded.services);
  return loaded.services.filter((s) => !superseded.has(s.id));
}

function serviceRecordsForRules(records: ReturnType<typeof currentServices>) {
  return records.map((r) => ({
    serviceDate: dateString(r.serviceDate)!,
    odometerKm: r.odometerKm,
    nextServiceDate: dateString(r.nextServiceDate),
    nextServiceOdometerKm: r.nextServiceOdometerKm,
    superseded: false,
  }));
}

function faultLite(fault: { status: string; severity: string; makesUnavailable: boolean }): FaultLite {
  return { status: fault.status as RepairStatusValue, severity: fault.severity as FaultLite["severity"], makesUnavailable: fault.makesUnavailable };
}

// ---------------------------------------------------------------------------
// Reminder settings
// ---------------------------------------------------------------------------

export type ReminderSettingsView = Record<ReminderCategory, number[]>;

/** The lead times per category. A category with no stored rows uses the default (30, 14 and 7 days). */
export async function getReminderSettings(db: Tx | typeof prisma = prisma): Promise<ReminderSettingsView> {
  const rows = await db.vehicleMaintenanceReminderSetting.findMany({ orderBy: { leadDays: "desc" } });
  const view = {} as ReminderSettingsView;
  for (const category of REMINDER_CATEGORY_LIST) {
    const leads = rows.filter((r) => r.category === category).map((r) => r.leadDays);
    view[category] = leads.length > 0 ? leads : [...DEFAULT_REMINDER_LEAD_DAYS];
  }
  return view;
}

/** Maintenance settings in the shape the rules use: every configured lead time, and the provisional service thresholds. */
function settingsFrom(view: ReminderSettingsView): MaintenanceSettings {
  return { ...DEFAULT_MAINTENANCE_SETTINGS, reminderLeadDays: [...new Set(Object.values(view).flat())].sort((a, b) => b - a) };
}

/**
 * Replaces the lead times of one category. The change is audited against the vehicle whose maintenance page the administrator
 * used, because the audit table needs a vehicle. The settings themselves are not per vehicle.
 */
export async function saveReminderSettings(vehicleId: string, actorUserId: string, category: ReminderCategory, leadDays: number[]) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const before = await tx.vehicleMaintenanceReminderSetting.findMany({ where: { category }, select: { leadDays: true } });
    await tx.vehicleMaintenanceReminderSetting.deleteMany({ where: { category } });
    await tx.vehicleMaintenanceReminderSetting.createMany({
      data: leadDays.map((leadDaysValue) => ({ category, leadDays: leadDaysValue, updatedByUserId: actorUserId })),
    });
    await audit(tx, {
      vehicleId,
      entityType: "REMINDER_SETTING",
      entityId: category,
      action: "UPDATED",
      actorUserId,
      summary: { category, from: before.map((b) => b.leadDays), to: leadDays },
    });
    return getReminderSettings(tx);
  });
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

/** Everything the maintenance page shows, with every status computed on the server for `today`. */
export async function getMaintenanceOverview(vehicleId: string, today: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, registrationNumber: true, vehicleType: true, status: true, make: true, model: true },
  });
  if (!vehicle) throw new AuthError(404, "That vehicle was not found.");

  const [loaded, leads] = await Promise.all([loadAll(prisma, vehicleId), getReminderSettings()]);
  const settings = settingsFrom(leads);

  const policies = currentPolicies(loaded);
  const insurance = insuranceStatus(policies, today, Math.max(...leads.INSURANCE));

  const latestTest = currentTests(loaded)[0] ?? null;
  const vet = vetStatus(
    latestDecision(loaded, ComplianceCategory.EMISSION_TEST) ? { kind: latestDecision(loaded, ComplianceCategory.EMISSION_TEST)!.decision as "NOT_APPLICABLE" | "EXCEPTION_DOCUMENTED" } : null,
    latestTest
      ? {
          testedOn: dateString(latestTest.testedOn)!,
          result: latestTest.result as "PASS" | "FAIL" | null,
          certificateExpiresOn: dateString(latestTest.certificateExpiresOn),
          nextDueOn: dateString(latestTest.nextDueOn),
        }
      : null,
    today,
    Math.max(...leads.EMISSION_TEST),
  );

  const latestLicence = currentLicences(loaded)[0] ?? null;
  const revenueDecision = latestDecision(loaded, ComplianceCategory.REVENUE_LICENCE);
  const revenue = revenueStatus(
    revenueDecision ? { kind: revenueDecision.decision as "NOT_APPLICABLE" | "EXCEPTION_DOCUMENTED" } : null,
    latestLicence ? { dueOn: dateString(latestLicence.dueOn)! } : null,
    today,
    Math.max(...leads.REVENUE_LICENCE),
  );

  const records = currentServices(loaded);
  const next = latestNextService(
    records.map((r) => ({
      serviceDate: dateString(r.serviceDate)!,
      nextServiceDate: dateString(r.nextServiceDate),
      nextServiceOdometerKm: r.nextServiceOdometerKm,
      superseded: false,
    })),
  );
  const current = currentOdometerKm(serviceRecordsForRules(records));
  const service = serviceState(next, today, current, { dueSoonDays: settings.serviceDueSoonDays, dueSoonKm: settings.serviceDueSoonKm });
  const latestService = records[0] ?? null;

  const faults = loaded.faults.map((f) => ({ ...faultLite(f), id: f.id }));
  const warnings = maintenanceWarnings({
    insurance,
    services: latestService ? [{ id: latestService.id, state: service }] : [],
    faults,
  });

  return {
    vehicle,
    today,
    insurance: { state: insurance.state, daysLeft: insurance.daysLeft, policy: insurance.policy },
    vet,
    revenue,
    service: {
      state: service,
      current: current,
      nextServiceDate: next?.nextServiceDate ?? null,
      nextServiceOdometerKm: next?.nextServiceOdometerKm ?? null,
      thresholds: { dueSoonDays: settings.serviceDueSoonDays, dueSoonKm: settings.serviceDueSoonKm, provisional: true },
    },
    lessonAvailability: vehicleAvailability(vehicle.status, warnings),
    warnings,
    faultWarnings: openFaultWarnings(faults),
    reminderSettings: leads,
    counts: {
      policies: loaded.policies.length,
      tests: loaded.tests.length,
      licences: loaded.licences.length,
      services: loaded.services.length,
      faults: loaded.faults.length,
      documents: loaded.documents.length,
      openReminders: loaded.reminders.filter((r) => r.status === ReminderStatus.OPEN).length,
    },
  };
}

/** Full history for each section. Superseded rows are included and marked, so corrections stay visible. */
export async function getMaintenanceHistory(vehicleId: string) {
  const loaded = await loadAll(prisma, vehicleId);
  const policySuperseded = supersededIds(loaded.policies);
  const testSuperseded = supersededIds(loaded.tests);
  const licenceSuperseded = supersededIds(loaded.licences);
  const serviceSuperseded = supersededIds(loaded.services);
  return {
    policies: loaded.policies.map((p) => ({
      id: p.id,
      insurer: p.insurer,
      policyNumber: p.policyNumber,
      coverage: p.coverage,
      startsOn: dateString(p.startsOn),
      expiresOn: dateString(p.expiresOn),
      premium: Number(p.premium),
      renewsPolicyId: p.renewsPolicyId,
      superseded: policySuperseded.has(p.id),
    })),
    decisions: loaded.decisions.map((d) => ({ id: d.id, category: d.category, decision: d.decision, reason: d.reason, decidedAt: d.decidedAt.toISOString() })),
    tests: loaded.tests.map((t) => ({
      id: t.id,
      testedOn: dateString(t.testedOn),
      result: t.result,
      certificateNumber: t.certificateNumber,
      issuedOn: dateString(t.issuedOn),
      certificateExpiresOn: dateString(t.certificateExpiresOn),
      nextDueOn: dateString(t.nextDueOn),
      testingCentre: t.testingCentre,
      superseded: testSuperseded.has(t.id),
    })),
    licences: loaded.licences.map((l) => ({
      id: l.id,
      licenceNumber: l.licenceNumber,
      issuedOn: dateString(l.issuedOn),
      renewedOn: dateString(l.renewedOn),
      dueOn: dateString(l.dueOn),
      renewsLicenceId: l.renewsLicenceId,
      superseded: licenceSuperseded.has(l.id),
    })),
    services: loaded.services.map((s) => ({
      id: s.id,
      category: s.category,
      serviceDate: dateString(s.serviceDate),
      odometerKm: s.odometerKm,
      providerName: s.providerName,
      totalCost: Number(s.totalCost),
      nextServiceDate: dateString(s.nextServiceDate),
      nextServiceOdometerKm: s.nextServiceOdometerKm,
      faultId: s.faultId,
      checklist: [...s.checklistItems].sort((a, b) => a.item.localeCompare(b.item)).map((c) => ({ item: c.item, result: c.result, note: c.note })),
      superseded: serviceSuperseded.has(s.id),
    })),
    faults: loaded.faults.map((f) => ({
      id: f.id,
      severity: f.severity,
      description: f.description,
      makesUnavailable: f.makesUnavailable,
      status: f.status,
      reportedOn: f.reportedAt.toISOString().slice(0, 10),
      // The role only, never the reporter's name or ID.
      reportedByRole: f.reportedBy.role,
      completedOn: f.completedAt ? f.completedAt.toISOString().slice(0, 10) : null,
      repairCost: f.repairCost === null ? null : Number(f.repairCost),
      safetyCritical: isSafetyCriticalOpenFault(faultLite(f)),
    })),
    documents: loaded.documents.map((d) => ({
      id: d.id,
      kind: d.kind,
      originalFileName: d.originalFileName,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      uploadedAt: d.uploadedAt.toISOString(),
      deleted: d.deletedAt !== null,
      deletedAt: d.deletedAt ? d.deletedAt.toISOString() : null,
      retention: retentionState(d.deletedAt, new Date()),
    })),
    reminders: loaded.reminders.map((r) => ({
      id: r.id,
      category: r.category,
      dueOn: dateString(r.dueOn),
      leadDays: r.leadDays,
      status: r.status,
      acknowledgedAt: r.acknowledgedAt ? r.acknowledgedAt.toISOString() : null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

export async function createInsurancePolicy(vehicleId: string, actorUserId: string, input: InsuranceInput) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const loaded = await loadAll(tx, vehicleId);
    const check = checkPolicyPeriod(
      { insurer: input.insurer, policyNumber: input.policyNumber, coverage: input.coverage, startsOn: input.startsOn, expiresOn: input.expiresOn, premium: input.premium },
      currentPolicies(loaded),
      input.renewsPolicyId,
    );
    if (!check.ok) throw new AuthError(422, check.message);

    const created = await tx.vehicleInsurancePolicy.create({
      data: {
        vehicleId,
        insurer: input.insurer,
        policyNumber: input.policyNumber,
        coverage: input.coverage,
        coverageDetails: input.coverageDetails,
        startsOn: new Date(`${input.startsOn}T00:00:00.000Z`),
        expiresOn: new Date(`${input.expiresOn}T00:00:00.000Z`),
        premium: input.premium,
        notes: input.notes,
        renewsPolicyId: input.renewsPolicyId,
        recordedByUserId: actorUserId,
      },
      select: { id: true },
    });
    await audit(tx, {
      vehicleId,
      entityType: "INSURANCE_POLICY",
      entityId: created.id,
      action: input.renewsPolicyId ? "RENEWED" : "CREATED",
      actorUserId,
      summary: { startsOn: input.startsOn, expiresOn: input.expiresOn, renewsPolicyId: input.renewsPolicyId },
    });
    return created;
  });
}

// ---------------------------------------------------------------------------
// Emission test and decisions
// ---------------------------------------------------------------------------

export async function createEmissionTest(vehicleId: string, actorUserId: string, input: VetTestInput) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    if (input.supersedesId) {
      const target = await tx.vehicleEmissionTest.findFirst({ where: { id: input.supersedesId, vehicleId }, select: { id: true } });
      if (!target) throw new AuthError(404, "The test being corrected was not found for this vehicle.");
      const already = await tx.vehicleEmissionTest.findFirst({ where: { supersedesId: input.supersedesId }, select: { id: true } });
      if (already) throw new AuthError(409, "That test has already been corrected. Correct the newer record instead.");
    }
    const created = await tx.vehicleEmissionTest.create({
      data: {
        vehicleId,
        testedOn: new Date(`${input.testedOn}T00:00:00.000Z`),
        result: input.result as EmissionTestResult | null,
        certificateNumber: input.certificateNumber,
        issuedOn: input.issuedOn ? new Date(`${input.issuedOn}T00:00:00.000Z`) : null,
        certificateExpiresOn: input.certificateExpiresOn ? new Date(`${input.certificateExpiresOn}T00:00:00.000Z`) : null,
        nextDueOn: input.nextDueOn ? new Date(`${input.nextDueOn}T00:00:00.000Z`) : null,
        testingCentre: input.testingCentre,
        notes: input.notes,
        supersedesId: input.supersedesId,
        recordedByUserId: actorUserId,
      },
      select: { id: true },
    });
    await audit(tx, {
      vehicleId,
      entityType: "EMISSION_TEST",
      entityId: created.id,
      action: input.supersedesId ? "CORRECTED" : "CREATED",
      actorUserId,
      summary: { testedOn: input.testedOn, result: input.result, supersedesId: input.supersedesId },
    });
    return created;
  });
}

export async function createComplianceDecision(vehicleId: string, actorUserId: string, input: ComplianceDecisionInput) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const created = await tx.vehicleComplianceDecision.create({
      data: {
        vehicleId,
        category: input.category as ComplianceCategory,
        decision: input.decision as ComplianceDecisionKind,
        reason: input.reason,
        decidedByUserId: actorUserId,
      },
      select: { id: true },
    });
    await audit(tx, {
      vehicleId,
      entityType: "COMPLIANCE_DECISION",
      entityId: created.id,
      action: "CREATED",
      actorUserId,
      reason: input.reason,
      summary: { category: input.category, decision: input.decision },
    });
    return created;
  });
}

// ---------------------------------------------------------------------------
// Revenue Licence
// ---------------------------------------------------------------------------

/**
 * Records a licence. A renewal (renewsLicenceId set) first checks the insurance and emission-test prerequisites on the renewal
 * date. Warnings never block the renewal alone: they need the administrator's recorded confirmation, which is audited.
 */
export async function createRevenueLicence(vehicleId: string, actorUserId: string, input: RevenueLicenceInput) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const loaded = await loadAll(tx, vehicleId);

    let confirmedWarnings: string[] = [];
    if (input.renewsLicenceId) {
      const target = await tx.vehicleRevenueLicence.findFirst({ where: { id: input.renewsLicenceId, vehicleId }, select: { id: true } });
      if (!target) throw new AuthError(404, "The licence being renewed was not found for this vehicle.");
      if (!input.renewedOn) throw new AuthError(422, "Enter the renewal date to record a renewal.");
      const emissionDecision = latestDecision(loaded, ComplianceCategory.EMISSION_TEST);
      const latestTest = currentTests(loaded)[0] ?? null;
      const check = renewalPrerequisites({
        renewalDate: input.renewedOn,
        policies: currentPolicies(loaded),
        decision: emissionDecision ? { kind: emissionDecision.decision as "NOT_APPLICABLE" | "EXCEPTION_DOCUMENTED" } : null,
        latestTest: latestTest
          ? {
              testedOn: dateString(latestTest.testedOn)!,
              result: latestTest.result as "PASS" | "FAIL" | null,
              certificateExpiresOn: dateString(latestTest.certificateExpiresOn),
              nextDueOn: dateString(latestTest.nextDueOn),
            }
          : null,
        settings: settingsFrom(await getReminderSettings(tx)),
      });
      const gate = requireRenewalConfirmation(check, input.confirmRenewalWarnings);
      if (!gate.ok) throw new AuthError(422, gate.message);
      confirmedWarnings = gate.auditStatuses;
    }

    const created = await tx.vehicleRevenueLicence.create({
      data: {
        vehicleId,
        licenceNumber: input.licenceNumber,
        issuedOn: input.issuedOn ? new Date(`${input.issuedOn}T00:00:00.000Z`) : null,
        renewedOn: input.renewedOn ? new Date(`${input.renewedOn}T00:00:00.000Z`) : null,
        dueOn: new Date(`${input.dueOn}T00:00:00.000Z`),
        notes: input.notes,
        renewsLicenceId: input.renewsLicenceId,
        recordedByUserId: actorUserId,
      },
      select: { id: true },
    });
    await audit(tx, {
      vehicleId,
      entityType: "REVENUE_LICENCE",
      entityId: created.id,
      action: input.renewsLicenceId ? "RENEWED" : "CREATED",
      actorUserId,
      summary: {
        dueOn: input.dueOn,
        renewedOn: input.renewedOn,
        renewsLicenceId: input.renewsLicenceId,
        ...(confirmedWarnings.length > 0 ? { confirmedPrerequisiteWarnings: confirmedWarnings, legalVerification: "NOT_VERIFIED" } : {}),
      },
    });
    return created;
  });
}

// ---------------------------------------------------------------------------
// Service records
// ---------------------------------------------------------------------------

/**
 * Records a service or inspection with its checklist. The odometer is checked against the current known reading: a lower reading
 * needs an explanation, which is stored in the audit log. A fault link is allowed only for a corrective service of the same vehicle.
 */
export async function createServiceRecord(vehicleId: string, actorUserId: string, input: ServiceInput) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const loaded = await loadAll(tx, vehicleId);

    if (input.supersedesId) {
      const target = await tx.vehicleServiceRecord.findFirst({ where: { id: input.supersedesId, vehicleId }, select: { id: true } });
      if (!target) throw new AuthError(404, "The record being corrected was not found for this vehicle.");
      if (supersededIds(loaded.services).has(input.supersedesId)) {
        throw new AuthError(409, "That record has already been corrected. Correct the newer record instead.");
      }
    }

    let fault: { id: string; vehicleId: string } | null = null;
    if (input.faultId) {
      fault = await tx.vehicleFault.findFirst({ where: { id: input.faultId, vehicleId }, select: { id: true, vehicleId: true } });
      if (!fault) throw new AuthError(404, "The linked fault was not found for this vehicle.");
    }
    const link = canLinkServiceToFault({ vehicleId, category: input.category }, fault);
    if (!link.ok) throw new AuthError(422, link.message);

    // A record may have no odometer reading. The regression rule applies only when a reading is sent.
    const current = currentOdometerKm(serviceRecordsForRules(currentServices(loaded)));
    let regression = false;
    if (input.odometerKm !== null) {
      const odometer = checkOdometerReading({ reading: input.odometerKm, current, explanation: input.odometerExplanation });
      if (!odometer.ok) throw new AuthError(422, odometer.message);
      regression = odometer.regression;
    }

    const created = await tx.vehicleServiceRecord.create({
      data: {
        vehicleId,
        category: input.category as ServiceCategory,
        serviceDate: new Date(`${input.serviceDate}T00:00:00.000Z`),
        odometerKm: input.odometerKm,
        providerName: input.providerName,
        workPerformed: input.workPerformed,
        findings: input.findings,
        recommendations: input.recommendations,
        partsCost: input.partsCost,
        labourCost: input.labourCost,
        totalCost: input.totalCost,
        nextServiceDate: input.nextServiceDate ? new Date(`${input.nextServiceDate}T00:00:00.000Z`) : null,
        nextServiceOdometerKm: input.nextServiceOdometerKm,
        notes: input.notes,
        supersedesId: input.supersedesId,
        faultId: fault ? fault.id : null,
        recordedByUserId: actorUserId,
        checklistItems: {
          create: input.checklist.map((c) => ({ item: c.item as ChecklistItem, result: c.result as ChecklistResult, note: c.note })),
        },
      },
      select: { id: true },
    });

    await audit(tx, {
      vehicleId,
      entityType: "SERVICE_RECORD",
      entityId: created.id,
      action: input.supersedesId ? "CORRECTED" : "CREATED",
      actorUserId,
      reason: regression ? input.odometerExplanation : null,
      summary: {
        category: input.category,
        serviceDate: input.serviceDate,
        odometerKm: input.odometerKm,
        odometerRegression: regression,
        previousKnownKm: current,
        faultId: fault ? fault.id : null,
        totalCost: input.totalCost,
      },
    });
    return created;
  });
}

// ---------------------------------------------------------------------------
// Faults and repairs
// ---------------------------------------------------------------------------

/**
 * Reports a fault. A safety-critical fault is shown to administrators as a warning. It does not change the vehicle's status,
 * and it does not block booking.
 */
export async function createFault(vehicleId: string, actorUserId: string, input: FaultInput) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const reportedAt = new Date(`${input.reportedOn}T00:00:00.000Z`);
    const created = await tx.vehicleFault.create({
      data: {
        vehicleId,
        severity: input.severity as FaultSeverity,
        description: input.description,
        makesUnavailable: input.makesUnavailable,
        status: RepairStatus.REPORTED,
        reportedAt,
        reportedByUserId: actorUserId,
        workshop: input.workshop,
        repairCost: input.repairCost,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    await tx.vehicleRepairEvent.create({
      data: { faultId: created.id, eventType: "STATUS_CHANGED", previousStatus: null, newStatus: RepairStatus.REPORTED, actorUserId },
    });
    await audit(tx, {
      vehicleId,
      entityType: "FAULT",
      entityId: created.id,
      action: "CREATED",
      actorUserId,
      summary: { severity: input.severity, makesUnavailable: input.makesUnavailable, safetyCritical: isSafetyCriticalOpenFault({ status: "REPORTED", severity: input.severity as FaultLite["severity"], makesUnavailable: input.makesUnavailable }) },
    });
    return created;
  });
}

/**
 * Moves a repair forward (REPORTED to DIAGNOSED to IN_REPAIR to COMPLETED, or CANCELLED). Every status change writes a repair
 * event. Closing a fault never changes the vehicle's status, so a vehicle is not reactivated automatically.
 */
export async function updateFault(vehicleId: string, faultId: string, actorUserId: string, input: FaultUpdateInput, today: string) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const fault = await tx.vehicleFault.findFirst({ where: { id: faultId, vehicleId } });
    if (!fault) throw new AuthError(404, "That fault was not found for this vehicle.");
    await tx.$queryRaw`SELECT id FROM "VehicleFault" WHERE id = ${faultId} FOR UPDATE`;

    const from = fault.status as RepairStatusValue;
    const to = input.status as RepairStatusValue;
    const statusChanged = from !== to;
    if (statusChanged && !canMoveRepair(from, to)) {
      throw new AuthError(409, `A repair cannot move from ${from.replace(/_/g, " ").toLowerCase()} to ${to.replace(/_/g, " ").toLowerCase()}.`);
    }
    if (to === "COMPLETED") {
      const dates = checkRepairDates(fault.reportedAt.toISOString().slice(0, 10), input.completedOn, today);
      if (!dates.ok) throw new AuthError(422, dates.message);
    }

    const completedAt = to === "COMPLETED" ? new Date(`${input.completedOn}T00:00:00.000Z`) : null;
    const updated = await tx.vehicleFault.update({
      where: { id: faultId },
      data: {
        status: to as RepairStatus,
        completedAt,
        workshop: input.workshop ?? undefined,
        diagnosis: input.diagnosis ?? undefined,
        workPerformed: input.workPerformed ?? undefined,
        repairCost: input.repairCost ?? undefined,
      },
    });
    await tx.vehicleRepairEvent.create({
      data: {
        faultId,
        eventType: statusChanged ? "STATUS_CHANGED" : "NOTE_ADDED",
        previousStatus: statusChanged ? (from as RepairStatus) : null,
        newStatus: statusChanged ? (to as RepairStatus) : null,
        note: input.note,
        amount: input.repairCost,
        actorUserId,
      },
    });
    await audit(tx, {
      vehicleId,
      entityType: "FAULT",
      entityId: faultId,
      action: statusChanged ? "STATUS_CHANGED" : "UPDATED",
      actorUserId,
      reason: input.note,
      summary: { from, to, completedOn: input.completedOn, vehicleStatusChanged: false },
    });
    return updated;
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export type DocumentLink = "insurancePolicyId" | "emissionTestId" | "revenueLicenceId" | "serviceRecordId" | "faultId";

/**
 * Stores a private document. The file type comes from its bytes, not from the browser's declared type or the file name. The
 * file is written before its row, and removed again if the row cannot be saved. The link must belong to this vehicle.
 */
export async function uploadMaintenanceDocument(
  vehicleId: string,
  actorUserId: string,
  input: { kind: MaintenanceDocumentKind; link: DocumentLink | null; linkId: string | null; originalFileName: string; bytes: Buffer },
) {
  if (input.bytes.length === 0 || input.bytes.length > MAX_SLIP_BYTES) throw new AuthError(422, "The file must be between 1 byte and 5 MB.");
  const type = detectSlipType(input.bytes);
  if (!type) throw new AuthError(422, "Upload a JPEG, PNG or PDF file.");
  const fileName = safeDisplayName(input.originalFileName);
  const meta = checkDocumentMeta({ kind: input.kind, mimeType: type.mime, fileSizeBytes: input.bytes.length, originalFileName: fileName });
  if (!meta.ok) throw new AuthError(422, meta.message);
  if (input.link !== null && input.linkId === null) throw new AuthError(422, "Choose the record this document belongs to.");

  maintenanceStorageDir(); // fails with StorageNotConfiguredError before anything is written
  const storageKey = await storeMaintenanceFile(input.bytes, type.extension as "jpg" | "png" | "pdf");
  try {
    return await prisma.$transaction(async (tx) => {
      await lockVehicle(tx, vehicleId);
      const links: Record<DocumentLink, string | null> = { insurancePolicyId: null, emissionTestId: null, revenueLicenceId: null, serviceRecordId: null, faultId: null };
      if (input.link && input.linkId) {
        const exists = await linkExists(tx, vehicleId, input.link, input.linkId);
        if (!exists) throw new AuthError(404, "The record this document belongs to was not found for this vehicle.");
        links[input.link] = input.linkId;
      }
      const created = await tx.vehicleMaintenanceDocument.create({
        data: {
          vehicleId,
          kind: input.kind,
          ...links,
          storageKey,
          originalFileName: fileName,
          mimeType: type.mime,
          fileSizeBytes: input.bytes.length,
          sha256: sha256Hex(input.bytes),
          uploadedByUserId: actorUserId,
        },
        select: { id: true },
      });
      await audit(tx, {
        vehicleId,
        entityType: "DOCUMENT",
        entityId: created.id,
        action: "UPLOADED",
        actorUserId,
        summary: { kind: input.kind, mimeType: type.mime, fileSizeBytes: input.bytes.length, linkedTo: input.link },
      });
      return created;
    });
  } catch (error) {
    await removeMaintenanceFile(storageKey);
    throw error;
  }
}

async function linkExists(tx: Tx, vehicleId: string, link: DocumentLink, id: string): Promise<boolean> {
  switch (link) {
    case "insurancePolicyId":
      return (await tx.vehicleInsurancePolicy.findFirst({ where: { id, vehicleId }, select: { id: true } })) !== null;
    case "emissionTestId":
      return (await tx.vehicleEmissionTest.findFirst({ where: { id, vehicleId }, select: { id: true } })) !== null;
    case "revenueLicenceId":
      return (await tx.vehicleRevenueLicence.findFirst({ where: { id, vehicleId }, select: { id: true } })) !== null;
    case "serviceRecordId":
      return (await tx.vehicleServiceRecord.findFirst({ where: { id, vehicleId }, select: { id: true } })) !== null;
    case "faultId":
      return (await tx.vehicleFault.findFirst({ where: { id, vehicleId }, select: { id: true } })) !== null;
  }
}

/** Reads a document for an administrator. Removed documents are not served. The stored SHA-256 is checked on every read. */
export async function readMaintenanceDocument(vehicleId: string, documentId: string) {
  const doc = await prisma.vehicleMaintenanceDocument.findFirst({
    where: { id: documentId, vehicleId },
    select: { storageKey: true, mimeType: true, originalFileName: true, sha256: true, deletedAt: true },
  });
  if (!doc) throw new AuthError(404, "That document was not found for this vehicle.");
  if (doc.deletedAt) throw new AuthError(404, "This document has been removed.");
  const bytes = await readMaintenanceFile(doc.storageKey);
  if (sha256Hex(bytes) !== doc.sha256) {
    throw new AuthError(500, "The stored file does not match its record, so it was not opened. Tell the school administrator.");
  }
  return { bytes, mimeType: doc.mimeType, fileName: doc.originalFileName };
}

/** Soft delete: once, with a reason. The row and the file are kept for the retention period. */
export async function softDeleteMaintenanceDocument(vehicleId: string, documentId: string, actorUserId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const doc = await tx.vehicleMaintenanceDocument.findFirst({ where: { id: documentId, vehicleId }, select: { id: true, deletedAt: true, kind: true } });
    if (!doc) throw new AuthError(404, "That document was not found for this vehicle.");
    if (doc.deletedAt) throw new AuthError(409, "This document has already been removed.");
    const now = new Date();
    await tx.vehicleMaintenanceDocument.update({
      where: { id: documentId },
      data: { deletedAt: now, deletedByUserId: actorUserId, deletionReason: reason },
    });
    await audit(tx, {
      vehicleId,
      entityType: "DOCUMENT",
      entityId: documentId,
      action: "REMOVED",
      actorUserId,
      reason,
      summary: { kind: doc.kind },
    });
    return { id: documentId, deletedAt: now.toISOString() };
  });
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

type Candidate = { category: ReminderCategory; targetRecordId: string; dueOn: string } | null;

/** The one record each category's reminder follows, and its due date, as the rules define "current". */
function reminderTargets(loaded: Loaded, today: string, leads: ReminderSettingsView): Record<ReminderCategory, Candidate> {
  const policy = insuranceStatus(currentPolicies(loaded), today, Math.max(...leads.INSURANCE)).policy;
  const insurance: Candidate = policy && policy.id ? { category: "INSURANCE", targetRecordId: policy.id, dueOn: policy.expiresOn } : null;

  const test = currentTests(loaded)[0] ?? null;
  const decision = latestDecision(loaded, ComplianceCategory.EMISSION_TEST);
  const vet = vetStatus(
    decision ? { kind: decision.decision as "NOT_APPLICABLE" | "EXCEPTION_DOCUMENTED" } : null,
    test ? { testedOn: dateString(test.testedOn)!, result: test.result as "PASS" | "FAIL" | null, certificateExpiresOn: dateString(test.certificateExpiresOn), nextDueOn: dateString(test.nextDueOn) } : null,
    today,
    0,
  );
  const emission: Candidate = test && vet.dueOn && vet.result !== "FAIL" ? { category: "EMISSION_TEST", targetRecordId: test.id, dueOn: vet.dueOn } : null;

  const licence = currentLicences(loaded)[0] ?? null;
  const revenue: Candidate = licence ? { category: "REVENUE_LICENCE", targetRecordId: licence.id, dueOn: dateString(licence.dueOn)! } : null;

  const records = currentServices(loaded);
  const next = latestNextService(records.map((r) => ({ serviceDate: dateString(r.serviceDate)!, nextServiceDate: dateString(r.nextServiceDate), nextServiceOdometerKm: r.nextServiceOdometerKm, superseded: false })));
  const latestDate = records[0] ? dateString(records[0].serviceDate) : null;
  const target = next && next.nextServiceDate ? records.find((r) => dateString(r.serviceDate) === latestDate && dateString(r.nextServiceDate) === next.nextServiceDate) : null;
  const service: Candidate = target && next?.nextServiceDate ? { category: "SERVICE", targetRecordId: target.id, dueOn: next.nextServiceDate } : null;

  return { INSURANCE: insurance, EMISSION_TEST: emission, REVENUE_LICENCE: revenue, SERVICE: service };
}

/**
 * Creates the in-app reminders that are open today, for the current target of each category. The unique key makes this
 * idempotent: running it twice creates nothing new. Reminders for an earlier target are marked SUPERSEDED, and never deleted.
 * Nothing is sent to anyone.
 */
export async function generateReminders(vehicleId: string, actorUserId: string, today: string) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const loaded = await loadAll(tx, vehicleId);
    const leads = await getReminderSettings(tx);
    const targets = reminderTargets(loaded, today, leads);

    let created = 0;
    let superseded = 0;
    for (const category of REMINDER_CATEGORY_LIST) {
      const target = targets[category];
      if (!target) continue;
      const stale = await tx.vehicleMaintenanceReminder.updateMany({
        where: { vehicleId, category, status: ReminderStatus.OPEN, NOT: { targetRecordId: target.targetRecordId } },
        data: { status: ReminderStatus.SUPERSEDED },
      });
      superseded += stale.count;
      const rows = leads[category]
        .filter((lead) => reminderOpenOn(target.dueOn, today, lead))
        .map((lead) => ({
          vehicleId,
          category: category as ReminderCategory,
          targetRecordId: target.targetRecordId,
          dueOn: new Date(`${target.dueOn}T00:00:00.000Z`),
          leadDays: lead,
          status: ReminderStatus.OPEN,
        }));
      if (rows.length > 0) {
        const result = await tx.vehicleMaintenanceReminder.createMany({ data: rows, skipDuplicates: true });
        created += result.count;
      }
    }

    await audit(tx, {
      vehicleId,
      entityType: "REMINDER",
      entityId: vehicleId,
      action: "GENERATED",
      actorUserId,
      summary: { today, created, superseded },
    });
    return { created, superseded };
  });
}

/** Acknowledges an open reminder. Who and when are recorded. The reminder's identity cannot change (database guard). */
export async function acknowledgeReminder(vehicleId: string, reminderId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    await lockVehicle(tx, vehicleId);
    const reminder = await tx.vehicleMaintenanceReminder.findFirst({ where: { id: reminderId, vehicleId }, select: { id: true, status: true, category: true } });
    if (!reminder) throw new AuthError(404, "That reminder was not found for this vehicle.");
    if (reminder.status !== ReminderStatus.OPEN) throw new AuthError(409, "Only an open reminder can be acknowledged.");
    const now = new Date();
    await tx.vehicleMaintenanceReminder.update({
      where: { id: reminderId },
      data: { status: ReminderStatus.ACKNOWLEDGED, acknowledgedAt: now, acknowledgedByUserId: actorUserId },
    });
    await audit(tx, {
      vehicleId,
      entityType: "REMINDER",
      entityId: reminderId,
      action: "ACKNOWLEDGED",
      actorUserId,
      summary: { category: reminder.category },
    });
    return { id: reminderId, acknowledgedAt: now.toISOString() };
  });
}
