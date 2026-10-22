import type { Metadata } from "next";
import type { ReactNode } from "react";
import EmailChangeForm from "@/components/student/EmailChangeForm";
import { formatDate } from "@/components/student/format";
import InstructorSideFrame from "@/components/instructor/InstructorSideFrame";
import { initialsOf } from "@/components/instructor/InstructorDashboardParts";
import PasswordChangeForm from "@/components/student/PasswordChangeForm";
import MobileNumberForm from "@/components/instructor/MobileNumberForm";
import StatusBadge from "@/components/student/StatusBadge";
import { labels } from "@/components/student/format";
import Icon from "@/components/ui/Icon";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getInstructorAccount } from "@/lib/instructor/profile";

export const metadata: Metadata = {
  title: "Profile | Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/** Same card as the instructor dashboard panels: white, bordered, soft shadow. */
const CARD = "grid content-start gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(16,27,48,0.04)] md:p-6";

/**
 * The instructor's profile. The fields are read-only here, because the school sets them. Password and email changes
 * use the same secure flows as every other account, which check the current password and verify the new address.
 */
export default async function InstructorProfilePage() {
  const user = await requirePortalUser("INSTRUCTOR");
  const account = await getInstructorAccount(user.userId);

  return (
    <InstructorSideFrame title="Profile" description="Your instructor details and account security." active="/portal/instructor/profile">
      <section aria-labelledby="profile-summary" className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-[0_24px_60px_-28px_rgba(16,27,48,0.7)] md:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gold text-[1.25rem] font-bold text-ink">
              {initialsOf(account.fullName)}
            </span>
            <div className="min-w-0">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold">Instructor</p>
              <h2 id="profile-summary" className="truncate text-[1.5rem] font-bold leading-tight tracking-[-0.02em]">
                {account.fullName}
              </h2>
              <p className="text-[0.875rem] text-white/70">{account.instructorId}</p>
            </div>
          </div>
          <StatusBadge status={account.status} label={account.status === "ACTIVE" ? "Active" : "Inactive"} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2 xl:items-start">
        <section aria-labelledby="details-heading" className={CARD}>
          <SectionHeader id="details-heading" icon="id-card" title="Your details" hint="Set by the school. Contact the school to change these." />
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Instructor ID" value={account.instructorId} />
            <Field label="Full name" value={account.fullName} />
            <Field label="Email" value={account.email} />
            <Field label="Hire date" value={formatDate(account.hireDate)} />
            <div className="grid gap-1 rounded-xl bg-page px-4 py-3 ring-1 ring-line sm:col-span-2">
              <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">Vehicle types</dt>
              <dd className="flex flex-wrap gap-2 pt-1">
                {account.vehicleTypes.length === 0 ? (
                  <span className="text-[0.9375rem] text-muted">None yet. Vehicle types appear here once you teach a lesson.</span>
                ) : (
                  account.vehicleTypes.map((type) => (
                    <span key={type} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[0.8125rem] font-semibold text-ink ring-1 ring-line">
                      <Icon name="car" className="h-3.5 w-3.5" />
                      {labels.vehicleType[type] ?? type}
                    </span>
                  ))
                )}
              </dd>
            </div>
          </dl>
          <p className="text-[0.8125rem] text-muted">
            To change your name, hire date or instructor ID, contact the school. Your mobile number can be changed in the Mobile number section.
          </p>
        </section>

        <div className="grid content-start gap-6">
          <section aria-labelledby="mobile-heading" className={CARD}>
            <SectionHeader id="mobile-heading" icon="phone" title="Mobile number" hint="The mobile number on your account." />
            <MobileNumberForm current={account.phoneNumber} />
          </section>
          <section aria-labelledby="password-heading" className={CARD}>
            <SectionHeader id="password-heading" icon="lock" title="Password" hint="Enter your current password, then choose a new one." />
            <PasswordChangeForm staff />
          </section>
          <section aria-labelledby="email-heading" className={CARD}>
            <SectionHeader id="email-heading" icon="mail" title="Email address" hint="We send a confirmation link to the new address before it changes." />
            <EmailChangeForm currentEmail={account.email} staff />
          </section>
        </div>
      </div>
    </InstructorSideFrame>
  );
}

/** Card heading with an icon chip, in the dashboard panel style. */
function SectionHeader({ id, icon, title, hint }: { id: string; icon: string; title: string; hint: string }) {
  return (
    <header className="flex items-start gap-3.5">
      <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink ring-1 ring-gold/60">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 id={id} className="text-[1.0625rem] font-bold text-ink">
          {title}
        </h2>
        <p className="mt-0.5 text-[0.8125rem] text-muted">{hint}</p>
      </div>
    </header>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl bg-page px-4 py-3 ring-1 ring-line">
      <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="break-words text-[0.9375rem] font-semibold text-ink">{value}</dd>
    </div>
  );
}
