import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  tone?: "brand" | "amber" | "slate" | "sky";
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand:
    "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/60 dark:bg-brand-900/20 dark:text-brand-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300",
  sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-900/20 dark:text-sky-300",
  slate:
    "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
};

/** Compact metric card used in the result summary. */
export function StatCard({ label, value, icon, tone = "slate" }: StatCardProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-4 shadow-sm ${toneStyles[tone]}`}
    >
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/60 dark:bg-black/20">
          {icon}
        </div>
      )}
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide opacity-80">
          {label}
        </p>
      </div>
    </div>
  );
}
