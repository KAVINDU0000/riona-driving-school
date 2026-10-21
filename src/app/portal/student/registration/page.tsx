import EmptyState from "@/components/student/EmptyState";
import { formatDate, formatMoney, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import StatusBadge from "@/components/student/StatusBadge";
import Icon from "@/components/ui/Icon";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getRegistration } from "@/lib/student/data";

export const metadata = { title: "Registration | Student portal", robots: { index: false, follow: false } };

/** The colours and wording that match each registration status. */
const HERO = {
  PENDING: { title: "Your application is under review", tone: "from-amber-100 to-gold-soft", icon: "clock", iconClass: "bg-gold-soft text-gold-ink ring-gold/50" },
  APPROVED: { title: "Your application is approved", tone: "from-emerald-100 to-emerald-50", icon: "check-circle", iconClass: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  REJECTED: { title: "Your application was not approved", tone: "from-red-100 to-red-50", icon: "x-circle", iconClass: "bg-red-100 text-red-700 ring-red-200" },
} as const;

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
        <section aria-labelledby="application-heading" className="flex flex-col gap-6">
          <h2 id="application-heading" className="sr-only">
            Application details
          </h2>

          <div className={`glass flex flex-col gap-5 rounded-[22px] bg-gradient-to-br p-6 md:flex-row md:items-center md:justify-between md:p-8 ${HERO[registration.status].tone}`}>
            <div className="flex items-center gap-4">
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ring-1 ${HERO[registration.status].iconClass}`}>
                <Icon name={HERO[registration.status].icon} className="h-7 w-7" />
              </span>
              <div>
                <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-muted">Application {registration.referenceNumber}</p>
                <p className="mt-1 text-[1.25rem] font-bold tracking-[-0.01em] text-ink md:text-[1.5rem]">{HERO[registration.status].title}</p>
                <p className="mt-1 text-[0.9375rem] text-muted">{registration.selectedPackage.name}</p>
              </div>
            </div>
            <StatusBadge status={registration.status} label={labels.registrationStatus[registration.status]} />
          </div>

          <ol aria-label="Application progress" className="glass grid gap-4 rounded-[22px] p-6 sm:grid-cols-3">
            <Step done label="Submitted" detail={formatDate(registration.submittedAt.toISOString().slice(0, 10))} />
            <Step
              done={Boolean(registration.reviewedAt)}
              current={!registration.reviewedAt}
              label="Reviewed by the school"
              detail={registration.reviewedAt ? formatDate(registration.reviewedAt.toISOString().slice(0, 10)) : "Waiting for review"}
            />
            <Step
              done={registration.status !== "PENDING"}
              label={registration.status === "REJECTED" ? "Decision: not approved" : "Decision: approved"}
              detail={registration.status === "PENDING" ? "Not decided yet" : labels.registrationStatus[registration.status]}
            />
          </ol>

          <div className="grid gap-4 sm:grid-cols-2">
            <Detail icon="id-card" label="Reference">
              <span className="font-mono">{registration.referenceNumber}</span>
            </Detail>
            <Detail icon="car" label="Training package">{registration.selectedPackage.name}</Detail>
            <Detail icon="wallet" label="Price at submission">{formatMoney(Number(registration.packagePriceAtSubmission))}</Detail>
            <Detail icon="calendar" label="Submitted">{formatDate(registration.submittedAt.toISOString().slice(0, 10))}</Detail>
            <Detail icon="check-circle" label="Reviewed">
              {registration.reviewedAt ? formatDate(registration.reviewedAt.toISOString().slice(0, 10)) : "Not yet reviewed"}
            </Detail>
          </div>
        </section>
      )}
    </>
  );
}

function Step({ label, detail, done = false, current = false }: { label: string; detail: string; done?: boolean; current?: boolean }) {
  const dot = done ? "bg-emerald-500 text-white" : current ? "bg-gold text-ink" : "bg-page text-muted ring-1 ring-line";
  return (
    <li className="flex items-start gap-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold ${dot}`}>{done ? "✓" : ""}</span>
      <div>
        <p className="font-semibold text-ink">{label}</p>
        <p className="text-[0.8125rem] text-muted">{detail}</p>
      </div>
    </li>
  );
}

function Detail({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="glass flex items-start gap-4 rounded-2xl p-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-ink ring-1 ring-gold/50">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[0.8125rem] font-semibold text-muted">{label}</p>
        <div className="mt-1 text-[0.9375rem] font-medium text-ink">{children}</div>
      </div>
    </div>
  );
}
