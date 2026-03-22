"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
} as const;

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <span
      className={`font-bold tracking-tight select-none ${sizes[size]} ${className}`}
      style={{ color: "var(--color-text-primary)" }}
    >
      <span style={{ color: "var(--color-primary)" }}>go</span>
      Blink
    </span>
  );
}
