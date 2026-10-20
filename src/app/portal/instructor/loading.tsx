import InstructorFrame from "@/components/instructor/InstructorFrame";
import LoadingState from "@/components/student/LoadingState";

/** Shown inside the instructor shell while a page loads, so the sidebar does not disappear. */
export default function InstructorLoading() {
  return (
    <InstructorFrame title="Loading" description="Getting your latest lessons." active="/portal/instructor">
      <LoadingState label="Loading the instructor portal" />
    </InstructorFrame>
  );
}
