import type { Metadata } from "next";
import EmailChangeForm from "@/components/student/EmailChangeForm";
import { formatDate } from "@/components/student/format";
import InstructorFrame from "@/components/instructor/InstructorFrame";
import PasswordChangeForm from "@/components/student/PasswordChangeForm";
import MobileNumberForm from "@/components/instructor/MobileNumberForm";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getInstructorAccount } from "@/lib/instructor/profile";

export const metadata: Metadata = {
  title: "Profile | Instructor Portal | Riyona Driving School",
  robots: { index: false, follow: false },
};

/**
 * The instructor's profile. The fields are read-only here, because the school sets them. Password and email changes
 * use the same secure flows as every other account, which check the current password and verify the new address.
 */
export default async function InstructorProfilePage() {
  const user = await requirePortalUser("INSTRUCTOR");
  const account = await getInstructorAccount(user.userId);

  return (
    <InstructorFrame title="Profile" description="Your instructor details and account security." active="/portal/instructor">
      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="profile-heading" className="glass rounded-[22px] p-6">
          <h2 id="profile-heading" className="text-[1.125rem] font-bold text-ink">
            Your details
          </h2>
          <dl className="mt-4 grid gap-4 text-[0.9375rem]">
            <Row label="Instructor ID" value={account.instructorId} />
            <Row label="Full name" value={account.fullName} />
            <Row label="Email" value={account.email} />
            <Row label="Hire date" value={formatDate(account.hireDate)} />
            <div>
              <dt className="text-[0.8125rem] font-semibold text-muted">Account status</dt>
              <dd className="mt-1">
                <StatusBadge status={account.status} label={account.status === "ACTIVE" ? "Active" : "Inactive"} />
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-[0.8125rem] text-muted">
            To change your name, hire date or instructor ID, contact the school. Your mobile number can be changed in the Mobile number section.
          </p>
        </section>

        <div className="grid content-start gap-6">
          <section aria-labelledby="mobile-heading" className="glass rounded-[22px] p-6">
            <h2 id="mobile-heading" className="text-[1.125rem] font-bold text-ink">
              Mobile number
            </h2>
            <div className="mt-4">
              <MobileNumberForm current={account.phoneNumber} />
            </div>
          </section>
          <section aria-labelledby="password-heading" className="glass rounded-[22px] p-6">
            <h2 id="password-heading" className="text-[1.125rem] font-bold text-ink">
              Password
            </h2>
            <div className="mt-4">
              <PasswordChangeForm />
            </div>
          </section>
          <section aria-labelledby="email-heading" className="glass rounded-[22px] p-6">
            <h2 id="email-heading" className="text-[1.125rem] font-bold text-ink">
              Email address
            </h2>
            <div className="mt-4">
              <EmailChangeForm currentEmail={account.email} />
            </div>
          </section>
        </div>
      </div>
    </InstructorFrame>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.8125rem] font-semibold text-muted">{label}</dt>
      <dd className="mt-1 break-words font-medium text-ink">{value}</dd>
    </div>
  );
}
