/** The student portal's sections. The order is the order shown in the sidebar and mobile bar. */
export const studentNav = [
  { href: "/portal/student/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/portal/student/profile", label: "Profile", icon: "user" },
  { href: "/portal/student/registration", label: "Registration", icon: "file-check" },
  { href: "/portal/student/enrollments", label: "Enrollments", icon: "badge-check" },
  { href: "/portal/student/lessons", label: "Lessons", icon: "car" },
  { href: "/portal/student/attendance", label: "Attendance", icon: "check-circle" },
  { href: "/portal/student/feedback", label: "Feedback", icon: "chat" },
  { href: "/portal/student/payments", label: "Payments", icon: "wallet" },
  { href: "/portal/student/appointments", label: "Appointments", icon: "calendar" },
  { href: "/portal/student/settings", label: "Settings", icon: "sliders" },
] as const;

/** The title shown for a path, used by breadcrumbs. Falls back to "Student portal". */
export function titleForPath(pathname: string): string {
  return studentNav.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? "Student portal";
}
