"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "font-semibold rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400";

  const variants = {
    primary:
      "bg-yellow-400 text-gray-900 hover:bg-yellow-500 hover:shadow-md active:scale-98 shadow-sm",
    secondary:
      "bg-gray-100 text-gray-900 hover:bg-gray-200 active:scale-98 border border-gray-300 shadow-sm",
    outline:
      "border-2 border-gray-900 text-gray-900 hover:bg-gray-50 active:scale-98",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm font-medium",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
