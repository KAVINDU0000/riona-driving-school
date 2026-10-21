import EmailChangeForm from "@/components/student/EmailChangeForm";
import EmptyState from "@/components/student/EmptyState";
import { formatDate } from "@/components/student/format";
import LogoutButton from "@/components/student/LogoutButton";
import PageIntro from "@/components/student/PageIntro";
import PasswordChangeForm from "@/components/student/PasswordChangeForm";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getStudentProfile } from "@/lib/student/data";
import SectionTitle from "@/components/student/SectionTitle";

export const metadata = { title: "Settings | Student portal", robots: { index: false, follow: false } };

export default async function StudentSettingsPage() {
  const user = await requirePortalUser("STUDENT");
  const profile = await getStudentProfile(user.userId);

  if (!profile) {
    return (
      <>
        <PageIntro title="Settings" description="Account details, password and sign-in." />
        <EmptyState title="Account not found" body="We could not load this account. Contact the school for help." />
      </>
    );
  }

  return (
    <>
      <PageIntro title="Settings" description="Your account details, password and sign-in." />

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="account-heading" className="glass rounded-[22px] p-6">
          <SectionTitle id="account-heading" icon="user" tone="blue">Account</SectionTitle>
          <dl className="mt-4 grid gap-4 text-[0.9375rem]">
            <div>
              <dt className="text-[0.8125rem] font-semibold text-muted">Student ID</dt>
              <dd className="mt-1 font-medium text-ink">{profile.studentId}</dd>
            </div>
            <div>
              <dt className="text-[0.8125rem] font-semibold text-muted">Account status</dt>
              <dd className="mt-1">
                <StatusBadge status={profile.accountStatus} label={profile.accountStatus === "ACTIVE" ? "Active" : "Inactive"} />
              </dd>
            </div>
            <div>
              <dt className="text-[0.8125rem] font-semibold text-muted">Start date</dt>
              <dd className="mt-1 font-medium text-ink">{formatDate(profile.startDate)}</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-[0.9375rem] font-semibold text-ink">Sign out</h3>
            <p className="mt-1 text-[0.875rem] text-muted">Ends this session on this device.</p>
            <LogoutButton className="mt-3 ring-1 ring-line" />
          </div>
        </section>

        <section aria-labelledby="password-heading" className="glass rounded-[22px] p-6">
          <SectionTitle id="password-heading" icon="lock" tone="violet">Change password</SectionTitle>
          <p className="mb-5 mt-1 text-[0.875rem] text-muted">Changing your password signs out every other device.</p>
          <PasswordChangeForm />
        </section>
      </div>

      <section aria-labelledby="email-heading" className="glass rounded-[22px] p-6">
        <SectionTitle id="email-heading" icon="mail" tone="blue">Change email address</SectionTitle>
        <p className="mb-5 mt-1 text-[0.875rem] text-muted">We send a link to the new address. Your sign-in email changes only after you open it.</p>
        <div className="max-w-xl">
          <EmailChangeForm currentEmail={profile.email ?? "Not set"} />
        </div>
      </section>
    </>
  );
}
