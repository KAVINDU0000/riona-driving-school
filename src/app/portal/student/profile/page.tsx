import EmptyState from "@/components/student/EmptyState";
import { formatDate } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import ProfileForm from "@/components/student/ProfileForm";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getStudentProfile } from "@/lib/student/data";

export const metadata = { title: "Profile | Student portal", robots: { index: false, follow: false } };

export default async function StudentProfilePage() {
  const user = await requirePortalUser("STUDENT");
  const profile = await getStudentProfile(user.userId);

  if (!profile) {
    return (
      <>
        <PageIntro title="Profile" description="Your personal details and account status." />
        <EmptyState title="Profile not found" body="We could not find a student profile for this account. Contact the school for help." />
      </>
    );
  }

  return (
    <>
      <PageIntro title="Profile" description="Check your personal details. You can update your address and mobile number here." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="details-heading" className="glass rounded-[22px] p-6">
          <h2 id="details-heading" className="text-[1.125rem] font-bold text-ink">
            Your details
          </h2>
          <dl className="mt-4 grid gap-4 text-[0.9375rem] sm:grid-cols-2">
            <Field label="Full name" value={profile.fullName} />
            <Field label="Student ID" value={profile.studentId} />
            <Field label="Date of birth" value={formatDate(profile.birthday)} />
            <Field label="NIC" value={profile.nicMasked} hint="Shown partly for your privacy. Contact the school to correct it." />
            <Field label="Start date" value={formatDate(profile.startDate)} />
            <Field label="Email" value={profile.email ?? "Not set"} hint="To change it, use Settings." />
            <div>
              <dt className="text-[0.8125rem] font-semibold text-muted">Account status</dt>
              <dd className="mt-1">
                <StatusBadge status={profile.accountStatus} label={profile.accountStatus === "ACTIVE" ? "Active" : "Inactive"} />
              </dd>
            </div>
            <Field label="Active enrollments" value={String(profile.activeEnrollments)} />
          </dl>
        </section>

        <section aria-labelledby="edit-heading" className="glass rounded-[22px] p-6">
          <h2 id="edit-heading" className="text-[1.125rem] font-bold text-ink">
            Contact details
          </h2>
          <p className="mb-5 mt-1 text-[0.875rem] text-muted">Keep your address and mobile number current so the school can reach you.</p>
          <ProfileForm initialAddress={profile.address} initialPhone={profile.phoneNumber} />
          <p className="mt-6 text-[0.8125rem] text-muted">Name, NIC and date of birth are maintained by the school.</p>
        </section>
      </div>
    </>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[0.8125rem] font-semibold text-muted">{label}</dt>
      <dd className="mt-1 break-words font-medium text-ink">{value}</dd>
      {hint && <p className="mt-1 text-[0.75rem] text-muted">{hint}</p>}
    </div>
  );
}
