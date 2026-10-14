import EmptyState from "@/components/student/EmptyState";
import { formatDate, labels } from "@/components/student/format";
import PageIntro from "@/components/student/PageIntro";
import { requirePortalUser } from "@/lib/auth/portal-guard";
import { getFeedback } from "@/lib/student/data";

export const metadata = { title: "Feedback | Student portal", robots: { index: false, follow: false } };

export default async function StudentFeedbackPage() {
  const user = await requirePortalUser("STUDENT");
  const feedback = await getFeedback(user.userId);

  return (
    <>
      <PageIntro title="Feedback" description="Written feedback from your instructors on your own lessons." />

      {feedback.length === 0 ? (
        <EmptyState title="No feedback yet" body="Your instructor's notes appear here after a lesson. Feedback is not created until your instructor writes it." />
      ) : (
        <ul className="flex flex-col gap-4">
          {feedback.map((item, index) => (
            <li key={index} className="glass rounded-[22px] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.8125rem] text-muted">
                <span>
                  {formatDate(item.lessonDate)} · {item.lessonStart} · {labels.vehicleType[item.vehicleType]}
                </span>
                <span>{item.instructorName}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink">{item.text}</p>
              {item.rating !== null && <p className="mt-3 text-[0.8125rem] font-semibold text-gold-ink">Rating: {item.rating} / 5</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
