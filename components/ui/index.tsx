import * as React from "react";
import { cn } from "@/lib/utils";

/* ─────────── Button ─────────── */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-dark",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        variant === "primary" && "bg-terracotta text-sand hover:bg-terracotta-dark",
        variant === "secondary" && "bg-honey-light text-terracotta-dark hover:bg-honey",
        variant === "danger" && "bg-brick text-white hover:bg-brick-dark",
        variant === "ghost" &&
          "border-2 border-navy-200 text-terracotta-dark hover:bg-honey-pale",
        className,
      )}
      {...props}
    />
  );
}

/* ─────────── Champs ─────────── */
export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900",
          "placeholder:text-navy-400 focus:border-navy-600 focus:outline-none",
          "disabled:bg-navy-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900",
          "placeholder:text-navy-400 focus:border-navy-600 focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900",
          "focus:border-navy-600 focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-navy-700", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-brick">{error}</p>}
    </div>
  );
}

/* ─────────── Conteneurs ─────────── */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-navy-100 bg-white p-5 shadow-[0_4px_14px_rgba(60,30,10,0.08)]",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
        tone === "neutral" && "bg-honey-light text-terracotta-dark",
        tone === "success" && "bg-sage-light text-sage-dark",
        tone === "warning" && "bg-due text-terracotta-dark",
        tone === "danger" && "bg-due text-brick-dark",
        tone === "info" && "bg-honey-pale text-terracotta-dark",
        className,
      )}
      {...props}
    />
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-4 rounded-lg border px-4 py-3 text-sm",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-900",
        tone === "error" && "border-red-200 bg-red-50 text-brick-dark",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
      )}
    >
      {children}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-navy-200 bg-white/50 px-6 py-12 text-center">
      <p className="font-medium text-navy-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-navy-400">{hint}</p>}
    </div>
  );
}

export function Avatar({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name || ""}
      width={size}
      height={size}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="inline-flex items-center justify-center rounded-full bg-terracotta font-semibold text-sand"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials}
    </span>
  );
}
