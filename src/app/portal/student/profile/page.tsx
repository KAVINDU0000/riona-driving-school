import type { ReactNode } from "react";
import EmptyState from "@/components/student/EmptyState";
import { formatDate } from "@/components/student/format";
import ProfileForm from "@/components/student/ProfileForm";
import StatusBadge from "@/components/student/StatusBadge";
import Icon from "@/components/ui/Icon";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getStudentProfile } from "@/lib/student/data";

export const metadata = { title: "Profile | Student portal", robots: { index: false, follow: false } };

/** Same card as the instructor profile sections: white, bordered, soft shadow. */
const CARD = "grid content-start gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(16,27,48,0.04)] md:p-6";

/** Two-letter initials for the avatar in the header, from the first two words of the name. */
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default async function StudentProfilePage() {
  const user = await requirePortalUser("STUDENT");
  const profile = await getStudentProfile(user.userId);

  if (!profile) {
    return (
      <>
        <h1 className="mb-6 text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-ink">
          Profile<span className="text-gold-dark">.</span>
        </h1>
        <EmptyState title="Profile not found" body="We could not find a student profile for this account. Contact the school for help." />
      </>
    );
  }

  return (
    <>
      <section aria-labelledby="profile-summary" className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-[0_24px_60px_-28px_rgba(16,27,48,0.7)] md:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gold text-[1.25rem] font-bold text-ink">
              {initialsOf(profile.fullName)}
            </span>
            <div className="min-w-0">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold">Student</p>
              <h1 id="profile-summary" className="truncate text-[1.5rem] font-bold leading-tight tracking-[-0.02em]">
                {profile.fullName}
              </h1>
              <p className="text-[0.875rem] text-white/70">{profile.studentId}</p>
            </div>
          </div>
          <StatusBadge status={profile.accountStatus} label={profile.accountStatus === "ACTIVE" ? "Active" : "Inactive"} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2 xl:items-start">
        <section aria-labelledby="details-heading" className={CARD}>
          <SectionHeader id="details-heading" icon="id-card" title="Your details" hint="Maintained by the school. Contact the school to correct these." />
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={profile.fullName} />
            <Field label="Student ID" value={profile.studentId} />
            <Field label="Date of birth" value={formatDate(profile.birthday)} />
            <Field label="Start date" value={formatDate(profile.startDate)} />
            <Field label="NIC" value={profile.nicMasked} hint="Shown partly for your privacy." />
            <Field label="Email" value={profile.email ?? "Not set"} hint="To change it, use Settings." />
            <Field label="Active enrollments" value={String(profile.activeEnrollments)} />
          </dl>
        </section>

        <section aria-labelledby="edit-heading" className={CARD}>
          <SectionHeader id="edit-heading" icon="phone" title="Contact details" hint="Keep your address and mobile number current so the school can reach you." />
          <ProfileForm initialAddress={profile.address} initialPhone={profile.phoneNumber} />
        </section>
      </div>
    </>
  );
}

/** Card heading with an icon chip, in the instructor profile style. */
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

function Field({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1 rounded-xl bg-page px-4 py-3 ring-1 ring-line">
      <dt className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="break-words text-[0.9375rem] font-semibold text-ink">{value}</dd>
      {hint && <p className="text-[0.75rem] text-muted">{hint}</p>}
    </div>
  );
}
