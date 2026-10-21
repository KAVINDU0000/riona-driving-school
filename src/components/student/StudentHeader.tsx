import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/student/LogoutButton";

/** Top bar for the student portal: brand, the student's ID, and sign-out. The ID is shown, never the email or NIC. */
export default function StudentHeader({ studentId }: { studentId: string }) {
  return (
    <header className="sticky top-0 z-50 pt-4 md:pt-5">
      <nav className="glass flex h-[76px] items-center gap-4 rounded-[18px] px-4 shadow-[0_12px_40px_-16px_rgb(40_60_90/0.16)] backdrop-blur-2xl md:px-6">
        <Link href="/portal/student/dashboard" className="flex min-w-0 shrink-0 items-center gap-3">
          <Image src="/images/logo-riyona.jpg" alt="Riyona Driving School logo" width={40} height={40} className="h-10 w-10 rounded-full object-cover ring-1 ring-line" />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="whitespace-nowrap text-[0.875rem] font-bold tracking-[0.02em] text-ink">RIYONA DRIVING SCHOOL</span>
            <span className="whitespace-nowrap text-[0.75rem] text-muted">Safe Drivers • Brighter Futures</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden rounded-full bg-page px-3 py-1 text-[0.8125rem] font-medium text-muted ring-1 ring-line md:inline">
            Student ID <span className="font-semibold text-ink">{studentId}</span>
          </span>
          <LogoutButton />
        </div>
      </nav>
    </header>
  );
}
