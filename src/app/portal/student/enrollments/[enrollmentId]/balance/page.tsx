import Link from "next/link";
import PaymentForm from "@/components/auth/PaymentForm";
import EmptyState from "@/components/student/EmptyState";
import { formatDate, formatMoney } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getEnrollments } from "@/lib/student/data";

export const metadata = { title: "Pay the balance | Student portal", robots: { index: false, follow: false } };

export default async function StudentBalancePage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const user = await requirePortalUser("STUDENT");
  const { enrollmentId } = await params;
  const enrollments = await getEnrollments(user.userId);
  const enrollment = enrollments.find((item) => item.id === enrollmentId);
  const payable = enrollment !== undefined && enrollment.canPayBalance && enrollment.applicationReference !== null;

  return (
    <>
      <PageIntro
        title="Pay the balance"
        description="Send the balance by bank transfer or bank deposit, then upload the slip. The school checks it before the balance is updated."
      />

      <Link href="/portal/student/enrollments" className="text-[0.875rem] font-semibold text-gold-ink underline underline-offset-2">
        Back to enrollments
      </Link>

      {!enrollment || !payable ? (
        <EmptyState
          title="No balance to pay online"
          body="This enrollment has no balance that can be paid online right now. Contact the school if you think this is wrong."
        />
      ) : (
        <section className="glass rounded-[22px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-[0.8125rem] text-muted">{enrollment.packageName}</p>
              {enrollment.balanceDueBy && (
                <p className="mt-1 text-[0.875rem] text-muted">
                  Must be received by <span className="font-semibold text-ink">{formatDate(enrollment.balanceDueBy)}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-gold-ink">Balance to pay now</p>
              <p className="text-[1.75rem] font-bold leading-tight text-ink">{formatMoney(enrollment.balance)}</p>
            </div>
          </div>

          <div className="mt-6">
            <PaymentForm
              pkg={{ id: enrollment.id, name: enrollment.packageName, price: enrollment.balance }}
              balanceDue={enrollment.balance}
              applicationReference={enrollment.applicationReference ?? undefined}
              initialEmail={enrollment.applicationEmail ?? undefined}
              signedInUserId={user.userId}
            />
          </div>
        </section>
      )}
    </>
  );
}
