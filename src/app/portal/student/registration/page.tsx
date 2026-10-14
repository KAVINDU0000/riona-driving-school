import EmptyState from "@/components/student/EmptyState";
import { formatDate, formatMoney, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import StatusBadge from "@/components/student/StatusBadge";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getRegistration } from "@/lib/student/data";

export const metadata = { title: "Registration | Student portal", robots: { index: false, follow: false } };

export default async function StudentRegistrationPage() {
  const user = await requirePortalUser("STUDENT");
  const registration = await getRegistration(user.userId);

  return (
    <>
      <PageIntro title="Registration" description="The status of your registration application. Only the school can approve or reject an application." />

      {!registration ? (
        <EmptyState
          title="No registration linked to this account"
          body="Your application appears here once the school has reviewed it and linked it to your student account. If you have submitted an application and have not seen it here, contact the school."
        />
      ) : (
        <section aria-labelledby="application-heading" className="glass grid gap-6 rounded-[22px] p-6 md:grid-cols-2">
          <h2 id="application-heading" className="sr-only">
            Application details
          </h2>
          <Item label="Reference">
            <span className="font-mono text-[0.9375rem] text-ink">{registration.referenceNumber}</span>
          </Item>
          <Item label="Status">
            <StatusBadge status={registration.status} label={labels.registrationStatus[registration.status]} />
          </Item>
          <Item label="Training package">{registration.selectedPackage.name}</Item>
          <Item label="Price at submission">{formatMoney(Number(registration.packagePriceAtSubmission))}</Item>
          <Item label="Submitted">{formatDate(registration.submittedAt.toISOString().slice(0, 10))}</Item>
          <Item label="Reviewed">{registration.reviewedAt ? formatDate(registration.reviewedAt.toISOString().slice(0, 10)) : "Not yet reviewed"}</Item>
        </section>
      )}
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.8125rem] font-semibold text-muted">{label}</p>
      <div className="mt-1 text-[0.9375rem] font-medium text-ink">{children}</div>
    </div>
  );
}
