interface StatusBadgeProps {
  value?: string;
}

const STATUS_STYLES: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  DID_NOT_CONNECT:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  BAD_LEAD: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  SALE_DONE: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

/** Colored pill for the CRM status enum; renders a dash when absent. */
export function StatusBadge({ value }: StatusBadgeProps) {
  if (!value) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  const style =
    STATUS_STYLES[value] ??
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
