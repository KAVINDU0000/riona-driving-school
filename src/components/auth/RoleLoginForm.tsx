"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export type LoginRole = "student" | "instructor" | "admin";

const roles: { value: LoginRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

const roleContent: Record<
  LoginRole,
  {
    eyebrow: string;
    title: string;
    body: string;
    points: { icon: string; text: string }[];
    identifierLabel: string;
    identifierPlaceholder: string;
    identifierType: "text" | "email";
    identifierIcon: string;
  }
> = {
  student: {
    eyebrow: "Riyona Driving School",
    title: "Student Portal",
    body: "Sign in to follow your lessons, practise papers and licence progress. Your instructor is only a message away.",
    points: [
      { icon: "calendar", text: "Your lesson schedule in one place" },
      { icon: "book", text: "Past papers and learning resources" },
      { icon: "user", text: "Direct contact with your instructor" },
    ],
    identifierLabel: "Student ID",
    identifierPlaceholder: "Enter student ID",
    identifierType: "text",
    identifierIcon: "id-card",
  },
  instructor: {
    eyebrow: "Riyona Driving School",
    title: "Instructor Portal",
    body: "Check your teaching schedule, the students assigned to you and your vehicle bookings.",
    points: [
      { icon: "calendar", text: "Your teaching schedule" },
      { icon: "users", text: "Students assigned to you" },
      { icon: "car", text: "Vehicle and lesson bookings" },
    ],
    identifierLabel: "Instructor ID",
    identifierPlaceholder: "Enter instructor ID",
    identifierType: "text",
    identifierIcon: "id-card",
  },
  admin: {
    eyebrow: "Admin Console",
    title: "Staff Sign In",
    body: "Restricted to school administrators. Manage student records, instructors and vehicles from one secure console.",
    points: [
      { icon: "users", text: "Manage student records" },
      { icon: "car", text: "Schedule instructors and vehicles" },
      { icon: "file-check", text: "Track licence progress" },
    ],
    identifierLabel: "Admin email",
    identifierPlaceholder: "Enter admin email",
    identifierType: "email",
    identifierIcon: "mail",
  },
};

interface RoleLoginFormProps {
  initialRole: LoginRole;
}

/** Role-aware login page: the copy column and the form both follow the selected role tab. Only students get the sign-up line. */
export default function RoleLoginForm({ initialRole }: RoleLoginFormProps) {
  const [role, setRole] = useState<LoginRole>(initialRole);
  const content = roleContent[role];

  return (
    <AuthShell eyebrow={content.eyebrow} title={content.title} body={content.body} points={content.points}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/images/logo-riyona.jpg"
            alt="Riyona Driving School logo"
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover ring-1 ring-line"
          />
          <h2 className="mt-5 text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-ink">Welcome Back</h2>
          <p className="mt-2 text-[0.9375rem] text-muted">Sign in to your Riyona Driving School account</p>

          <div role="tablist" aria-label="Select user role" className="mt-6 inline-flex rounded-full bg-page p-1 ring-1 ring-line">
            {roles.map((item) => {
              const selected = item.value === role;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setRole(item.value)}
                  className={`rounded-full px-5 py-2 text-[0.875rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark ${
                    selected ? "bg-white text-ink shadow-[0_2px_8px_-2px_rgb(16_27_48/0.18)]" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* key resets the fields when the role changes */}
        <LoginForm
          key={role}
          identifierLabel={content.identifierLabel}
          identifierPlaceholder={content.identifierPlaceholder}
          identifierType={content.identifierType}
          identifierIcon={content.identifierIcon}
          submitLabel="Login"
          footnote={
            role === "student" ? (
              <>
                New student?{" "}
                <Link href="/signup" className="font-semibold text-gold-ink hover:text-ink">
                  Sign up
                </Link>
              </>
            ) : undefined
          }
        />
      </div>
    </AuthShell>
  );
}
