import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import clsx from "clsx";

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  children,
  className,
  glow,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  glow?: "teal" | "amber" | "blue" | "none";
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "glass rounded-xl p-4 transition-all duration-300",
        glow === "teal" && "shadow-[0_0_0_1px_rgba(45,212,191,0.1),0_8px_20px_-8px_rgba(20,184,166,0.15)]",
        glow === "amber" && "shadow-[0_0_0_1px_rgba(251,146,60,0.1),0_8px_20px_-8px_rgba(249,115,22,0.15)]",
        glow === "blue" && "shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_8px_20px_-8px_rgba(59,130,246,0.15)]",
        !glow || glow === "none" ? "shadow-sm border border-white/5" : "",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------- Button ---------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

// Framer Motion's drag/animation event props collide with the native DOM
// button attributes of the same name, so the conflicting ones are omitted here.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

interface ButtonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-teal-400 to-teal-600 text-ink-950 font-semibold shadow-[0_8px_24px_-8px_rgba(20,184,166,0.6)] hover:brightness-110",
  secondary:
    "bg-gradient-to-b from-amber-400 to-amber-600 text-ink-950 font-semibold shadow-[0_8px_24px_-8px_rgba(249,115,22,0.55)] hover:brightness-110",
  outline: "border border-ink-600 text-mist-100 hover:border-teal-400 hover:text-teal-300",
  ghost: "text-mist-400 hover:text-mist-100 hover:bg-white/5",
  danger: "bg-gradient-to-b from-rose-400 to-rose-500 text-white font-semibold hover:brightness-110",
};

export function Button({
  variant = "primary",
  loading,
  icon,
  fullWidth,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: disabled || loading ? 1 : 1.015 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      className={clsx(
        "relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        fullWidth && "w-full",
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      {children}
    </motion.button>
  );
}

/* --------------------------------- Inputs ---------------------------------- */

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={clsx("mb-1.5 block text-xs font-medium text-mist-400", props.className)} />;
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={clsx(
        "field-surface w-full rounded-xl border border-ink-600 bg-ink-900/60 px-3.5 py-2.5 text-[15px] text-mist-100 placeholder:text-mist-500",
        "outline-none transition-colors duration-150 focus:border-teal-400 focus:bg-ink-900",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={clsx(
        "field-surface w-full resize-none rounded-xl border border-ink-600 bg-ink-900/60 px-3.5 py-2.5 text-[15px] text-mist-100 placeholder:text-mist-500",
        "outline-none transition-colors duration-150 focus:border-teal-400 focus:bg-ink-900",
        className,
      )}
    />
  );
}

/* --------------------------------- Badge ----------------------------------- */

type BadgeTone = "teal" | "amber" | "rose" | "slate" | "blue";

const badgeTones: Record<BadgeTone, string> = {
  teal: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  slate: "bg-mist-500/10 text-mist-400 border-mist-500/25",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export function Badge({ tone = "slate", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Spinner ---------------------------------- */

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------- Progress bar -------------------------------- */

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-ink-700/70", className)}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-amber-400"
        initial={{ width: 0 }}
        animate={{ width: `${clampPct(value)}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

function clampPct(n: number) {
  return Math.min(100, Math.max(0, n));
}

/* -------------------------------- Empty state --------------------------------- */

export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon && <div className="mb-1 text-mist-500">{icon}</div>}
      <p className="text-sm font-medium text-mist-300">{title}</p>
      {subtitle && <p className="max-w-xs text-xs text-mist-500">{subtitle}</p>}
    </div>
  );
}

/* --------------------------------- Avatar ------------------------------------ */

export function Avatar({ name, color, url, size = 36 }: { name: string; color?: string; url?: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
    
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white shadow-inner relative"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: color || "linear-gradient(135deg, #2dd4bf, #0f766e)",
      }}
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover absolute inset-0" />
      ) : (
        initials
      )}
    </div>
  );
}
